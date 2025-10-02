const { Pool } = require('pg');
const logger = require('../utils/logger');

// Role-Based Access Control System
class RBAC {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Define roles hierarchy
    this.roleHierarchy = {
      super_admin: 10,
      hospital_admin: 9,
      department_head: 8,
      doctor: 7,
      nurse: 6,
      pharmacist: 6,
      lab_technician: 6,
      billing_clerk: 5,
      receptionist: 4,
      patient: 3,
      guest: 1
    };

    // Define permissions for each role
    this.permissions = this.definePermissions();
    
    // Cache for user roles
    this.roleCache = new Map();
  }

  // Define comprehensive permissions
  definePermissions() {
    return {
      super_admin: {
        // Full system access
        system: ['*'],
        hospitals: ['create', 'read', 'update', 'delete', 'manage'],
        users: ['create', 'read', 'update', 'delete', 'manage_roles'],
        patients: ['create', 'read', 'update', 'delete', 'export'],
        medical_records: ['create', 'read', 'update', 'delete', 'audit'],
        financial: ['create', 'read', 'update', 'delete', 'audit', 'export'],
        inventory: ['create', 'read', 'update', 'delete', 'manage'],
        analytics: ['read', 'export', 'configure'],
        integrations: ['manage', 'configure', 'test'],
        audit: ['read', 'export', 'delete']
      },
      
      hospital_admin: {
        hospitals: ['read', 'update'],
        users: ['create', 'read', 'update', 'manage_roles'],
        patients: ['create', 'read', 'update', 'export'],
        medical_records: ['create', 'read', 'update', 'audit'],
        financial: ['read', 'update', 'audit', 'export'],
        inventory: ['read', 'update', 'manage'],
        analytics: ['read', 'export'],
        integrations: ['read', 'test'],
        audit: ['read', 'export']
      },
      
      department_head: {
        users: ['read', 'update'],
        patients: ['create', 'read', 'update'],
        medical_records: ['create', 'read', 'update'],
        financial: ['read'],
        inventory: ['read', 'update'],
        analytics: ['read'],
        audit: ['read']
      },
      
      doctor: {
        patients: ['create', 'read', 'update'],
        medical_records: ['create', 'read', 'update'],
        prescriptions: ['create', 'read', 'update'],
        lab_orders: ['create', 'read'],
        appointments: ['create', 'read', 'update'],
        analytics: ['read:own_patients']
      },
      
      nurse: {
        patients: ['read', 'update:vitals'],
        medical_records: ['read', 'update:nursing_notes'],
        medications: ['read', 'administer'],
        lab_orders: ['read'],
        appointments: ['read', 'update']
      },
      
      pharmacist: {
        prescriptions: ['read', 'dispense', 'verify'],
        inventory: ['read', 'update'],
        medications: ['read', 'manage'],
        patients: ['read:basic']
      },
      
      lab_technician: {
        lab_orders: ['read', 'update:results'],
        lab_results: ['create', 'read', 'update'],
        patients: ['read:basic']
      },
      
      billing_clerk: {
        financial: ['create', 'read', 'update'],
        insurance: ['create', 'read', 'update'],
        patients: ['read:billing_info'],
        appointments: ['read']
      },
      
      receptionist: {
        patients: ['create', 'read:basic', 'update:contact'],
        appointments: ['create', 'read', 'update'],
        queue: ['manage']
      },
      
      patient: {
        medical_records: ['read:own'],
        appointments: ['read:own', 'create:own', 'update:own'],
        prescriptions: ['read:own'],
        lab_results: ['read:own'],
        billing: ['read:own'],
        profile: ['read:own', 'update:own']
      },
      
      guest: {
        public: ['read'],
        appointments: ['create']
      }
    };
  }

  // Initialize RBAC tables
  async initializeTables() {
    try {
      // Create roles table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS roles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) UNIQUE NOT NULL,
          display_name VARCHAR(100),
          description TEXT,
          hierarchy_level INTEGER,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create permissions table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS permissions (
          id SERIAL PRIMARY KEY,
          resource VARCHAR(100) NOT NULL,
          action VARCHAR(50) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(resource, action)
        )
      `);

      // Create role_permissions table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id SERIAL PRIMARY KEY,
          role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
          permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
          conditions JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(role_id, permission_id)
        )
      `);

      // Create user_roles table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
          hospital_id VARCHAR(50),
          department_id VARCHAR(50),
          assigned_by VARCHAR(100),
          assigned_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          UNIQUE(user_id, role_id, hospital_id)
        )
      `);

      // Create access_policies table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS access_policies (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          resource VARCHAR(100),
          conditions JSONB,
          effect VARCHAR(10) CHECK (effect IN ('allow', 'deny')),
          priority INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create role_policies table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS role_policies (
          id SERIAL PRIMARY KEY,
          role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
          policy_id INTEGER REFERENCES access_policies(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(role_id, policy_id)
        )
      `);

      // Seed default roles
      await this.seedDefaultRoles();

      logger.info('RBAC tables initialized successfully');
      return true;
    } catch (error) {
      logger.error('Error initializing RBAC tables:', error);
      return false;
    }
  }

  // Seed default roles
  async seedDefaultRoles() {
    try {
      for (const [roleName, level] of Object.entries(this.roleHierarchy)) {
        await this.pool.query(`
          INSERT INTO roles (name, hierarchy_level, display_name)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE SET
            hierarchy_level = $2,
            updated_at = NOW()
        `, [roleName, level, roleName.replace('_', ' ').toUpperCase()]);
      }

      // Seed permissions
      for (const [role, permissions] of Object.entries(this.permissions)) {
        const roleResult = await this.pool.query(
          'SELECT id FROM roles WHERE name = $1',
          [role]
        );
        
        if (roleResult.rows.length > 0) {
          const roleId = roleResult.rows[0].id;
          
          for (const [resource, actions] of Object.entries(permissions)) {
            for (const action of actions) {
              // Insert permission
              const permResult = await this.pool.query(`
                INSERT INTO permissions (resource, action)
                VALUES ($1, $2)
                ON CONFLICT (resource, action) DO UPDATE SET
                  resource = $1
                RETURNING id
              `, [resource, action]);
              
              // Link role to permission
              await this.pool.query(`
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES ($1, $2)
                ON CONFLICT (role_id, permission_id) DO NOTHING
              `, [roleId, permResult.rows[0].id]);
            }
          }
        }
      }

      logger.info('Default roles and permissions seeded');
    } catch (error) {
      logger.error('Error seeding default roles:', error);
    }
  }

  // Check if user has permission
  async hasPermission(userId, resource, action, context = {}) {
    try {
      // Get user roles
      const userRoles = await this.getUserRoles(userId, context.hospitalId);
      
      if (userRoles.length === 0) {
        return false;
      }

      // Check each role for permission
      for (const role of userRoles) {
        // Check wildcard permissions
        if (this.permissions[role.name]?.system?.includes('*')) {
          return true;
        }

        // Check specific resource permissions
        const rolePermissions = this.permissions[role.name]?.[resource];
        if (rolePermissions) {
          // Check for wildcard action
          if (rolePermissions.includes('*')) {
            return true;
          }

          // Check for specific action
          if (rolePermissions.includes(action)) {
            // Apply contextual checks
            return await this.checkContextualPermission(role, resource, action, context);
          }

          // Check for conditional actions (e.g., 'read:own')
          for (const permission of rolePermissions) {
            if (permission.startsWith(action)) {
              const condition = permission.split(':')[1];
              if (await this.checkCondition(condition, userId, context)) {
                return true;
              }
            }
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Permission check error:', error);
      return false;
    }
  }

  // Get user roles
  async getUserRoles(userId, hospitalId = null) {
    try {
      // Check cache first
      const cacheKey = `${userId}:${hospitalId || 'all'}`;
      if (this.roleCache.has(cacheKey)) {
        const cached = this.roleCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
          return cached.roles;
        }
      }

      let query = `
        SELECT r.*, ur.hospital_id, ur.department_id
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 
          AND ur.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      `;
      
      const params = [userId];
      
      if (hospitalId) {
        query += ' AND (ur.hospital_id = $2 OR ur.hospital_id IS NULL)';
        params.push(hospitalId);
      }

      const result = await this.pool.query(query, params);
      
      // Cache the result
      this.roleCache.set(cacheKey, {
        roles: result.rows,
        timestamp: Date.now()
      });

      return result.rows;
    } catch (error) {
      logger.error('Error getting user roles:', error);
      return [];
    }
  }

  // Assign role to user
  async assignRole(userId, roleName, assignedBy, options = {}) {
    try {
      // Get role ID
      const roleResult = await this.pool.query(
        'SELECT id FROM roles WHERE name = $1',
        [roleName]
      );

      if (roleResult.rows.length === 0) {
        throw new Error(`Role ${roleName} not found`);
      }

      const roleId = roleResult.rows[0].id;

      // Insert user role
      await this.pool.query(`
        INSERT INTO user_roles 
        (user_id, role_id, hospital_id, department_id, assigned_by, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, role_id, hospital_id) DO UPDATE SET
          is_active = true,
          assigned_by = $5,
          assigned_at = NOW(),
          expires_at = $6
      `, [
        userId,
        roleId,
        options.hospitalId || null,
        options.departmentId || null,
        assignedBy,
        options.expiresAt || null
      ]);

      // Clear cache
      this.clearUserCache(userId);

      logger.info('Role assigned', { userId, roleName, assignedBy });
      return true;
    } catch (error) {
      logger.error('Error assigning role:', error);
      throw error;
    }
  }

  // Revoke role from user
  async revokeRole(userId, roleName, revokedBy) {
    try {
      const roleResult = await this.pool.query(
        'SELECT id FROM roles WHERE name = $1',
        [roleName]
      );

      if (roleResult.rows.length === 0) {
        throw new Error(`Role ${roleName} not found`);
      }

      await this.pool.query(`
        UPDATE user_roles 
        SET is_active = false
        WHERE user_id = $1 AND role_id = $2
      `, [userId, roleResult.rows[0].id]);

      // Clear cache
      this.clearUserCache(userId);

      logger.info('Role revoked', { userId, roleName, revokedBy });
      return true;
    } catch (error) {
      logger.error('Error revoking role:', error);
      throw error;
    }
  }

  // Check contextual permission
  async checkContextualPermission(role, resource, action, context) {
    // Department-based access
    if (context.departmentId && role.department_id) {
      if (context.departmentId !== role.department_id) {
        return false;
      }
    }

    // Hospital-based access
    if (context.hospitalId && role.hospital_id) {
      if (context.hospitalId !== role.hospital_id) {
        return false;
      }
    }

    // Time-based access
    if (context.timeRestriction) {
      const now = new Date();
      const hour = now.getHours();
      if (hour < context.timeRestriction.start || hour > context.timeRestriction.end) {
        return false;
      }
    }

    // IP-based access
    if (context.ipRestriction && context.clientIp) {
      if (!context.ipRestriction.includes(context.clientIp)) {
        return false;
      }
    }

    return true;
  }

  // Check condition (e.g., 'own' for own records)
  async checkCondition(condition, userId, context) {
    switch (condition) {
      case 'own':
        return context.ownerId === userId;
      
      case 'own_department':
        const userRoles = await this.getUserRoles(userId);
        return userRoles.some(r => r.department_id === context.departmentId);
      
      case 'own_hospital':
        const roles = await this.getUserRoles(userId);
        return roles.some(r => r.hospital_id === context.hospitalId);
      
      case 'own_patients':
        // Check if the user is the assigned doctor/nurse
        return context.assignedTo === userId;
      
      case 'basic':
        // Limited fields access
        return context.fieldsRequested?.every(f => 
          ['name', 'age', 'gender', 'patient_id'].includes(f)
        );
      
      case 'vitals':
        return context.dataType === 'vitals';
      
      case 'nursing_notes':
        return context.dataType === 'nursing_notes';
      
      case 'billing_info':
        return context.dataType === 'billing';
      
      default:
        return false;
    }
  }

  // Create access policy
  async createAccessPolicy(policy) {
    try {
      const result = await this.pool.query(`
        INSERT INTO access_policies 
        (name, resource, conditions, effect, priority)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        policy.name,
        policy.resource,
        JSON.stringify(policy.conditions || {}),
        policy.effect || 'allow',
        policy.priority || 0
      ]);

      logger.info('Access policy created', { policyId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating access policy:', error);
      throw error;
    }
  }

  // Attach policy to role
  async attachPolicyToRole(roleId, policyId) {
    try {
      await this.pool.query(`
        INSERT INTO role_policies (role_id, policy_id)
        VALUES ($1, $2)
        ON CONFLICT (role_id, policy_id) DO NOTHING
      `, [roleId, policyId]);

      logger.info('Policy attached to role', { roleId, policyId });
      return true;
    } catch (error) {
      logger.error('Error attaching policy to role:', error);
      throw error;
    }
  }

  // Get effective permissions for user
  async getEffectivePermissions(userId, hospitalId = null) {
    try {
      const userRoles = await this.getUserRoles(userId, hospitalId);
      const effectivePermissions = new Set();

      for (const role of userRoles) {
        const permissions = this.permissions[role.name] || {};
        
        for (const [resource, actions] of Object.entries(permissions)) {
          for (const action of actions) {
            effectivePermissions.add(`${resource}:${action}`);
          }
        }
      }

      return Array.from(effectivePermissions);
    } catch (error) {
      logger.error('Error getting effective permissions:', error);
      return [];
    }
  }

  // Check role hierarchy
  hasHigherRole(userRole, targetRole) {
    const userLevel = this.roleHierarchy[userRole] || 0;
    const targetLevel = this.roleHierarchy[targetRole] || 0;
    return userLevel >= targetLevel;
  }

  // Clear user cache
  clearUserCache(userId) {
    for (const key of this.roleCache.keys()) {
      if (key.startsWith(userId)) {
        this.roleCache.delete(key);
      }
    }
  }

  // Export role for backup
  async exportRoles() {
    try {
      const roles = await this.pool.query('SELECT * FROM roles');
      const permissions = await this.pool.query('SELECT * FROM permissions');
      const rolePermissions = await this.pool.query('SELECT * FROM role_permissions');
      const policies = await this.pool.query('SELECT * FROM access_policies');

      return {
        roles: roles.rows,
        permissions: permissions.rows,
        rolePermissions: rolePermissions.rows,
        policies: policies.rows,
        exportedAt: new Date()
      };
    } catch (error) {
      logger.error('Error exporting roles:', error);
      throw error;
    }
  }
}

module.exports = new RBAC();
