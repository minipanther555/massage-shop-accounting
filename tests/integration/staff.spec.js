const request = require('supertest');

// We no longer import the app directly. We get the URL from an environment variable.
const baseURL = `http://localhost:${process.env.PORT || 3000}`;

describe('Staff API Endpoint Integration Tests', () => {
  describe('GET /api/staff/roster', () => {
    it('should successfully fetch the active staff roster and return a 200 status', async () => {
      // The test now makes a real HTTP request to the running server process
      const response = await request(baseURL).get('/api/staff/roster');

      // Assertions remain the same
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      
      const firstStaffMember = response.body[0];
      expect(firstStaffMember).toHaveProperty('id');
      // Corrected property name from 'name' to 'masseuse_name' to match the API response
      expect(firstStaffMember).toHaveProperty('masseuse_name');
      expect(firstStaffMember).toHaveProperty('status');
    });
  });
});
