import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '../../../../../lib/admin/stages'
import { portalIdToInternalEmail } from '../../../../../lib/studentPortalCredentials'

function createServerClient(key, authorization) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    global: authorization ? { headers: { Authorization: authorization } } : undefined,
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

function temporaryPassword() {
  return `Yl!${randomBytes(12).toString('base64url')}`
}

async function uniquePortalId(adminClient) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const portalId = `YL-${randomBytes(4).toString('hex').toUpperCase()}`
    const { data } = await adminClient.from('student_portal_accounts').select('id').eq('portal_id', portalId).maybeSingle()
    if (!data) return portalId
  }
  throw new Error('Unable to generate a unique portal ID')
}

export default async function handler(req, res) {
  if (!['POST', 'PUT'].includes(req.method)) {
    res.setHeader('Allow', 'POST, PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  res.setHeader('Cache-Control', 'private, no-store')

  const authorization = req.headers.authorization || ''
  if (!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' })
  const anonClient = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, authorization)
  const { data: { user }, error: userError } = await anonClient.auth.getUser(authorization.slice(7))
  if (userError || !user) return res.status(401).json({ error: 'Invalid session' })
  if (!isAdminUser(user)) return res.status(403).json({ error: 'Admin access required' })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Student credential service is not configured' })
  }

  const studentId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  const adminClient = createServerClient(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const [{ data: student }, { data: enrollment }, { data: existingAccount }] = await Promise.all([
    adminClient.from('current_students').select('*').eq('id', studentId).maybeSingle(),
    adminClient.from('student_course_enrollments').select('id').eq('current_student_id', studentId).limit(1).maybeSingle(),
    adminClient.from('student_portal_accounts').select('*').eq('current_student_id', studentId).maybeSingle(),
  ])

  if (!student) return res.status(404).json({ error: 'Current student not found' })
  if (!enrollment) return res.status(409).json({ error: 'Assign a course before creating portal access' })

  try {
    if (req.method === 'POST') {
      if (existingAccount) return res.status(409).json({ error: 'Portal access already exists. Reset the temporary password instead.' })
      const portalId = await uniquePortalId(adminClient)
      const password = temporaryPassword()
      const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
        email: portalIdToInternalEmail(portalId),
        password,
        email_confirm: true,
        app_metadata: { role: 'student_portal', current_student_id: studentId },
        user_metadata: { portal_id: portalId, preferred_name: student.full_name },
      })
      if (createError || !authData.user) throw new Error(createError?.message || 'Unable to create the portal login')

      const { data: account, error: accountError } = await adminClient.from('student_portal_accounts').insert({
        application_id: null,
        current_student_id: studentId,
        portal_user_id: authData.user.id,
        portal_id: portalId,
        status: 'active',
        must_change_password: true,
        created_by: user.id,
      }).select('portal_id, status, must_change_password, created_at').single()
      if (accountError) {
        await adminClient.auth.admin.deleteUser(authData.user.id)
        throw accountError
      }
      return res.status(201).json({ account, temporaryPassword: password })
    }

    if (!existingAccount) return res.status(404).json({ error: 'Create portal access before resetting it' })
    const password = temporaryPassword()
    const { error: passwordError } = await adminClient.auth.admin.updateUserById(existingAccount.portal_user_id, { password })
    if (passwordError) throw passwordError
    const { data: account, error: updateError } = await adminClient.from('student_portal_accounts').update({
      must_change_password: true,
      activated_at: null,
      updated_at: new Date().toISOString(),
    }).eq('id', existingAccount.id).select('portal_id, status, must_change_password, created_at').single()
    if (updateError) throw updateError
    return res.status(200).json({ account, temporaryPassword: password })
  } catch (error) {
    console.error('current student portal credential operation failed', error)
    return res.status(500).json({ error: error.message || 'Unable to manage student portal credentials' })
  }
}
