import Link from 'next/link'
import StudentPortalShell, {
  PortalLoading,
  PROGRAM_LABELS,
} from '../../components/portal/StudentPortalShell'
import useStudentPortal from '../../lib/portal/useStudentPortal'
import styles from '../../styles/studentPortal.module.css'

export default function StudentPortalHome() {
  const { user, application, currentStudent, portalAccount, loading, error } = useStudentPortal()

  if (loading) return <PortalLoading />
  if (!user) return null

  const name = currentStudent?.full_name || user.user_metadata?.preferred_name || 'Student'
  const profile = currentStudent || application
  const program = PROGRAM_LABELS[profile?.program] || profile?.program || 'Your program'

  return (
    <StudentPortalShell
      user={user}
      application={application}
      currentStudent={currentStudent}
      eyebrow="Program workspace"
      title={`Welcome, ${name}`}
      description="Your course progress and resources are organized here, separately from your application account."
    >
      {error ? <div className={styles.error}>{error}</div> : null}
      {!error ? (
        <>
          <section className={styles.homeSummary} aria-label="Portal summary">
            <div>
              <span className={styles.summaryIcon} aria-hidden>Y</span>
              <div><span>Portal ID</span><strong>{portalAccount?.portal_id}</strong></div>
            </div>
            <div>
              <span className={styles.summaryIcon} aria-hidden>01</span>
              <div><span>Program</span><strong>{program}</strong></div>
            </div>
            <div>
              <span className={`${styles.summaryIcon} ${styles.summaryActive}`} aria-hidden>✓</span>
              <div><span>Access</span><strong>Active</strong></div>
            </div>
          </section>

          <section className={styles.workspaceCards} aria-label="Student workspace">
            <Link href="/student/course" className={styles.workspaceCard}>
              <span className={`${styles.workspaceVisual} ${styles.courseVisual}`} aria-hidden><i /><i /><i /></span>
              <div>
                <span>Learning progress</span>
                <h2>My course</h2>
                <p>Review hours, milestones, modules, and your completed classes.</p>
                <strong className={styles.cardAction}>Open my course <span aria-hidden>→</span></strong>
              </div>
            </Link>
            <Link href="/student/files" className={styles.workspaceCard}>
              <span className={`${styles.workspaceVisual} ${styles.filesVisual}`} aria-hidden><i /><i /></span>
              <div>
                <span>Private resources</span>
                <h2>Files</h2>
                <p>Download materials, templates, and feedback shared with you.</p>
                <strong className={styles.cardAction}>Browse my files <span aria-hidden>→</span></strong>
              </div>
            </Link>
          </section>
        </>
      ) : null}
    </StudentPortalShell>
  )
}
