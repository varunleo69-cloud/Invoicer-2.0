function calculateInvoice(items, fallbackTaxRate = 0.18) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Invoice must contain at least one item.');
  }

  const normalizedFallbackTaxRate = parseRate(fallbackTaxRate, 'tax rate');
  let subtotal = 0;
  let totalTax = 0;

  const itemBreakdown = items.map((item) => {
    if (!item || typeof item.name !== 'string' || !item.name.trim()) {
      throw new Error('Each item must have a name.');
    }

    const price = Number(item.price);
    const quantity = Number(item.quantity);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Invalid item price or quantity.');
    }

    const rate = item.taxRate !== undefined
      ? parseRate(item.taxRate, 'tax rate')
      : normalizedFallbackTaxRate;

    const itemSubtotal = roundMoney(price * quantity);
    const itemTax = roundMoney(itemSubtotal * rate);
    const itemTotal = roundMoney(itemSubtotal + itemTax);

    subtotal += itemSubtotal;
    totalTax += itemTax;

    return {
      name: item.name.trim(),
      price,
      quantity,
      taxRate: `${Math.round(rate * 100)}%`,
      taxRateValue: rate,
      itemSubtotal,
      itemTax,
      itemTotal
    };
  });

  subtotal = roundMoney(subtotal);
  totalTax = roundMoney(totalTax);

  return {
    itemCount: items.length,
    items: itemBreakdown,
    subtotal,
    taxAmount: totalTax,
    total: roundMoney(subtotal + totalTax)
  };
}

function parseRate(value, label) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error(`Invalid ${label}.`);
  }
  return rate;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

module.exports = { calculateInvoice };
