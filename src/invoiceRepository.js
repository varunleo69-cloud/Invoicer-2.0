const { query } = require('./database');

async function createInvoice(invoice) {
  const client = await require('./database').pool.connect();
  try {
    await client.query('BEGIN');

    const invoiceResult = await client.query(
      `INSERT INTO invoices (invoice_number, item_count, subtotal, tax_amount, total)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, invoice_number, item_count, subtotal, tax_amount, total, created_at`,
      [invoice.invoiceNumber, invoice.itemCount, invoice.subtotal, invoice.taxAmount, invoice.total]
    );

    const savedInvoice = invoiceResult.rows[0];
    const savedItems = [];

    for (const item of invoice.items) {
      const result = await client.query(
        `INSERT INTO invoice_items
          (invoice_id, name, price, quantity, tax_rate, item_subtotal, item_tax, item_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name, price, quantity, tax_rate, item_subtotal, item_tax, item_total`,
        [
          savedInvoice.id,
          item.name,
          item.price,
          item.quantity,
          item.taxRateValue,
          item.itemSubtotal,
          item.itemTax,
          item.itemTotal
        ]
      );
      savedItems.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return mapInvoice(savedInvoice, savedItems);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listInvoices() {
  const result = await query(
    `SELECT id, invoice_number, item_count, subtotal, tax_amount, total, created_at
     FROM invoices ORDER BY created_at DESC, id DESC`
  );
  return result.rows.map(mapInvoiceSummary);
}

async function getInvoice(id) {
  const invoiceResult = await query(
    `SELECT id, invoice_number, item_count, subtotal, tax_amount, total, created_at
     FROM invoices WHERE id = $1`,
    [id]
  );
  if (invoiceResult.rowCount === 0) return null;

  const itemResult = await query(
    `SELECT id, name, price, quantity, tax_rate, item_subtotal, item_tax, item_total
     FROM invoice_items WHERE invoice_id = $1 ORDER BY id`,
    [id]
  );
  return mapInvoice(invoiceResult.rows[0], itemResult.rows);
}

async function deleteInvoice(id) {
  const result = await query('DELETE FROM invoices WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

function money(value) {
  return Number(value);
}

function mapInvoiceSummary(row) {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    itemCount: row.item_count,
    subtotal: money(row.subtotal),
    taxAmount: money(row.tax_amount),
    total: money(row.total),
    createdAt: row.created_at
  };
}

function mapInvoice(row, items) {
  return {
    ...mapInvoiceSummary(row),
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      price: money(item.price),
      quantity: item.quantity,
      taxRate: `${Math.round(Number(item.tax_rate) * 100)}%`,
      taxRateValue: Number(item.tax_rate),
      itemSubtotal: money(item.item_subtotal),
      itemTax: money(item.item_tax),
      itemTotal: money(item.item_total)
    }))
  };
}

module.exports = { createInvoice, listInvoices, getInvoice, deleteInvoice };
