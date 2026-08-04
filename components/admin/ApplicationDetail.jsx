import { useState } from 'react'
import { getSchema } from '../../lib/forms/schema'
import { supabase } from '../../lib/supabaseClient'
import {
  ADMIN_STAGES,
  NEXT_STATUS,
  PROGRAM_LABELS,
  STATUS_LABELS,
  studentEmail,
  studentName,
} from '../../lib/admin/stages'
import styles from '../../styles/admin.module.css'
import StudentCourseHours from './StudentCourseHours'
import StudentFiles from './StudentFiles'
import StudentPortalAccess from './StudentPortalAccess'

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

export default function ApplicationDetail({ application, history, moving, deleting, onMove, onConvert, onDelete, onClose }) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  if (!application) return null

  const schema = getSchema(application.program)
  const nextStatus = NEXT_STATUS[application.status]

  async function downloadPdf() {
    setDownloading(true)
    setDownloadError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Please sign in again.')
      const response = await fetch(`/api/admin/applications/${application.id}/pdf`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'PDF download failed.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const disposition = response.headers.get('content-disposition') || ''
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'application.pdf'
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(error.message || 'PDF download failed.')
    } finally {
      setDownloading(false)
    }
  }

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

      <div className={styles.documentActions}>
        <div>
          <strong>Submitted application PDF</strong>
          <span>A copy is automatically emailed to Ashlyn after submission.</span>
        </div>
        <button type="button" className={styles.secondaryButton} disabled={downloading} onClick={downloadPdf}>
          {downloading ? 'Preparing PDF...' : 'Download PDF'}
        </button>
      </div>
      {downloadError ? <div className={styles.inlineError}>{downloadError}</div> : null}

      <StudentCourseHours application={application} />
      <StudentPortalAccess application={application} />
      <StudentFiles application={application} />

      <section className={styles.detailSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Progress</span>
            <h3>Application stages</h3>
          </div>
          <div className={styles.actionRow}>
            {application.status === 'offer' ? (
              <button type="button" className={styles.primaryButton} disabled={moving} onClick={() => onConvert(application)}>
                {moving ? 'Enrolling...' : 'Enroll as current student'}
              </button>
            ) : null}
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

      <section className={styles.dangerZone}>
        <div>
          <span className={styles.eyebrow}>Application management</span>
          <h3>{application.status === 'rejected' ? 'Archived application' : 'Archive this application'}</h3>
          <p>{application.status === 'rejected'
            ? 'Restore this application to active admissions, or permanently delete it and its related records.'
            : 'Archived applications leave the active admissions list and remain available in the separate archive.'}</p>
        </div>
        <div className={styles.dangerActions}>
          {application.status === 'rejected' ? (
            <>
              <button type="button" className={styles.secondaryButton} disabled={moving || deleting} onClick={() => onMove(application, 'submitted')}>Restore to submitted</button>
              <button type="button" className={styles.deleteButton} disabled={moving || deleting} onClick={() => onDelete(application)}>{deleting ? 'Deleting...' : 'Permanently delete'}</button>
            </>
          ) : (
            <button type="button" className={styles.archiveButton} disabled={moving} onClick={() => onMove(application, 'rejected')}>Archive application</button>
          )}
        </div>
      </section>
    </aside>
  )
}
