import Link from 'next/link'
import StudentPortalShell, {
  PortalLoading,
  PROGRAM_LABELS,
} from '../../components/portal/StudentPortalShell'
import useStudentPortal from '../../lib/portal/useStudentPortal'
import styles from '../../styles/studentPortal.module.css'

export default function StudentPortalHome() {
  const { user, application, portalAccount, loading, error } = useStudentPortal()

  if (loading) return <PortalLoading />
  if (!user) return null

  const name =
    user.user_metadata?.preferred_name || 'Student'
  const program =
    PROGRAM_LABELS[application?.program] || application?.program || 'Your program'

  return (
    <StudentPortalShell
      user={user}
      application={application}
      eyebrow="Program workspace"
      title={`Welcome, ${name}`}
      description="Your course progress and resources are organized here, separately from your application account."
    >
      {error ? <div className={styles.error}>{error}</div> : null}
      {!error ? (
        <>
          <section className={styles.homeSummary}>
            <div>
              <span>Portal ID</span>
              <strong>{portalAccount?.portal_id}</strong>
            </div>
            <div>
              <span>Program</span>
              <strong>{program}</strong>
            </div>
            <div>
              <span>Access</span>
              <strong>Active</strong>
            </div>
          </section>

          <section className={styles.workspaceCards} aria-label="Student workspace">
            <Link href="/student/course" className={styles.workspaceCard}>
              <span className={styles.workspaceNumber}>01</span>
              <div>
                <span>Learning progress</span>
                <h2>My course</h2>
                <p>Review hours, milestones, modules, and your completed classes.</p>
              </div>
              <strong aria-hidden>→</strong>
            </Link>
            <Link href="/student/files" className={styles.workspaceCard}>
              <span className={styles.workspaceNumber}>02</span>
              <div>
                <span>Private resources</span>
                <h2>Files</h2>
                <p>Download materials, templates, and feedback shared with you.</p>
              </div>
              <strong aria-hidden>→</strong>
            </Link>
          </section>
        </>
      ) : null}
    </StudentPortalShell>
  )
}
