export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatCompactCurrency(value) {
  const safeValue = Number.isFinite(value) ? value : 0;

  if (Math.abs(safeValue) >= 1_000_000) {
    return `$${(safeValue / 1_000_000).toFixed(2)}M`;
  }

  if (Math.abs(safeValue) >= 1_000) {
    return `$${Math.round(safeValue / 1_000)}K`;
  }

  return formatCurrency(safeValue);
}
