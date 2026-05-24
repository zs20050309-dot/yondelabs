// Supabase Edge Function — send-status-email
//
// Invoked by a Supabase Database Webhook configured against the
// `applications` table for UPDATE events. Decides whether the change is
// notification-worthy and, if so, sends a transactional email via Resend.
//
// Required env vars (set in Supabase Dashboard → Project Settings → Edge
// Functions → Secrets):
//   RESEND_API_KEY    Resend API key (re_...)
//   WEBHOOK_SECRET    Shared secret. The Database Webhook must send it
//                     in the `Authorization: Bearer <secret>` header.
//   DASHBOARD_URL     Public URL students land on (default: production URL)
//   FROM_EMAIL        Sender, default "YondeLabs Admissions <noreply@yondelabs.com>"
//
// Send rules:
//   - Only on status transitions to one of: interview, offer, rejected.
//   - Never on draft → submitted (the dashboard already confirms that).
//   - Never on no-op updates (status unchanged).

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''
const DASHBOARD_URL = Deno.env.get('DASHBOARD_URL') ?? 'https://yondelabs.com/dashboard'
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'YondeLabs Admissions <noreply@yondelabs.com>'

const PROGRAM_LABELS: Record<string, string> = {
  ra: 'In-Person Research Assistant',
  irp: 'Independent Research Program',
  'passion-project': 'Passion Project',
  isef: 'ISEF Coaching',
}

type EmailTemplate = {
  subject: string
  text: (ctx: { name: string; programLabel: string }) => string
}

const TEMPLATES: Record<'interview' | 'offer' | 'rejected', EmailTemplate> = {
  interview: {
    subject: 'Your YondeLabs application: interview invitation',
    text: ({ name, programLabel }) => `Hi ${name},

Congratulations — your application to the ${programLabel} has moved to the interview stage.

Our admissions team will reach out shortly to schedule a time that works for you. There is nothing you need to do right now.

You can view your application status anytime at:
${DASHBOARD_URL}

If you have questions in the meantime, reply to this email or write to info@yondelabs.com.

— YondeLabs Admissions`,
  },

  offer: {
    subject: 'Welcome to YondeLabs — admission decision',
    text: ({ name, programLabel }) => `Hi ${name},

We're delighted to share that you've been admitted to the ${programLabel}.

Your official offer details and next steps will arrive in a separate email from our admissions coordinator within the next 1–2 business days. Please look out for it.

You can view your dashboard at:
${DASHBOARD_URL}

If anything doesn't reach you, write to info@yondelabs.com and we'll resend immediately.

Welcome aboard.

— YondeLabs Admissions`,
  },

  rejected: {
    subject: 'Your YondeLabs application has been reviewed',
    text: ({ name, programLabel }) => `Hi ${name},

Thank you for applying to the ${programLabel} and for sharing your work with us.

After careful review, we are not able to offer you a place in this cohort. We know how much thought goes into an application like this, and we appreciate the time you put in.

You're welcome to apply again in a future cycle. If you'd like specific feedback or to talk through future fit, write to info@yondelabs.com and we'll be glad to follow up.

— YondeLabs Admissions`,
  },
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
  const expected = `Bearer ${WEBHOOK_SECRET}`
  return header === expected
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

  if (payload.type !== 'UPDATE') {
    return json(200, { skipped: 'not an update' })
  }

  const oldStatus = payload.old_record?.status
  const newStatus = payload.record?.status

  if (!newStatus || oldStatus === newStatus) {
    return json(200, { skipped: 'status unchanged' })
  }

  const notifiable = newStatus === 'interview' || newStatus === 'offer' || newStatus === 'rejected'
  if (!notifiable) {
    return json(200, { skipped: `status "${newStatus}" is not a notifiable transition` })
  }

  const formData = payload.record.form_data || {}
  const to: string = formData.email || ''
  if (!to) {
    return json(200, { skipped: 'no email on file in form_data' })
  }

  const name: string = formData.preferred_name || formData.full_name || 'there'
  const program: string = payload.record.program
  const programLabel = PROGRAM_LABELS[program] || 'YondeLabs program'

  const template = TEMPLATES[newStatus as 'interview' | 'offer' | 'rejected']
  const subject = template.subject
  const text = template.text({ name, programLabel })

  try {
    const result = await sendEmail(to, subject, text)
    return json(200, { sent: true, to, status: newStatus, resendId: result.id })
  } catch (err: any) {
    console.error('send-status-email error', err)
    return json(500, { error: 'Email send failed', detail: err.message ?? String(err) })
  }
})
