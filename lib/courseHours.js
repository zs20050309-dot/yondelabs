export function hoursToMinutes(hours) {
  const value = Number(hours)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 60)
}

export function formatHours(minutes) {
  const value = Math.max(0, Number(minutes) || 0)
  const hours = value / 60
  return Number.isInteger(hours) ? `${hours} hr` : `${hours.toFixed(1)} hr`
}

export function formatHoursLong(minutes) {
  const value = Math.max(0, Number(minutes) || 0)
  const wholeHours = Math.floor(value / 60)
  const remainingMinutes = value % 60
  if (!wholeHours) return `${remainingMinutes} min`
  if (!remainingMinutes) return `${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'}`
  return `${wholeHours}h ${remainingMinutes}m`
}

export function sumMinutes(records, field = 'duration_minutes') {
  return (records || []).reduce((total, record) => total + (Number(record[field]) || 0), 0)
}

