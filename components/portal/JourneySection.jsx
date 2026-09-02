import styles from '../../styles/studentJourney.module.css'

/**
 * Shared wrapper so every journey section reads with the same rhythm and the
 * page feels like one story rather than a set of unrelated widgets.
 * Renders nothing when there is no content: the product spec asks for empty
 * sections to be hidden rather than shown as empty UI.
 */
export default function JourneySection({ eyebrow, title, children, hidden = false }) {
  if (hidden) return null
  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        {eyebrow ? <span className={styles.sectionEyebrow}>{eyebrow}</span> : null}
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  )
}
