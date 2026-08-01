import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import ApplicationDetail from '../../components/admin/ApplicationDetail'
import CoursePlanManager from '../../components/admin/CoursePlanManager'
import CurrentStudents from '../../components/admin/CurrentStudents'
import { supabase } from '../../lib/supabaseClient'
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
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [applications, setApplications] = useState([])
  const [history, setHistory] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [movingId, setMovingId] = useState(null)
  const [error, setError] = useState('')
  const [showCoursePlans, setShowCoursePlans] = useState(false)
  const [section, setSection] = useState('applications')
  const [currentStudents, setCurrentStudents] = useState([])
  const [currentStudentsLoading, setCurrentStudentsLoading] = useState(true)
  const [currentStudentsError, setCurrentStudentsError] = useState('')

  const loadApplications = useCallback(async () => {
    const [applicationsResult, historyResult] = await Promise.all([
      supabase.from('applications').select('*, student_course_enrollments(id, allocated_minutes, status, created_at, class_sessions(duration_minutes))').neq('status', 'draft').order('submitted_at', { ascending: false }),
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

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return applications.filter((application) => {
      const matchesStatus = statusFilter === 'all' || application.status === statusFilter
      const haystack = `${studentName(application)} ${studentEmail(application)} ${PROGRAM_LABELS[application.program] || application.program}`.toLowerCase()
      return matchesStatus && (!normalized || haystack.includes(normalized))
    })
  }, [applications, query, statusFilter])

  const selected = applications.find((application) => application.id === selectedId) || null
  const selectedHistory = history.filter((item) => item.application_id === selectedId)
  const counts = {
    total: applications.length,
    submitted: applications.filter((item) => item.status === 'submitted').length,
    inProgress: applications.filter((item) => ['interview', 'offer'].includes(item.status)).length,
    archived: applications.filter((item) => item.status === 'rejected').length,
  }
  const currentCounts = {
    total: currentStudents.length,
    active: currentStudents.filter((item) => item.status === 'active').length,
    paused: currentStudents.filter((item) => item.status === 'paused').length,
    completed: currentStudents.filter((item) => item.status === 'completed').length,
  }

  async function moveApplication(application, nextStatus) {
    const label = STATUS_LABELS[nextStatus] || nextStatus
    if (!window.confirm(`Move ${studentName(application)} to “${label}”?`)) return

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
    }
    setMovingId(null)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return <div className={styles.loading}>Loading Yonde Admin…</div>
  if (!user) return null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src="/images/logos/yondelabs-logo.svg" alt="YondeLabs" />
          <span>Admin</span>
        </div>
        <button type="button" className={styles.signOut} onClick={signOut}>Log out</button>
      </header>

      <main className={styles.main}>
        <nav className={styles.adminTabs} aria-label="Admin sections">
          <button type="button" className={section === 'applications' ? styles.adminTabActive : styles.adminTab} onClick={() => setSection('applications')}>Applications</button>
          <button type="button" className={section === 'students' ? styles.adminTabActive : styles.adminTab} onClick={() => setSection('students')}>Current students</button>
        </nav>
        <div className={styles.titleRow}>
          {section === 'applications'
            ? <div><span className={styles.eyebrow}>Admissions</span><h1>Student applications</h1><p>Review new profiles and move students through each application stage.</p></div>
            : <div><span className={styles.eyebrow}>Programs</span><h1>Current students</h1><p>Manage enrolled students, course hours, mentors, files, and portal access.</p></div>}
          <button type="button" className={styles.primaryButton} onClick={() => setShowCoursePlans(true)}>Manage course plans</button>
        </div>

        {section === 'applications' ? (
          <section className={styles.stats} aria-label="Application summary">
            <div><span>All applications</span><strong>{counts.total}</strong></div>
            <div><span>New submissions</span><strong>{counts.submitted}</strong></div>
            <div><span>In progress</span><strong>{counts.inProgress}</strong></div>
            <div><span>Archived</span><strong>{counts.archived}</strong></div>
          </section>
        ) : (
          <section className={styles.stats} aria-label="Current student summary">
            <div><span>All current students</span><strong>{currentCounts.total}</strong></div>
            <div><span>Active</span><strong>{currentCounts.active}</strong></div>
            <div><span>Paused</span><strong>{currentCounts.paused}</strong></div>
            <div><span>Completed</span><strong>{currentCounts.completed}</strong></div>
          </section>
        )}

        {section === 'applications' && error ? <div className={styles.error}>{error}</div> : null}
        {section === 'students' && currentStudentsError ? <div className={styles.error}>{currentStudentsError}</div> : null}

        {section === 'applications' ? <section className={styles.tableCard}>
          <div className={styles.toolbar}>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or program" aria-label="Search applications" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by stage">
              <option value="all">All stages</option>
              <option value="submitted">Submitted</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer sent</option>
              <option value="rejected">Archived</option>
            </select>
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
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!filtered.length ? <div className={styles.empty}>No applications match these filters.</div> : null}
          </div>
        </section> : <CurrentStudents students={currentStudents} loading={currentStudentsLoading} onReload={loadCurrentStudents} />}
      </main>

      {selected ? <><button type="button" className={styles.backdrop} onClick={() => setSelectedId(null)} aria-label="Close profile" /><ApplicationDetail application={selected} history={selectedHistory} moving={movingId === selected.id} onMove={moveApplication} onClose={() => setSelectedId(null)} /></> : null}
      {showCoursePlans ? <><button type="button" className={styles.backdrop} onClick={() => setShowCoursePlans(false)} aria-label="Close course plans" /><CoursePlanManager onClose={() => setShowCoursePlans(false)} /></> : null}
    </div>
  )
}
