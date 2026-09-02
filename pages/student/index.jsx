import StudentPortalShell, {
  PortalLoading,
  PROGRAM_LABELS,
} from '../../components/portal/StudentPortalShell'
import StudentJourneyView from '../../components/portal/StudentJourneyView'
import useStudentPortal from '../../lib/portal/useStudentPortal'
import useStudentJourney from '../../lib/portal/useStudentJourney'
import styles from '../../styles/studentPortal.module.css'

export default function StudentPortalHome() {
  const { user, application, currentStudent, portalAccount, loading, error } = useStudentPortal()
  const journey = useStudentJourney({
    applicationId: application?.id,
    currentStudentId: currentStudent?.id,
    fallbackTeam: currentStudent?.student_mentor_assignments,
  })

  if (loading) return <PortalLoading />
  if (!user) return null

  const name = currentStudent?.full_name || user.user_metadata?.preferred_name || 'Student'
  const profile = currentStudent || application
  // The course plan carries the real program name (e.g. "Entrepreneurship
  // Program with Prof. Gu"); the program enum is only a fallback, and may be
  // unset entirely for students added directly in the admin portal.
  const programName = journey.plan?.name
    || PROGRAM_LABELS[profile?.program]
    || profile?.program
    || 'Your program'

  return (
    <StudentPortalShell
      user={user}
      portalId={portalAccount?.portal_id}
      accountStatus={portalAccount?.status}
      showProgramPill={false}
      application={application}
      currentStudent={currentStudent}
      programName={programName}
      eyebrow="Program workspace"
      title={`Welcome, ${name}`}
      description="Your learning journey, project progress, team, and materials in one place."
    >
      {error ? <div className={styles.error}>{error}</div> : null}
      {!error ? (
        <StudentJourneyView
          journey={journey}
          currentStudent={currentStudent}
          applicationId={application?.id}
          programName={programName}
        />
      ) : null}
    </StudentPortalShell>
  )
}
