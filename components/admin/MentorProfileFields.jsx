import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from './ToastProvider'
import styles from '../../styles/admin.module.css'

/**
 * Responsibility and timezone for a mentor. These are mentor-level (not
 * per-assignment) because they describe the person, and they are what the
 * student's "Your Team" card renders beneath the name and role.
 */
export default function MentorProfileFields({ mentor }) {
  const showToast = useToast()
  const [responsibility, setResponsibility] = useState('')
  const [timezone, setTimezone] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setResponsibility(mentor?.responsibility || '')
    setTimezone(mentor?.timezone || '')
  }, [mentor?.id, mentor?.responsibility, mentor?.timezone])

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const { error: saveError } = await supabase.from('mentors').update({
      responsibility: responsibility.trim() || null,
      timezone: timezone.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', mentor.id)

    if (saveError) {
      setError(saveError.message.includes('column')
        ? 'Run the 2026-09-02 student journey migration to edit mentor profiles.'
        : saveError.message)
    } else {
      showToast('Mentor profile saved.')
      setOpen(false)
    }
    setBusy(false)
  }

  if (!mentor?.id) return null

  if (!open) {
    return (
      <button type="button" className={styles.ghostButton} onClick={() => setOpen(true)}>
        Edit student-facing profile
      </button>
    )
  }

  return (
    <form className={styles.mentorPaymentForm} onSubmit={save}>
      <label style={{ flex: '1 1 260px' }}>
        <span>Responsibility (shown to student)</span>
        <input
          type="text"
          value={responsibility}
          onChange={(event) => setResponsibility(event.target.value)}
          placeholder="1–2 sentences on what to come to them for"
        />
      </label>
      <label>
        <span>Timezone</span>
        <input
          type="text"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          placeholder="e.g. Pacific Time"
        />
      </label>
      <button type="submit" className={styles.secondaryButton} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      <button type="button" className={styles.ghostButton} onClick={() => setOpen(false)}>Cancel</button>
      {error ? <div className={styles.inlineError}>{error}</div> : null}
    </form>
  )
}
