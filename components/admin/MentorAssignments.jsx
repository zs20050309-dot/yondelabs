import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import MentorProfileFields from './MentorProfileFields'
import { useConfirm } from './ConfirmProvider'
import { amountToCents, centsToAmount, PAYMENT_TYPE_LABELS } from '../../lib/admin/mentorPayments'
import styles from '../../styles/admin.module.css'

function AssignmentRow({ assignment, milestones, rates, onRemoved, onSettingsSaved, onRatesSaved }) {
  const confirm = useConfirm()
  const [paymentType, setPaymentType] = useState(assignment.settings?.payment_type || 'milestone')
  const [hourlyRate, setHourlyRate] = useState(centsToAmount(assignment.settings?.hourly_rate_cents))
  const [milestoneRates, setMilestoneRates] = useState(() =>
    Object.fromEntries(milestones.map((milestone) => [milestone.id, centsToAmount(rates[milestone.id])]))
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function removeAssignment() {
    const ok = await confirm({ title: 'Remove mentor', message: `Remove ${assignment.mentors?.name} as ${assignment.role} for this student?`, danger: true, confirmLabel: 'Remove' })
    if (!ok) return
    setBusy(true)
    setError('')
    const { error: deleteError } = await supabase.from('student_mentor_assignments').delete().eq('id', assignment.id)
    if (deleteError) setError(deleteError.message)
    else onRemoved(assignment.id)
    setBusy(false)
  }

  async function saveSettings(event) {
    event.preventDefault()
    if (paymentType === 'hourly' && amountToCents(hourlyRate) === null) {
      setError('Enter a valid hourly rate.')
      return
    }
    setBusy(true)
    setError('')

    const { data: settings, error: upsertError } = await supabase
      .from('mentor_payment_settings')
      .upsert(
        {
          assignment_id: assignment.id,
          payment_type: paymentType,
          hourly_rate_cents: paymentType === 'hourly' ? amountToCents(hourlyRate) : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'assignment_id' }
      )
      .select()
      .single()
    if (upsertError) {
      setError(upsertError.message)
      setBusy(false)
      return
    }
    onSettingsSaved(assignment.id, settings)

    if (paymentType === 'milestone') {
      const rows = milestones
        .filter((milestone) => String(milestoneRates[milestone.id] ?? '').trim() !== '')
        .map((milestone) => ({
          assignment_id: assignment.id,
          milestone_id: milestone.id,
          amount_cents: amountToCents(milestoneRates[milestone.id]),
          updated_at: new Date().toISOString(),
        }))
      if (rows.some((row) => row.amount_cents === null)) {
        setError('Enter a valid amount for each priced milestone.')
        setBusy(false)
        return
      }
      if (rows.length) {
        const { error: ratesError } = await supabase
          .from('mentor_milestone_rates')
          .upsert(rows, { onConflict: 'assignment_id,milestone_id' })
        if (ratesError) setError(ratesError.message)
        else onRatesSaved(assignment.id, Object.fromEntries(rows.map((row) => [row.milestone_id, row.amount_cents])))
      }
    }
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
        {paymentType === 'hourly' ? (
          <label>
            <span>Rate per hour</span>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} />
          </label>
        ) : null}
        <button type="submit" className={styles.secondaryButton} disabled={busy}>{busy ? 'Saving…' : 'Save payment settings'}</button>
      </form>

      {paymentType === 'milestone' ? (
        milestones.length ? (
          <div className={styles.milestoneRateGrid}>
            <span className={styles.milestoneRateHint}>This mentor's own payout per milestone. Leave blank for milestones they aren't paid for.</span>
            {milestones.map((milestone) => (
              <label key={milestone.id} className={styles.milestoneRateField}>
                <span>{milestone.title}</span>
                <input
                  type="number" min="0" step="0.01" placeholder="Not paid"
                  value={milestoneRates[milestone.id] ?? ''}
                  onChange={(event) => setMilestoneRates((current) => ({ ...current, [milestone.id]: event.target.value }))}
                />
              </label>
            ))}
          </div>
        ) : (
          <p className={styles.portalAccessMuted}>Assign a course plan with milestones before pricing this schedule.</p>
        )
      ) : null}

      <MentorProfileFields mentor={assignment.mentors} />

      {error ? <div className={styles.inlineError}>{error}</div> : null}
    </div>
  )
}

export default function MentorAssignments({ currentStudent }) {
  const [assignments, setAssignments] = useState([])
  const [milestones, setMilestones] = useState([])
  const [rates, setRates] = useState({})
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [mentorChoice, setMentorChoice] = useState('')
  const [newMentorName, setNewMentorName] = useState('')
  const [role, setRole] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [assignmentsResult, mentorsResult, enrollmentResult] = await Promise.all([
      supabase
        .from('student_mentor_assignments')
        .select('id, role, sort_order, mentors(id, name, responsibility, timezone), mentor_payment_settings(payment_type, hourly_rate_cents)')
        .eq('current_student_id', currentStudent.id)
        .order('sort_order', { ascending: true }),
      supabase.from('mentors').select('id, name, responsibility, timezone').eq('active', true).order('name', { ascending: true }),
      supabase
        .from('student_course_enrollments')
        .select('id, course_plans(course_milestones(id, title, sort_order))')
        .eq('current_student_id', currentStudent.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (assignmentsResult.error) {
      setError('Mentor payments are unavailable. Run the 2026-08-13 mentor payments migration.')
      setLoading(false)
      return
    }
    setError('')
    const loadedAssignments = (assignmentsResult.data || []).map((item) => ({
      ...item,
      settings: item.mentor_payment_settings?.[0] || item.mentor_payment_settings || null,
    }))
    setAssignments(loadedAssignments)
    setMentors(mentorsResult.data || [])
    const sortedMilestones = [...(enrollmentResult.data?.course_plans?.course_milestones || [])].sort((a, b) => a.sort_order - b.sort_order)
    setMilestones(sortedMilestones)

    if (loadedAssignments.length) {
      const { data: rateRows } = await supabase
        .from('mentor_milestone_rates')
        .select('assignment_id, milestone_id, amount_cents')
        .in('assignment_id', loadedAssignments.map((item) => item.id))
      const grouped = {}
      for (const row of rateRows || []) {
        grouped[row.assignment_id] = { ...(grouped[row.assignment_id] || {}), [row.milestone_id]: row.amount_cents }
      }
      setRates(grouped)
    } else {
      setRates({})
    }
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

  function handleRatesSaved(id, savedRates) {
    setRates((current) => ({ ...current, [id]: { ...(current[id] || {}), ...savedRates } }))
  }

  const rowsByAssignment = useMemo(() => assignments, [assignments])

  if (loading) return <section className={styles.detailSection}><p>Loading mentors…</p></section>

  return (
    <section className={styles.detailSection}>
      <span className={styles.eyebrow}>Mentors</span>
      <h3>Assigned team &amp; payment schedule</h3>
      {error ? <div className={styles.inlineErrorStandalone}>{error}</div> : null}

      <div className={styles.mentorAssignmentList}>
        {rowsByAssignment.map((assignment) => (
          <AssignmentRow
            key={assignment.id}
            assignment={assignment}
            milestones={milestones}
            rates={rates[assignment.id] || {}}
            onRemoved={handleRemoved}
            onSettingsSaved={handleSettingsSaved}
            onRatesSaved={handleRatesSaved}
          />
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
