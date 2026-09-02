import styles from '../../styles/studentJourney.module.css'

/**
 * Section wrapper. The label sits top-aligned above the content rather than in
 * a side rail, so every section gets the full column width — and no
 * variable-length title can collide with the body.
 */
export default function JourneySection({ eyebrow, title, action, children, hidden = false, id }) {
  if (hidden) return null
  return (
    <section className={styles.section} id={id}>
      <header className={styles.sectionHeader}>
        <div>
          {eyebrow ? <span className={styles.sectionEyebrow}>{eyebrow}</span> : null}
          <h2>{title}</h2>
        </div>
        {action ? <div className={styles.sectionAction}>{action}</div> : null}
      </header>
      {children}
    </section>
  )
}
