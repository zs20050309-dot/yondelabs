import CourseHours from '../../components/portal/CourseHours'
import StudentPortalShell, {
  PortalEmpty,
  PortalLoading,
} from '../../components/portal/StudentPortalShell'
import useStudentPortal from '../../lib/portal/useStudentPortal'
import styles from '../../styles/studentPortal.module.css'

export default function CoursePage() {
  const { user, application, currentStudent, loading, error } = useStudentPortal()
  const profile = currentStudent || application

  if (loading) return <PortalLoading message="Loading your course..." />
  if (!user) return null

  return (
    <StudentPortalShell
      user={user}
      application={application}
      currentStudent={currentStudent}
      eyebrow="Learning"
      title="My course"
      description="Follow your course hours, current milestone, modules, and completed classes in one place."
    >
      {error ? <div className={styles.error}>{error}</div> : null}
      {!error && profile ? (
        <CourseHours applicationId={application?.id} currentStudentId={currentStudent?.id} mentors={currentStudent?.student_mentor_assignments} showEmpty />
      ) : null}
      {!error && !profile ? (
        <PortalEmpty
          title="No course is assigned yet"
          body="Your course details will appear after the Yonde Labs team assigns your program plan."
        />
      ) : null}
    </StudentPortalShell>
  )
}
