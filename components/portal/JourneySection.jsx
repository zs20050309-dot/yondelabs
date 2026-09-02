import styles from '../../styles/studentJourney.module.css'

/**
 * Shared wrapper for every journey section.
 *
 * Desktop uses a two-column editorial grid: the section label sits in a sticky
 * left rail while the content scrolls beside it, so a reader always knows which
 * part of the journey they are in. Mobile collapses it to a single column.
 *
 * Renders nothing when there is no content — the spec asks for empty sections
 * to be hidden rather than shown as empty UI.
 */
export default function JourneySection({ eyebrow, title, children, hidden = false, id }) {
  if (hidden) return null
  return (
    <section className={styles.section} id={id}>
      <header className={styles.sectionHeader}>
        {eyebrow ? <span className={styles.sectionEyebrow}>{eyebrow}</span> : null}
        <h2>{title}</h2>
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}
