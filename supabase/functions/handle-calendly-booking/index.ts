// @ts-nocheck
// Supabase Edge Function - handle-calendly-booking
//
// Public webhook endpoint for Calendly booking events.
// The webhook URL must include ?token=YOUR_CALENDLY_WEBHOOK_TOKEN and this
// function must be deployed with JWT verification disabled.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'YondeLabs Admissions <noreply@yondelabs.com>'
const CALENDLY_WEBHOOK_TOKEN = Deno.env.get('CALENDLY_WEBHOOK_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const PROGRAM_LABELS: Record<string, string> = {
  ra: 'Research Scholar',
  irp: 'Independent Research',
  'passion-project': 'Passion Project',
  'portfolio-project': 'Portfolio Project',
  isef: 'ISEF Mentorship',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/^mailto:/i, '')
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function formatDateTime(isoString: string | undefined, timezone: string | undefined) {
  if (!isoString) return 'your scheduled time'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return 'your scheduled time'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone || 'UTC',
  }).format(date)
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

  if (!CALENDLY_WEBHOOK_TOKEN) {
    return json(500, { error: 'CALENDLY_WEBHOOK_TOKEN is not configured' })
  }

  if (!supabaseAdmin) {
    return json(500, { error: 'Supabase admin environment variables are missing' })
  }

  const token = new URL(req.url).searchParams.get('token')
  if (token !== CALENDLY_WEBHOOK_TOKEN) {
    return json(401, { error: 'Unauthorized' })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  if (body.event !== 'invitee.created') {
    return json(200, { skipped: `event "${body.event || 'unknown'}" is not handled` })
  }

  const invitee = body.payload?.invitee || {}
  const event = body.payload?.event || {}
  const inviteeEmail = normalizeEmail(invitee.email)

  if (!inviteeEmail || !isValidEmail(inviteeEmail)) {
    return json(200, { skipped: 'invitee email is missing or invalid' })
  }

  const { data: candidates, error: fetchError } = await supabaseAdmin
    .from('applications')
    .select('*')
    .eq('status', 'interview')
    .eq('contact_email', inviteeEmail)
    .order('updated_at', { ascending: false })
    .limit(5)

  if (fetchError) {
    console.error('handle-calendly-booking fetch error', fetchError)
    return json(500, { error: 'Could not load matching application', detail: fetchError.message })
  }

  const application =
    (candidates || []).find((row) => row.calendly_invitee_uri === invitee.uri) ||
    (candidates || []).find((row) => !row.interview_scheduled_at) ||
    candidates?.[0]

  if (!application) {
    return json(200, { skipped: 'no interview-stage application matched this Calendly booking' })
  }

  const alreadyHandled =
    application.calendly_invitee_uri === invitee.uri &&
    application.interview_scheduled_at &&
    application.zoom_confirmation_sent_at

  if (alreadyHandled) {
    return json(200, { skipped: 'booking already recorded for this application' })
  }

  const interviewScheduledAt = event.start_time || invitee.start_time || null
  const updatePayload = {
    interview_scheduled_at: interviewScheduledAt,
    calendly_invitee_uri: invitee.uri || application.calendly_invitee_uri || null,
    calendly_event_uri: event.uri || application.calendly_event_uri || null,
    zoom_confirmation_sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error: updateError } = await supabaseAdmin
    .from('applications')
    .update(updatePayload)
    .eq('id', application.id)

  if (updateError) {
    console.error('handle-calendly-booking update error', updateError)
    return json(500, { error: 'Could not record Calendly booking', detail: updateError.message })
  }

  if (!RESEND_API_KEY) {
    return json(200, {
      recorded: true,
      applicationId: application.id,
      skipped: 'booking stored, but RESEND_API_KEY is not configured',
    })
  }

  const formData = application.form_data || {}
  const name = formData.preferred_name || formData.full_name || invitee.name || 'there'
  const programLabel = PROGRAM_LABELS[application.program] || 'Yonde Labs'
  const scheduledLabel = formatDateTime(interviewScheduledAt, invitee.timezone)
  const subject = 'Your Yonde Labs interview is booked'
  const text = `Hi ${name},

Your Yonde Labs ${programLabel} interview has been booked for ${scheduledLabel}.

Calendly has sent your Zoom details and calendar invite separately, so please check your inbox for that message. If you do not see it, please also check spam or promotions.

If anything looks off with your booking, just reply to this email and we'll help right away.

Best,
Ashlyn
CEO, Yonde Labs`

  try {
    const resendResult = await sendEmail(inviteeEmail, subject, text)
    return json(200, {
      recorded: true,
      emailed: true,
      applicationId: application.id,
      resendId: resendResult.id,
    })
  } catch (err: any) {
    console.error('handle-calendly-booking email error', err)
    return json(500, {
      error: 'Calendly booking was recorded, but the confirmation email failed',
      detail: err.message ?? String(err),
    })
  }
})
