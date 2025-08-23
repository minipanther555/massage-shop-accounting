const { addCSRFToken } = require('./backend/middleware/csrf-protection');

// Mock request and response objects
const mockReq = {
  method: 'GET',
  path: '/transaction',
  url: '/transaction',
  headers: {
    'user-agent': 'test-agent',
    referer: 'https://test.com'
  },
  cookies: {
    sessionId: 'test-session-123'
  }
};

const mockRes = {
  locals: {},
  setHeader: (name, value) => {
    console.log(`✅ Header set: ${name} = ${value}`);
  }
};

const mockNext = () => {
  console.log('✅ Next called');
};

console.log('🧪 Testing CSRF middleware directly...');
console.log('📋 Request:', {
  method: mockReq.method,
  path: mockReq.path,
  sessionId: mockReq.cookies.sessionId
});

try {
  addCSRFToken(mockReq, mockRes, mockNext);
  console.log('✅ Middleware completed successfully');
  console.log('📋 res.locals.csrfToken:', mockRes.locals.csrfToken);
} catch (error) {
  console.error('❌ Middleware failed:', error);
}
