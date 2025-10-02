const securityService = require('../services/securityService');
const pool = require('../config/database');

class AuthMiddleware {
    /**
     * Authenticate user with JWT token
     */
    async authenticate(req, res, next) {
        try {
            // Extract token from Authorization header
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    message: 'No authentication token provided'
                });
            }
            
            const token = authHeader.substring(7);
            
            try {
                // Verify JWT token
                const payload = securityService.verifyToken(token);
                
                // Validate session
                const session = await securityService.validateSession(payload.sessionToken);
                
                if (!session.valid) {
                    return res.status(401).json({
                        success: false,
                        message: session.reason
                    });
                }
                
                // Attach user info to request
                req.user = {
                    id: payload.userId,
                    email: session.email,
                    sessionId: session.sessionId
                };
                
                // Set user context for RLS
                const client = await pool.connect();
                try {
                    await client.query(`SET LOCAL app.current_user_id = $1`, [payload.userId]);
                } finally {
                    client.release();
                }
                
                // Log data access for HIPAA compliance
                if (req.method === 'GET' && req.path.includes('/patients/')) {
                    await securityService.logDataAccess({
                        userId: payload.userId,
                        patientId: req.params.patientId,
                        accessType: 'view',
                        dataCategory: 'patient_data',
                        dataFields: Object.keys(req.query || {}),
                        ipAddress: req.ip,
                        sessionId: session.sessionId
                    });
                }
                
                next();
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }
        } catch (error) {
            console.error('Authentication error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authentication error'
            });
        }
    }

    /**
     * Authorize based on permissions
     * @param {string} resource - Resource to access
     * @param {string} action - Action to perform
     */
    authorize(resource, action) {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        message: 'Authentication required'
                    });
                }
                
                // Check permission
                const hasPermission = await securityService.checkPermission(
                    req.user.id,
                    resource,
                    action
                );
                
                if (!hasPermission) {
                    // Log unauthorized access attempt
                    await securityService.auditLog(
                        req.user.id,
                        'UNAUTHORIZED_ACCESS_ATTEMPT',
                        resource,
                        null,
                        {
                            action: action,
                            path: req.path,
                            method: req.method,
                            ipAddress: req.ip
                        }
                    );
                    
                    return res.status(403).json({
                        success: false,
                        message: 'Insufficient permissions'
                    });
                }
                
                next();
            } catch (error) {
                console.error('Authorization error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Authorization error'
                });
            }
        };
    }

    /**
     * Authorize based on roles
     * @param {array} allowedRoles - Array of allowed role names
     */
    authorizeRoles(allowedRoles) {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        message: 'Authentication required'
                    });
                }
                
                // Get user roles
                const { roles } = await securityService.getUserRolesAndPermissions(req.user.id);
                
                // Check if user has any of the allowed roles
                const hasRole = roles.some(role => allowedRoles.includes(role.name));
                
                if (!hasRole) {
                    return res.status(403).json({
                        success: false,
                        message: 'Insufficient role privileges'
                    });
                }
                
                // Attach roles to request
                req.user.roles = roles;
                
                next();
            } catch (error) {
                console.error('Role authorization error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Authorization error'
                });
            }
        };
    }

    /**
     * Verify GDPR consent for data processing
     */
    async verifyConsent(req, res, next) {
        try {
            // Only check for patient-related operations
            if (!req.params.patientId) {
                return next();
            }
            
            const client = await pool.connect();
            try {
                // Check if patient has given consent
                const result = await client.query(
                    `SELECT consent_given, withdrawal_date 
                     FROM compliance.patient_consent 
                     WHERE patient_id = $1 
                       AND consent_type = 'data_processing'
                     ORDER BY consent_date DESC 
                     LIMIT 1`,
                    [req.params.patientId]
                );
                
                if (result.rows.length === 0 || !result.rows[0].consent_given || result.rows[0].withdrawal_date) {
                    return res.status(403).json({
                        success: false,
                        message: 'Patient consent required for data processing',
                        requiresConsent: true
                    });
                }
                
                next();
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Consent verification error:', error);
            return res.status(500).json({
                success: false,
                message: 'Consent verification error'
            });
        }
    }

    /**
     * Rate limiting middleware
     */
    rateLimit(maxRequests = 100, windowMs = 60000) {
        const requests = new Map();
        
        return (req, res, next) => {
            const key = `${req.ip}:${req.user?.id || 'anonymous'}`;
            const now = Date.now();
            
            // Clean old entries
            for (const [k, v] of requests.entries()) {
                if (now - v.firstRequest > windowMs) {
                    requests.delete(k);
                }
            }
            
            // Check rate limit
            const userRequests = requests.get(key);
            
            if (!userRequests) {
                requests.set(key, {
                    count: 1,
                    firstRequest: now
                });
            } else if (userRequests.count >= maxRequests) {
                // Log rate limit violation
                securityService.logSecurityIncident({
                    type: 'rate_limit_exceeded',
                    severity: 'medium',
                    userId: req.user?.id,
                    ipAddress: req.ip,
                    description: `Rate limit exceeded: ${userRequests.count} requests in ${windowMs}ms`,
                    affectedResources: { endpoint: req.path },
                    detectionMethod: 'rate_limiter'
                });
                
                return res.status(429).json({
                    success: false,
                    message: 'Too many requests. Please try again later.'
                });
            } else {
                userRequests.count++;
            }
            
            next();
        };
    }

    /**
     * Validate and sanitize input
     */
    validateInput(schema) {
        return (req, res, next) => {
            const { error } = schema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true
            });
            
            if (error) {
                const errors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }));
                
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: errors
                });
            }
            
            next();
        };
    }

    /**
     * Set security headers (OWASP recommendations)
     */
    securityHeaders(req, res, next) {
        // Prevent clickjacking
        res.setHeader('X-Frame-Options', 'DENY');
        
        // Prevent MIME type sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Enable XSS protection
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Content Security Policy
        res.setHeader('Content-Security-Policy', 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self' data:; " +
            "connect-src 'self'; " +
            "frame-ancestors 'none';"
        );
        
        // Strict Transport Security (HSTS)
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        
        // Referrer Policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Permissions Policy
        res.setHeader('Permissions-Policy', 
            'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
        );
        
        next();
    }

    /**
     * Audit logging middleware
     */
    auditLog(action, resourceType) {
        return async (req, res, next) => {
            const startTime = Date.now();
            
            // Capture original end function
            const originalEnd = res.end;
            
            res.end = function(...args) {
                // Calculate response time
                const responseTime = Date.now() - startTime;
                
                // Log audit event
                securityService.auditLog(
                    req.user?.id,
                    action,
                    resourceType,
                    req.params.id || req.body?.id,
                    {
                        method: req.method,
                        path: req.path,
                        query: req.query,
                        statusCode: res.statusCode,
                        responseTime: responseTime,
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent']
                    }
                ).catch(error => {
                    console.error('Audit logging error:', error);
                });
                
                // Call original end function
                originalEnd.apply(res, args);
            };
            
            next();
        };
    }

    /**
     * HIPAA compliance logging for medical records
     */
    hipaaLogging(dataCategory) {
        return async (req, res, next) => {
            if (req.method === 'GET' && req.user) {
                await securityService.logDataAccess({
                    userId: req.user.id,
                    patientId: req.params.patientId || req.query.patientId,
                    accessType: 'view',
                    dataCategory: dataCategory,
                    dataFields: Object.keys(req.query || {}),
                    ipAddress: req.ip,
                    sessionId: req.user.sessionId
                });
            }
            
            next();
        };
    }

    /**
     * Emergency access override (for medical emergencies)
     */
    emergencyAccess(req, res, next) {
        const emergencyCode = req.headers['x-emergency-code'];
        
        if (emergencyCode) {
            // Verify emergency code (in production, would validate against secure system)
            if (emergencyCode === process.env.EMERGENCY_ACCESS_CODE) {
                // Log emergency access
                securityService.logSecurityIncident({
                    type: 'emergency_access',
                    severity: 'high',
                    userId: req.user?.id,
                    ipAddress: req.ip,
                    description: 'Emergency access override used',
                    affectedResources: {
                        endpoint: req.path,
                        method: req.method
                    },
                    detectionMethod: 'emergency_header'
                }).catch(console.error);
                
                // Grant temporary elevated permissions
                req.emergencyAccess = true;
            }
        }
        
        next();
    }

    /**
     * Check data retention policy
     */
    async checkRetentionPolicy(req, res, next) {
        try {
            const client = await pool.connect();
            try {
                // Get retention policy for the data category
                const result = await client.query(
                    `SELECT * FROM compliance.retention_policies 
                     WHERE data_category = $1`,
                    [req.dataCategory || 'general']
                );
                
                if (result.rows.length > 0) {
                    req.retentionPolicy = result.rows[0];
                }
                
                next();
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Retention policy check error:', error);
            next(); // Continue even if check fails
        }
    }
}

module.exports = new AuthMiddleware();
