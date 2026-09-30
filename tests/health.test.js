jest.mock('../src/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 }),
  pool: { connect: jest.fn() },
  closeDatabase: jest.fn()
}));

const os = require('os');
const request = require('supertest');
const app = require('../src/server');
const db = require('../src/database');

describe('Load balancer support', () => {
  test('every response names the replica that served it', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-instance']).toBe(os.hostname());
    expect(res.body.server).toBe(os.hostname());
  });

  test('/health returns 503 when the database is unreachable', async () => {
    db.query.mockRejectedValueOnce(new Error('connection refused'));
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(503);
    expect(res.body.database).toBe('DOWN');
  });

  test('no CORS headers are sent unless FRONTEND_ORIGIN is configured', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
