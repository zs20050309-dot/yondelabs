import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useConfirm } from './ConfirmProvider'
import { formatHours, formatHoursLong, hoursToMinutes, sumMinutes } from '../../lib/courseHours'
import styles from '../../styles/courseHours.module.css'

function localDateTimeValue() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function formatDate(value) {
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function StudentCourseHours({ application, currentStudent }) {
  const confirm = useConfirm()
  const ownerColumn = currentStudent ? 'current_student_id' : 'application_id'
  const ownerId = currentStudent?.id || application?.id
  const [plans, setPlans] = useState([])
  const [enrollment, setEnrollment] = useState(null)
  const [sessions, setSessions] = useState([])
  const [milestoneProgress, setMilestoneProgress] = useState([])
  const [planId, setPlanId] = useState('')
  const [allocatedHours, setAllocatedHours] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [moduleId, setModuleId] = useState('')
  const [assignmentId, setAssignmentId] = useState('')
  const [sessionAt, setSessionAt] = useState(localDateTimeValue())
  const [durationHours, setDurationHours] = useState('1')
  const [notes, setNotes] = useState('')
  const [mentorHourDrafts, setMentorHourDrafts] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [plansResult, enrollmentResult] = await Promise.all([
      supabase.from('course_plans').select('*, course_modules(*), course_milestones(*)').eq('active', true).order('created_at', { ascending: false }),
      supabase.from('student_course_enrollments').select('*, course_plans(*, course_modules(*), course_milestones(*)), student_hour_allocations(id, label, allocated_minutes, sort_order)').eq(ownerColumn, ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (plansResult.error || enrollmentResult.error) {
      setError('Course hours or milestones are unavailable. Run the 2026-07-22 and 2026-07-23 course migrations.')
      return
    }
    setPlans(plansResult.data || [])
    const current = enrollmentResult.data || null
    setEnrollment(current)
    if (current) {
      setAllocatedHours(String(current.allocated_minutes / 60))
      const [sessionsResult, progressResult] = await Promise.all([
        supabase.from('class_sessions').select('*, course_modules(title)').eq('enrollment_id', current.id).order('session_at', { ascending: false }),
        supabase.from('student_milestone_progress').select('*').eq('enrollment_id', current.id),
      ])
      setSessions(sessionsResult.data || [])
      setMilestoneProgress(progressResult.data || [])
    } else {
      setSessions([])
      setMilestoneProgress([])
    }
  }

  useEffect(() => { if (ownerId) load() }, [ownerId])

  const selectedPlan = plans.find((plan) => plan.id === planId)
  const modules = enrollment?.course_plans?.course_modules || []
  const mentorAssignments = currentStudent?.student_mentor_assignments || []
  const milestones = [...(enrollment?.course_plans?.course_milestones || [])].sort((a, b) => a.sort_order - b.sort_order)
  const usedMinutes = useMemo(() => sumMinutes(sessions), [sessions])
  const allowsOverage = Boolean(enrollment?.course_plans?.allow_overage)
  const additionalMinutes = enrollment ? Math.max(usedMinutes - enrollment.allocated_minutes, 0) : 0
  const milestoneProgressMap = new Map(milestoneProgress.map((item) => [item.milestone_id, item]))

  // Hours are budgeted per kind of mentor (the assignment role). Allocations live in
  // student_hour_allocations keyed by label, which the student portal matches on too.
  const { mentorHourRows, unassignedMinutes } = useMemo(() => {
    const keyFor = (label) => String(label || '').trim().toLowerCase()
    const rows = new Map()
    const ensure = (label) => {
      const key = keyFor(label)
      if (!rows.has(key)) rows.set(key, { key, label: String(label || '').trim(), mentorNames: [], assignmentIds: [], usedMinutes: 0, allocation: null })
      return rows.get(key)
    }
    for (const assignment of mentorAssignments) {
      if (!assignment.role) continue
      const row = ensure(assignment.role)
      row.assignmentIds.push(assignment.id)
      if (assignment.mentors?.name) row.mentorNames.push(assignment.mentors.name)
    }
    for (const allocation of enrollment?.student_hour_allocations || []) ensure(allocation.label).allocation = allocation

    let unassigned = 0
    for (const session of sessions) {
      const minutes = Number(session.duration_minutes) || 0
      const byAssignment = session.assignment_id
        ? [...rows.values()].find((row) => row.assignmentIds.includes(session.assignment_id))
        : null
      const row = byAssignment || (session.mentor_role ? rows.get(keyFor(session.mentor_role)) : null)
      if (row) row.usedMinutes += minutes
      else unassigned += minutes
    }
    return { mentorHourRows: [...rows.values()], unassignedMinutes: unassigned }
  }, [mentorAssignments, enrollment, sessions])

  async function saveMentorHours(row) {
    const raw = mentorHourDrafts[row.key]
    const minutes = hoursToMinutes(raw)
    if (!minutes && String(raw ?? '').trim() !== '') return
    setBusy(true)
    setError('')
    let saveError = null
    if (!minutes) {
      if (row.allocation) ({ error: saveError } = await supabase.from('student_hour_allocations').delete().eq('id', row.allocation.id))
    } else if (row.allocation) {
      ({ error: saveError } = await supabase.from('student_hour_allocations').update({ allocated_minutes: minutes }).eq('id', row.allocation.id))
    } else {
      ({ error: saveError } = await supabase.from('student_hour_allocations').insert({
        enrollment_id: enrollment.id,
        label: row.label,
        allocated_minutes: minutes,
        sort_order: mentorHourRows.length,
      }))
    }
    if (saveError) setError(saveError.message)
    else await load()
    setBusy(false)
  }

  function choosePlan(value) {
    setPlanId(value)
    const plan = plans.find((item) => item.id === value)
    setAllocatedHours(plan ? String(sumMinutes(plan.course_modules, 'planned_minutes') / 60) : '')
  }

  async function assignCourse(event) {
    event.preventDefault()
    const minutes = hoursToMinutes(allocatedHours)
    if (!planId || !minutes) return
    setBusy(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error: insertError } = await supabase.from('student_course_enrollments').insert({
      application_id: application?.id || null,
      current_student_id: currentStudent?.id || null,
      course_plan_id: planId, allocated_minutes: minutes,
      started_at: startDate, created_by: user?.id,
    })
    if (insertError) setError(insertError.message)
    else await load()
    setBusy(false)
  }

  async function saveAllocation() {
    const minutes = hoursToMinutes(allocatedHours)
    if (!minutes) return
    setBusy(true)
    const { error: updateError } = await supabase.from('student_course_enrollments').update({ allocated_minutes: minutes, updated_at: new Date().toISOString() }).eq('id', enrollment.id)
    if (updateError) setError(updateError.message)
    else await load()
    setBusy(false)
  }

  async function logSession(event) {
    event.preventDefault()
    const minutes = hoursToMinutes(durationHours)
    if (!minutes) return
    setBusy(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const selectedAssignment = mentorAssignments.find((item) => item.id === assignmentId)
    const { error: insertError } = await supabase.from('class_sessions').insert({
      enrollment_id: enrollment.id,
      module_id: moduleId || null,
      assignment_id: assignmentId || null,
      mentor_role: selectedAssignment?.role || null,
      session_at: new Date(sessionAt).toISOString(),
      duration_minutes: minutes,
      notes: notes.trim() || null,
      created_by: user?.id,
    })
    if (insertError) setError(insertError.message)
    else {
      setDurationHours('1')
      setAssignmentId('')
      setNotes('')
      setSessionAt(localDateTimeValue())
      await load()
    }
    setBusy(false)
  }

  async function deleteSession(id) {
    const ok = await confirm({ title: 'Delete class entry', message: 'Delete this class entry? The used-hours total will be recalculated.', danger: true, confirmLabel: 'Delete' })
    if (!ok) return
    setBusy(true)
    const { error: deleteError } = await supabase.from('class_sessions').delete().eq('id', id)
    if (deleteError) setError(deleteError.message)
    else await load()
    setBusy(false)
  }

  async function updateMilestone(milestoneId, status) {
    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.rpc('set_student_milestone_status', {
      p_enrollment_id: enrollment.id,
      p_milestone_id: milestoneId,
      p_status: status,
    })
    if (updateError) setError(updateError.message)
    else await load()
    setBusy(false)
  }

  async function updateMilestoneMentor(milestoneId, milestoneAssignmentId) {
    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.rpc('set_student_milestone_mentor', {
      p_enrollment_id: enrollment.id,
      p_milestone_id: milestoneId,
      p_assignment_id: milestoneAssignmentId || null,
    })
    if (updateError) setError(updateError.message)
    else await load()
    setBusy(false)
  }

  async function setEnrollmentStatus(status) {
    setBusy(true)
    const { error: updateError } = await supabase.from('student_course_enrollments').update({
      status, completed_at: status === 'completed' ? new Date().toISOString().slice(0, 10) : null, updated_at: new Date().toISOString(),
    }).eq('id', enrollment.id)
    if (updateError) setError(updateError.message)
    else await load()
    setBusy(false)
  }

  return (
    <section className={styles.adminCourseSection}>
      <div className={styles.adminSectionHeader}><div><span className={styles.eyebrow}>Program delivery</span><h3>Course hours</h3></div>{enrollment ? <span className={styles.enrollmentStatus}>{enrollment.status}</span> : null}</div>
      {error ? <div className={styles.adminError}>{error}</div> : null}

      {!enrollment ? (
        <form className={styles.assignmentForm} onSubmit={assignCourse}>
          <p>Assign a course plan when this student joins a program.</p>
          <label>Course plan<select value={planId} onChange={(event) => choosePlan(event.target.value)} required><option value="">Choose a plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
          <label>{selectedPlan?.allow_overage ? 'Minimum required hours' : 'Total allocated hours'}<input type="number" min="0.25" step="0.25" value={allocatedHours} onChange={(event) => setAllocatedHours(event.target.value)} required /></label>
          <label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
          <button type="submit" disabled={busy || !selectedPlan}>Assign course</button>
        </form>
      ) : <>
        <div className={styles.adminHourSummary}>
          <div><span>Plan</span><strong>{enrollment.course_plans?.name}</strong></div>
          <div><span>Used</span><strong>{formatHours(usedMinutes)}</strong></div>
          <div><span>{allowsOverage && additionalMinutes > 0 ? 'Beyond minimum' : allowsOverage ? 'To minimum' : 'Remaining'}</span><strong>{formatHours(allowsOverage && additionalMinutes > 0 ? additionalMinutes : Math.max(enrollment.allocated_minutes - usedMinutes, 0))}</strong></div>
        </div>

        <div className={styles.policyNotice}><strong>{allowsOverage ? 'Minimum-hours policy' : 'Fixed-hours policy'}</strong><span>{allowsOverage ? `The student may continue beyond ${formatHours(enrollment.allocated_minutes)} until the course work is complete.` : `Class entries are capped at ${formatHours(enrollment.allocated_minutes)}.`}</span></div>

        <div className={styles.allocationEditor}>
          <label>{allowsOverage ? 'Minimum hours' : 'Allocated hours'}<input type="number" min="0.25" step="0.25" value={allocatedHours} onChange={(event) => setAllocatedHours(event.target.value)} /></label>
          <button type="button" onClick={saveAllocation} disabled={busy}>Save allocation</button>
          <button type="button" onClick={() => setEnrollmentStatus(enrollment.status === 'paused' ? 'active' : 'paused')} disabled={busy}>{enrollment.status === 'paused' ? 'Resume course' : 'Pause course'}</button>
          {enrollment.status !== 'completed' ? <button type="button" onClick={() => setEnrollmentStatus('completed')} disabled={busy}>Mark completed</button> : null}
        </div>

        {mentorHourRows.length || unassignedMinutes > 0 ? (
          <div className={styles.mentorHours}>
            <div className={styles.editorSubheading}>
              <div><span className={styles.eyebrow}>Per mentor</span><h4>Hours by mentor</h4></div>
              <span>Set the hours budgeted for each kind of mentor</span>
            </div>
            <div className={styles.mentorHourList}>
              {mentorHourRows.map((row) => {
                const allocated = row.allocation?.allocated_minutes || 0
                const remaining = allocated - row.usedMinutes
                const draft = mentorHourDrafts[row.key] ?? (allocated ? String(allocated / 60) : '')
                return (
                  <div key={row.key}>
                    <div>
                      <strong>{row.mentorNames.join(', ') || 'No mentor assigned'}</strong>
                      <span>{row.label}</span>
                    </div>
                    <div className={styles.mentorHourStat}><span>Used</span><strong>{formatHours(row.usedMinutes)}</strong></div>
                    <div className={styles.mentorHourStat}>
                      <span>{allocated ? (remaining < 0 ? 'Over by' : 'Left') : 'Left'}</span>
                      <strong className={allocated && remaining < 0 ? styles.mentorHourOver : undefined}>
                        {allocated ? formatHours(Math.abs(remaining)) : '—'}
                      </strong>
                    </div>
                    <label>
                      <span className={styles.srOnly}>{`${row.label} allocated hours`}</span>
                      <input type="number" min="0" step="0.25" placeholder="No budget" value={draft}
                        onChange={(event) => setMentorHourDrafts((current) => ({ ...current, [row.key]: event.target.value }))} />
                    </label>
                    <button type="button" onClick={() => saveMentorHours(row)} disabled={busy}>Save</button>
                  </div>
                )
              })}
              {unassignedMinutes > 0 ? (
                <div>
                  <div><strong>Unassigned classes</strong><span>Logged without a mentor</span></div>
                  <div className={styles.mentorHourStat}><span>Used</span><strong>{formatHours(unassignedMinutes)}</strong></div>
                  <div className={styles.mentorHourStat}><span>Left</span><strong>—</strong></div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {milestones.length ? (
          <div className={styles.adminMilestones}>
            <div className={styles.editorSubheading}><div><span className={styles.eyebrow}>Student progress</span><h4>Milestone status</h4></div><span>{milestoneProgress.filter((item) => item.status === 'completed').length} / {milestones.length} complete</span></div>
            <div className={styles.adminMilestoneList}>
              {milestones.map((milestone, index) => {
                const progress = milestoneProgressMap.get(milestone.id)
                return (
                  <div key={milestone.id}>
                    <span className={styles.milestoneOrder}>{index + 1}</span>
                    <div><strong>{milestone.title}</strong>{milestone.description ? <span>{milestone.description}</span> : null}</div>
                    <select value={progress?.assignment_id || ''} onChange={(event) => updateMilestoneMentor(milestone.id, event.target.value)} disabled={busy} aria-label={`${milestone.title} responsible mentor`}>
                      <option value="">No mentor assigned</option>
                      {mentorAssignments.map((item) => <option key={item.id} value={item.id}>{item.mentors?.name} · {item.role}</option>)}
                    </select>
                    <select value={progress?.status || 'not_started'} onChange={(event) => updateMilestone(milestone.id, event.target.value)} disabled={busy} aria-label={`${milestone.title} status`}>
                      <option value="not_started">Not started</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        <form className={styles.sessionForm} onSubmit={logSession}>
          <h4>Log completed class</h4>
          <label>Module<select value={moduleId} onChange={(event) => setModuleId(event.target.value)}><option value="">General / no module</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
          <label>Mentor<select value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)}><option value="">General / unassigned</option>{mentorAssignments.map((item) => <option key={item.id} value={item.id}>{item.mentors?.name} · {item.role}</option>)}</select></label>
          <label>Date and time<input type="datetime-local" value={sessionAt} onChange={(event) => setSessionAt(event.target.value)} required /></label>
          <label>Hours used<input type="number" min="0.25" step="0.25" value={durationHours} onChange={(event) => setDurationHours(event.target.value)} required /></label>
          <label className={styles.notesField}>Class notes<textarea rows="2" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What was covered?" /></label>
          <button type="submit" disabled={busy}>Add class</button>
        </form>

        <div className={styles.adminSessionList}>
          {sessions.map((session) => (
            <div key={session.id}><div><strong>{session.course_modules?.title || 'General session'}</strong><span>{session.mentor_role ? `${session.mentor_role} · ` : ''}{formatDate(session.session_at)}{session.notes ? ` · ${session.notes}` : ''}</span></div><strong>{formatHoursLong(session.duration_minutes)}</strong><button type="button" onClick={() => deleteSession(session.id)} disabled={busy}>Delete</button></div>
          ))}
          {!sessions.length ? <p>No classes logged yet.</p> : null}
        </div>
      </>}
    </section>
  )
}
