const express = require('express');
const cors = require('cors');
const { calculateInvoice } = require('./billing');
const { query } = require('./database');
const invoiceRepository = require('./invoiceRepository');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || true
}));
app.use(express.json({ limit: '100kb' }));

app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ status: 'UP', database: 'UP', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'DOWN', database: 'DOWN', timestamp: new Date().toISOString() });
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

function createInvoiceNumber() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `INV-${stamp}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function parsePositiveInteger(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`🚀 Invoicer API listening on port ${PORT}`));
}

module.exports = app;
