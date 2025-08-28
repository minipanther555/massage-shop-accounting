# Backend API Documentation

**Date**: 2024-08-25  
**Status**: CURRENT - Backend Development Guide  
**Purpose**: Backend-specific documentation including authentication and API endpoints  

## **🔐 AUTHENTICATION SYSTEM**

### **Current Method**: Cookie-based sessions with HTTP-only cookies

### **User Credentials**
- **Manager**: `manager/manager456`
- **Reception**: `reception/reception123`

### **Authentication Endpoints**
- **Login**: `POST /api/auth/login`
- **Session Check**: `GET /api/auth/session`
- **Logout**: `POST /api/auth/logout`

### **Testing Authentication**
```bash
# Method 1: See cookie in response headers
curl -v -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manager","password":"manager456"}'

# Method 2: Save cookie to file and use it
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manager","password":"manager456"}'
curl -b cookies.txt -X GET "http://localhost:3000/api/transactions/recent?limit=100&date=2024-08-25"

# Method 3: Automatic cookie handling (normal operation)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manager","password":"manager456"}'
curl -X GET "http://localhost:3000/api/transactions/recent?limit=100&date=2024-08-25"
```

**Complete Authentication Documentation**: See `00-project-docs/authentication-system.md`

---

## **🚫 DEPRECATED METHODS (DO NOT USE)**

### **Old Bearer Token System**
```bash
# ❌ THIS NO LONGER WORKS
curl -H "Authorization: Bearer {sessionId}" http://localhost:3000/api/...
```

### **Old sessionId in Response Body**
```json
// ❌ THIS NO LONGER HAPPENS
{
  "success": true,
  "sessionId": "abc123",  // This field doesn't exist anymore
  "user": {...}
}
```

---

## **🏗️ PROJECT STRUCTURE**

```
backend/
├── config/           # Environment configuration
├── middleware/       # Express middleware (auth, validation, etc.)
├── models/          # Database models and connections
├── routes/          # API route definitions
├── scripts/         # Deployment and maintenance scripts
├── utils/           # Utility functions and logging
├── server.js        # Main server entry point
└── package.json     # Dependencies and scripts
```

---

## **🔌 API ENDPOINTS**

### **Authentication Routes** (`/api/auth`)
- `POST /login` - User authentication
- `GET /session` - Check current session
- `POST /logout` - End user session

### **Main Routes** (`/api/main`)
- `GET /summary` - Daily summary page
- `GET /transaction` - Transaction page
- `GET /staff` - Staff management page

### **Transaction Routes** (`/api/transactions`)
- `GET /` - All transactions
- `GET /recent` - Recent transactions (with date filtering)
- `POST /` - Create new transaction
- `PUT /:id` - Update transaction
- `DELETE /:id` - Delete transaction

### **Staff Routes** (`/api/staff`)
- `GET /` - Staff roster
- `POST /` - Add staff to roster
- `PUT /:id` - Update staff status
- `DELETE /:id` - Remove staff from roster

### **Admin Routes** (`/api/admin`)
- `GET /staff` - Staff administration
- `POST /staff` - Add new staff member
- `PUT /staff/:id` - Update staff member
- `POST /staff/:id/payments` - Record staff payment

### **Reports Routes** (`/api/reports`)
- `GET /summary/today` - Today's financial summary
- `GET /summary/week` - Weekly financial summary

---

## **🔧 DEVELOPMENT SETUP**

### **Prerequisites**
- Node.js (v16 or higher)
- npm or yarn
- SQLite3

### **Installation**
```bash
cd backend
npm install
```

### **Environment Configuration**
Create `.env` file in backend directory:
```env
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-secret-key
```

### **Running Development Server**
```bash
npm run dev
# or
node server.js
```

### **Database Setup**
The system uses SQLite with automatic schema creation. Database file: `../data/massage_shop.db`

---

## **🧪 TESTING**

### **Running Tests**
```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/integration/test_authentication_flow.js

# Run with verbose output
npm test -- --verbose
```

### **Test Structure**
- **Unit Tests**: `tests/unit/` - Individual function testing
- **Integration Tests**: `tests/integration/` - API endpoint testing
- **E2E Tests**: `tests/e2e/` - Full user flow testing

---

## **🔒 SECURITY FEATURES**

### **Authentication & Authorization**
- Cookie-based sessions with HTTP-only cookies
- Role-based access control (reception, manager)
- CSRF protection with token validation
- Rate limiting on authentication endpoints

### **Input Validation**
- Request size limits
- Input sanitization
- SQL injection protection
- XSS protection

### **Security Headers**
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options

---

## **📊 LOGGING & MONITORING**

### **Log Files**
- `backend.log` - General application logs
- `logs/` - Detailed logging by component

### **Log Levels**
- `ERROR` - Critical errors requiring immediate attention
- `WARN` - Warning conditions
- `INFO` - General information
- `DEBUG` - Detailed debugging information

---

## **🚀 DEPLOYMENT**

### **Production Deployment**
```bash
# Build and start production server
npm run build
npm start

# Using PM2
pm2 start ecosystem.config.js
```

### **Docker Deployment**
```bash
# Build and run with Docker Compose
docker-compose up -d

# Build custom image
docker build -t massage-shop-backend .
docker run -p 3000:3000 massage-shop-backend
```

---

## **📚 RELATED DOCUMENTATION**

- **Authentication**: `00-project-docs/authentication-system.md`
- **Project Overview**: `00-project-docs/masterplan.md`
- **Current Status**: `00-project-docs/steps/current-phase.md`
- **Frontend**: `../web-app/README.md`

---

## **🔄 CHANGELOG**

- **2024-08-25**: Created comprehensive backend documentation
- **2024-08-25**: Documented current authentication system
- **2024-08-25**: Added API endpoint reference
- **2024-08-25**: Included development setup instructions

---

**Status**: ✅ COMPLETE - Backend development guide
