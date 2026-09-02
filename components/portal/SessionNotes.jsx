import JourneySection from './JourneySection'
import styles from '../../styles/studentJourney.module.css'

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Notes are uploaded verbatim from Zoom. The portal deliberately does not
 * generate, rewrite, summarise, or impose section templates on them — it only
 * makes them chronological and readable.
 */
export default function SessionNotes({ notes = [], hasCourse = false }) {
  if (!notes.length) {
    if (!hasCourse) return null
    return (
      <JourneySection eyebrow="What has happened" title="Session Notes">
        <p className={styles.emptyNote}>
          Your session notes will appear here after your first meeting.
        </p>
      </JourneySection>
    )
  }

  return (
    <JourneySection eyebrow="What has happened" title="Session Notes">
      <div className={styles.noteList}>
        {notes.map((note) => {
          const mentor = note.mentors?.name || note.mentor_name
          return (
            <details className={styles.note} key={note.id}>
              <summary>
                <span className={styles.noteDate}>{formatDate(note.session_date)}</span>
                <span className={styles.noteTitle}>
                  {note.title}
                  {mentor ? <em> · {mentor}</em> : null}
                </span>
                <span className={styles.noteChevron} aria-hidden>⌄</span>
              </summary>
              <div className={styles.noteBody}>
                {note.notes
                  ? <p>{note.notes}</p>
                  : <p className={styles.emptyNote}>No notes were uploaded for this session.</p>}
              </div>
            </details>
          )
        })}
      </div>
    </JourneySection>
  )
}
