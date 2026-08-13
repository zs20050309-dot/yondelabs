export const PAYMENT_TYPE_LABELS = {
  milestone: 'Per milestone',
  hourly: 'Per hour',
}

export const PAYMENT_STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
}

export const PAYMENT_SOURCE_LABELS = {
  milestone: 'Milestone completed',
  session: 'Class session',
  manual: 'Manual adjustment',
}

export function centsToAmount(cents) {
  const value = Number(cents)
  if (!Number.isFinite(value)) return ''
  return (value / 100).toFixed(2)
}

export function amountToCents(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

export function formatCents(cents, currency = 'USD') {
  const value = Number(cents)
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value / 100)
}

export function sumCents(records, field = 'amount_cents') {
  return (records || []).reduce((total, record) => total + (Number(record[field]) || 0), 0)
}
