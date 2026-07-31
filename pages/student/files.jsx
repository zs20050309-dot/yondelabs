import StudentFiles from '../../components/portal/StudentFiles'
import StudentPortalShell, {
  PortalEmpty,
  PortalLoading,
} from '../../components/portal/StudentPortalShell'
import useStudentPortal from '../../lib/portal/useStudentPortal'
import styles from '../../styles/studentPortal.module.css'

export default function FilesPage() {
  const { user, application, loading, error } = useStudentPortal()

  if (loading) return <PortalLoading message="Loading your files..." />
  if (!user) return null

  return (
    <StudentPortalShell
      user={user}
      application={application}
      eyebrow="Resources"
      title="Files"
      description="Find course documents, mentor feedback, templates, and materials shared directly with you."
    >
      {error ? <div className={styles.error}>{error}</div> : null}
      {!error && application ? (
        <StudentFiles applicationId={application.id} showEmpty />
      ) : null}
      {!error && !application ? (
        <PortalEmpty
          title="No files available yet"
          body="Files will appear here after an admin or mentor shares course resources with you."
        />
      ) : null}
    </StudentPortalShell>
  )
}
