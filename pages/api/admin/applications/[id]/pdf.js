import { createClient } from '@supabase/supabase-js'
import { applicationPdfFilename, createApplicationPdf } from '../../../../../lib/admin/applicationPdf'
import { isAdminUser } from '../../../../../lib/admin/stages'

export const config = {
  api: { responseLimit: false },
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
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
  const { data: application, error } = await client.from('applications').select('*').eq('id', id).maybeSingle()
  if (error) return res.status(500).json({ error: 'Unable to load application' })
  if (!application) return res.status(404).json({ error: 'Application not found' })

  try {
    const pdf = await createApplicationPdf(application)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${applicationPdfFilename(application)}"`)
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).send(Buffer.from(pdf))
  } catch (pdfError) {
    console.error('application PDF generation failed', pdfError)
    return res.status(500).json({ error: 'Unable to generate PDF' })
  }
}

