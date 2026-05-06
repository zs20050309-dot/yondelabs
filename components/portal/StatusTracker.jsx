import styles from '../../styles/statusTracker.module.css'

const STAGES = [
  {
    key: 'submitted',
    label: 'Application Submitted',
    icon: '✓',
    message:
      "We've received your application. Our team will review it and reach out within 2 weeks.",
  },
  {
    key: 'interview',
    label: 'Interview Scheduled',
    icon: '◎',
    message:
      "Congratulations! You've been selected for an interview. Our team will contact you shortly to schedule.",
  },
  {
    key: 'offer',
    label: 'Offer Sent',
    icon: '★',
    message:
      "You've been admitted! Please check your email for your official offer and next steps.",
  },
]

const REJECTED_MESSAGE =
  'Thank you for applying to the Yonde Research Scholar Program. After careful review, we are unable to offer you a place at this time. We encourage you to apply again in a future cohort.'

function stageIndex(status) {
  const i = STAGES.findIndex((s) => s.key === status)
  return i >= 0 ? i : 0
}

export default function StatusTracker({ status }) {
  const isRejected = status === 'rejected'
  const current = isRejected ? -1 : stageIndex(status)

  function circleClass(i) {
    if (isRejected) return `${styles.circle} ${styles.circleMuted}`
    if (i < current) return `${styles.circle} ${styles.circleCompleted}`
    if (i === current) return `${styles.circle} ${styles.circleActive}`
    return `${styles.circle} ${styles.circleUpcoming}`
  }

  function circleContent(stage, i) {
    if (isRejected) return <span aria-hidden="true">{stage.icon}</span>
    if (i < current) return <span className={styles.check}>✓</span>
    return <span aria-hidden="true">{stage.icon}</span>
  }

  function labelClass(i) {
    if (isRejected) return styles.label
    if (i === current) return `${styles.label} ${styles.labelActive}`
    return styles.label
  }

  function connectorDone(i) {
    if (isRejected) return false
    return current > i
  }

  const showActiveMessage = !isRejected && current >= 0 && current < STAGES.length
  const activeMessage = showActiveMessage ? STAGES[current].message : null

  return (
    <div className={styles.wrapper}>
      <div className={styles.desktop}>
        <div className={styles.desktopCircles}>
          {STAGES.flatMap((stage, i) => {
            const nodes = [
              <div key={`${stage.key}-c`} className={styles.dCircleWrap}>
                <div className={circleClass(i)}>{circleContent(stage, i)}</div>
              </div>,
            ]
            if (i < STAGES.length - 1) {
              nodes.push(
                <div
                  key={`${stage.key}-conn`}
                  className={`${styles.dConn} ${connectorDone(i) ? styles.dConnDone : ''}`}
                />
              )
            }
            return nodes
          })}
        </div>
        <div className={styles.desktopLabels}>
          {STAGES.map((stage, i) => (
            <div key={`${stage.key}-lbl`} className={styles.dLabelSlot}>
              <div className={labelClass(i)}>{stage.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.mobile}>
        {STAGES.map((stage, i) => (
          <div key={stage.key} className={styles.mobileStep}>
            <div className={styles.rail}>
              <div className={circleClass(i)}>{circleContent(stage, i)}</div>
              {i < STAGES.length - 1 ? (
                <div
                  className={`${styles.vline} ${connectorDone(i) ? styles.vlineDone : ''}`}
                />
              ) : null}
            </div>
            <div className={styles.mobileBody}>
              <div className={labelClass(i)}>{stage.label}</div>
            </div>
          </div>
        ))}
      </div>

      {showActiveMessage ? <div className={styles.messageCard}>{activeMessage}</div> : null}

      {isRejected ? (
        <div className={styles.rejectedBox}>
          <div className={styles.rejectedTitle}>Application Reviewed</div>
          <div>{REJECTED_MESSAGE}</div>
        </div>
      ) : null}
    </div>
  )
}
