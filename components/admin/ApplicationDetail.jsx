import { getSchema } from '../../lib/forms/schema'
import {
  ADMIN_STAGES,
  NEXT_STATUS,
  PROGRAM_LABELS,
  STATUS_LABELS,
  studentEmail,
  studentName,
} from '../../lib/admin/stages'
import styles from '../../styles/admin.module.css'

function formatDate(value, includeTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}

function displayValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export default function ApplicationDetail({ application, history, moving, onMove, onClose }) {
  if (!application) return null

  const schema = getSchema(application.program)
  const nextStatus = NEXT_STATUS[application.status]

  return (
    <aside className={styles.detailPanel} aria-label="Application details">
      <div className={styles.detailHeader}>
        <div>
          <span className={styles.eyebrow}>Student profile</span>
          <h2>{studentName(application)}</h2>
          <p>{studentEmail(application)}</p>
        </div>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close profile">
          ×
        </button>
      </div>

      <div className={styles.detailMeta}>
        <div><span>Program</span><strong>{PROGRAM_LABELS[application.program] || application.program}</strong></div>
        <div><span>Submitted</span><strong>{formatDate(application.submitted_at)}</strong></div>
        <div><span>Current stage</span><strong>{STATUS_LABELS[application.status] || application.status}</strong></div>
      </div>

      <section className={styles.detailSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Progress</span>
            <h3>Application stages</h3>
          </div>
          <div className={styles.actionRow}>
            {nextStatus ? (
              <button
                type="button"
                className={styles.primaryButton}
                disabled={moving}
                onClick={() => onMove(application, nextStatus)}
              >
                {moving ? 'Updating…' : `Move to ${STATUS_LABELS[nextStatus]}`}
              </button>
            ) : null}
            {application.status !== 'rejected' ? (
              <button
                type="button"
                className={styles.archiveButton}
                disabled={moving}
                onClick={() => onMove(application, 'rejected')}
              >
                Archive
              </button>
            ) : (
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={moving}
                onClick={() => onMove(application, 'submitted')}
              >
                Restore to submitted
              </button>
            )}
          </div>
        </div>

        <ol className={styles.timeline}>
          {ADMIN_STAGES.map((stage) => {
            const event = history.find((item) => item.to_status === stage.key)
            const active = application.status === stage.key
            const complete = Boolean(event) || (stage.key === 'submitted' && application.submitted_at)
            return (
              <li key={stage.key} className={complete ? styles.timelineComplete : ''}>
                <span className={styles.timelineDot} aria-hidden="true" />
                <div>
                  <strong>{stage.label}{active ? ' · Current' : ''}</strong>
                  <span>{formatDate(event?.changed_at || (stage.key === 'submitted' ? application.submitted_at : null), true)}</span>
                </div>
              </li>
            )
          })}
          {application.status === 'rejected' ? (
            <li className={styles.timelineArchived}>
              <span className={styles.timelineDot} aria-hidden="true" />
              <div><strong>Archived · Current</strong><span>{formatDate(history.find((item) => item.to_status === 'rejected')?.changed_at, true)}</span></div>
            </li>
          ) : null}
        </ol>
      </section>

      <section className={styles.detailSection}>
        <span className={styles.eyebrow}>Submitted form</span>
        <h3>Application answers</h3>
        {schema ? schema.steps.map((step) => (
          <div className={styles.answerGroup} key={step.id}>
            <h4>{step.title}</h4>
            {step.fields.map((field) => (
              <div className={styles.answer} key={field.id}>
                <span>{field.label}</span>
                <p>{displayValue(application.form_data?.[field.id])}</p>
              </div>
            ))}
          </div>
        )) : (
          <div className={styles.answerGroup}>
            {Object.entries(application.form_data || {}).map(([key, value]) => (
              <div className={styles.answer} key={key}><span>{key.replaceAll('_', ' ')}</span><p>{displayValue(value)}</p></div>
            ))}
          </div>
        )}
      </section>
    </aside>
  )
}

