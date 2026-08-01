import StudentFiles from '../../components/portal/StudentFiles'
import StudentPortalShell, {
  PortalEmpty,
  PortalLoading,
} from '../../components/portal/StudentPortalShell'
import useStudentPortal from '../../lib/portal/useStudentPortal'
import styles from '../../styles/studentPortal.module.css'

export default function FilesPage() {
  const { user, application, currentStudent, loading, error } = useStudentPortal()
  const profile = currentStudent || application

  if (loading) return <PortalLoading message="Loading your files..." />
  if (!user) return null

  return (
    <StudentPortalShell
      user={user}
      application={application}
      currentStudent={currentStudent}
      eyebrow="Resources"
      title="Files"
      description="Find course documents, mentor feedback, templates, and materials shared directly with you."
    >
      {error ? <div className={styles.error}>{error}</div> : null}
      {!error && profile ? (
        <StudentFiles applicationId={application?.id} currentStudentId={currentStudent?.id} showEmpty />
      ) : null}
      {!error && !profile ? (
        <PortalEmpty
          title="No files available yet"
          body="Files will appear here after an admin or mentor shares course resources with you."
        />
      ) : null}
    </StudentPortalShell>
  )
}
