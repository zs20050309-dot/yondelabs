import styles from '../../styles/applicationSummary.module.css'

const PROGRAM_NAMES = {
  ra: 'Research Scholar Program',
  irp: 'Independent Research Program',
  'passion-project': 'Passion Project',
  isef: 'ISEF Coaching',
}

export default function ApplicationSummary({ application }) {
  const programName = PROGRAM_NAMES[application.program] || '—'
  const cohort = application.form_data?.cohort || '—'
  const email = application.form_data?.email || '—'
  const submitted = new Date(application.submitted_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <span className={styles.label}>Program</span>
        <span className={styles.value}>{programName}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Applied for</span>
        <span className={styles.value}>{cohort}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Submitted on</span>
        <span className={styles.value}>{submitted}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Email on file</span>
        <span className={styles.value}>{email}</span>
      </div>
      <p className={styles.note}>
        Need to update your application? Contact us at{' '}
        <a href="mailto:hello@yondelabs.com">hello@yondelabs.com</a>
      </p>
    </div>
  )
}
