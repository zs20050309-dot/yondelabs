import { createClient } from '@supabase/supabase-js'
import { verifyConnectSignature } from '../../../lib/docusign'

export const config = {
  api: { bodyParser: false },
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

function eventStatus(payload) {
  const summaryStatus = payload?.data?.envelopeSummary?.status
  if (summaryStatus) return String(summaryStatus).toLowerCase()
  return String(payload?.event || '').toLowerCase().replace(/^envelope-/, '')
}

function eventDate(payload) {
  return (
    payload?.data?.envelopeSummary?.statusChangedDateTime
    || payload?.generatedDateTime
    || new Date().toISOString()
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawBody = await readBody(req)
  const signature = req.headers['x-docusign-signature-1']
  if (!verifyConnectSignature(rawBody, Array.isArray(signature) ? signature[0] : signature)) {
    return res.status(401).json({ error: 'Invalid DocuSign signature' })
  }

  let payload
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return res.status(400).json({ error: 'Connect must send JSON notifications' })
  }

  const envelopeId = payload?.data?.envelopeId || payload?.envelopeId
  const status = eventStatus(payload)
  const supported = ['sent', 'delivered', 'completed', 'declined', 'voided']
  if (!envelopeId || !supported.includes(status)) {
    return res.status(200).json({ skipped: 'Unsupported Connect event' })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Webhook storage is not configured' })
  }

  const eventAt = eventDate(payload)
  const update = {
    status,
    last_event_at: eventAt,
    updated_at: new Date().toISOString(),
  }
  if (status === 'delivered') update.delivered_at = eventAt
  if (status === 'completed') update.completed_at = eventAt
  if (status === 'declined') update.declined_at = eventAt
  if (status === 'voided') update.voided_at = eventAt

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { data, error } = await admin
    .from('application_contracts')
    .update(update)
    .eq('envelope_id', envelopeId)
    .select('id')

  if (error) {
    console.error('DocuSign Connect update failed', error)
    return res.status(500).json({ error: 'Unable to record Connect event' })
  }

  return res.status(200).json({
    received: true,
    matched: Boolean(data?.length),
    envelopeId,
    status,
  })
}
