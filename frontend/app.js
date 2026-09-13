const API_BASE = (window.INVOICER_CONFIG && window.INVOICER_CONFIG.API_BASE) || 'http://localhost:3000';

const itemsContainer = document.getElementById('items-container');
const addItemBtn = document.getElementById('add-item-btn');
const form = document.getElementById('invoice-form');
const resultCard = document.getElementById('result-card');
const statusBadge = document.getElementById('system-status');
const breakdownBody = document.getElementById('invoice-breakdown-body');
const savedInvoices = document.getElementById('saved-invoices');
const refreshInvoicesBtn = document.getElementById('refresh-invoices-btn');

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      statusBadge.textContent = 'API Online';
      statusBadge.className = 'status-badge status-online';
    } else {
      throw new Error('API unavailable');
    }
  } catch {
    statusBadge.textContent = 'API Offline';
    statusBadge.className = 'status-badge';
    statusBadge.style.color = '#ef4444';
  }
}
checkHealth();
loadInvoices();
refreshInvoicesBtn.addEventListener('click', loadInvoices);

function createItemRow(desc = '', price = '', qty = '', taxRate = '0.18') {
  const row = document.createElement('div');
  row.className = 'form-row';
  row.innerHTML = `
    <input type="text" class="col-desc item-name" placeholder="Item Description" value="${escapeHtml(desc)}" required />
    <input type="number" class="col-price item-price" placeholder="Price" min="0" step="any" value="${price}" required />
    <input type="number" class="col-qty item-qty" placeholder="Qty" min="1" step="1" value="${qty}" required />
    <select class="col-gst item-tax">
      <option value="0.00" ${taxRate === '0.00' ? 'selected' : ''}>0% (Exempt)</option>
      <option value="0.05" ${taxRate === '0.05' ? 'selected' : ''}>5% GST</option>
      <option value="0.12" ${taxRate === '0.12' ? 'selected' : ''}>12% GST</option>
      <option value="0.18" ${taxRate === '0.18' ? 'selected' : ''}>18% GST</option>
      <option value="0.28" ${taxRate === '0.28' ? 'selected' : ''}>28% GST</option>
    </select>
    <button type="button" class="btn-danger remove-btn col-action" title="Delete Row">✕</button>
  `;

  row.querySelector('.remove-btn').addEventListener('click', () => {
    if (itemsContainer.children.length > 1) {
      row.remove();
    } else {
      row.querySelector('.item-name').value = '';
      row.querySelector('.item-price').value = '';
      row.querySelector('.item-qty').value = '';
      row.querySelector('.item-tax').value = '0.18';
    }
  });

  itemsContainer.appendChild(row);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value) {
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

createItemRow();
addItemBtn.addEventListener('click', () => createItemRow());

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const rows = document.querySelectorAll('#items-container .form-row');
  const items = [];

  rows.forEach((row) => {
    const name = row.querySelector('.item-name').value.trim();
    const price = parseFloat(row.querySelector('.item-price').value);
    const quantity = parseInt(row.querySelector('.item-qty').value, 10);
    const taxRate = parseFloat(row.querySelector('.item-tax').value);

    if (name && Number.isFinite(price) && Number.isInteger(quantity)) {
      items.push({ name, price, quantity, taxRate });
    }
  });

  if (items.length === 0) {
    alert('Please enter at least one valid item.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Unable to create invoice.');
    }

    renderInvoice(data.invoice);
    loadInvoices();
  } catch (err) {
    alert(`Failed to save invoice: ${err.message}`);
  }
});

function renderInvoice(inv) {
  breakdownBody.innerHTML = '';

  inv.items.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>${item.quantity}</td>
      <td>${money(item.price)}</td>
      <td>${escapeHtml(item.taxRate)}</td>
      <td>${money(item.itemTax)}</td>
      <td>${money(item.itemTotal)}</td>
    `;
    breakdownBody.appendChild(tr);
  });

  document.getElementById('res-items').textContent = inv.itemCount;
  document.getElementById('res-subtotal').textContent = money(inv.subtotal);
  document.getElementById('res-tax').textContent = money(inv.taxAmount);
  document.getElementById('res-total').textContent = money(inv.total);

  resultCard.classList.remove('hidden');
  resultCard.scrollIntoView({ behavior: 'smooth' });
}

async function loadInvoices() {
  try {
    const response = await fetch(`${API_BASE}/api/v1/invoices`);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load invoices.');

    if (data.invoices.length === 0) {
      savedInvoices.textContent = 'No saved invoices yet.';
      return;
    }

    savedInvoices.innerHTML = data.invoices.map((invoice) => `
      <div class="saved-invoice">
        <div class="saved-invoice-meta">
          <strong>${escapeHtml(invoice.invoiceNumber)}</strong>
          <span>${new Date(invoice.createdAt).toLocaleString('en-IN')} · ${invoice.itemCount} item(s) · ${money(invoice.total)}</span>
        </div>
        <div class="saved-invoice-actions">
          <button type="button" class="btn btn-secondary btn-small" data-view-id="${invoice.id}">View</button>
          <button type="button" class="btn btn-danger btn-small" data-delete-id="${invoice.id}">Delete</button>
        </div>
      </div>
    `).join('');

    savedInvoices.querySelectorAll('[data-view-id]').forEach((button) => {
      button.addEventListener('click', () => viewInvoice(button.dataset.viewId));
    });
    savedInvoices.querySelectorAll('[data-delete-id]').forEach((button) => {
      button.addEventListener('click', () => deleteInvoice(button.dataset.deleteId));
    });
  } catch (error) {
    savedInvoices.textContent = `Unable to load invoices: ${error.message}`;
  }
}

async function viewInvoice(id) {
  try {
    const response = await fetch(`${API_BASE}/api/v1/invoices/${id}`);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Invoice not found.');
    renderInvoice(data.invoice);
  } catch (error) {
    alert(`Unable to load invoice: ${error.message}`);
  }
}

async function deleteInvoice(id) {
  if (!confirm('Delete this invoice permanently?')) return;
  try {
    const response = await fetch(`${API_BASE}/api/v1/invoices/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Unable to delete invoice.');
    }
    loadInvoices();
  } catch (error) {
    alert(`Unable to delete invoice: ${error.message}`);
  }
}
