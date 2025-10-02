const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class SignalingServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/signaling',
      verifyClient: this.verifyClient.bind(this)
    });

    this.rooms = new Map(); // consultationId -> Set of connections
    this.connections = new Map(); // ws -> user info
    
    this.wss.on('connection', this.handleConnection.bind(this));
    
    logger.info('WebSocket signaling server initialized');
  }

  // Verify JWT token before accepting connection
  verifyClient(info, callback) {
    try {
      const token = this.extractToken(info.req.headers.authorization);
      if (!token) {
        callback(false, 401, 'Unauthorized');
        return;
      }

      jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
        if (err) {
          callback(false, 401, 'Invalid token');
        } else {
          info.req.user = decoded;
          callback(true);
        }
      });
    } catch (error) {
      callback(false, 500, 'Server error');
    }
  }

  extractToken(authHeader) {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
    return null;
  }

  handleConnection(ws, request) {
    const user = request.user;
    
    logger.info('WebSocket connection established', { userId: user.id });

    // Store connection info
    this.connections.set(ws, {
      userId: user.id,
      userType: user.role,
      consultationId: null
    });

    // Set up event handlers
    ws.on('message', (message) => this.handleMessage(ws, message));
    ws.on('close', () => this.handleDisconnect(ws));
    ws.on('error', (error) => this.handleError(ws, error));

    // Send connection confirmation
    this.sendMessage(ws, {
      type: 'connected',
      userId: user.id
    });
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const connInfo = this.connections.get(ws);

      logger.debug('Received message', { type: data.type, userId: connInfo.userId });

      switch (data.type) {
        case 'join-room':
          this.handleJoinRoom(ws, data);
          break;
        case 'leave-room':
          this.handleLeaveRoom(ws, data);
          break;
        case 'offer':
          this.handleOffer(ws, data);
          break;
        case 'answer':
          this.handleAnswer(ws, data);
          break;
        case 'ice-candidate':
          this.handleIceCandidate(ws, data);
          break;
        case 'ping':
          this.sendMessage(ws, { type: 'pong' });
          break;
        default:
          logger.warn('Unknown message type', { type: data.type });
      }
    } catch (error) {
      logger.error('Error handling message:', error);
      this.sendError(ws, 'Invalid message format');
    }
  }

  handleJoinRoom(ws, data) {
    const { consultationId } = data;
    const connInfo = this.connections.get(ws);

    // Leave previous room if any
    if (connInfo.consultationId) {
      this.leaveRoom(ws, connInfo.consultationId);
    }

    // Join new room
    connInfo.consultationId = consultationId;
    
    if (!this.rooms.has(consultationId)) {
      this.rooms.set(consultationId, new Set());
    }
    
    const room = this.rooms.get(consultationId);
    room.add(ws);

    // Notify user they joined
    this.sendMessage(ws, {
      type: 'joined-room',
      consultationId,
      participants: room.size
    });

    // Notify other participants
    this.broadcastToRoom(consultationId, {
      type: 'user-joined',
      userId: connInfo.userId,
      userType: connInfo.userType
    }, ws);

    logger.info('User joined room', { 
      userId: connInfo.userId, 
      consultationId,
      participants: room.size 
    });
  }

  handleLeaveRoom(ws, data) {
    const connInfo = this.connections.get(ws);
    const consultationId = data.consultationId || connInfo.consultationId;

    if (consultationId) {
      this.leaveRoom(ws, consultationId);
    }
  }

  leaveRoom(ws, consultationId) {
    const connInfo = this.connections.get(ws);
    const room = this.rooms.get(consultationId);

    if (room && room.has(ws)) {
      room.delete(ws);
      
      // Notify other participants
      this.broadcastToRoom(consultationId, {
        type: 'user-left',
        userId: connInfo.userId
      }, ws);

      // Clean up empty rooms
      if (room.size === 0) {
        this.rooms.delete(consultationId);
      }

      connInfo.consultationId = null;

      logger.info('User left room', { 
        userId: connInfo.userId, 
        consultationId,
        remainingParticipants: room ? room.size : 0
      });
    }
  }

  handleOffer(ws, data) {
    const connInfo = this.connections.get(ws);
    const { consultationId, targetUserId, offer } = data;

    if (connInfo.consultationId !== consultationId) {
      this.sendError(ws, 'Not in this room');
      return;
    }

    // Find target user's connection
    const targetWs = this.findUserInRoom(consultationId, targetUserId);
    
    if (targetWs) {
      this.sendMessage(targetWs, {
        type: 'offer',
        offer,
        fromUserId: connInfo.userId
      });
      
      logger.debug('Offer relayed', { 
        from: connInfo.userId, 
        to: targetUserId 
      });
    } else {
      this.sendError(ws, 'Target user not found');
    }
  }

  handleAnswer(ws, data) {
    const connInfo = this.connections.get(ws);
    const { consultationId, targetUserId, answer } = data;

    if (connInfo.consultationId !== consultationId) {
      this.sendError(ws, 'Not in this room');
      return;
    }

    const targetWs = this.findUserInRoom(consultationId, targetUserId);
    
    if (targetWs) {
      this.sendMessage(targetWs, {
        type: 'answer',
        answer,
        fromUserId: connInfo.userId
      });
      
      logger.debug('Answer relayed', { 
        from: connInfo.userId, 
        to: targetUserId 
      });
    } else {
      this.sendError(ws, 'Target user not found');
    }
  }

  handleIceCandidate(ws, data) {
    const connInfo = this.connections.get(ws);
    const { consultationId, targetUserId, candidate } = data;

    if (connInfo.consultationId !== consultationId) {
      this.sendError(ws, 'Not in this room');
      return;
    }

    const targetWs = this.findUserInRoom(consultationId, targetUserId);
    
    if (targetWs) {
      this.sendMessage(targetWs, {
        type: 'ice-candidate',
        candidate,
        fromUserId: connInfo.userId
      });
      
      logger.debug('ICE candidate relayed', { 
        from: connInfo.userId, 
        to: targetUserId 
      });
    }
  }

  findUserInRoom(consultationId, userId) {
    const room = this.rooms.get(consultationId);
    if (!room) return null;

    for (const ws of room) {
      const connInfo = this.connections.get(ws);
      if (connInfo && connInfo.userId === userId) {
        return ws;
      }
    }
    return null;
  }

  broadcastToRoom(consultationId, message, excludeWs = null) {
    const room = this.rooms.get(consultationId);
    if (!room) return;

    for (const ws of room) {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, message);
      }
    }
  }

  handleDisconnect(ws) {
    const connInfo = this.connections.get(ws);
    
    if (connInfo) {
      // Leave any room they were in
      if (connInfo.consultationId) {
        this.leaveRoom(ws, connInfo.consultationId);
      }

      // Remove connection
      this.connections.delete(ws);
      
      logger.info('WebSocket disconnected', { userId: connInfo.userId });
    }
  }

  handleError(ws, error) {
    const connInfo = this.connections.get(ws);
    logger.error('WebSocket error', { 
      userId: connInfo?.userId, 
      error: error.message 
    });
  }

  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, error) {
    this.sendMessage(ws, {
      type: 'error',
      error
    });
  }

  // Get room statistics
  getRoomStats() {
    const stats = {};
    for (const [consultationId, room] of this.rooms) {
      stats[consultationId] = {
        participants: room.size,
        users: Array.from(room).map(ws => {
          const conn = this.connections.get(ws);
          return conn ? { userId: conn.userId, userType: conn.userType } : null;
        }).filter(Boolean)
      };
    }
    return stats;
  }
}

module.exports = SignalingServer;
