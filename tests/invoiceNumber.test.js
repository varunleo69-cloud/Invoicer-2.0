const crypto = require('crypto');
const { createInvoiceNumber } = require('../src/invoiceNumber');

describe('createInvoiceNumber', () => {
  afterEach(() => jest.restoreAllMocks());

  test('uses the INV-<timestamp>-<6 hex> format', () => {
    const number = createInvoiceNumber(new Date('2026-09-30T12:34:56.789Z'));
    expect(number).toMatch(/^INV-20260930123456-[0-9A-F]{6}$/);
  });

  test('takes its random part from crypto (3 bytes = 16.7 million values)', () => {
    jest.spyOn(crypto, 'randomBytes').mockReturnValueOnce(Buffer.from([0xab, 0xcd, 0xef]));
    const number = createInvoiceNumber(new Date('2026-09-30T12:34:56Z'));
    expect(crypto.randomBytes).toHaveBeenCalledWith(3);
    expect(number).toBe('INV-20260930123456-ABCDEF');
  });

  test('two calls in the same second give different numbers', () => {
    const now = new Date('2026-09-30T12:34:56Z');
    // Old format: only 1000 possible suffixes, so collisions were likely under load.
    // New format: 16.7 million, so a repeat here would be a one-in-millions fluke.
    expect(createInvoiceNumber(now)).not.toBe(createInvoiceNumber(now));
  });
});
