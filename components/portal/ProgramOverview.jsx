import JourneySection from './JourneySection'
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
  // Never surface an empty project goal as blank or "N/A" — the spec asks for
  // this exact phrasing while a direction is still being explored.
  const projectGoal = student?.project_goal?.trim() || 'Exploring Project Direction'

  const rows = [
    { label: 'Program', value: programName },
    { label: 'School', value: student?.school?.trim() },
    { label: 'Stage', value: student?.stage?.trim() },
    { label: 'Project area', value: student?.project_area?.trim() },
    { label: 'Project goal', value: projectGoal },
    { label: 'Duration', value: span },
    { label: 'Learning cadence', value: plan?.cadence?.trim() },
  ].filter((row) => row.value)

  const objective = plan?.learning_objective?.trim()
  const capstone = plan?.capstone_goal?.trim()

  if (!rows.length && !objective && !capstone) return null

  return (
    <JourneySection eyebrow="Program overview" title={programName || 'Your program'}>
      {objective ? <p className={styles.lede}>{objective}</p> : null}
      {capstone ? (
        <div className={styles.capstone}>
          <span>Capstone goal</span>
          <p>{capstone}</p>
        </div>
      ) : null}
      {rows.length ? (
        <dl className={styles.overviewGrid}>
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </JourneySection>
  )
}
