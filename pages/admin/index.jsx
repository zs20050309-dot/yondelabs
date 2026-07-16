import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import ApplicationDetail from '../../components/admin/ApplicationDetail'
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

  const loadApplications = useCallback(async () => {
    const [applicationsResult, historyResult] = await Promise.all([
      supabase.from('applications').select('*').neq('status', 'draft').order('submitted_at', { ascending: false }),
      supabase.from('application_stage_history').select('*').order('changed_at', { ascending: true }),
    ])

    if (applicationsResult.error) throw applicationsResult.error
    if (historyResult.error) throw historyResult.error
    setApplications(applicationsResult.data || [])
    setHistory(historyResult.data || [])
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
      } catch (loadError) {
        setError(loadError.message?.includes('application_stage_history')
          ? 'The admin workflow migration has not been applied yet.'
          : 'Unable to load applications. Check the admin database policies and try again.')
      } finally {
        setLoading(false)
      }
    }
    initialise()
  }, [loadApplications, router])

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
        <div className={styles.titleRow}>
          <div><span className={styles.eyebrow}>Admissions</span><h1>Student applications</h1><p>Review new profiles and move students through each application stage.</p></div>
        </div>

        <section className={styles.stats} aria-label="Application summary">
          <div><span>All applications</span><strong>{counts.total}</strong></div>
          <div><span>New submissions</span><strong>{counts.submitted}</strong></div>
          <div><span>In progress</span><strong>{counts.inProgress}</strong></div>
          <div><span>Archived</span><strong>{counts.archived}</strong></div>
        </section>

        {error ? <div className={styles.error}>{error}</div> : null}

        <section className={styles.tableCard}>
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
              <thead><tr><th>Student</th><th>Program</th><th>Submitted</th><th>Stage</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
              <tbody>
                {filtered.map((application) => {
                  const nextStatus = NEXT_STATUS[application.status]
                  return (
                    <tr key={application.id}>
                      <td><button type="button" className={styles.studentLink} onClick={() => setSelectedId(application.id)}><strong>{studentName(application)}</strong><span>{studentEmail(application)}</span></button></td>
                      <td>{PROGRAM_LABELS[application.program] || application.program}</td>
                      <td>{formatDate(application.submitted_at)}</td>
                      <td><span className={`${styles.status} ${styles[`status_${application.status}`]}`}>{STATUS_LABELS[application.status] || application.status}</span></td>
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
        </section>
      </main>

      {selected ? <><button type="button" className={styles.backdrop} onClick={() => setSelectedId(null)} aria-label="Close profile" /><ApplicationDetail application={selected} history={selectedHistory} moving={movingId === selected.id} onMove={moveApplication} onClose={() => setSelectedId(null)} /></> : null}
    </div>
  )
}

