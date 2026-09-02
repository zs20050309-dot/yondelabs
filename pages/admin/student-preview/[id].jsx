import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../../../lib/supabaseClient'
import StudentJourneyView from '../../../components/portal/StudentJourneyView'
import { PROGRAM_LABELS } from '../../../components/portal/StudentPortalShell'
import useStudentJourney from '../../../lib/portal/useStudentJourney'
import styles from '../../../styles/studentPortal.module.css'
import previewStyles from '../../../styles/adminPreview.module.css'

/**
 * Read-only view of exactly what one student sees on /student.
 *
 * Deliberately NOT impersonation: no session is swapped and no student password
 * is reset. Admins already hold RLS read access to every table behind these
 * sections (`is_yonde_admin()`), so the same components render from the admin's
 * own session. Nothing here can write.
 *
 * Route protection comes from proxy.js, which gates /admin/* on role === 'admin'.
 */
export default function StudentPortalPreview() {
  const router = useRouter()
  const { id } = router.query
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return undefined
    let active = true

    async function load() {
      const { data, error: loadError } = await supabase
        .from('current_students')
        .select('id, full_name, program, status, student_mentor_assignments(id, role, sort_order, mentors(id, name))')
        .eq('id', id)
        .maybeSingle()

      if (!active) return
      if (loadError || !data) setError('That student could not be loaded.')
      else setStudent(data)
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [id])

  const journey = useStudentJourney({
    currentStudentId: student?.id,
    fallbackTeam: student?.student_mentor_assignments,
  })

  const programName = journey.plan?.name
    || PROGRAM_LABELS[student?.program]
    || student?.program
    || 'Your program'

  return (
    <div className={styles.page}>
      <div className={previewStyles.banner} role="status">
        <div>
          <strong>Read-only preview</strong>
          <span>
            {student ? `This is what ${student.full_name} sees at /student.` : 'Loading student…'}
            {' '}Nothing on this page can be edited.
          </span>
        </div>
        <Link href="/admin" className={previewStyles.bannerBack}>Back to admin</Link>
      </div>

      <main className={styles.main}>
        <div className={styles.mainInner}>
          {loading ? <p className={previewStyles.state}>Loading preview…</p> : null}
          {error ? <p className={previewStyles.state}>{error}</p> : null}

          {!loading && !error && student ? (
            <>
              <section className={styles.pageHeader}>
                <div>
                  <span className={styles.eyebrow}>Program workspace</span>
                  <h1>Welcome, {student.full_name}</h1>
                  <p>Your learning journey, project progress, team, and materials in one place.</p>
                </div>
              </section>
              <StudentJourneyView
                journey={journey}
                currentStudent={student}
                programName={programName}
              />
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
