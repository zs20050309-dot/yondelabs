// @ts-nocheck
// Supabase Edge Function - send-status-email
//
// Invoked by a Supabase Database Webhook configured against the
// `applications` table for INSERT and UPDATE events. Sends a submission
// confirmation to the student and a separate application PDF to Ashlyn when
// an application is first received.
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
//   - The internal PDF email sends even when the student's email is invalid.

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'YondeLabs Admissions <noreply@yondelabs.com>'
const APPLICATION_PDF_RECIPIENT = 'ashlyndong@gmail.com'

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

type EmailAttachment = { filename: string; content: string }

async function sendEmail(to: string, subject: string, text: string, attachments: EmailAttachment[] = []) {
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
      attachments,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Resend ${res.status}: ${errBody}`)
  }

  return await res.json()
}

function pdfSafeText(value: unknown): string {
  if (Array.isArray(value)) value = value.join(', ')
  if (value === true) value = 'Yes'
  if (value === false) value = 'No'
  if (value === null || value === undefined || value === '') value = 'Not provided'
  return String(value)
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\n]/g, '?')
}

function fieldLabel(key: string): string {
  return key
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function wrapPdfText(text: unknown, font: any, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of pdfSafeText(text).split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate
      } else {
        if (current) lines.push(current)
        let remainder = word
        while (font.widthOfTextAtSize(remainder, size) > maxWidth && remainder.length > 1) {
          let splitAt = remainder.length - 1
          while (splitAt > 1 && font.widthOfTextAtSize(`${remainder.slice(0, splitAt)}-`, size) > maxWidth) splitAt -= 1
          lines.push(`${remainder.slice(0, splitAt)}-`)
          remainder = remainder.slice(splitAt)
        }
        current = remainder
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

async function createApplicationPdf(record: any, name: string, programLabel: string): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const width = 612
  const height = 792
  const margin = 52
  const contentWidth = width - margin * 2
  const navy = rgb(0.012, 0.145, 0.424)
  const blue = rgb(0.145, 0.255, 0.698)
  const muted = rgb(0.39, 0.43, 0.5)
  const line = rgb(0.88, 0.9, 0.93)
  let page: any
  let y = 0

  function addPage() {
    page = document.addPage([width, height])
    y = height - margin
    page.drawText('YondeLabs', { x: margin, y, size: 18, font: bold, color: navy })
    page.drawText('Submitted Application', { x: margin, y: y - 19, size: 9, font: bold, color: blue })
    page.drawLine({ start: { x: margin, y: y - 32 }, end: { x: width - margin, y: y - 32 }, thickness: 1, color: line })
    y -= 55
  }

  function ensureSpace(required: number) {
    if (y - required < 58) addPage()
  }

  function drawLines(lines: string[], font: any, size: number, color: any, lineHeight: number, indent = 0) {
    for (const value of lines) {
      ensureSpace(lineHeight)
      page.drawText(value || ' ', { x: margin + indent, y, size, font, color })
      y -= lineHeight
    }
  }

  addPage()
  drawLines(wrapPdfText(name, bold, 23, contentWidth), bold, 23, navy, 28)
  y -= 4
  drawLines(wrapPdfText(programLabel, regular, 11, contentWidth), regular, 11, muted, 15)
  drawLines(wrapPdfText(`Submitted: ${new Date(record.submitted_at || Date.now()).toLocaleDateString('en-US')}`, regular, 9, contentWidth), regular, 9, muted, 14)
  y -= 18

  page.drawText('APPLICATION ANSWERS', { x: margin, y, size: 11, font: bold, color: blue })
  y -= 9
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1.2, color: blue })
  y -= 22

  for (const [key, value] of Object.entries(record.form_data || {})) {
    const labelLines = wrapPdfText(fieldLabel(key), bold, 9, contentWidth)
    const valueLines = wrapPdfText(value, regular, 10, contentWidth - 12)
    ensureSpace(labelLines.length * 12 + Math.max(valueLines.length, 1) * 14 + 20)
    drawLines(labelLines, bold, 9, muted, 12)
    y -= 3
    drawLines(valueLines, regular, 10, rgb(0.105, 0.105, 0.105), 14, 12)
    y -= 13
  }

  const pages = document.getPages()
  pages.forEach((currentPage: any, index: number) => {
    currentPage.drawLine({ start: { x: margin, y: 42 }, end: { x: width - margin, y: 42 }, thickness: 0.7, color: line })
    currentPage.drawText(`Application ${pdfSafeText(record.id)}  |  Page ${index + 1} of ${pages.length}`, { x: margin, y: 27, size: 7.5, font: regular, color: muted })
  })
  document.setTitle(`${name} - YondeLabs Application`)
  document.setAuthor('YondeLabs Admissions')
  return document.save()
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
  const canEmailStudent = isValidEmail(to)

  const name: string = formData.preferred_name || formData.full_name || 'there'
  const program: string = payload.record.program
  const programLabel = PROGRAM_LABELS[program] || 'Yonde Labs'

  try {
    const pdfBytes = await createApplicationPdf(payload.record, name, programLabel)
    const safeName = pdfSafeText(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'student'
    const attachment = {
      filename: `${safeName}-${program}-application.pdf`,
      content: encodeBase64(pdfBytes),
    }
    const [studentResult, admissionsResult] = await Promise.all([
      canEmailStudent
        ? sendEmail(
          to,
          SUBMITTED_TEMPLATE.subject,
          SUBMITTED_TEMPLATE.text({ name, programLabel })
        )
        : Promise.resolve(null),
      sendEmail(
        APPLICATION_PDF_RECIPIENT,
        `New YondeLabs application: ${name} - ${programLabel}`,
        `${name} submitted a ${programLabel} application. The complete application is attached as a PDF.`,
        [attachment]
      ),
    ])
    return json(200, {
      sent: true,
      to,
      pdfSentTo: APPLICATION_PDF_RECIPIENT,
      studentEmailSkipped: canEmailStudent ? null : 'missing or invalid email in form_data',
      status: newStatus,
      resendId: studentResult?.id ?? null,
      admissionsResendId: admissionsResult.id,
    })
  } catch (err: any) {
    console.error('send-status-email error', err)
    return json(500, { error: 'Email send failed', detail: err.message ?? String(err) })
  }
})
