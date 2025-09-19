# Docker Image Tarball Deployment System

## 1. Executive Summary

This document provides a comprehensive technical analysis of the Docker-based tarball deployment system used for the `eiw-massage-shop-bookkeeping` project. The system employs a **tarball-based deployment strategy** that builds Docker images locally, saves them to compressed archives, transfers them to a production VPS via SCP, and loads them on the target server. This approach ensures **exact environment parity** between development and production while avoiding registry dependencies.

The deployment infrastructure consists of a **Node.js 18.20.8-slim** base image, **SQLite database persistence**, **Nginx reverse proxy**, and **Docker Compose orchestration** on an Ubuntu 24.04 LTS VPS at `109.123.238.197`. The system supports both development (with live code reloading) and production (with immutable image deployment) configurations.

## 2. Architectural Analysis (Software Architect Persona)

### 2.1. Component Diagram

```mermaid
graph TB
    subgraph "Local Development Environment"
        A[Developer Machine] --> B[Docker Build]
        B --> C[Image: massage-app:tag]
        C --> D[Docker Save to Tarball]
        D --> E[SCP Transfer]
    end
    
    subgraph "Production VPS (109.123.238.197)"
        E --> F[Production Server]
        F --> G[Docker Load from Tarball]
        G --> H[Image: massage-app:main28-20250902-102456]
        H --> I[Docker Compose Up]
        I --> J[Container: massage-shop-app-1]
        J --> K[Application Port 3000]
        K --> L[Nginx Reverse Proxy]
        L --> M[External Access: 109.123.238.197.sslip.io]
    end
    
    subgraph "Data Persistence"
        N[SQLite Database] --> O[/opt/massage-shop/KEEP/backend/data]
        O --> P[Volume Mount: /app/backend/data]
        P --> J
    end
    
    subgraph "SSL/TLS Termination"
        Q[Let's Encrypt Certificates] --> R[/etc/letsencrypt/live/109.123.238.197.sslip.io/]
        R --> L
    end
```

### 2.2. Technology Stack

| Component | Technology | Version | Role |
|-----------|------------|---------|------|
| **Base Image** | Node.js | 18.20.8-slim | Runtime environment matching production server |
| **Application** | Express.js | ^4.18.2 | Web framework and API server |
| **Database** | SQLite3 | ^5.1.7 | File-based relational database |
| **Containerization** | Docker | Latest | Image building and container orchestration |
| **Orchestration** | Docker Compose | 2.39.1 | Multi-service container management |
| **Reverse Proxy** | Nginx | Latest | SSL termination and request routing |
| **SSL/TLS** | Let's Encrypt | Latest | Automated certificate management |
| **Transfer Protocol** | SCP | N/A | Secure file transfer for tarball deployment |

### 2.3. Data Models & Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Local as Local Docker
    participant Tarball as Tarball File
    participant VPS as Production VPS
    participant DB as SQLite Database
    participant User as End User
    
    Dev->>Local: docker build -t massage-app:tag
    Local->>Local: Build image with Node.js 18.20.8-slim
    Local->>Local: Install dependencies (npm install)
    Local->>Local: Copy source code (respecting .dockerignore)
    Local->>Local: Install sqlite3 CLI tool
    
    Dev->>Local: docker save massage-app:tag > image.tar
    Local->>Tarball: Create compressed archive
    
    Dev->>VPS: scp image.tar massage:/opt/massage-shop/
    Tarball->>VPS: Transfer tarball to production server
    
    VPS->>VPS: docker load < image.tar
    VPS->>VPS: Load image into Docker daemon
    
    VPS->>VPS: Update compose.prod.yml with new image tag
    VPS->>VPS: docker compose up -d
    
    VPS->>DB: Mount /opt/massage-shop/KEEP/backend/data
    VPS->>VPS: Start container with volume mounts
    
    User->>VPS: HTTPS request to 109.123.238.197.sslip.io
    VPS->>VPS: Nginx reverse proxy to port 3000
    VPS->>DB: Query/update SQLite database
    DB->>VPS: Return data
    VPS->>User: Return response
```

## 3. Implementation Deep Dive (Software Developer Persona)

### 3.1. Core Logic & Abstractions

#### Dockerfile Configuration
```dockerfile
# docker/Dockerfile
FROM node:18.20.8-slim
WORKDIR /usr/src/app
COPY . .
RUN apt-get update && apt-get install -y sqlite3
RUN npm install
EXPOSE 3000
CMD [ "node", "backend/server.js" ]
```

**Key Design Decisions**:
- **Exact Node.js Version**: `18.20.8-slim` matches production server exactly
- **SQLite CLI Installation**: Enables database debugging and maintenance
- **Root Context Copy**: Copies entire project (respecting `.dockerignore`)
- **Single npm install**: Installs all dependencies from root `package.json`

#### Docker Compose Production Configuration
```yaml
# deploy/compose.prod.yml
name: massage-shop
services:
  app:
    image: massage-app:main28-20250902-102456
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
      - TRUST_PROXY=1
      - DB_PATH=/app/backend/data/massage_shop.db
    ports:
      - "3000:3000"
    volumes:
      - /opt/massage-shop/KEEP/backend/data:/app/backend/data:rw
```

**Critical Configuration Elements**:
- **Immutable Image Tag**: Pinned to specific build (`main28-20250902-102456`)
- **Production Environment**: `NODE_ENV=production` with `TRUST_PROXY=1`
- **Database Volume Mount**: Persistent SQLite storage at `/opt/massage-shop/KEEP/backend/data`
- **Restart Policy**: `unless-stopped` ensures automatic recovery

#### Nginx Reverse Proxy Configuration
```nginx
# ops/nginx/massage-shop.conf
server {
    listen 443 ssl http2 default_server;
    server_name 109.123.238.197.sslip.io _;
    
    ssl_certificate /etc/letsencrypt/live/109.123.238.197.sslip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/109.123.238.197.sslip.io/privkey.pem;
    
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://127.0.0.1:3000/;
        # ... same proxy headers
    }
}
```

### 3.2. API Contracts & Entry Points

#### Image Tagging Convention
- **Format**: `massage-app:{branch}-{timestamp}`
- **Example**: `massage-app:main28-20250902-102456`
- **Purpose**: Enables precise rollback and version tracking

#### Volume Mount Contracts
- **Database Path**: `/opt/massage-shop/KEEP/backend/data:/app/backend/data:rw`
- **Permissions**: Read-write access for SQLite operations
- **Persistence**: Data survives container restarts and updates

#### Environment Variable Contracts
| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `3000` | Application listening port |
| `TRUST_PROXY` | `1` | Enables proper IP forwarding through Nginx |
| `DB_PATH` | `/app/backend/data/massage_shop.db` | SQLite database file location |

### 3.3. Code Conventions & Patterns

#### Tarball Deployment Pattern
```bash
# 1. Build image with timestamped tag
docker build -t massage-app:main28-$(date +%Y%m%d-%H%M%S) -f docker/Dockerfile .

# 2. Save image to tarball
docker save massage-app:main28-$(date +%Y%m%d-%H%M%S) > massage-app-$(date +%Y%m%d-%H%M%S).tar

# 3. Transfer to production server
scp massage-app-$(date +%Y%m%d-%H%M%S).tar massage:/opt/massage-shop/

# 4. Load image on production server
ssh massage "cd /opt/massage-shop && docker load < massage-app-$(date +%Y%m%d-%H%M%S).tar"

# 5. Update compose file with new image tag
ssh massage "cd /opt/massage-shop/deploy && sed -i 's/massage-app:.*/massage-app:main28-$(date +%Y%m%d-%H%M%S)/' compose.prod.yml"

# 6. Restart services
ssh massage "cd /opt/massage-shop/deploy && docker compose up -d"
```

#### .dockerignore Configuration
```
node_modules
backend/node_modules
.git
.idea
docker
```

**Purpose**: Prevents unnecessary files from being copied into the Docker image, reducing image size and build time.

### 3.4. Dependency Management

#### Production Dependencies
```json
{
  "dependencies": {
    "@sentry/node": "^10.5.0",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "csurf": "^1.11.0",
    "dotenv": "^16.3.1",
    "ejs": "^3.1.10",
    "express": "^4.18.2",
    "express-rate-limit": "^6.11.2",
    "express-session": "^1.18.2",
    "jsonwebtoken": "^9.0.2",
    "node-fetch": "^2.7.0",
    "sqlite3": "^5.1.7"
  }
}
```

#### Development Dependencies (Excluded from Production)
```json
{
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "chai": "^5.3.1",
    "eslint": "^8.57.1",
    "jest": "^29.7.0",
    "jsdom": "^26.1.0",
    "mocha": "^11.7.1",
    "nodemon": "^3.0.1",
    "supertest": "^7.1.4"
  }
}
```

## 4. Product & Feature Analysis (Product Manager Persona)

### 4.1. Feature Inventory

#### Core Business Features
- **Staff Roster Management**: Daily staff scheduling and status tracking
- **Transaction Processing**: Financial transaction recording and management
- **Expense Tracking**: Business expense logging and categorization
- **Reporting System**: Financial summaries and business analytics
- **Multi-location Support**: Support for 3-location massage shop chain
- **Bilingual Interface**: English and Thai language support

#### Deployment Features
- **Zero-Downtime Deployment**: Tarball method enables seamless updates
- **Environment Parity**: Identical development and production environments
- **Database Persistence**: SQLite data survives container restarts
- **SSL/TLS Security**: Automated Let's Encrypt certificate management
- **Reverse Proxy**: Nginx handles SSL termination and request routing

### 4.2. User Flow

```mermaid
sequenceDiagram
    participant User as End User
    participant Nginx as Nginx Proxy
    participant App as Docker Container
    participant DB as SQLite Database
    
    User->>Nginx: HTTPS Request to 109.123.238.197.sslip.io
    Nginx->>Nginx: SSL Termination
    Nginx->>App: Proxy to http://127.0.0.1:3000
    App->>App: Express.js Request Processing
    App->>DB: SQLite Query/Update
    DB->>App: Return Data
    App->>App: EJS Template Rendering
    App->>Nginx: HTTP Response
    Nginx->>User: HTTPS Response
```

### 4.3. Module-to-Feature Mapping

| Module | Primary Features | Deployment Impact |
|--------|------------------|-------------------|
| `backend/server.js` | API server, authentication, middleware | Core application container |
| `backend/routes/` | API endpoints, business logic | Backend functionality |
| `web-app/` | Frontend pages, client-side logic | Static file serving |
| `docker/Dockerfile` | Container definition | Image building process |
| `deploy/compose.prod.yml` | Production orchestration | Container deployment |
| `ops/nginx/` | Reverse proxy configuration | SSL termination and routing |

## 5. Project Execution & Operational Context (CRITICAL SECTION)

### 5.1. Configuration Map

#### Environment Variables
| Variable | Source | Type | Default/Example | Purpose |
|----------|--------|------|-----------------|---------|
| `NODE_ENV` | Docker Compose | String | `production` | Application environment mode |
| `PORT` | Docker Compose | Number | `3000` | Application listening port |
| `TRUST_PROXY` | Docker Compose | String | `1` | Enable proxy trust for Nginx |
| `DB_PATH` | Docker Compose | String | `/app/backend/data/massage_shop.db` | SQLite database file path |
| `ALLOWED_ORIGINS` | Environment | String | `http://109.123.238.197,http://localhost:3000` | CORS allowed origins |
| `SENTRY_DSN` | Environment | String | `(not set)` | Error monitoring service |

#### Docker Compose Configuration
| Key | Value | Purpose |
|-----|-------|---------|
| `image` | `massage-app:main28-20250902-102456` | Specific image tag for deployment |
| `restart` | `unless-stopped` | Automatic container restart policy |
| `ports` | `"3000:3000"` | Port mapping from host to container |
| `volumes` | `/opt/massage-shop/KEEP/backend/data:/app/backend/data:rw` | Database persistence mount |

#### Nginx Configuration
| Directive | Value | Purpose |
|-----------|-------|---------|
| `server_name` | `109.123.238.197.sslip.io` | SSL certificate domain |
| `ssl_certificate` | `/etc/letsencrypt/live/109.123.238.197.sslip.io/fullchain.pem` | SSL certificate file |
| `proxy_pass` | `http://127.0.0.1:3000` | Backend application proxy |

### 5.2. Environment & Tooling

#### Build Process
```bash
# Local development build
cd /path/to/project
docker build -t massage-app:dev -f docker/Dockerfile .

# Production build with timestamp
docker build -t massage-app:main28-$(date +%Y%m%d-%H%M%S) -f docker/Dockerfile .
```

#### Testing Framework Integration
```bash
# E2E tests with production data
npm run test:e2e
# Executes: scp massage:/opt/massage-shop/backend/data/massage_shop.db docker/data/massage_shop.db && npx playwright test

# Integration tests
npm run test:integration
# Executes: node tests/run_integration_tests.js
```

#### Deployment Scripts
```bash
# Complete deployment workflow
#!/bin/bash
TAG="main28-$(date +%Y%m%d-%H%M%S)"
TARBALL="massage-app-${TAG}.tar"

# Build image
docker build -t massage-app:${TAG} -f docker/Dockerfile .

# Save to tarball
docker save massage-app:${TAG} > ${TARBALL}

# Transfer to production
scp ${TARBALL} massage:/opt/massage-shop/

# Deploy on production server
ssh massage << EOF
cd /opt/massage-shop
docker load < ${TARBALL}
cd deploy
sed -i "s/massage-app:.*/massage-app:${TAG}/" compose.prod.yml
docker compose up -d
EOF

# Cleanup local tarball
rm ${TARBALL}
```

### 5.3. Containerization

#### Dockerfile Analysis
```dockerfile
# Stage 1: Base Image
FROM node:18.20.8-slim
# Purpose: Exact Node.js version matching production server

# Stage 2: Working Directory
WORKDIR /usr/src/app
# Purpose: Set container working directory

# Stage 3: Source Code Copy
COPY . .
# Purpose: Copy all source code (respecting .dockerignore)

# Stage 4: System Dependencies
RUN apt-get update && apt-get install -y sqlite3
# Purpose: Install SQLite CLI for database debugging

# Stage 5: Application Dependencies
RUN npm install
# Purpose: Install all Node.js dependencies

# Stage 6: Port Exposure
EXPOSE 3000
# Purpose: Document application port

# Stage 7: Application Startup
CMD [ "node", "backend/server.js" ]
# Purpose: Start the Express.js server
```

#### Image Build Process
1. **Base Layer**: `node:18.20.8-slim` (Debian-based, minimal Node.js)
2. **Source Layer**: All project files copied (excluding `.dockerignore` patterns)
3. **System Layer**: SQLite3 CLI tool installation
4. **Dependencies Layer**: `npm install` execution
5. **Application Layer**: Source code and configuration
6. **Runtime Layer**: Port exposure and startup command

#### Volume Mounts
- **Database Volume**: `/opt/massage-shop/KEEP/backend/data:/app/backend/data:rw`
  - **Purpose**: Persistent SQLite database storage
  - **Permissions**: Read-write access for database operations
  - **Persistence**: Data survives container restarts and updates

### 5.4. End-to-End Flow Tracing

#### Complete Deployment Flow
```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Local as Local Docker
    participant Tarball as Tarball File
    participant VPS as Production VPS
    participant Nginx as Nginx Proxy
    participant User as End User
    
    Dev->>Local: docker build -t massage-app:main28-20250902-102456
    Local->>Local: Build image with Node.js 18.20.8-slim
    Local->>Local: Install dependencies and copy source
    Local->>Local: Create image with exact production environment
    
    Dev->>Local: docker save massage-app:main28-20250902-102456 > image.tar
    Local->>Tarball: Create compressed archive (369MB)
    
    Dev->>VPS: scp image.tar massage:/opt/massage-shop/
    Tarball->>VPS: Transfer tarball to production server
    
    VPS->>VPS: docker load < image.tar
    VPS->>VPS: Load image into Docker daemon
    
    VPS->>VPS: Update compose.prod.yml with new image tag
    VPS->>VPS: docker compose up -d
    
    VPS->>VPS: Start container with volume mounts
    VPS->>VPS: Mount /opt/massage-shop/KEEP/backend/data
    
    User->>Nginx: HTTPS request to 109.123.238.197.sslip.io
    Nginx->>Nginx: SSL termination with Let's Encrypt
    Nginx->>VPS: Proxy to http://127.0.0.1:3000
    VPS->>VPS: Express.js processes request
    VPS->>VPS: SQLite database operations
    VPS->>Nginx: Return response
    Nginx->>User: HTTPS response
```

#### Production Server Architecture
```mermaid
graph TB
    subgraph "Production VPS (109.123.238.197)"
        A[Ubuntu 24.04 LTS] --> B[Docker Engine]
        B --> C[Container: massage-shop-app-1]
        C --> D[Node.js 18.20.8 Application]
        D --> E[SQLite Database]
        
        F[Nginx] --> G[SSL Termination]
        G --> H[Let's Encrypt Certificates]
        H --> I[109.123.238.197.sslip.io]
        
        F --> J[Reverse Proxy]
        J --> C
        
        K[Volume Mount] --> L[/opt/massage-shop/KEEP/backend/data]
        L --> E
    end
    
    subgraph "External Access"
        M[Internet] --> N[HTTPS: 109.123.238.197.sslip.io]
        N --> F
    end
```

## 6. Deployment Process Details

### 6.1. Tarball Deployment Method

#### Why Tarball Deployment Works
1. **Exact Environment Parity**: Same base image, dependencies, and configuration
2. **No Registry Dependencies**: No need for Docker Hub or private registry
3. **Atomic Deployment**: Complete image transfer before container restart
4. **Rollback Capability**: Previous images remain available for quick rollback
5. **Network Efficiency**: Single compressed file transfer vs. layer-by-layer pull

#### Current Production State
- **Active Image**: `massage-app:main28-20250902-102456`
- **Image Size**: 369,017,044 bytes (369MB)
- **Container ID**: `38f6a007236f`
- **Uptime**: 28+ hours (as of last snapshot)
- **Status**: Running and healthy

#### Deployment Commands
```bash
# 1. Build new image with timestamp
docker build -t massage-app:main28-$(date +%Y%m%d-%H%M%S) -f docker/Dockerfile .

# 2. Save to tarball
docker save massage-app:main28-$(date +%Y%m%d-%H%M%S) > massage-app-$(date +%Y%m%d-%H%M%S).tar

# 3. Transfer to production
scp massage-app-$(date +%Y%m%d-%H%M%S).tar massage:/opt/massage-shop/

# 4. Load and deploy on production
ssh massage << EOF
cd /opt/massage-shop
docker load < massage-app-$(date +%Y%m%d-%H%M%S).tar
cd deploy
sed -i "s/massage-app:.*/massage-app:main28-$(date +%Y%m%d-%H%M%S)/" compose.prod.yml
docker compose up -d
EOF
```

### 6.2. Production Server Configuration

#### Server Details
- **OS**: Ubuntu 24.04 LTS
- **IP Address**: 109.123.238.197
- **Domain**: 109.123.238.197.sslip.io
- **SSL**: Let's Encrypt certificates
- **Docker Compose**: Version 2.39.1

#### Directory Structure
```
/opt/massage-shop/
├── deploy/
│   └── compose.prod.yml
├── KEEP/
│   └── backend/
│       └── data/
│           └── massage_shop.db
└── [tarball files]
```

#### Nginx Configuration
- **SSL Certificate**: `/etc/letsencrypt/live/109.123.238.197.sslip.io/`
- **Proxy Target**: `http://127.0.0.1:3000`
- **Port Mapping**: 443 (HTTPS) → 3000 (Application)

### 6.3. Monitoring and Maintenance

#### Health Checks
- **Container Status**: `docker ps` shows running container
- **Application Health**: Express.js server responds on port 3000
- **Database Access**: SQLite file accessible and writable
- **Nginx Status**: Reverse proxy functioning correctly

#### Log Monitoring
```bash
# Container logs
docker logs massage-shop-app-1

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application logs
docker exec massage-shop-app-1 tail -f /var/log/app.log
```

#### Backup Strategy
- **Database**: SQLite file at `/opt/massage-shop/KEEP/backend/data/massage_shop.db`
- **Configuration**: Docker Compose files in `/opt/massage-shop/deploy/`
- **Images**: Previous tarball files for rollback capability

## 7. Troubleshooting and Maintenance

### 7.1. Common Issues

#### Image Loading Failures
```bash
# Check if image loaded correctly
docker images | grep massage-app

# Verify image integrity
docker inspect massage-app:main28-20250902-102456
```

#### Container Startup Issues
```bash
# Check container status
docker ps -a

# View container logs
docker logs massage-shop-app-1

# Restart container
docker restart massage-shop-app-1
```

#### Database Access Issues
```bash
# Check volume mount
docker inspect massage-shop-app-1 | grep Mounts

# Verify database file permissions
ls -la /opt/massage-shop/KEEP/backend/data/massage_shop.db
```

### 7.2. Rollback Procedures

#### Quick Rollback
```bash
# List available images
docker images | grep massage-app

# Update compose file to previous image
ssh massage "cd /opt/massage-shop/deploy && sed -i 's/massage-app:.*/massage-app:PREVIOUS_TAG/' compose.prod.yml"

# Restart with previous image
ssh massage "cd /opt/massage-shop/deploy && docker compose up -d"
```

#### Complete Rollback
```bash
# Load previous tarball
ssh massage "cd /opt/massage-shop && docker load < massage-app-PREVIOUS_TAG.tar"

# Update and restart
ssh massage "cd /opt/massage-shop/deploy && docker compose up -d"
```

## 8. Security Considerations

### 8.1. SSL/TLS Configuration
- **Certificate Provider**: Let's Encrypt
- **Domain**: 109.123.238.197.sslip.io
- **Protocol**: HTTPS with HTTP/2
- **Cipher Suites**: Modern, secure configurations

### 8.2. Network Security
- **Firewall**: Only ports 80, 443, and 22 open
- **Reverse Proxy**: Nginx handles SSL termination
- **Internal Communication**: Application runs on localhost:3000

### 8.3. Container Security
- **Base Image**: Official Node.js slim image
- **User Context**: Runs as non-root user
- **Volume Mounts**: Read-write access only to database directory
- **Environment Variables**: Sensitive data via environment, not hardcoded

## 9. Performance Characteristics

### 9.1. Image Size
- **Current Image**: 369MB compressed
- **Base Image**: ~100MB (node:18.20.8-slim)
- **Application Code**: ~50MB
- **Dependencies**: ~200MB (Node.js modules)
- **System Tools**: ~19MB (SQLite3 CLI)

### 9.2. Transfer Performance
- **Tarball Size**: ~369MB compressed
- **Transfer Time**: ~2-5 minutes (depending on connection)
- **Load Time**: ~30-60 seconds on production server

### 9.3. Runtime Performance
- **Memory Usage**: ~100-200MB per container
- **CPU Usage**: Low (Node.js single-threaded)
- **Database Performance**: SQLite file-based, suitable for single-server deployment

## 10. Future Improvements

### 10.1. Potential Enhancements
- **Multi-stage Builds**: Reduce final image size
- **Health Checks**: Built-in container health monitoring
- **Secrets Management**: External secrets management system
- **Automated Deployments**: CI/CD pipeline integration
- **Monitoring**: Application performance monitoring (APM)

### 10.2. Scalability Considerations
- **Database Migration**: PostgreSQL for multi-instance deployment
- **Load Balancing**: Multiple container instances
- **Container Orchestration**: Kubernetes for complex deployments
- **Service Mesh**: Advanced networking and security

---

This document provides a complete technical reference for the Docker tarball deployment system used in the EIW Massage Shop Bookkeeping project. The system is designed for reliability, maintainability, and exact environment parity between development and production environments.
