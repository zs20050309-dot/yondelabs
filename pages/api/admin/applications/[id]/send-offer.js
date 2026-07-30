import { createClient } from '@supabase/supabase-js'
import { PROGRAM_LABELS, isAdminUser } from '../../../../../lib/admin/stages'
import { sendOfferEnvelope } from '../../../../../lib/docusign'

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
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } }
  )

  const { data: { user }, error: userError } = await client.auth.getUser(authorization.slice(7))
  if (userError || !user) return res.status(401).json({ error: 'Invalid session' })
  if (!isAdminUser(user)) return res.status(403).json({ error: 'Admin access required' })

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  const { data: application, error: applicationError } = await client
    .from('applications')
    .select('*, application_contracts(*)')
    .eq('id', id)
    .maybeSingle()

  if (applicationError) return res.status(500).json({ error: 'Unable to load application' })
  if (!application) return res.status(404).json({ error: 'Application not found' })
  const existingContract = Array.isArray(application.application_contracts)
    ? application.application_contracts[0]
    : application.application_contracts
  if (existingContract) {
    return res.status(409).json({ error: 'An offer contract has already been sent for this application.' })
  }
  if (application.status !== 'interview') {
    return res.status(409).json({ error: 'The application must be in the interview stage before sending an offer.' })
  }

  try {
    const envelope = await sendOfferEnvelope(
      application,
      PROGRAM_LABELS[application.program] || application.program || 'program'
    )
    const { data: contract, error: recordError } = await client.rpc('record_docusign_offer', {
      p_application_id: application.id,
      p_envelope_id: envelope.envelopeId,
      p_template_id: envelope.templateId,
      p_status: envelope.status,
      p_recipient_name: envelope.student.name,
      p_recipient_email: envelope.student.email,
      p_guardian_name: envelope.guardian?.name || null,
      p_guardian_email: envelope.guardian?.email || null,
      p_sent_at: envelope.statusDateTime,
    })

    if (recordError) {
      console.error('DocuSign envelope sent but database recording failed', {
        applicationId: application.id,
        envelopeId: envelope.envelopeId,
        error: recordError,
      })
      return res.status(502).json({
        error: 'DocuSign sent the contract, but the portal could not record it. Contact support before retrying.',
        envelopeId: envelope.envelopeId,
      })
    }

    return res.status(200).json({ sent: true, envelopeId: envelope.envelopeId, contract })
  } catch (error) {
    console.error('DocuSign offer send failed', error)
    return res.status(502).json({ error: error.message || 'Unable to send the DocuSign offer.' })
  }
}
