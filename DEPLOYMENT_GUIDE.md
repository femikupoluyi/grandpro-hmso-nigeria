# GrandPro HMSO - Production Deployment Guide

## Quick Start

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL 15+ (or Neon Database account)
- Git
- Domain with SSL certificates
- Minimum 4GB RAM, 20GB storage

### 1. Clone Repository
```bash
git clone https://github.com/femikupoluyi/grandpro-hmso-nigeria.git
cd grandpro-hmso-nigeria
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL=your_neon_database_url
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)
DEFAULT_TIMEZONE=Africa/Lagos
DEFAULT_CURRENCY=NGN
PORT=5000
EOF

# Initialize database
npm run migrate

# Start backend
npm start
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:5000/api
EOF

# Build for production
npm run build

# Or run development server
npm run dev
```

### 4. Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Command Centre: http://localhost:5173/command-centre
- Analytics: http://localhost:5173/analytics
- Integrations: http://localhost:5173/integrations

## Production Deployment

### Using Docker
```dockerfile
# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

```dockerfile
# Frontend Dockerfile
FROM node:20-alpine as builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start src/server.js --name grandpro-backend

# Serve frontend with PM2
pm2 serve frontend/dist 3000 --spa --name grandpro-frontend

# Save PM2 configuration
pm2 save
pm2 startup
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name grandpro-hmso.ng;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name grandpro-hmso.ng;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket for video calls
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Database Setup

### Using Neon (Recommended)
1. Create account at https://neon.tech
2. Create new project "grandpro-hmso"
3. Copy connection string
4. Update DATABASE_URL in .env

### Using Local PostgreSQL
```sql
-- Create database
CREATE DATABASE grandpro_hmso;

-- Create user
CREATE USER grandpro WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE grandpro_hmso TO grandpro;

-- Connect and run migrations
\c grandpro_hmso;
```

## Environment Variables

### Required Variables
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/grandpro

# Security (Generate secure values!)
JWT_SECRET=<32-character-secret>
ENCRYPTION_MASTER_KEY=<64-character-hex>
WEBHOOK_SECRET=<random-secret>

# Application
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://grandpro-hmso.ng

# Nigerian Context
DEFAULT_TIMEZONE=Africa/Lagos
DEFAULT_CURRENCY=NGN
COUNTRY_CODE=NG

# Features
REPLICATION_ENABLED=false
FAILOVER_ENABLED=false
REMOTE_BACKUP_ENABLED=false
```

### Partner Integration Variables (Optional)
```env
# Insurance/HMO
NHIS_API_KEY=your_key
NHIS_SECRET_KEY=your_secret
HYGEIA_API_KEY=your_key
RELIANCE_API_KEY=your_key

# Pharmacy
EMZOR_API_KEY=your_key
FIDSON_API_KEY=your_key
MAYBAKER_API_KEY=your_key

# Telemedicine
WELLA_API_KEY=your_key
MOBI_API_KEY=your_key
```

## Security Hardening

### 1. SSL/TLS Setup
```bash
# Using Let's Encrypt
sudo apt install certbot
sudo certbot --nginx -d grandpro-hmso.ng
```

### 2. Firewall Configuration
```bash
# UFW setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. Database Security
```sql
-- Enable SSL for database connections
ALTER SYSTEM SET ssl = on;

-- Restrict connections
ALTER SYSTEM SET listen_addresses = 'localhost';

-- Set password encryption
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
```

### 4. Application Security Headers
```javascript
// Add to backend/src/server.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Monitoring Setup

### 1. Application Monitoring
```bash
# PM2 Monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. Database Monitoring
```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

### 3. Health Checks
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

## Backup Configuration

### 1. Database Backup Script
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/grandpro"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="grandpro_hmso"

# Create backup
pg_dump $DATABASE_URL > "$BACKUP_DIR/backup_$DATE.sql"

# Compress
gzip "$BACKUP_DIR/backup_$DATE.sql"

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/backup_$DATE.sql.gz" s3://grandpro-backups/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### 2. Automated Backup Cron
```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

## Scaling Considerations

### Horizontal Scaling
```yaml
# docker-compose.yml for scaling
version: '3.8'
services:
  backend:
    build: ./backend
    deploy:
      replicas: 3
    environment:
      - DATABASE_URL=${DATABASE_URL}
    networks:
      - grandpro

  frontend:
    build: ./frontend
    deploy:
      replicas: 2
    networks:
      - grandpro

  nginx:
    image: nginx
    ports:
      - "80:80"
      - "443:443"
    networks:
      - grandpro

networks:
  grandpro:
    driver: overlay
```

### Database Connection Pooling
```javascript
// backend/src/config/database.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql $DATABASE_URL -c "SELECT 1"

# Check firewall
sudo ufw status
```

#### 2. Port Already in Use
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>
```

#### 3. Memory Issues
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

#### 4. SSL Certificate Issues
```bash
# Renew certificates
sudo certbot renew

# Test certificate
openssl s_client -connect grandpro-hmso.ng:443
```

## Performance Optimization

### 1. Enable Compression
```javascript
const compression = require('compression');
app.use(compression());
```

### 2. Redis Caching
```javascript
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});
```

### 3. CDN Setup
```nginx
# Serve static files from CDN
location /static {
    proxy_pass https://cdn.grandpro-hmso.ng;
    proxy_cache_valid 200 1d;
}
```

## Maintenance Mode

### Enable Maintenance Mode
```javascript
// maintenance.js
app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return res.status(503).json({
      message: 'System under maintenance. Please try again later.'
    });
  }
  next();
});
```

## Rollback Procedure

### Database Rollback
```bash
# Restore from backup
gunzip < backup_20240102.sql.gz | psql $DATABASE_URL
```

### Application Rollback
```bash
# Using Git
git checkout <previous-version-tag>
npm install
npm run build
pm2 restart all

# Using Docker
docker-compose down
docker-compose up -d --build
```

## Support

### Logs Location
- Application: `/var/log/grandpro/`
- Nginx: `/var/log/nginx/`
- PostgreSQL: `/var/log/postgresql/`

### Monitoring Endpoints
- Health: `https://api.grandpro-hmso.ng/health`
- Metrics: `https://api.grandpro-hmso.ng/metrics`
- Status: `https://api.grandpro-hmso.ng/status`

---

**Deployment Checklist:**
- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] Database migrated
- [ ] Backup system configured
- [ ] Monitoring enabled
- [ ] Firewall configured
- [ ] Health checks passing
- [ ] Performance optimizations applied

---

*Last Updated: October 2, 2024*
*Version: 1.0.0*
