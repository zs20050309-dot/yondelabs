// @ts-nocheck
// Supabase Edge Function - send-status-email
//
// Invoked by a Supabase Database Webhook configured against the
// `applications` table for INSERT and UPDATE events. Sends exactly one kind of
// email: a submission confirmation when an application is first received.
//
// Required env vars (set in Supabase Dashboard -> Project Settings -> Edge
// Functions -> Secrets):
//   RESEND_API_KEY    Resend API key (re_...)
//   WEBHOOK_SECRET    Shared secret. The Database Webhook must send it
//                     in the `Authorization: Bearer <secret>` header.
//   FROM_EMAIL        Sender, default "YondeLabs Admissions <noreply@yondelabs.com>"
//
// Send rules:
//   - On INSERT when the row is created directly as submitted.
//   - On UPDATE when a draft becomes submitted.
//   - Never on later status changes such as interview / offer / rejected.
//   - Never on draft saves or no-op updates.

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'YondeLabs Admissions <noreply@yondelabs.com>'

const PROGRAM_LABELS: Record<string, string> = {
  ra: 'Research Scholar',
  irp: 'Independent Research',
  'passion-project': 'Passion Project',
  'portfolio-project': 'Portfolio Project',
  isef: 'ISEF Mentorship',
}

type EmailTemplate = {
  subject: string
  text: (ctx: { name: string; programLabel: string }) => string
}

const SUBMITTED_TEMPLATE: EmailTemplate = {
  subject: 'Your Yonde Labs application has been received',
  text: ({ name, programLabel }) => `Hi ${name},

Thank you for applying to the Yonde Labs ${programLabel} Program.

We would like to confirm that your application has been successfully received and is currently under review by our team. We evaluate candidates on a rolling basis, giving each application the individual attention it deserves. If your profile is a strong match for our current cohort, we'll be in touch within one week to invite you to a short Zoom interview (~15-30 min) with one of our mentors.

We receive applications from driven students around the world, and we're thoughtful about who we bring into the Yonder Scholar community - so we appreciate your patience as we review your materials carefully.

We'll follow up soon either way.

Best,
Ashlyn
CEO, Yonde Labs`,
}

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: any
  old_record: any | null
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function authorize(req: Request): boolean {
  if (!WEBHOOK_SECRET) return false
  const header = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!header) return false
  return header === `Bearer ${WEBHOOK_SECRET}`
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/^mailto:/i, '')
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function sendEmail(to: string, subject: string, text: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      text,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Resend ${res.status}: ${errBody}`)
  }

  return await res.json()
}

function shouldSendSubmissionEmail(payload: WebhookPayload, newStatus: string, oldStatus: string | undefined) {
  if (payload.type === 'INSERT') {
    return newStatus === 'submitted'
  }

  if (payload.type === 'UPDATE') {
    if (oldStatus === newStatus) return false
    return oldStatus === 'draft' && newStatus === 'submitted'
  }

  return false
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  if (!authorize(req)) {
    return json(401, { error: 'Unauthorized' })
  }

  if (!RESEND_API_KEY) {
    return json(500, { error: 'RESEND_API_KEY is not configured' })
  }

  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  const newStatus = payload.record?.status
  const oldStatus = payload.old_record?.status

  if (!newStatus) {
    return json(200, { skipped: 'record has no status' })
  }

  if (!shouldSendSubmissionEmail(payload, newStatus, oldStatus)) {
    return json(200, { skipped: `status "${newStatus}" is not a notifiable submission event` })
  }

  const formData = payload.record.form_data || {}
  const to = normalizeEmail(formData.email)
  if (!to) {
    return json(200, { skipped: 'no email on file in form_data' })
  }

  if (!isValidEmail(to)) {
    return json(200, {
      skipped: 'invalid email in form_data',
      email: to,
    })
  }

  const name: string = formData.preferred_name || formData.full_name || 'there'
  const program: string = payload.record.program
  const programLabel = PROGRAM_LABELS[program] || 'Yonde Labs'

  try {
    const result = await sendEmail(
      to,
      SUBMITTED_TEMPLATE.subject,
      SUBMITTED_TEMPLATE.text({ name, programLabel })
    )
    return json(200, { sent: true, to, status: newStatus, resendId: result.id })
  } catch (err: any) {
    console.error('send-status-email error', err)
    return json(500, { error: 'Email send failed', detail: err.message ?? String(err) })
  }
})
