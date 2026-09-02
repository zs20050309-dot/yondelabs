import { useState } from 'react'
import JourneySection from './JourneySection'
import { IconCheckCircle } from './icons'
import { phaseProgress, summarise } from '../../lib/portal/journeyProgress'
import styles from '../../styles/studentJourney.module.css'

const STATUS_LABEL = { completed: 'Completed', current: 'In progress', upcoming: 'Upcoming' }

function Meter({ percent, tone = 'accent' }) {
  return (
    <div className={styles.meter} role="img" aria-label={`${percent}% complete`}>
      <span className={styles[`meterFill_${tone}`]} style={{ width: `${percent}%` }} />
    </div>
  )
}

function MilestoneRow({ milestone }) {
  const done = milestone.status === 'completed'
  const active = milestone.status === 'in_progress'
  return (
    <li className={`${styles.checkItem} ${done ? styles.checkDone : ''} ${active ? styles.checkActive : ''}`}>
      <IconCheckCircle className={styles.checkMark} />
      <span className={styles.checkLabel}>{milestone.title}</span>
      {active ? <span className={styles.checkTag}>In progress</span> : null}
    </li>
  )
}

/**
 * The journey reads as progress, not prose: a summary bar answers "where am I"
 * at a glance, then each phase is an expandable card carrying its own status,
 * completion count, and milestone checklist. The current phase is open by
 * default because it is the only one the student needs today.
 */
export default function ProjectJourney({ phases = [] }) {
  const summary = summarise(phases)
  const [openId, setOpenId] = useState(() => summary.currentPhase?.id || phases[0]?.id || null)

  if (!phases.length) return null

  return (
    <JourneySection
      eyebrow="Where you are"
      title="Project Journey"
      id="project-journey"
      action={<span className={styles.countPill}>{summary.completed}/{summary.total} milestones</span>}
    >
      <div className={styles.summaryCard}>
        <div className={styles.summaryLead}>
          <span className={styles.summaryPercent}>{summary.percent}<i>%</i></span>
          <span className={styles.summaryCaption}>
            {summary.completed} of {summary.total} milestones complete
          </span>
        </div>
        <Meter percent={summary.percent} />
        <div className={styles.summaryFacts}>
          {summary.currentPhase ? (
            <div>
              <dt>Current phase</dt>
              <dd>{summary.currentPhase.name}</dd>
            </div>
          ) : null}
          {summary.nextMilestone ? (
            <div>
              <dt>Next milestone</dt>
              <dd>{summary.nextMilestone.title}</dd>
            </div>
          ) : null}
        </div>
      </div>

      <ol className={styles.phaseList}>
        {phases.map((phase, index) => {
          const progress = phaseProgress(phase)
          const open = openId === phase.id
          return (
            <li key={phase.id} className={`${styles.phaseCard} ${styles[`card_${phase.status}`]}`}>
              <button
                type="button"
                className={styles.phaseToggle}
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : phase.id)}
              >
                <span className={styles.phaseNum}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.phaseHeading}>
                  <span className={styles.phaseName}>{phase.name}</span>
                  <span className={styles.phaseSub}>
                    {phase.estimated_duration ? <em>{phase.estimated_duration}</em> : null}
                    {progress.total ? <span>{progress.completed}/{progress.total} milestones</span> : null}
                  </span>
                </span>
                <span className={styles[`chip_${phase.status}`]}>{STATUS_LABEL[phase.status]}</span>
                <span className={styles.phaseChevron} aria-hidden>⌄</span>
              </button>

              {progress.total ? (
                <Meter
                  percent={progress.percent}
                  tone={phase.status === 'completed' ? 'done' : phase.status === 'current' ? 'accent' : 'idle'}
                />
              ) : null}

              {open ? (
                <div className={styles.phaseDetail}>
                  {phase.indicative_focus ? <p>{phase.indicative_focus}</p> : null}
                  {phase.milestones?.length ? (
                    <ul className={styles.checkList}>
                      {phase.milestones.map((milestone) => (
                        <MilestoneRow key={milestone.id} milestone={milestone} />
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
    </JourneySection>
  )
}
