import { createClient } from '@supabase/supabase-js'
import {
  applicationPdfFilename,
  createApplicationPdf,
} from '../../../../lib/admin/applicationPdf'
import {
  PROGRAM_LABELS,
  isAdminUser,
  studentName,
} from '../../../../lib/admin/stages'

const RECIPIENT = 'ashlyndong@gmail.com'

export const config = {
  api: { responseLimit: false },
}

async function sendApplicationEmail(application) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured in Vercel')
  }

  const pdf = await createApplicationPdf(application)
  const name = studentName(application)
  const program = PROGRAM_LABELS[application.program] || application.program
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `application-pdf/${application.id}`,
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || 'YondeLabs Admissions <noreply@yondelabs.com>',
      to: [RECIPIENT],
      subject: `New YondeLabs application: ${name} - ${program}`,
      text: `${name} submitted a ${program} application. The complete application profile is attached as a PDF.`,
      attachments: [{
        filename: applicationPdfFilename(application),
        content: Buffer.from(pdf).toString('base64'),
      }],
    }),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.message || body.error || `Resend returned ${response.status}`)
  }
  return body
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authorization = req.headers.authorization || ''
  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    }
  )
  const token = authorization.slice(7)
  const { data: { user }, error: userError } = await client.auth.getUser(token)
  if (userError || !user) return res.status(401).json({ error: 'Invalid session' })

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  const { data: application, error: applicationError } = await client
    .from('applications')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (applicationError) return res.status(500).json({ error: 'Unable to load application' })
  if (!application) return res.status(404).json({ error: 'Application not found' })
  if (application.user_id !== user.id && !isAdminUser(user)) {
    return res.status(403).json({ error: 'You cannot send this application' })
  }
  if (application.status !== 'submitted') {
    return res.status(409).json({ error: 'Only submitted applications can be emailed' })
  }
  const submittedAt = Date.parse(application.submitted_at || '')
  if (!Number.isFinite(submittedAt) || Date.now() - submittedAt > 15 * 60 * 1000) {
    return res.status(409).json({ error: 'The automatic notification window has closed' })
  }

  try {
    const result = await sendApplicationEmail(application)
    return res.status(200).json({
      sent: true,
      recipient: RECIPIENT,
      resendId: result.id,
    })
  } catch (error) {
    console.error('submission PDF email failed', {
      applicationId: application.id,
      error: error.message || String(error),
    })
    return res.status(502).json({
      error: 'The application was submitted, but its PDF email could not be sent.',
    })
  }
}
