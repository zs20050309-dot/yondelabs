import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { amountToCents, centsToAmount, PAYMENT_TYPE_LABELS } from '../../lib/admin/mentorPayments'
import styles from '../../styles/admin.module.css'

function AssignmentRow({ assignment, onRemoved, onSettingsSaved }) {
  const [paymentType, setPaymentType] = useState(assignment.settings?.payment_type || 'milestone')
  const [rate, setRate] = useState(
    centsToAmount(
      assignment.settings?.payment_type === 'hourly'
        ? assignment.settings?.hourly_rate_cents
        : assignment.settings?.milestone_rate_cents
    )
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function removeAssignment() {
    if (!window.confirm(`Remove ${assignment.mentors?.name} as ${assignment.role} for this student?`)) return
    setBusy(true)
    setError('')
    const { error: deleteError } = await supabase.from('student_mentor_assignments').delete().eq('id', assignment.id)
    if (deleteError) setError(deleteError.message)
    else onRemoved(assignment.id)
    setBusy(false)
  }

  async function saveSettings(event) {
    event.preventDefault()
    const cents = amountToCents(rate)
    if (cents === null) {
      setError('Enter a valid rate.')
      return
    }
    setBusy(true)
    setError('')
    const { data, error: upsertError } = await supabase
      .from('mentor_payment_settings')
      .upsert(
        {
          assignment_id: assignment.id,
          payment_type: paymentType,
          milestone_rate_cents: paymentType === 'milestone' ? cents : null,
          hourly_rate_cents: paymentType === 'hourly' ? cents : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'assignment_id' }
      )
      .select()
      .single()
    if (upsertError) setError(upsertError.message)
    else onSettingsSaved(assignment.id, data)
    setBusy(false)
  }

  return (
    <div className={styles.mentorAssignmentRow}>
      <div className={styles.mentorAssignmentHeading}>
        <div>
          <strong>{assignment.mentors?.name}</strong>
          <span>{assignment.role}</span>
        </div>
        <button type="button" className={styles.iconButton} onClick={removeAssignment} disabled={busy} aria-label="Remove mentor">×</button>
      </div>
      <form className={styles.mentorPaymentForm} onSubmit={saveSettings}>
        <label>
          <span>Payment type</span>
          <select value={paymentType} onChange={(event) => setPaymentType(event.target.value)}>
            {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{paymentType === 'hourly' ? 'Rate per hour' : 'Rate per milestone'}</span>
          <input type="number" min="0" step="0.01" placeholder="0.00" value={rate} onChange={(event) => setRate(event.target.value)} />
        </label>
        <button type="submit" className={styles.secondaryButton} disabled={busy}>{busy ? 'Saving…' : 'Save payment settings'}</button>
      </form>
      {error ? <div className={styles.inlineError}>{error}</div> : null}
    </div>
  )
}

export default function MentorAssignments({ currentStudent }) {
  const [assignments, setAssignments] = useState([])
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [mentorChoice, setMentorChoice] = useState('')
  const [newMentorName, setNewMentorName] = useState('')
  const [role, setRole] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [assignmentsResult, mentorsResult] = await Promise.all([
      supabase
        .from('student_mentor_assignments')
        .select('id, role, sort_order, mentors(id, name), mentor_payment_settings(payment_type, milestone_rate_cents, hourly_rate_cents)')
        .eq('current_student_id', currentStudent.id)
        .order('sort_order', { ascending: true }),
      supabase.from('mentors').select('id, name').eq('active', true).order('name', { ascending: true }),
    ])
    if (assignmentsResult.error) {
      setError('Mentor payments are unavailable. Run the 2026-08-13 mentor payments migration.')
    } else {
      setError('')
      setAssignments((assignmentsResult.data || []).map((item) => ({ ...item, settings: item.mentor_payment_settings?.[0] || item.mentor_payment_settings || null })))
    }
    setMentors(mentorsResult.data || [])
    setLoading(false)
  }, [currentStudent.id])

  useEffect(() => { load() }, [load])

  async function addAssignment(event) {
    event.preventDefault()
    if (!role.trim()) return
    if (!mentorChoice && !newMentorName.trim()) return
    setBusy(true)
    setError('')

    let mentorId = mentorChoice
    if (!mentorId) {
      const { data: mentor, error: mentorError } = await supabase
        .from('mentors')
        .insert({ name: newMentorName.trim() })
        .select()
        .single()
      if (mentorError) {
        setError(mentorError.message)
        setBusy(false)
        return
      }
      mentorId = mentor.id
    }

    const { error: assignError } = await supabase.from('student_mentor_assignments').insert({
      current_student_id: currentStudent.id,
      mentor_id: mentorId,
      role: role.trim(),
      sort_order: assignments.length,
    })
    if (assignError) setError(assignError.message)
    else {
      setMentorChoice('')
      setNewMentorName('')
      setRole('')
      await load()
    }
    setBusy(false)
  }

  function handleRemoved(id) {
    setAssignments((current) => current.filter((item) => item.id !== id))
  }

  function handleSettingsSaved(id, settings) {
    setAssignments((current) => current.map((item) => (item.id === id ? { ...item, settings } : item)))
  }

  if (loading) return <section className={styles.detailSection}><p>Loading mentors…</p></section>

  return (
    <section className={styles.detailSection}>
      <span className={styles.eyebrow}>Mentors</span>
      <h3>Assigned team &amp; payment settings</h3>
      {error ? <div className={styles.inlineErrorStandalone}>{error}</div> : null}

      <div className={styles.mentorAssignmentList}>
        {assignments.map((assignment) => (
          <AssignmentRow key={assignment.id} assignment={assignment} onRemoved={handleRemoved} onSettingsSaved={handleSettingsSaved} />
        ))}
        {!assignments.length ? <p className={styles.portalAccessMuted}>No mentors assigned yet.</p> : null}
      </div>

      <form className={styles.addMentorForm} onSubmit={addAssignment}>
        <label>
          <span>Mentor</span>
          <select value={mentorChoice} onChange={(event) => { setMentorChoice(event.target.value); if (event.target.value) setNewMentorName('') }}>
            <option value="">New mentor…</option>
            {mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}
          </select>
        </label>
        {!mentorChoice ? (
          <label>
            <span>New mentor name</span>
            <input type="text" value={newMentorName} onChange={(event) => setNewMentorName(event.target.value)} placeholder="Full name" />
          </label>
        ) : null}
        <label>
          <span>Role</span>
          <input type="text" value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Lead mentor" required />
        </label>
        <button type="submit" className={styles.primaryButton} disabled={busy}>{busy ? 'Adding…' : 'Add mentor'}</button>
      </form>
    </section>
  )
}
