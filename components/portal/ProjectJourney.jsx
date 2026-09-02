import JourneySection from './JourneySection'
import styles from '../../styles/studentJourney.module.css'

const STATUS_LABEL = {
  completed: 'Completed',
  current: 'Current',
  upcoming: 'Upcoming',
}

export default function ProjectJourney({ phases = [] }) {
  if (!phases.length) return null

  return (
    <JourneySection eyebrow="Where you are" title="Project Journey" id="project-journey">
      <ol className={styles.timeline}>
        {phases.map((phase, index) => (
          <li
            key={phase.id}
            className={`${styles.phase} ${styles[`phase_${phase.status}`]}`}
            aria-current={phase.status === 'current' ? 'step' : undefined}
          >
            <div className={styles.phaseMarker} aria-hidden />
            <div className={styles.phaseBody}>
              <div className={styles.phaseTop}>
                <span className={styles.phaseIndex}>
                  Phase {String(index + 1).padStart(2, '0')}
                </span>
                <span className={styles.phaseStatus}>{STATUS_LABEL[phase.status]}</span>
              </div>
              <h3>{phase.name}</h3>
              {/* Free text such as "~4-6 weeks" — deliberately not a date range. */}
              {phase.estimated_duration ? (
                <p className={styles.phaseDuration}>{phase.estimated_duration}</p>
              ) : null}
              {phase.indicative_focus ? (
                <p className={styles.phaseFocus}>{phase.indicative_focus}</p>
              ) : null}
              {phase.milestones?.length ? (
                <ul className={styles.milestones}>
                  {phase.milestones.map((milestone) => (
                    <li key={milestone.id} className={styles[`milestone_${milestone.status}`]}>
                      <span className={styles.milestoneDot} aria-hidden />
                      {milestone.title}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </JourneySection>
  )
}
