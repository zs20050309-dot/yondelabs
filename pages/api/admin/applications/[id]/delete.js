import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '../../../../../lib/admin/stages'
import { STUDENT_FILES_BUCKET } from '../../../../../lib/studentFiles'

function createServerClient(key, authorization) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    global: authorization ? { headers: { Authorization: authorization } } : undefined,
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  res.setHeader('Cache-Control', 'private, no-store')

  const authorization = req.headers.authorization || ''
  if (!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' })

  const authClient = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, authorization)
  const { data: { user }, error: userError } = await authClient.auth.getUser(authorization.slice(7))
  if (userError || !user) return res.status(401).json({ error: 'Invalid session' })
  if (!isAdminUser(user)) return res.status(403).json({ error: 'Admin access required' })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Application deletion service is not configured' })
  }

  const applicationId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  const adminClient = createServerClient(process.env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    const { data: application, error: applicationError } = await adminClient
      .from('applications')
      .select('id, status, converted_current_student_id')
      .eq('id', applicationId)
      .maybeSingle()
    if (applicationError) throw applicationError
    if (!application) return res.status(404).json({ error: 'Application not found' })
    if (application.status !== 'rejected') {
      return res.status(409).json({ error: 'Archive the application before permanently deleting it' })
    }
    if (application.converted_current_student_id) {
      return res.status(409).json({ error: 'Converted student applications cannot be deleted from the archive' })
    }

    const [{ data: enrollments, error: enrollmentError }, { data: portalAccount, error: portalError }] = await Promise.all([
      adminClient.from('student_course_enrollments').select('id').eq('application_id', applicationId),
      adminClient.from('student_portal_accounts').select('portal_user_id').eq('application_id', applicationId).maybeSingle(),
    ])
    if (enrollmentError) throw enrollmentError
    if (portalError) throw portalError

    const enrollmentIds = (enrollments || []).map((item) => item.id)
    if (enrollmentIds.length) {
      const { data: files, error: filesError } = await adminClient
        .from('student_files')
        .select('storage_path')
        .in('enrollment_id', enrollmentIds)
      if (filesError) throw filesError
      const paths = (files || []).map((file) => file.storage_path).filter(Boolean)
      if (paths.length) {
        const { error: storageError } = await adminClient.storage.from(STUDENT_FILES_BUCKET).remove(paths)
        if (storageError) throw storageError
      }
    }

    const { error: deleteError, count } = await adminClient
      .from('applications')
      .delete({ count: 'exact' })
      .eq('id', applicationId)
      .eq('status', 'rejected')
    if (deleteError) throw deleteError
    if (count !== 1) return res.status(409).json({ error: 'Application status changed before deletion. Reload and try again.' })

    if (portalAccount?.portal_user_id) {
      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(portalAccount.portal_user_id)
      if (authDeleteError) console.error('orphaned portal auth cleanup failed', authDeleteError)
    }

    return res.status(200).json({ deleted: true })
  } catch (error) {
    console.error('application deletion failed', error)
    return res.status(500).json({ error: error.message || 'Unable to permanently delete the application' })
  }
}
