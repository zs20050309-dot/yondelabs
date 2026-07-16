export const ADMIN_STAGES = [
  { key: 'submitted', label: 'Application submitted' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer sent' },
]

export const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  interview: 'Interview',
  offer: 'Offer sent',
  rejected: 'Archived',
}

export const NEXT_STATUS = {
  submitted: 'interview',
  interview: 'offer',
}

export const PROGRAM_LABELS = {
  ra: 'Research Assistant',
  irp: 'Independent Research',
  'passion-project': 'Passion Project',
  'portfolio-project': 'Portfolio Project',
  isef: 'ISEF Coaching',
}

export function isAdminUser(user) {
  return user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin'
}

export function studentName(application) {
  return (
    application?.form_data?.preferred_name ||
    application?.form_data?.full_name ||
    application?.contact_email ||
    application?.form_data?.email ||
    'Unnamed applicant'
  )
}

export function studentEmail(application) {
  return application?.contact_email || application?.form_data?.email || '—'
}

