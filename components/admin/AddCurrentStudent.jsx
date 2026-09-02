import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { CURRENT_STUDENT_PROGRAMS } from '../../lib/admin/currentStudents'
import { useToast } from './ToastProvider'
import styles from '../../styles/admin.module.css'

const EMPTY = { fullName: '', contactEmail: '', program: '', status: 'active' }

export default function AddCurrentStudent({ onCreated }) {
  const showToast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function close() {
    setOpen(false)
    setForm(EMPTY)
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    const fullName = form.fullName.trim()
    const contactEmail = form.contactEmail.trim()

    if (!fullName) {
      setError('A full name is required.')
      return
    }

    setBusy(true)
    setError('')

    // source: 'manual' marks a student who never came through an application,
    // as opposed to the 'converted' rows the 2026-08-02 conversion RPC writes.
    const { data: { user } } = await supabase.auth.getUser()
    const { error: insertError } = await supabase.from('current_students').insert({
      full_name: fullName,
      contact_email: contactEmail || null,
      program: form.program || null,
      status: form.status,
      source: 'manual',
      created_by: user?.id || null,
    })

    if (insertError) {
      // 23505 is the unique index on lower(contact_email).
      setError(insertError.code === '23505'
        ? 'A student with that contact email already exists.'
        : insertError.message)
      setBusy(false)
      return
    }

    showToast(`${fullName} added to current students.`)
    setBusy(false)
    close()
    await onCreated()
  }

  if (!open) {
    return (
      <button type="button" className={styles.secondaryButton} onClick={() => setOpen(true)}>
        Add student
      </button>
    )
  }

  return (
    <form className={styles.addStudentForm} onSubmit={submit}>
      <label>
        <span>Full name</span>
        <input type="text" value={form.fullName} onChange={(event) => update('fullName', event.target.value)} placeholder="Student name" required autoFocus />
      </label>
      <label>
        <span>Contact email</span>
        <input type="email" value={form.contactEmail} onChange={(event) => update('contactEmail', event.target.value)} placeholder="Optional" />
      </label>
      <label>
        <span>Program</span>
        <select value={form.program} onChange={(event) => update('program', event.target.value)}>
          <option value="">Not assigned yet</option>
          {Object.entries(CURRENT_STUDENT_PROGRAMS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Status</span>
        <select value={form.status} onChange={(event) => update('status', event.target.value)}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <button type="submit" className={styles.primaryButton} disabled={busy}>{busy ? 'Adding…' : 'Add student'}</button>
      <button type="button" className={styles.ghostButton} onClick={close} disabled={busy}>Cancel</button>
      {error ? <div className={styles.inlineError}>{error}</div> : null}
    </form>
  )
}
