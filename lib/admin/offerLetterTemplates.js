import { PROGRAM_LABELS, studentEmail, studentName } from './stages.js'

export const OFFER_TEMPLATE_PROGRAMS = ['ra', 'irp', 'passion-project', 'portfolio-project']

export const OFFER_TEMPLATE_LABELS = {
  ra: 'Research Assistant offer letter',
  irp: 'Independent Research offer letter',
  'passion-project': 'Passion Project offer letter',
  'portfolio-project': 'Portfolio Project offer letter',
}

const PROGRAM_FIELDS = {
  ra: [
    { key: 'programName', label: 'Program name', required: true, placeholder: 'JHU Fluid Dynamics & AI Research Program' },
    { key: 'location', label: 'Location', required: true, placeholder: 'Johns Hopkins University, Baltimore' },
    { key: 'format', label: 'Format', required: true, placeholder: 'In-person' },
    { key: 'programPeriod', label: 'Program period / duration', required: true, placeholder: '4 weeks, June 1–June 26, 2026' },
  ],
  irp: [
    { key: 'programName', label: 'Program name', required: true, placeholder: 'MIT Customized Research Project' },
    { key: 'format', label: 'Format', required: true, placeholder: 'Personalized 1-on-1 online mentorship' },
    { key: 'projectFocus', label: 'Research area', required: true, placeholder: 'Applied Mathematics' },
    { key: 'minimumHours', label: 'Minimum mentorship hours', required: true, type: 'number', min: 0.5, step: 0.5 },
    { key: 'sessionCount', label: 'Typical session count', type: 'number', min: 1, step: 1 },
    { key: 'programPeriod', label: 'Program period', required: true, placeholder: 'Mid-May through August 2026' },
    { key: 'campusVisit', label: 'Include optional campus visit', type: 'checkbox' },
    { key: 'university', label: 'Campus visit university', dependsOn: 'campusVisit', placeholder: 'MIT' },
  ],
  'passion-project': [
    { key: 'programName', label: 'Program name', required: true, placeholder: 'Customized Passion Project' },
    { key: 'format', label: 'Format', required: true, placeholder: 'Personalized 1-on-1 online mentorship' },
    { key: 'projectFocus', label: 'Project focus', required: true, placeholder: 'Computer Science, Systems Engineering & STEM Education' },
    { key: 'minimumHours', label: 'Minimum mentorship hours', required: true, type: 'number', min: 0.5, step: 0.5 },
    { key: 'sessionCount', label: 'Typical session count', type: 'number', min: 1, step: 1 },
    { key: 'programPeriod', label: 'Program period', required: true, placeholder: '12 months from the program start date' },
  ],
  'portfolio-project': [
    { key: 'programName', label: 'Program name', required: true, placeholder: 'Customized Portfolio Project' },
    { key: 'format', label: 'Format', required: true, placeholder: 'Personalized 1-on-1 online mentorship' },
    { key: 'projectFocus', label: 'Project focus', required: true, placeholder: 'Game Design' },
    { key: 'trackOneName', label: 'Track 1 name', required: true, placeholder: 'Project concept and design' },
    { key: 'trackOneHours', label: 'Track 1 hours', required: true, type: 'number', min: 0.5, step: 0.5 },
    { key: 'trackOneDeliverable', label: 'Track 1 deliverable', required: true, placeholder: 'A professional project design document' },
    { key: 'trackTwoName', label: 'Track 2 name', required: true, placeholder: 'Prototype development' },
    { key: 'trackTwoHours', label: 'Track 2 hours', required: true, type: 'number', min: 0.5, step: 0.5 },
    { key: 'trackTwoDeliverable', label: 'Track 2 deliverable', required: true, placeholder: 'A polished, playable prototype' },
    { key: 'programPeriod', label: 'Program period', required: true, placeholder: 'July through October 2026' },
  ],
}

export function offerTemplateFields(program) {
  return PROGRAM_FIELDS[program] || []
}

function isoToday() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function defaultOfferLetterData(application) {
  const focus = Array.isArray(application?.form_data?.research_area)
    ? application.form_data.research_area.join(', ')
    : application?.form_data?.research_area || ''
  const common = {
    recipientEmail: studentEmail(application) === '—' ? '' : studentEmail(application),
    studentName: studentName(application),
    offerDate: isoToday(),
    programName: PROGRAM_LABELS[application?.program] || '',
    format: application?.program === 'ra' ? 'In-person' : 'Personalized 1-on-1 online mentorship',
    programPeriod: '',
  }

  if (application?.program === 'ra') return { ...common, location: '' }
  if (application?.program === 'irp') return { ...common, projectFocus: focus, minimumHours: 20, sessionCount: 14, campusVisit: false, university: '' }
  if (application?.program === 'passion-project') return { ...common, projectFocus: focus, minimumHours: 22.5, sessionCount: 15 }
  if (application?.program === 'portfolio-project') return {
    ...common,
    projectFocus: '',
    trackOneName: 'Project concept and design',
    trackOneHours: 20,
    trackOneDeliverable: 'A professional project design document',
    trackTwoName: 'Prototype development',
    trackTwoHours: 30,
    trackTwoDeliverable: 'A polished, portfolio-ready prototype',
  }
  return common
}

export function validateOfferLetterData(program, raw) {
  if (!OFFER_TEMPLATE_PROGRAMS.includes(program)) return { error: 'No offer-letter template is configured for this program.' }
  const data = {}
  const commonFields = [
    { key: 'recipientEmail', label: 'Recipient email', required: true },
    { key: 'studentName', label: 'Student name', required: true },
    { key: 'offerDate', label: 'Offer date', required: true },
  ]
  for (const field of [...commonFields, ...offerTemplateFields(program)]) {
    if (field.dependsOn && !raw?.[field.dependsOn]) continue
    if (field.type === 'checkbox') {
      data[field.key] = raw?.[field.key] === true
      continue
    }
    const value = String(raw?.[field.key] ?? '').trim()
    if (field.required && !value) return { error: `${field.label} is required.` }
    if (value.length > 500) return { error: `${field.label} is too long.` }
    if (field.type === 'number' && value) {
      const number = Number(value)
      if (!Number.isFinite(number) || number < (field.min || 0)) return { error: `${field.label} is invalid.` }
      data[field.key] = number
    } else {
      data[field.key] = value
    }
  }
  if (!/^\S+@\S+\.\S+$/.test(data.recipientEmail)) return { error: 'Enter a valid recipient email.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.offerDate) || Number.isNaN(Date.parse(`${data.offerDate}T00:00:00Z`))) {
    return { error: 'Enter a valid offer date.' }
  }
  return { data }
}
