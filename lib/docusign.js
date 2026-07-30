import crypto from 'crypto'

const REQUIRED_ENV = [
  'DOCUSIGN_INTEGRATION_KEY',
  'DOCUSIGN_USER_ID',
  'DOCUSIGN_ACCOUNT_ID',
  'DOCUSIGN_PRIVATE_KEY',
  'DOCUSIGN_TEMPLATE_ID',
]

function requireConfig() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key])
  if (missing.length) {
    throw new Error(`DocuSign is not configured. Missing: ${missing.join(', ')}`)
  }
}

function encode(value) {
  return Buffer.from(
    typeof value === 'string' ? value : JSON.stringify(value)
  ).toString('base64url')
}

function privateKey() {
  return process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n')
}

function authServer() {
  return (process.env.DOCUSIGN_AUTH_SERVER || 'account-d.docusign.com')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
}

async function readJson(response, label) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = body.error_description || body.message || body.error || response.statusText
    throw new Error(`${label} failed: ${detail}`)
  }
  return body
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  const header = encode({ alg: 'RS256', typ: 'JWT' })
  const claims = encode({
    iss: process.env.DOCUSIGN_INTEGRATION_KEY,
    sub: process.env.DOCUSIGN_USER_ID,
    aud: authServer(),
    iat: now - 60,
    exp: now + 3600,
    scope: 'signature impersonation',
  })
  const unsigned = `${header}.${claims}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKey()).toString('base64url')

  const response = await fetch(`https://${authServer()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  })
  const token = await readJson(response, 'DocuSign authentication')
  return token.access_token
}

async function getAccount(accessToken) {
  const response = await fetch(`https://${authServer()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const userInfo = await readJson(response, 'DocuSign account lookup')
  const account = (userInfo.accounts || []).find(
    (item) => item.account_id === process.env.DOCUSIGN_ACCOUNT_ID
  )
  if (!account) {
    throw new Error('The configured DocuSign account is not available to this API user.')
  }
  return account
}

function cleanEmail(value) {
  return typeof value === 'string' ? value.trim().replace(/^mailto:/i, '') : ''
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function offerRecipient(application) {
  const formData = application.form_data || {}
  const student = {
    name: String(formData.full_name || formData.preferred_name || '').trim(),
    email: cleanEmail(application.contact_email || formData.email),
  }
  const guardian = {
    name: String(formData.parent_name || '').trim(),
    email: cleanEmail(formData.parent_email),
  }

  if (!student.name) throw new Error('The application does not contain the student’s full name.')
  if (!validEmail(student.email)) throw new Error('The application does not contain a valid student email.')

  const guardianRole = process.env.DOCUSIGN_GUARDIAN_ROLE?.trim()
  if (guardianRole && (!guardian.name || !validEmail(guardian.email))) {
    throw new Error('The DocuSign template requires a guardian, but the application has no valid guardian contact.')
  }

  return { student, guardian: guardianRole ? guardian : null }
}

export async function sendOfferEnvelope(application, programLabel) {
  requireConfig()
  const accessToken = await getAccessToken()
  const account = await getAccount(accessToken)
  const { student, guardian } = offerRecipient(application)
  const templateRoles = [{
    email: student.email,
    name: student.name,
    roleName: process.env.DOCUSIGN_STUDENT_ROLE || 'Student',
  }]

  if (guardian) {
    templateRoles.push({
      email: guardian.email,
      name: guardian.name,
      roleName: process.env.DOCUSIGN_GUARDIAN_ROLE,
    })
  }

  const response = await fetch(
    `${account.base_uri}/restapi/v2.1/accounts/${account.account_id}/envelopes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-DocuSign-Transaction-Id': crypto.randomUUID(),
      },
      body: JSON.stringify({
        templateId: process.env.DOCUSIGN_TEMPLATE_ID,
        templateRoles,
        emailSubject: `Yonde Labs ${programLabel} offer`,
        emailBlurb: 'Please review and sign your Yonde Labs program agreement.',
        customFields: {
          textCustomFields: [{
            name: 'YondeApplicationId',
            value: application.id,
            show: 'false',
          }],
        },
        status: 'sent',
      }),
    }
  )
  const envelope = await readJson(response, 'Sending the DocuSign offer')

  return {
    envelopeId: envelope.envelopeId,
    status: envelope.status || 'sent',
    statusDateTime: envelope.statusDateTime || new Date().toISOString(),
    student,
    guardian,
    templateId: process.env.DOCUSIGN_TEMPLATE_ID,
  }
}

export function verifyConnectSignature(rawBody, signature) {
  const secret = process.env.DOCUSIGN_CONNECT_HMAC_KEY
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(signature)
  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
}
