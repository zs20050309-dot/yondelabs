import JourneySection from './JourneySection'
import ProgramOverview from './ProgramOverview'
import LearningMap from './LearningMap'
import ProjectJourney from './ProjectJourney'
import YourTeam from './YourTeam'
import SessionNotes from './SessionNotes'
import StudentFiles from './StudentFiles'
import { derivePhaseStatuses } from '../../lib/portal/useStudentJourney'
import styles from '../../styles/studentJourney.module.css'

/**
 * The six journey sections, rendered from data rather than from the logged-in
 * session. Shared by /student and the admin read-only preview so both show
 * exactly the same thing — a preview that drifted from the real portal would be
 * worse than no preview at all.
 *
 * Section order is the product spec's narrative and is deliberate: goal -> what
 * I'm learning -> where I am -> who helps -> what happened -> my resources.
 * Each section hides itself when empty.
 */
export default function StudentJourneyView({
  journey,
  currentStudent,
  applicationId,
  programName,
}) {
  const phases = derivePhaseStatuses(journey.phases, journey.milestones, journey.progress)
  const hasOwner = Boolean(currentStudent || applicationId)

  return (
    <div className={styles.journey}>
      <ProgramOverview
        programName={programName}
        plan={journey.plan}
        student={journey.studentProfile || currentStudent}
      />
      <LearningMap categories={journey.categories} />
      <ProjectJourney phases={phases} />
      <YourTeam team={journey.team} />
      <SessionNotes notes={journey.notes} hasCourse={Boolean(journey.enrollment)} />

      {hasOwner ? (
        <JourneySection eyebrow="Your resources" title="Additional Materials">
          <StudentFiles
            applicationId={applicationId}
            currentStudentId={currentStudent?.id}
            showEmpty
            hideHeading
          />
        </JourneySection>
      ) : null}
    </div>
  )
}
