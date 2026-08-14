import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import AdminShell from '../../components/admin/AdminShell'
import ApplicationDetail from '../../components/admin/ApplicationDetail'
import { ConfirmProvider, useConfirm } from '../../components/admin/ConfirmProvider'
import CoursePlanManager from '../../components/admin/CoursePlanManager'
import CurrentStudents from '../../components/admin/CurrentStudents'
import MentorPayments from '../../components/admin/MentorPayments'
import Spinner from '../../components/admin/Spinner'
import { ToastProvider, useToast } from '../../components/admin/ToastProvider'
import { supabase } from '../../lib/supabaseClient'
import { useAdminTheme } from '../../lib/admin/useAdminTheme'
import {
  NEXT_STATUS,
  PROGRAM_LABELS,
  STATUS_LABELS,
  isAdminUser,
  studentEmail,
  studentName,
} from '../../lib/admin/stages'
import styles from '../../styles/admin.module.css'
import { formatHours, sumMinutes } from '../../lib/courseHours'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminDashboard() {
  const { theme, toggleTheme } = useAdminTheme()
  return (
    <div className={styles.shell} data-theme={theme}>
      <ToastProvider>
        <ConfirmProvider>
          <AdminDashboardInner theme={theme} toggleTheme={toggleTheme} />
        </ConfirmProvider>
      </ToastProvider>
    </div>
  )
}

function AdminDashboardInner({ theme, toggleTheme }) {
  const router = useRouter()
  const confirm = useConfirm()
  const showToast = useToast()
  const [user, setUser] = useState(null)
  const [applications, setApplications] = useState([])
  const [history, setHistory] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [movingId, setMovingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [showCoursePlans, setShowCoursePlans] = useState(false)
  const [section, setSection] = useState('applications')
  const [currentStudents, setCurrentStudents] = useState([])
  const [currentStudentsLoading, setCurrentStudentsLoading] = useState(true)
  const [currentStudentsError, setCurrentStudentsError] = useState('')

  const loadApplications = useCallback(async () => {
    const [applicationsResult, historyResult] = await Promise.all([
      supabase.from('applications').select('*, student_course_enrollments(id, allocated_minutes, status, created_at, class_sessions(duration_minutes))').neq('status', 'draft').is('converted_current_student_id', null).order('submitted_at', { ascending: false }),
      supabase.from('application_stage_history').select('*').order('changed_at', { ascending: true }),
    ])

    if (applicationsResult.error) throw applicationsResult.error
    if (historyResult.error) throw historyResult.error
    setApplications(applicationsResult.data || [])
    setHistory(historyResult.data || [])
  }, [])

  const loadCurrentStudents = useCallback(async () => {
    setCurrentStudentsLoading(true)
    const { data, error: loadError } = await supabase
      .from('current_students')
      .select(`
        *,
        student_course_enrollments(
          id, allocated_minutes, status, created_at,
          course_plans(id, name, allow_overage),
          class_sessions(duration_minutes),
          student_hour_allocations(id, label, allocated_minutes, sort_order)
        ),
        student_mentor_assignments(id, role, sort_order, mentors(id, name)),
        student_portal_accounts(portal_id, status, must_change_password)
      `)
      .order('created_at', { ascending: false })

    if (loadError) {
      setCurrentStudentsError('Apply the 2026-08-01 current students migration, then reload this page.')
      setCurrentStudents([])
    } else {
      setCurrentStudentsError('')
      setCurrentStudents(data || [])
    }
    setCurrentStudentsLoading(false)
  }, [])

  useEffect(() => {
    async function initialise() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
          router.replace('/login')
          return
        }
        if (!isAdminUser(currentUser)) {
          router.replace('/dashboard')
          return
        }
        setUser(currentUser)
        await loadApplications()
        await loadCurrentStudents()
      } catch (loadError) {
        setError(loadError.message?.includes('application_stage_history')
          ? 'The admin workflow migration has not been applied yet.'
          : 'Unable to load applications. Check the admin database policies and try again.')
      } finally {
        setLoading(false)
      }
    }
    initialise()
  }, [loadApplications, loadCurrentStudents, router])

  const activeApplications = useMemo(
    () => applications.filter((application) => application.status !== 'rejected'),
    [applications]
  )
  const archivedApplications = useMemo(
    () => applications.filter((application) => application.status === 'rejected'),
    [applications]
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const source = section === 'archived' ? archivedApplications : activeApplications
    return source.filter((application) => {
      const matchesStatus = section === 'archived' || statusFilter === 'all' || application.status === statusFilter
      const haystack = `${studentName(application)} ${studentEmail(application)} ${PROGRAM_LABELS[application.program] || application.program}`.toLowerCase()
      return matchesStatus && (!normalized || haystack.includes(normalized))
    })
  }, [activeApplications, archivedApplications, query, section, statusFilter])

  const selected = applications.find((application) => application.id === selectedId) || null
  const selectedHistory = history.filter((item) => item.application_id === selectedId)
  const counts = {
    total: activeApplications.length,
    submitted: activeApplications.filter((item) => item.status === 'submitted').length,
    inProgress: activeApplications.filter((item) => item.status === 'interview').length,
    offers: activeApplications.filter((item) => item.status === 'offer').length,
  }
  const currentCounts = {
    total: currentStudents.length,
    active: currentStudents.filter((item) => item.status === 'active').length,
    paused: currentStudents.filter((item) => item.status === 'paused').length,
    completed: currentStudents.filter((item) => item.status === 'completed').length,
  }

  async function moveApplication(application, nextStatus) {
    const label = STATUS_LABELS[nextStatus] || nextStatus
    const ok = await confirm({ title: 'Move application stage', message: `Move ${studentName(application)} to "${label}"?` })
    if (!ok) return

    setMovingId(application.id)
    setError('')
    const { error: moveError } = await supabase.rpc('advance_application_stage', {
      p_application_id: application.id,
      p_next_status: nextStatus,
      p_note: null,
    })

    if (moveError) {
      setError(moveError.message || 'The stage could not be updated.')
    } else {
      await loadApplications()
      showToast(`Moved ${studentName(application)} to ${label}.`)
      if (nextStatus === 'rejected') {
        setSelectedId(null)
        setSection('archived')
      } else if (application.status === 'rejected') {
        setSelectedId(null)
        setSection('applications')
      }
    }
    setMovingId(null)
  }

  async function convertToCurrentStudent(application) {
    const ok = await confirm({ title: 'Enroll as current student', message: `Enroll ${studentName(application)} as a current student? They will leave the active Applications list.` })
    if (!ok) return
    setMovingId(application.id)
    setError('')
    const { error: convertError } = await supabase.rpc('convert_application_to_current_student', {
      p_application_id: application.id,
    })

    if (convertError) {
      setError(convertError.message || 'The application could not be converted.')
    } else {
      setSelectedId(null)
      await Promise.all([loadApplications(), loadCurrentStudents()])
      showToast(`${studentName(application)} enrolled as a current student.`)
      setSection('students')
    }
    setMovingId(null)
  }

  async function deleteApplication(application) {
    const name = studentName(application)
    const ok = await confirm({
      title: 'Permanently delete this application',
      message: `This removes the application, stage history, course records, portal access, and uploaded files for ${name}. This cannot be undone.`,
      requireText: name,
      danger: true,
      confirmLabel: 'Delete permanently',
    })
    if (!ok) return

    setDeletingId(application.id)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Please sign in again.')
      const response = await fetch(`/api/admin/applications/${application.id}/delete`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'The application could not be deleted.')
      setSelectedId(null)
      await loadApplications()
      showToast(`${name}'s application was permanently deleted.`)
    } catch (deleteError) {
      setError(deleteError.message || 'The application could not be deleted.')
    } finally {
      setDeletingId(null)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return <div className={styles.loading}><Spinner label="Loading Yonde Admin…" /></div>
  if (!user) return null

  return (
    <AdminShell
      theme={theme}
      onToggleTheme={toggleTheme}
      section={section}
      onSectionChange={setSection}
      archivedCount={archivedApplications.length}
      onSignOut={signOut}
    >
      <div className={styles.titleRow}>
        {section === 'applications'
          ? <div><span className={styles.eyebrow}>Admissions</span><h1>Student applications</h1><p>Review new profiles and move students through each application stage.</p></div>
          : section === 'students'
            ? <div><span className={styles.eyebrow}>Programs</span><h1>Current students</h1><p>Manage enrolled students, course hours, mentors, files, and portal access.</p></div>
            : section === 'payments'
              ? <div><span className={styles.eyebrow}>Accounting</span><h1>Mentor payments</h1><p>Track what's owed to mentors from logged classes and completed milestones, and mark what's been paid.</p></div>
              : <div><span className={styles.eyebrow}>Admissions archive</span><h1>Archived applications</h1><p>Review withdrawn or declined applications separately from active admissions.</p></div>}
        {section !== 'archived' && section !== 'payments' ? <button type="button" className={styles.primaryButton} onClick={() => setShowCoursePlans(true)}>Manage course plans</button> : null}
      </div>

      {section === 'applications' ? (
        <section className={styles.stats} aria-label="Application summary">
          <div><span>All applications</span><strong>{counts.total}</strong></div>
          <div><span>New submissions</span><strong>{counts.submitted}</strong></div>
          <div><span>In progress</span><strong>{counts.inProgress}</strong></div>
          <div><span>Offers sent</span><strong>{counts.offers}</strong></div>
        </section>
      ) : section === 'students' ? (
        <section className={styles.stats} aria-label="Current student summary">
          <div><span>All current students</span><strong>{currentCounts.total}</strong></div>
          <div><span>Active</span><strong>{currentCounts.active}</strong></div>
          <div><span>Paused</span><strong>{currentCounts.paused}</strong></div>
          <div><span>Completed</span><strong>{currentCounts.completed}</strong></div>
        </section>
      ) : section === 'archived' ? (
        <section className={styles.stats} aria-label="Archived application summary">
          <div><span>Archived applications</span><strong>{archivedApplications.length}</strong></div>
        </section>
      ) : null}

      {(section === 'applications' || section === 'archived') && error ? <div className={styles.error}>{error}</div> : null}
      {section === 'students' && currentStudentsError ? <div className={styles.error}>{currentStudentsError}</div> : null}

      {section === 'payments' ? <MentorPayments /> : section !== 'students' ? <section className={styles.tableCard}>
        <div className={styles.toolbar}>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or program" aria-label="Search applications" />
          {section === 'applications' ? <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by stage">
            <option value="all">All stages</option>
            <option value="submitted">Submitted</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer sent</option>
          </select> : null}
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Student</th><th>Program</th><th>Submitted</th><th>Stage</th><th>Course hours</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
            <tbody>
              {filtered.map((application) => {
                const nextStatus = NEXT_STATUS[application.status]
                const enrollment = [...(application.student_course_enrollments || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
                const usedMinutes = sumMinutes(enrollment?.class_sessions)
                return (
                  <tr key={application.id}>
                    <td><button type="button" className={styles.studentLink} onClick={() => setSelectedId(application.id)}><strong>{studentName(application)}</strong><span>{studentEmail(application)}</span></button></td>
                    <td>{PROGRAM_LABELS[application.program] || application.program}</td>
                    <td>{formatDate(application.submitted_at)}</td>
                    <td><span className={`${styles.status} ${styles[`status_${application.status}`]}`}>{STATUS_LABELS[application.status] || application.status}</span></td>
                    <td>{enrollment ? <span className={styles.courseHoursCell}><strong>{formatHours(usedMinutes)}</strong><span> / {formatHours(enrollment.allocated_minutes)}</span></span> : <span className={styles.noCourse}>Not assigned</span>}</td>
                    <td className={styles.rowActions}>
                      <button type="button" className={styles.viewButton} onClick={() => setSelectedId(application.id)}>View profile</button>
                      {nextStatus ? <button type="button" className={styles.moveButton} disabled={movingId === application.id} onClick={() => moveApplication(application, nextStatus)}>{movingId === application.id ? 'Updating…' : `Move to ${STATUS_LABELS[nextStatus]}`}</button> : null}
                      {application.status === 'offer' ? <button type="button" className={styles.moveButton} disabled={movingId === application.id} onClick={() => convertToCurrentStudent(application)}>{movingId === application.id ? 'Enrolling...' : 'Enroll student'}</button> : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filtered.length ? <div className={styles.empty}>{section === 'archived' ? 'No archived applications.' : 'No applications match these filters.'}</div> : null}
        </div>
      </section> : <CurrentStudents students={currentStudents} loading={currentStudentsLoading} />}

      {selected ? <><button type="button" className={styles.backdrop} onClick={() => setSelectedId(null)} aria-label="Close profile" /><ApplicationDetail application={selected} history={selectedHistory} moving={movingId === selected.id} deleting={deletingId === selected.id} onMove={moveApplication} onConvert={convertToCurrentStudent} onDelete={deleteApplication} onOfferSent={loadApplications} onClose={() => setSelectedId(null)} /></> : null}
      {showCoursePlans ? <><button type="button" className={styles.backdrop} onClick={() => setShowCoursePlans(false)} aria-label="Close course plans" /><CoursePlanManager onClose={() => setShowCoursePlans(false)} /></> : null}
    </AdminShell>
  )
}
