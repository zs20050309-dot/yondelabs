import { createClient } from '@supabase/supabase-js'
import { createOfferLetterPdf, offerLetterFilename } from '../../../../../lib/admin/offerLetterPdf'
import { validateOfferLetterData } from '../../../../../lib/admin/offerLetterTemplates'
import { isAdminUser } from '../../../../../lib/admin/stages'

export const config = { api: { responseLimit: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  res.setHeader('Cache-Control', 'private, no-store')

  const authorization = req.headers.authorization || ''
  if (!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' })

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } }
  )
  const token = authorization.slice(7)
  const { data: { user }, error: userError } = await client.auth.getUser(token)
  if (userError || !user) return res.status(401).json({ error: 'Invalid session' })
  if (!isAdminUser(user)) return res.status(403).json({ error: 'Admin access required' })

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  const { data: application, error: applicationError } = await client
    .from('applications').select('*').eq('id', id).maybeSingle()
  if (applicationError) return res.status(500).json({ error: 'Unable to load application.' })
  if (!application) return res.status(404).json({ error: 'Application not found.' })
  if (!['interview', 'offer'].includes(application.status)) {
    return res.status(409).json({ error: 'Offer letters are available during the Interview and Offer sent stages.' })
  }

  const validation = validateOfferLetterData(application.program, req.body)
  if (validation.error) return res.status(422).json({ error: validation.error })

  try {
    const pdf = await createOfferLetterPdf(application, validation.data)
    const filename = offerLetterFilename(application, validation.data)
    const disposition = req.query.download === '1' ? 'attachment' : 'inline'
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`)
    return res.status(200).send(Buffer.from(pdf))
  } catch (error) {
    console.error('offer letter preview failed', { applicationId: application.id, error: error.message || String(error) })
    return res.status(500).json({ error: 'The offer-letter PDF could not be generated.' })
  }
}
