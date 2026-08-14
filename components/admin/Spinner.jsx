import styles from '../../styles/admin.module.css'

export default function Spinner({ label }) {
  return (
    <div className={styles.spinnerRow}>
      <span className={styles.spinner} aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </div>
  )
}
