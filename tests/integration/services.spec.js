const request = require('supertest');

const baseURL = `http://localhost:${process.env.PORT || 3000}`;

describe('Services API Endpoint Integration Tests', () => {
  describe('GET /api/services', () => {
    it('should successfully fetch the list of services and return a 200 status', async () => {
      const response = await request(baseURL).get('/api/services');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      const firstService = response.body[0];
      expect(firstService).toHaveProperty('id');
      expect(firstService).toHaveProperty('service_name');
      expect(firstService).toHaveProperty('price');
      expect(firstService).toHaveProperty('duration_minutes');
    });
  });
});
