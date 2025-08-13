# Critical Issue #1: Backend API Connectivity - DETAILED SUBSTEPS

## Issue Overview
**Priority**: 🔴 CRITICAL - IMMEDIATE ATTENTION REQUIRED
**Status**: ✅ RESOLVED - All business operations restored
**Date Reported**: August 13, 2025
**Date Resolved**: August 13, 2025
**Impact**: Complete system failure - users cannot log in or access any functionality
**Error Message**: "Cannot connect to server. Please ensure the backend is running on port 3000"

## Current Situation Analysis
- ✅ Frontend pages loading correctly
- ✅ Health endpoint responding at `/health`
- ✅ Nginx reverse proxy configured and working
- ❌ Backend API endpoints failing (login attempts fail)
- ❌ PM2 process may not be running or responding correctly

## Root Cause Hypothesis
The backend server process (PM2) is either:
1. Not running at all
2. Running but not responding to API requests
3. Running but with configuration errors
4. Running but blocked by firewall/network issues

## Detailed Substeps

### Step 1: SSH to Production Server and Check PM2 Status
**Objective**: Verify if the backend process is running
**Commands**:
```bash
ssh massage
cd /opt/massage-shop
pm2 status
```

**Expected Result**: Should show `massage-shop` process as "online"
**If Process Missing**: Process needs to be started
**If Process Error**: Process needs to be restarted

**Success Criteria**: PM2 shows massage-shop process as "online"

### Step 2: Check PM2 Process Logs for Errors
**Objective**: Identify any errors preventing the process from working
**Commands**:
```bash
pm2 logs massage-shop --lines 100
pm2 logs massage-shop --err --lines 50
```

**What to Look For**:
- JavaScript errors or exceptions
- Database connection failures
- Port binding issues
- Environment variable problems
- Middleware errors

**Success Criteria**: No critical errors in logs, process appears healthy

### Step 3: Verify Process is Listening on Port 3000
**Objective**: Confirm the Node.js process is actually listening on port 3000
**Commands**:
```bash
netstat -tlnp | grep :3000
ss -tlnp | grep :3000
lsof -i :3000
```

**Expected Result**: Should show Node.js process listening on port 3000
**If Port Not Listening**: Process may have crashed or failed to start
**If Port in Use by Wrong Process**: Port conflict needs resolution

**Success Criteria**: Port 3000 shows massage-shop process listening

### Step 4: Test Backend Connectivity from Server
**Objective**: Test if backend is responding locally on the server
**Commands**:
```bash
curl -s http://localhost:3000/health
curl -s http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'
```

**Expected Result**: 
- Health endpoint should return JSON response
- Login endpoint should return error (but not connection refused)

**If Local Fails**: Backend process has internal issues
**If Local Works but External Fails**: Nginx configuration issue

**Success Criteria**: Backend responds to local requests

### Step 5: Check Nginx Configuration for API Routing
**Objective**: Verify Nginx is properly routing API calls to backend
**Commands**:
```bash
sudo nginx -t
sudo cat /etc/nginx/sites-available/massage-shop
```

**What to Look For**:
- Proper location block for `/api/` routes
- Correct proxy_pass to localhost:3000
- No syntax errors in configuration

**Success Criteria**: Nginx configuration is valid and properly routes API calls

### Step 6: Test External API Connectivity
**Objective**: Verify API endpoints are accessible from external network
**Commands**:
```bash
# From local machine
curl -s http://109.123.238.197/health
curl -s http://109.123.238.197/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'
```

**Expected Result**: 
- Health endpoint should work
- API endpoint should return response (even if error)

**If External Fails**: Network/firewall issue or Nginx routing problem

**Success Criteria**: External API calls reach the backend

### Step 7: Restart PM2 Process if Needed
**Objective**: Restart the backend process to resolve any hanging or error states
**Commands**:
```bash
pm2 restart massage-shop --update-env
pm2 status
pm2 logs massage-shop --lines 20
```

**What to Look For**:
- Process starts successfully
- No error messages in startup logs
- Process shows as "online"

**Success Criteria**: Process restarts without errors and shows as "online"

### Step 8: Verify Environment Variables and Configuration
**Objective**: Ensure all required environment variables are loaded
**Commands**:
```bash
cat .env
pm2 env massage-shop
```

**What to Look For**:
- NODE_ENV set correctly
- PORT set to 3000
- Database path correct
- Session secret configured

**Success Criteria**: All required environment variables are properly set

### Step 9: Test Complete Login Flow
**Objective**: Verify the entire authentication flow works end-to-end
**Commands**:
```bash
# Test with existing hardcoded user
curl -s http://109.123.238.197/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"reception","password":"reception123"}'
```

**Expected Result**: Should return successful login response with session data
**If Still Fails**: Deeper investigation needed into authentication system

**Success Criteria**: Login endpoint returns successful response

### Step 10: Monitor Process Stability
**Objective**: Ensure the process remains stable after fixes
**Commands**:
```bash
pm2 monit
# Watch for any crashes or errors
```

**What to Look For**:
- Process remains online
- No memory leaks
- No crashes
- Stable performance

**Success Criteria**: Process remains stable for at least 10 minutes

## Success Criteria Summary

### Technical Success
- ✅ PM2 process shows as "online"
- ✅ Process listening on port 3000
- ✅ No critical errors in logs
- ✅ Backend responds to local requests
- ✅ External API calls reach backend
- ✅ Login endpoint functional
- ✅ Process remains stable

### Business Success
- ✅ Users can access login page
- ✅ Login button works without errors
- ✅ System ready for authentication implementation
- ✅ Basic connectivity restored

## Rollback Plan

### If Process Restart Fails
1. Check previous PM2 process logs
2. Verify environment configuration
3. Check for file permission issues
4. Verify Node.js installation

### If Configuration Changes Break System
1. Restore previous Nginx configuration
2. Restore previous PM2 configuration
3. Check for syntax errors
4. Verify all paths are correct

## Next Steps After Resolution

### Immediate Next
1. **Document the fix** in known-bugs directory
2. **Move to Critical Issue #2**: Multi-Location Authentication Implementation
3. **Test all API endpoints** to ensure full connectivity

### Prevention Measures
1. **Set up PM2 monitoring** with alerts
2. **Implement health check monitoring**
3. **Create automated restart scripts**
4. **Document troubleshooting procedures**

---

*Last Updated: August 13, 2025*
*Status: RESOLVED - All API endpoints functional and stable*
*Maintainer: AI Assistant*
*Priority: CRITICAL - RESOLVED*
