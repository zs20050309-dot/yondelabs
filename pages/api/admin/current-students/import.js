import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '../../../../lib/admin/stages'
import {
  DEFAULT_CURRENT_STUDENT_PLANS,
  normalizeCurrentStudent,
} from '../../../../lib/admin/currentStudents'
import { portalIdToInternalEmail } from '../../../../lib/studentPortalCredentials'

function serverClient(key, authorization) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    global: authorization ? { headers: { Authorization: authorization } } : undefined,
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

function temporaryPassword() {
  return `Yl!${randomBytes(12).toString('base64url')}`
}

async function uniquePortalId(client) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const portalId = `YL-${randomBytes(4).toString('hex').toUpperCase()}`
    const { data } = await client.from('student_portal_accounts').select('id').eq('portal_id', portalId).maybeSingle()
    if (!data) return portalId
  }
  throw new Error('Could not generate a unique portal ID')
}

async function findOrCreatePlan(client, program, allowOverage, createdBy) {
  const definition = DEFAULT_CURRENT_STUDENT_PLANS[program]
  const { data: existing } = await client
    .from('course_plans')
    .select('id')
    .eq('name', definition.name)
    .limit(1)
    .maybeSingle()
  if (existing) return existing.id

  const { data, error } = await client.from('course_plans').insert({
    name: definition.name,
    description: 'Course plan for existing students imported into the current-student portal.',
    allow_overage: Boolean(allowOverage || definition.allowOverage),
    created_by: createdBy,
  }).select('id').single()
  if (error) throw error
  return data.id
}

async function onboardStudent(client, adminUser, rawStudent, rowNumber) {
  const student = normalizeCurrentStudent(rawStudent, rowNumber)
  if (student.errors.length) throw new Error(student.errors.join('; '))

  let createdStudentId = null
  let portalUserId = null
  try {
    let duplicateQuery = client.from('current_students').select('id, full_name')
    duplicateQuery = student.email
      ? duplicateQuery.ilike('contact_email', student.email)
      : duplicateQuery.ilike('full_name', student.name).eq('program', student.program)
    const { data: duplicate } = await duplicateQuery.limit(1).maybeSingle()
    if (duplicate) throw new Error('This student is already in Current Students')

    const planId = await findOrCreatePlan(
      client,
      student.program,
      student.allowOverage,
      adminUser.id
    )
    const { data: currentStudent, error: studentError } = await client
      .from('current_students')
      .insert({
        full_name: student.name,
        contact_email: student.email,
        program: student.program,
        source: 'csv_import',
        created_by: adminUser.id,
      })
      .select('id')
      .single()
    if (studentError) throw studentError
    createdStudentId = currentStudent.id

    const { data: enrollment, error: enrollmentError } = await client
      .from('student_course_enrollments')
      .insert({
        application_id: null,
        current_student_id: currentStudent.id,
        course_plan_id: planId,
        allocated_minutes: student.totalMinutes,
        status: 'active',
        created_by: adminUser.id,
      })
      .select('id')
      .single()
    if (enrollmentError) throw enrollmentError

    if (student.allocations.length) {
      const { error } = await client.from('student_hour_allocations').insert(
        student.allocations.map((item, index) => ({
          enrollment_id: enrollment.id,
          label: item.label,
          allocated_minutes: item.allocatedMinutes,
          sort_order: index,
        }))
      )
      if (error) throw error
    }

    for (let index = 0; index < student.mentors.length; index += 1) {
      const mentor = student.mentors[index]
      let { data: mentorRecord } = await client.from('mentors').select('id').ilike('name', mentor.name).limit(1).maybeSingle()
      if (!mentorRecord) {
        const result = await client.from('mentors').insert({ name: mentor.name }).select('id').single()
        if (result.error) throw result.error
        mentorRecord = result.data
      }
      const { error } = await client.from('student_mentor_assignments').insert({
        current_student_id: currentStudent.id,
        mentor_id: mentorRecord.id,
        role: mentor.role,
        sort_order: index,
      })
      if (error) throw error
    }

    const portalId = await uniquePortalId(client)
    const password = temporaryPassword()
    const { data: authData, error: authError } = await client.auth.admin.createUser({
      email: portalIdToInternalEmail(portalId),
      password,
      email_confirm: true,
      app_metadata: { role: 'student_portal', current_student_id: currentStudent.id },
      user_metadata: { portal_id: portalId, preferred_name: student.name },
    })
    if (authError || !authData.user) throw new Error(authError?.message || 'Could not create portal login')
    portalUserId = authData.user.id

    const { error: accountError } = await client.from('student_portal_accounts').insert({
      application_id: null,
      current_student_id: currentStudent.id,
      portal_user_id: portalUserId,
      portal_id: portalId,
      status: 'active',
      must_change_password: true,
      created_by: adminUser.id,
    })
    if (accountError) throw accountError

    return {
      name: student.name,
      email: student.email,
      portalId,
      temporaryPassword: password,
    }
  } catch (error) {
    if (portalUserId) await client.auth.admin.deleteUser(portalUserId)
    if (createdStudentId) await client.from('current_students').delete().eq('id', createdStudentId)
    throw error
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  res.setHeader('Cache-Control', 'private, no-store')

  const authorization = req.headers.authorization || ''
  if (!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' })
  const authClient = serverClient(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, authorization)
  const { data: { user }, error: userError } = await authClient.auth.getUser(authorization.slice(7))
  if (userError || !user) return res.status(401).json({ error: 'Invalid session' })
  if (!isAdminUser(user)) return res.status(403).json({ error: 'Admin access required' })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Student credential service is not configured' })
  }

  const students = Array.isArray(req.body?.students) ? req.body.students : []
  if (!students.length || students.length > 100) {
    return res.status(400).json({ error: 'Import between 1 and 100 students at a time' })
  }

  const adminClient = serverClient(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const imported = []
  const failed = []
  for (let index = 0; index < students.length; index += 1) {
    const rowNumber = Number(students[index]?.rowNumber) || index + 2
    try {
      imported.push(await onboardStudent(adminClient, user, students[index], rowNumber))
    } catch (error) {
      failed.push({ rowNumber, name: students[index]?.name || '', error: error.message })
    }
  }

  return res.status(imported.length ? 200 : 400).json({ imported, failed })
}
