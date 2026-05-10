import styles from '../../styles/statusTracker.module.css'

const STAGES = [
  {
    key: 'submitted',
    label: 'Application Submitted',
  },
  {
    key: 'interview',
    label: 'Interview Scheduled',
  },
  {
    key: 'offer',
    label: 'Offer Sent',
  },
]

const REVIEWED_MESSAGE =
  'Your application has been reviewed. We appreciate your interest in YondeLabs.'

function formatDate(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function stepState(status, index) {
  if (status === 'rejected') {
    return index === 0 ? 'completed' : 'inactive'
  }

  if (status === 'offer') {
    return 'completed'
  }

  if (status === 'interview') {
    if (index === 0) return 'completed'
    if (index === 1) return 'active'
    return 'inactive'
  }

  return index === 0 ? 'completed' : 'inactive'
}

function connectorDone(status, index) {
  if (status === 'rejected') return false
  if (status === 'offer') return true
  if (status === 'interview') return index === 0
  return false
}

function circleClass(state) {
  if (state === 'completed') return `${styles.circle} ${styles.circleCompleted}`
  if (state === 'active') return `${styles.circle} ${styles.circleActive}`
  return `${styles.circle} ${styles.circleUpcoming}`
}

function labelClass(state) {
  if (state === 'inactive') return styles.label
  return `${styles.label} ${styles.labelActive}`
}

function subLabel(state, index, submittedAt) {
  if (index === 0) return formatDate(submittedAt)
  if (state === 'inactive') return 'Pending'
  if (state === 'active') return 'In progress'
  return 'Completed'
}

function circleContent(state) {
  if (state === 'completed') {
    return <span className={styles.check}>✓</span>
  }

  if (state === 'active') {
    return <span className={styles.activeDot} aria-hidden="true" />
  }

  return null
}

export default function StatusTracker({ status, submittedAt }) {
  const isReviewed = status === 'rejected'

  function renderStep(stage, index, variant) {
    const state = stepState(status, index)

    return (
      <div key={`${variant}-${stage.key}`} className={styles.stepBody}>
        <div className={labelClass(state)}>{stage.label}</div>
        <div className={styles.subLabel}>{subLabel(state, index, submittedAt)}</div>
      </div>
    )
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Application Progress</h2>

      <div className={styles.desktop}>
        <div className={styles.stepGrid}>
          <div
            className={`${styles.dConn} ${
              connectorDone(status, 0) ? styles.dConnDone : ''
            } ${styles.dConnFirst}`}
            aria-hidden="true"
          />
          <div
            className={`${styles.dConn} ${
              connectorDone(status, 1) ? styles.dConnDone : ''
            } ${styles.dConnSecond}`}
            aria-hidden="true"
          />

          {STAGES.map((stage, index) => {
            const state = stepState(status, index)

            return (
              <div key={`${stage.key}-desktop`} className={styles.desktopStep}>
                <div className={styles.dCircleWrap} aria-hidden="true">
                  <div className={circleClass(state)}>{circleContent(state)}</div>
                </div>
                {renderStep(stage, index, 'desktop')}
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.mobile}>
        {STAGES.map((stage, index) => (
          <div key={stage.key} className={styles.mobileStep}>
            <div className={styles.rail}>
              <div className={circleClass(stepState(status, index))}>
                {circleContent(stepState(status, index))}
              </div>
              {index < STAGES.length - 1 ? (
                <div
                  className={`${styles.vline} ${
                    connectorDone(status, index) ? styles.vlineDone : ''
                  }`}
                />
              ) : null}
            </div>
            {renderStep(stage, index, 'mobile')}
          </div>
        ))}
      </div>

      {isReviewed ? (
        <div className={styles.reviewedBox}>
          <div className={styles.reviewedTitle}>Application Reviewed</div>
          <div>{REVIEWED_MESSAGE}</div>
        </div>
      ) : null}
    </section>
  )
}
