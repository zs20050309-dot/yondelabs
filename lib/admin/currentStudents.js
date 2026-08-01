export const CURRENT_STUDENT_PROGRAMS = {
  isef: 'ISEF',
  irp: 'Independent Research Program',
  'passion-project': 'Passion Project',
  'portfolio-project': 'Portfolio Project',
}

export const DEFAULT_CURRENT_STUDENT_PLANS = {
  isef: { name: 'ISEF Current Students', allowOverage: false },
  irp: { name: 'Independent Research Program', allowOverage: true },
  'passion-project': { name: 'Passion Project', allowOverage: true },
  'portfolio-project': { name: 'Portfolio Project', allowOverage: true },
}

function normalizeHeader(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim().toLowerCase()
}

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(field)
      if (row.some((value) => String(value).trim())) rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  row.push(field)
  if (row.some((value) => String(value).trim())) rows.push(row)
  return rows
}

export function normalizeProgram(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[–—]/g, '-')
  if (normalized === 'isef') return 'isef'
  if (normalized === 'irp' || normalized === 'irp-game' || normalized === 'irp game') return 'irp'
  if (normalized === 'pp' || normalized === 'passion project' || normalized === 'passion-project') return 'passion-project'
  if (normalized === 'portfolio project' || normalized === 'portfolio-project') return 'portfolio-project'
  return null
}

export function normalizeCurrentStudent(input, rowNumber) {
  const name = String(input.name || '').trim()
  const rawEmail = String(input.email || '').trim()
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail.toLowerCase() : null
  const program = normalizeProgram(input.program)
  const hoursText = String(input.totalHours || '').trim()
  const totalMatch = hoursText.match(/(?:total|at\s+least)?\s*(\d+(?:\.\d+)?)\s*h(?:ours?)?/i)
  const totalMinutes = Number(input.totalMinutes) > 0
    ? Math.round(Number(input.totalMinutes))
    : totalMatch ? Math.round(Number(totalMatch[1]) * 60) : 0
  const parsedAllocations = [...hoursText.matchAll(/-\s*(\d+(?:\.\d+)?)\s*h\s+([^\r\n]+)/gi)]
    .map((match) => ({
      allocatedMinutes: Math.round(Number(match[1]) * 60),
      label: match[2].trim(),
    }))
    .filter((item) => item.allocatedMinutes > 0 && item.label)
  const allocations = Array.isArray(input.allocations)
    ? input.allocations.filter((item) => item.allocatedMinutes > 0 && item.label)
    : parsedAllocations
  const mentorInputs = Array.isArray(input.mentors) ? input.mentors : [
    { name: input.mentor1, role: input.mentorRole1 },
    { name: input.mentor2, role: input.mentorRole2 },
  ]
  const mentors = mentorInputs.map((mentor) => ({
    name: String(mentor.name || '').trim(),
    role: String(mentor.role || 'Mentor').trim(),
  })).filter((mentor) => mentor.name)
  const errors = []

  if (!name) errors.push('Name is required')
  if (!program) errors.push(`Unsupported program: ${input.program || 'blank'}`)
  if (!totalMinutes) errors.push('Total hours are required')
  if (rawEmail && !email && !['暂无', 'n/a', 'na', '-'].includes(rawEmail.toLowerCase())) {
    errors.push('Email is invalid')
  }

  return {
    rowNumber,
    name,
    email,
    program,
    totalMinutes,
    allowOverage: typeof input.allowOverage === 'boolean'
      ? input.allowOverage
      : /at\s+least/i.test(hoursText),
    allocations,
    mentors,
    errors,
  }
}

export function parseCurrentStudentsCsv(text) {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const headers = rows[0].map(normalizeHeader)
  const find = (...names) => headers.findIndex((header) => names.includes(header))
  const indexes = {
    name: find('name'),
    email: find('email'),
    totalHours: find('total hours', 'hours'),
    program: find('programs', 'program'),
    mentor1: find('assigned mentor i', 'assigned mentor 1', 'mentor i'),
    mentorRole1: find('mentor role', 'mentor role i', 'mentor role 1'),
    mentor2: find('assigned mentor ii', 'assigned mentor 2', 'mentor ii'),
    mentorRole2: find('mentor role ii', 'mentor role 2'),
  }

  return rows.slice(1).map((values, index) => normalizeCurrentStudent({
    name: values[indexes.name],
    email: values[indexes.email],
    totalHours: values[indexes.totalHours],
    program: values[indexes.program],
    mentor1: values[indexes.mentor1],
    mentorRole1: values[indexes.mentorRole1],
    mentor2: values[indexes.mentor2],
    mentorRole2: values[indexes.mentorRole2],
  }, index + 2))
}
