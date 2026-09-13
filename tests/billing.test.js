const request = require('supertest');

jest.mock('../src/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 }),
  pool: { connect: jest.fn() },
  closeDatabase: jest.fn()
}));

const app = require('../src/server');
const { calculateInvoice } = require('../src/billing');

describe('Billing Logic & API Tests', () => {
  test('calculates per-item GST rates and grand total', () => {
    const items = [
      { name: 'Book (Exempt)', price: 500, quantity: 2, taxRate: 0.00 },
      { name: 'Branded Apparel', price: 2000, quantity: 1, taxRate: 0.12 },
      { name: 'Monitor', price: 10000, quantity: 1, taxRate: 0.18 }
    ];
    const result = calculateInvoice(items);
    expect(result.subtotal).toBe(13000);
    expect(result.taxAmount).toBe(2040);
    expect(result.total).toBe(15040);
  });

  test('rejects an empty invoice', () => {
    expect(() => calculateInvoice([])).toThrow('Invoice must contain at least one item.');
  });

  test('rejects invalid item price or quantity', () => {
    expect(() => calculateInvoice([{ name: 'Bad item', price: -1, quantity: 1, taxRate: 0.18 }]))
      .toThrow('Invalid item price or quantity.');
  });

  test('GET /health returns API and database health', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.database).toBe('UP');
  });

  test('POST /api/v1/invoices returns 400 on empty items', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .send({ items: [] });
    expect(res.statusCode).toBe(400);
  });

  test('GET /api/v1/invoices returns an empty list when repository has no invoices', async () => {
    const db = require('../src/database');
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app).get('/api/v1/invoices');
    expect(res.statusCode).toBe(200);
    expect(res.body.invoices).toEqual([]);
  });
});
