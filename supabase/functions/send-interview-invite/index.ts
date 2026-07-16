// @ts-nocheck
// Supabase Edge Function - send-interview-invite
//
// Invoked by a database trigger when an application enters interview review.
// Sends a Calendly scheduling email and records that the invitation was sent.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'YondeLabs Admissions <noreply@yondelabs.com>'
const CALENDLY_BOOKING_URL = Deno.env.get('CALENDLY_BOOKING_URL') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const PROGRAM_LABELS: Record<string, string> = {
  ra: 'Research Scholar',
  irp: 'Independent Research',
  'passion-project': 'Passion Project',
  'portfolio-project': 'Portfolio Project',
  isef: 'ISEF Mentorship',
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

function shouldSendInterviewInvite(payload: WebhookPayload, newStatus: string, oldStatus?: string) {
  if (payload.type !== 'UPDATE') return false
  if (newStatus !== 'interview') return false
  return oldStatus !== 'interview'
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

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null

serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  if (!authorize(req)) {
    return json(401, { error: 'Unauthorized' })
  }

  if (!RESEND_API_KEY || !CALENDLY_BOOKING_URL) {
    return json(500, {
      error: 'RESEND_API_KEY or CALENDLY_BOOKING_URL is not configured',
    })
  }

  if (!supabaseAdmin) {
    return json(500, { error: 'Supabase admin environment variables are missing' })
  }

  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  const record = payload.record || {}
  const newStatus = record.status
  const oldStatus = payload.old_record?.status

  if (!newStatus) {
    return json(200, { skipped: 'record has no status' })
  }

  if (!shouldSendInterviewInvite(payload, newStatus, oldStatus)) {
    return json(200, { skipped: `status "${newStatus}" is not an interview-invite event` })
  }

  if (record.interview_invite_sent_at) {
    return json(200, { skipped: 'interview invite already recorded on application' })
  }

  const formData = record.form_data || {}
  const to = normalizeEmail(record.contact_email || formData.email)
  if (!to) {
    return json(200, { skipped: 'no email on file for interview invite' })
  }

  if (!isValidEmail(to)) {
    return json(200, { skipped: 'invalid email on file for interview invite', email: to })
  }

  const name = formData.preferred_name || formData.full_name || 'there'
  const programLabel = PROGRAM_LABELS[record.program] || 'Yonde Labs'
  const subject = 'Choose your Yonde Labs interview time'
  const text = `Hi ${name},

We'd love to move forward with your Yonde Labs ${programLabel} application.

Please use the link below to choose an interview time that works for you:
${CALENDLY_BOOKING_URL}

Once you book, Calendly will send your Zoom details automatically. We'll also send a brief confirmation from our side after the booking comes through.

If you run into any scheduling issues, just reply to this email and our team will help.

Best,
Ashlyn
CEO, Yonde Labs`

  try {
    const resendResult = await sendEmail(to, subject, text)

    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        interview_invite_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id)

    if (updateError) {
      throw updateError
    }

    return json(200, {
      sent: true,
      to,
      applicationId: record.id,
      resendId: resendResult.id,
    })
  } catch (err: any) {
    console.error('send-interview-invite error', err)
    return json(500, { error: 'Interview invite email failed', detail: err.message ?? String(err) })
  }
})
