const os = require('os');
const express = require('express');
const cors = require('cors');
const { calculateInvoice } = require('./billing');
const { query } = require('./database');
const invoiceRepository = require('./invoiceRepository');
const { createInvoiceNumber } = require('./invoiceNumber');

const app = express();

// Browsers reach the API through the nginx load balancer on the same origin, so
// CORS is only needed when FRONTEND_ORIGIN is set. Unset = no CORS headers
// (the old default allowed every origin).
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || false
}));

// Identify which replica answered. Handy to prove that nginx is balancing:
//   for i in $(seq 10); do curl -si localhost:8080/health | grep -i x-instance; done
const INSTANCE_ID = os.hostname();
app.use((req, res, next) => {
  res.set('X-Instance', INSTANCE_ID);
  next();
});
app.use(express.json({ limit: '100kb' }));

app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({
        status: 'UP',
        database: 'UP',
        server: INSTANCE_ID,
        timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
        status: 'DOWN',
        database: 'DOWN',
        server: INSTANCE_ID,
        timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/invoices', async (req, res) => {
  try {
    const invoice = calculateInvoice(req.body.items, req.body.taxRate);
    const invoiceNumber = createInvoiceNumber();
    const savedInvoice = await invoiceRepository.createInvoice({ ...invoice, invoiceNumber });
    res.status(201).json({ success: true, invoice: savedInvoice });
  } catch (error) {
    console.error('Create invoice failed:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/invoices', async (req, res) => {
  try {
    const invoices = await invoiceRepository.listInvoices();
    res.json({ success: true, invoices });
  } catch (error) {
    console.error('List invoices failed:', error.message);
    res.status(500).json({ success: false, error: 'Unable to retrieve invoices.' });
  }
});

app.get('/api/v1/invoices/:id', async (req, res) => {
  try {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid invoice id.' });

    const invoice = await invoiceRepository.getInvoice(id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found.' });

    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Get invoice failed:', error.message);
    res.status(500).json({ success: false, error: 'Unable to retrieve invoice.' });
  }
});

app.delete('/api/v1/invoices/:id', async (req, res) => {
  try {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid invoice id.' });

    const deleted = await invoiceRepository.deleteInvoice(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Invoice not found.' });

    res.status(204).send();
  } catch (error) {
    console.error('Delete invoice failed:', error.message);
    res.status(500).json({ success: false, error: 'Unable to delete invoice.' });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

function parsePositiveInteger(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`🚀 Invoicer API listening on port ${PORT}`));
}

module.exports = app;
