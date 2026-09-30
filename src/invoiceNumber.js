const crypto = require('crypto');

// Format: INV-YYYYMMDDHHMMSS-XXXXXX
// The 6 hex characters come from crypto.randomBytes (~16.7 million values per
// second), so several backend replicas can create invoices at the same moment
// without hitting the UNIQUE constraint on invoices.invoice_number.
function createInvoiceNumber(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${stamp}-${suffix}`;
}

module.exports = { createInvoiceNumber };
