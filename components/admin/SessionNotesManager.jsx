import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useConfirm } from './ConfirmProvider'
import { useToast } from './ToastProvider'
import styles from '../../styles/courseHours.module.css'

const EMPTY = { session_date: '', title: '', mentor_id: '', notes: '' }

/**
 * Uploads meeting notes for one student, newest first.
 *
 * Kept separate from class_sessions on purpose: those rows drive
 * mentor_payment_records, and a student-facing note must never be able to
 * affect the payment ledger. Notes are stored verbatim — the portal imposes no
 * template on them.
 */
export default function SessionNotesManager({ enrollmentId, mentors = [] }) {
  const confirm = useConfirm()
  const showToast = useToast()
  const [notes, setNotes] = useState([])
  const [draft, setDraft] = useState(EMPTY)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!enrollmentId) return
    const { data, error: loadError } = await supabase
      .from('session_notes')
      .select('id, session_date, title, mentor_id, mentor_name, notes, mentors(name)')
      .eq('enrollment_id', enrollmentId)
      .order('session_date', { ascending: false })
    if (loadError) {
      setError('Session notes are unavailable. Run the 2026-09-02 student journey migration.')
      setNotes([])
      return
    }
    setError('')
    setNotes(data || [])
  }, [enrollmentId])

  useEffect(() => { load() }, [load])

  async function addNote(event) {
    event.preventDefault()
    if (!draft.session_date || !draft.title.trim()) {
      setError('A session date and title are required.')
      return
    }
    setBusy(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const mentor = mentors.find((item) => item.mentors?.id === draft.mentor_id)
    const { error: insertError } = await supabase.from('session_notes').insert({
      enrollment_id: enrollmentId,
      session_date: draft.session_date,
      title: draft.title.trim(),
      mentor_id: draft.mentor_id || null,
      // Denormalised so the attribution survives a mentor record being removed.
      mentor_name: mentor?.mentors?.name || null,
      notes: draft.notes.trim() || null,
      created_by: user?.id || null,
    })
    if (insertError) setError(insertError.message)
    else {
      setDraft(EMPTY)
      setOpen(false)
      showToast('Session note added.')
      await load()
    }
    setBusy(false)
  }

  async function deleteNote(note) {
    const ok = await confirm({
      title: 'Delete session note',
      message: `"${note.title}" will no longer be visible to the student.`,
      danger: true,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    setBusy(true)
    const { error: deleteError } = await supabase.from('session_notes').delete().eq('id', note.id)
    if (deleteError) setError(deleteError.message)
    else await load()
    setBusy(false)
  }

  if (!enrollmentId) return null

  function update(field) {
    return (event) => setDraft((current) => ({ ...current, [field]: event.target.value }))
  }

  return (
    <div className={styles.journeyEditor}>
      <div className={styles.editorSubheading}>
        <div><span className={styles.eyebrow}>Student-facing</span><h3>Session notes</h3></div>
        <span>{notes.length} uploaded</span>
      </div>
      {error ? <div className={styles.adminError}>{error}</div> : null}

      {notes.map((note) => (
        <div className={styles.noteRow} key={note.id}>
          <div>
            <strong>{note.title}</strong>
            <span>
              {note.session_date}
              {note.mentors?.name || note.mentor_name ? ` · ${note.mentors?.name || note.mentor_name}` : ''}
            </span>
          </div>
          <button type="button" className={styles.dangerText} onClick={() => deleteNote(note)} disabled={busy}>Delete</button>
        </div>
      ))}
      {!notes.length && !error ? <p className={styles.assignHint}>No session notes uploaded yet.</p> : null}

      {open ? (
        <form className={styles.journeyEditor} onSubmit={addNote}>
          <div className={styles.dateRow}>
            <label className={styles.stackedField}>
              <span>Session date</span>
              <input type="date" value={draft.session_date} onChange={update('session_date')} required />
            </label>
            <label className={styles.stackedField}>
              <span>Mentor</span>
              <select value={draft.mentor_id} onChange={update('mentor_id')}>
                <option value="">Not specified</option>
                {mentors.map((item) => (
                  <option key={item.id} value={item.mentors?.id}>{item.mentors?.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.stackedField}>
            <span>Title</span>
            <input value={draft.title} onChange={update('title')} placeholder="e.g. Professor Gu Session" required />
          </label>
          <label className={styles.stackedField}>
            <span>Notes</span>
            <textarea rows="8" value={draft.notes} onChange={update('notes')} placeholder="Paste the Zoom meeting notes here. They are shown to the student exactly as entered." />
          </label>
          <div className={styles.rowTools}>
            <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add session note'}</button>
            <button type="button" onClick={() => { setOpen(false); setDraft(EMPTY); setError('') }}>Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)}>Upload session note</button>
      )}
    </div>
  )
}
