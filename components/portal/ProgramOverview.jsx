import JourneySection from './JourneySection'
import { FIELD_ICONS } from './icons'
import styles from '../../styles/studentJourney.module.css'

function formatMonth(value) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function duration(startsOn, endsOn) {
  const start = formatMonth(startsOn)
  const end = formatMonth(endsOn)
  if (start && end) return `${start} – ${end}`
  return start || end || null
}

export default function ProgramOverview({ programName, plan, student }) {
  const span = duration(plan?.starts_on, plan?.expected_end_on)
  // Never surface an empty goal as blank or "N/A" — this exact phrasing is the
  // agreed student-facing wording while a direction is still being explored.
  const projectGoal = student?.project_goal?.trim() || 'Exploring Project Direction'

  const stats = [
    { label: 'School', value: student?.school?.trim() },
    { label: 'Stage', value: student?.stage?.trim() },
    { label: 'Project area', value: student?.project_area?.trim() },
    { label: 'Duration', value: span },
    { label: 'Learning cadence', value: plan?.cadence?.trim() },
  ].filter((row) => row.value)

  const objective = plan?.learning_objective?.trim()
  const capstone = plan?.capstone_goal?.trim()

  if (!stats.length && !objective && !capstone && !programName) return null

  return (
    <JourneySection eyebrow="Your program" title="Program Overview" id="overview">
      <div className={styles.overviewCard}>
        <div className={styles.overviewIntro}>
          {programName ? <h3 className={styles.programName}>{programName}</h3> : null}
          {objective ? <p className={styles.lede}>{objective}</p> : null}
          <div className={styles.goalRow}>
            {capstone ? (
              <div className={styles.callout}>
                <span>Capstone goal</span>
                <p>{capstone}</p>
              </div>
            ) : null}
            <div className={`${styles.callout} ${styles.calloutMuted}`}>
              <span>Your project goal</span>
              <p>{projectGoal}</p>
            </div>
          </div>
        </div>

        {stats.length ? (
          <dl className={styles.statBar}>
            {stats.map((stat) => {
              const Icon = FIELD_ICONS[stat.label]
              return (
                <div key={stat.label} className={styles.stat}>
                  <dt>
                    {Icon ? <Icon className={styles.statIcon} /> : null}
                    {stat.label}
                  </dt>
                  <dd>{stat.value}</dd>
                </div>
              )
            })}
          </dl>
        ) : null}
      </div>
    </JourneySection>
  )
}
