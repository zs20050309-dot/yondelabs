import StudentPortalShell, {
  PortalLoading,
  PROGRAM_LABELS,
} from '../../components/portal/StudentPortalShell'
import JourneySection from '../../components/portal/JourneySection'
import ProgramOverview from '../../components/portal/ProgramOverview'
import LearningMap from '../../components/portal/LearningMap'
import ProjectJourney from '../../components/portal/ProjectJourney'
import YourTeam from '../../components/portal/YourTeam'
import SessionNotes from '../../components/portal/SessionNotes'
import StudentFiles from '../../components/portal/StudentFiles'
import useStudentPortal from '../../lib/portal/useStudentPortal'
import useStudentJourney, { derivePhaseStatuses } from '../../lib/portal/useStudentJourney'
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

  const phases = derivePhaseStatuses(journey.phases, journey.milestones, journey.progress)

  return (
    <StudentPortalShell
      user={user}
      application={application}
      currentStudent={currentStudent}
      programName={programName}
      eyebrow="Program workspace"
      title={`Welcome, ${name}`}
      description="Your learning journey, project progress, team, and materials in one place."
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
              <div><span>Program</span><strong>{programName}</strong></div>
            </div>
            <div>
              <span className={`${styles.summaryIcon} ${styles.summaryActive}`} aria-hidden>✓</span>
              <div><span>Access</span><strong>Active</strong></div>
            </div>
          </section>

          {/* Section order is the product spec's narrative and is deliberate:
              goal -> what I'm learning -> where I am -> who helps -> what
              happened -> my resources. Each section hides itself when empty. */}
          <ProgramOverview
            programName={programName}
            plan={journey.plan}
            student={journey.studentProfile || currentStudent}
          />
          <LearningMap categories={journey.categories} />
          <ProjectJourney phases={phases} />
          <YourTeam team={journey.team} />
          <SessionNotes notes={journey.notes} hasCourse={Boolean(journey.enrollment)} />

          {profile ? (
            <JourneySection eyebrow="Your resources" title="Additional Materials">
              <StudentFiles
                applicationId={application?.id}
                currentStudentId={currentStudent?.id}
                showEmpty
                hideHeading
              />
            </JourneySection>
          ) : null}
        </>
      ) : null}
    </StudentPortalShell>
  )
}
