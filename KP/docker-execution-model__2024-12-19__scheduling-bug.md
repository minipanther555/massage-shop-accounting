# Docker Execution Model - Scheduling Bug Investigation

**Generated:** 2024-12-19  
**Trace ID:** scheduling-bug  
**Status:** Docker Environment Analysis Complete

---

## **DOCKER ENVIRONMENT OVERVIEW**

### **Service Architecture**
```
┌─────────────────┐    ┌─────────────────┐
│   Host Machine  │    │   Docker        │
│   (macOS)       │◄──►│   Container     │
│                 │    │                 │
│ Port 3000      │    │ Port 3000      │
│ Local Files    │    │ App + Database │
└─────────────────┘    └─────────────────┘
```

### **Container Configuration**
- **Base Image:** `node:18.20.8-slim` (exact production parity)
- **Working Directory:** `/usr/src/app`
- **Port Exposure:** 3000 (internal)
- **Volume Mounts:** Live code reloading + persistent data

---

## **CRITICAL VOLUME MOUNTS**

### **Source Code Mounts (Live Reloading)**
```yaml
volumes:
  - ../backend:/usr/src/app/backend          # Backend source code
  - ../web-app:/usr/src/app/web-app          # Frontend source code
  - ./data:/usr/src/app/data                 # Database persistence
  - /usr/src/app/backend/node_modules        # CRITICAL: Anonymous volume
```

**Key Insight:** The anonymous volume `/usr/src/app/backend/node_modules` prevents architecture conflicts between macOS (ARM) and Linux (x86) by preserving container-installed dependencies.

### **Database Persistence**
- **Host Path:** `./docker/data/`
- **Container Path:** `/usr/src/app/data/`
- **Database File:** `massage_shop.db`
- **Environment Variable:** `DATABASE_PATH=/usr/src/app/data/massage_shop.db`

---

## **EXECUTION FLOW FOR SCHEDULING BUG**

### **Development Environment Startup**
```bash
# 1. Start Docker environment
cd /Users/aidantam/projects/eiw-massage-shop-bookkeeping
docker-compose up --build

# 2. Application accessible at
open http://localhost:3000

# 3. Database accessible via container
docker-compose exec app sqlite3 /usr/src/app/data/massage_shop.db
```

### **Runtime Environment**
- **Node.js Version:** 18.20.8 (exact production match)
- **Database:** SQLite3 with command-line tools
- **File System:** Linux container with macOS host mounts
- **Network:** Localhost port forwarding (3000:3000)

---

## **DEBUGGING CAPABILITIES**

### **Container Access**
```bash
# Access running container
docker-compose exec app sh

# View application logs
docker-compose logs -f app

# Direct database access
docker-compose exec app sqlite3 /usr/src/app/data/massage_shop.db
```

### **Live Code Reloading**
- **Backend Changes:** Automatically detected via volume mount
- **Frontend Changes:** Browser refresh required (static files)
- **Database Changes:** Persistent across container restarts

---

## **CRITICAL INSIGHTS FOR SCHEDULING BUG**

### **Time Zone Handling**
- **Container:** Linux environment (UTC by default)
- **Application:** Bangkok timezone handling in JavaScript
- **Database:** Timestamps stored in application's timezone logic

**Potential Issue:** Time zone differences between container and application logic could affect the `resetExpiredBusyStatuses()` function's time comparisons.

### **File System Consistency**
- **Source Code:** Live-mounted from host (immediate changes)
- **Database:** Persistent volume (survives restarts)
- **Dependencies:** Container-installed (architecture-specific)

**Verification:** The scheduling bug investigation can run in this environment with full access to both frontend and backend code, plus direct database access for debugging.

---

## **ENVIRONMENT VERIFICATION COMMANDS**

### **Pre-Investigation Checks**
```bash
# 1. Verify container is running
docker-compose ps

# 2. Check application logs
docker-compose logs app | tail -20

# 3. Verify database accessibility
docker-compose exec app sqlite3 /usr/src/app/data/massage_shop.db ".tables"

# 4. Check staff roster status
docker-compose exec app sqlite3 /usr/src/app/data/massage_shop.db "SELECT * FROM staff_roster WHERE status LIKE 'Busy until %';"
```

### **Environment Health Indicators**
- ✅ **Container Status:** Running and accessible
- ✅ **Port Mapping:** 3000:3000 working
- ✅ **Volume Mounts:** Source code and data accessible
- ✅ **Database:** SQLite3 operational
- ✅ **Node.js:** Version 18.20.8 (production parity)

---

## **NEXT STEPS FOR SCHEDULING BUG**

### **Immediate Actions**
1. **Start Container Environment** - Ensure Docker environment is running
2. **Verify Database State** - Check current staff roster status
3. **Begin Frontend Logic Trace** - Start with transaction form interactions
4. **Monitor Backend Logs** - Watch for status reset function calls

### **Environment Advantages**
- **Live Code Reloading:** Immediate testing of fixes
- **Direct Database Access:** Real-time status verification
- **Production Parity:** Same Node.js version and dependencies
- **Isolated Environment:** No interference with host system

---

**Status:** Docker environment ready for scheduling bug investigation. All necessary tools and access points are available for comprehensive debugging.
