import CourseHours from '../components/portal/CourseHours'
import StudentPortalShell, {
  PortalEmpty,
  PortalLoading,
} from '../components/portal/StudentPortalShell'
import useStudentPortal from '../lib/portal/useStudentPortal'
import styles from '../styles/studentPortal.module.css'

export default function CoursePage() {
  const { user, application, loading, error } = useStudentPortal()

  if (loading) return <PortalLoading message="Loading your course..." />
  if (!user) return null

  return (
    <StudentPortalShell
      user={user}
      application={application}
      eyebrow="Learning"
      title="My course"
      description="Follow your course hours, current milestone, modules, and completed classes in one place."
    >
      {error ? <div className={styles.error}>{error}</div> : null}
      {!error && application ? (
        <CourseHours applicationId={application.id} showEmpty />
      ) : null}
      {!error && !application ? (
        <PortalEmpty
          title="No course is assigned yet"
          body="Your course details will appear here after your application is accepted and the Yonde Labs team assigns your program plan."
        />
      ) : null}
    </StudentPortalShell>
  )
}
