export const STUDENT_PORTAL_EMAIL_DOMAIN = 'student-login.yondelabs.com'

export function normalizePortalId(value) {
  return String(value || '').trim().toUpperCase()
}

export function portalIdToInternalEmail(value) {
  const portalId = normalizePortalId(value)
  if (!/^YL-[A-F0-9]{8}$/.test(portalId)) return null
  return `${portalId.toLowerCase()}@${STUDENT_PORTAL_EMAIL_DOMAIN}`
}
