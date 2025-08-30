# Docker Execution Model - EIW Massage Shop Application

**Generated:** 2024-12-19  
**Trace ID:** checkForEdit-bug-fix  
**Environment:** Local Development

## Runtime Services

### 1. App Service (`app`)
**Image:** Built from `docker/Dockerfile`  
**Base:** `node:18.20.8-slim`  
**Port:** `3000:3000` (host:container)  
**Working Directory:** `/usr/src/app`  
**Entry Point:** `node backend/server.js`  
**Dependencies:** `db` service

**Key Commands:**
```bash
# Build and start
docker-compose up --build

# Start existing containers
docker-compose up

# Stop services
docker-compose down

# View logs
docker-compose logs -f app
```

### 2. Database Service (`db`)
**Image:** `alpine`  
**Purpose:** Data volume container for SQLite persistence  
**Command:** `true` (exits immediately, maintains volume ownership)  
**Dependencies:** None

## Volume Mounts

### Persistent Data
- **Source:** `./docker/data` (host)
- **Target:** `/usr/src/app/data` (container)
- **Purpose:** SQLite database file persistence
- **Critical Files:** `massage_shop.db`

### Live Code Reloading
- **Backend:** `../backend` → `/usr/src/app/backend`
- **Frontend:** `../web-app` → `/usr/src/app/web-app`
- **Node Modules Protection:** `/usr/src/app/backend/node_modules` (anonymous volume)

## Environment Variables

### Container Environment
```bash
DATABASE_PATH=/usr/src/app/data/massage_shop.db
NODE_ENV=${NODE_ENV:-development}
```

### Host Environment Override
```bash
# Set in .env file or export
export NODE_ENV=production
export NODE_ENV=testing
```

## Network Configuration

### Default Network
- **Name:** `eiw-massage-shop-bookkeeping_default`
- **Driver:** `bridge`
- **IP Range:** `172.20.0.0/16`
- **Gateway:** `172.20.0.1`

### Service Communication
- **App → Database:** Direct volume access (no network required)
- **Host → App:** `localhost:3000`
- **Container → Host:** Host networking available

## Build Process

### Dockerfile Steps
1. **Base Image:** `node:18.20.8-slim`
2. **Working Directory:** `/usr/src/app`
3. **Source Copy:** All project files (`.dockerignore` excludes `node_modules`)
4. **Dependencies:** `apt-get update && apt-get install -y sqlite3`
5. **Node Dependencies:** `npm install` (from root package.json)
6. **Port Exposure:** `EXPOSE 3000`
7. **Command:** `node backend/server.js`

### Build Context
- **Context:** Project root directory (`..`)
- **Dockerfile:** `docker/Dockerfile`
- **Ignore Patterns:** `node_modules`, `.git`, etc.

## Runtime Behavior

### Startup Sequence
1. **Volume Creation:** `db` service creates data volume
2. **Image Build:** `app` service builds from Dockerfile
3. **Container Start:** `app` container starts with mounted volumes
4. **Application Launch:** Node.js server starts on port 3000
5. **Database Access:** SQLite file accessed via mounted volume

### Live Development Features
- **Code Changes:** Immediately reflected due to volume mounts
- **Database Persistence:** Survives container restarts
- **Dependency Isolation:** Container uses Linux-compiled modules
- **Port Forwarding:** Direct access to app via localhost:3000

## Troubleshooting

### Common Issues
1. **Port Conflicts:** Ensure port 3000 is available on host
2. **Permission Issues:** Check volume mount permissions
3. **Node Modules Conflicts:** Verify anonymous volume protection
4. **Database Locking:** Ensure single container access

### Debug Commands
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs app

# Access container shell
docker-compose exec app sh

# Check volume mounts
docker volume ls

# Inspect network
docker network ls
```

## Production Considerations

### Security
- **User Context:** Container runs as root (development only)
- **Port Exposure:** Only necessary ports exposed
- **Volume Isolation:** Database file isolated from host

### Performance
- **Volume I/O:** Direct file system access for database
- **Code Mounting:** No build step for development changes
- **Memory:** Node.js heap size managed by container limits

### Scalability
- **Single Instance:** Designed for development, not production scaling
- **Database:** SQLite single-file database
- **Stateless:** Application state not persisted in container
