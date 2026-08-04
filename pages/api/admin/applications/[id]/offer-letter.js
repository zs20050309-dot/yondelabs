import { createClient } from '@supabase/supabase-js'
import { createOfferLetterPdf, offerLetterFilename } from '../../../../../lib/admin/offerLetterPdf'
import { validateOfferLetterData } from '../../../../../lib/admin/offerLetterTemplates'
import { PROGRAM_LABELS, isAdminUser } from '../../../../../lib/admin/stages'

export const config = { api: { responseLimit: false } }

async function authenticatedAdmin(req) {
  const authorization = req.headers.authorization || ''
  if (!authorization.startsWith('Bearer ')) return { error: 'Authentication required', status: 401 }
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } }
  )
  const { data: { user }, error } = await client.auth.getUser(authorization.slice(7))
  if (error || !user) return { error: 'Invalid session', status: 401 }
  if (!isAdminUser(user)) return { error: 'Admin access required', status: 403 }
  return { client, user }
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const auth = await authenticatedAdmin(req)
  if (auth.error) return res.status(auth.status).json({ error: auth.error })

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  const { data: application, error: applicationError } = await auth.client
    .from('applications').select('*').eq('id', id).maybeSingle()
  if (applicationError) return res.status(500).json({ error: 'Unable to load application.' })
  if (!application) return res.status(404).json({ error: 'Application not found.' })

  if (req.method === 'GET') {
    const { data, error } = await auth.client.from('offer_letter_sends')
      .select('id, recipient_email, status, provider_message_id, error_message, created_at, sent_at')
      .eq('application_id', id).order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: 'Offer-letter history is unavailable. Apply the 2026-08-04 migration.' })
    return res.status(200).json({ sends: data || [] })
  }

  if (!['interview', 'offer'].includes(application.status)) {
    return res.status(409).json({ error: 'An application must be in the Interview or Offer sent stage before its offer letter can be emailed.' })
  }
  const validation = validateOfferLetterData(application.program, req.body)
  if (validation.error) return res.status(422).json({ error: validation.error })
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'RESEND_API_KEY is not configured in Vercel.' })

  const { data: send, error: insertError } = await auth.client.from('offer_letter_sends').insert({
    application_id: application.id,
    recipient_email: validation.data.recipientEmail,
    program: application.program,
    letter_data: validation.data,
    status: 'pending',
    sent_by: auth.user.id,
  }).select('id').single()
  if (insertError) return res.status(500).json({ error: 'Unable to record the offer letter. Apply the 2026-08-04 migration.' })

  try {
    const pdf = await createOfferLetterPdf(application, validation.data)
    const program = PROGRAM_LABELS[application.program] || application.program
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `offer-letter/${send.id}`,
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'YondeLabs Admissions <noreply@yondelabs.com>',
        to: [validation.data.recipientEmail],
        subject: `Your Yonde Labs ${program} offer`,
        text: `Dear ${validation.data.studentName},\n\nCongratulations! Your Yonde Labs ${program} offer letter is attached as a PDF. Please reply to this email within two weeks to confirm your place.\n\nWarm regards,\nYonde Labs`,
        attachments: [{
          filename: offerLetterFilename(application, validation.data),
          content: Buffer.from(pdf).toString('base64'),
        }],
      }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || body.error || `Resend returned ${response.status}`)
    const sentAt = new Date().toISOString()
    await auth.client.from('offer_letter_sends').update({ status: 'sent', provider_message_id: body.id || null, sent_at: sentAt }).eq('id', send.id)
    let stageUpdated = application.status === 'offer'
    if (application.status === 'interview') {
      const { error: stageError } = await auth.client.rpc('advance_application_stage', {
        p_application_id: application.id,
        p_next_status: 'offer',
        p_note: `Offer letter emailed to ${validation.data.recipientEmail}`,
      })
      stageUpdated = !stageError
      if (stageError) console.error('offer letter sent but stage update failed', { applicationId: application.id, error: stageError.message })
    }
    return res.status(200).json({ sent: true, id: send.id, recipient: validation.data.recipientEmail, sentAt, stageUpdated })
  } catch (error) {
    console.error('offer letter delivery failed', { applicationId: application.id, sendId: send.id, error: error.message || String(error) })
    await auth.client.from('offer_letter_sends').update({ status: 'failed', error_message: String(error.message || error).slice(0, 500) }).eq('id', send.id)
    return res.status(502).json({ error: 'The offer letter could not be emailed. Check the Resend configuration and try again.' })
  }
}
