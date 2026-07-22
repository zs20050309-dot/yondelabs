import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
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

export default function StudentCourseHours({ application }) {
  const [plans, setPlans] = useState([])
  const [enrollment, setEnrollment] = useState(null)
  const [sessions, setSessions] = useState([])
  const [planId, setPlanId] = useState('')
  const [allocatedHours, setAllocatedHours] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [moduleId, setModuleId] = useState('')
  const [sessionAt, setSessionAt] = useState(localDateTimeValue())
  const [durationHours, setDurationHours] = useState('1')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [plansResult, enrollmentResult] = await Promise.all([
      supabase.from('course_plans').select('*, course_modules(*)').eq('active', true).order('created_at', { ascending: false }),
      supabase.from('student_course_enrollments').select('*, course_plans(*, course_modules(*))').eq('application_id', application.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (plansResult.error || enrollmentResult.error) {
      setError('Course hours are unavailable until the course-hours migration is applied.')
      return
    }
    setPlans(plansResult.data || [])
    const current = enrollmentResult.data || null
    setEnrollment(current)
    if (current) {
      setAllocatedHours(String(current.allocated_minutes / 60))
      const sessionsResult = await supabase.from('class_sessions').select('*, course_modules(title)').eq('enrollment_id', current.id).order('session_at', { ascending: false })
      setSessions(sessionsResult.data || [])
    } else {
      setSessions([])
    }
  }

  useEffect(() => { load() }, [application.id])

  const selectedPlan = plans.find((plan) => plan.id === planId)
  const modules = enrollment?.course_plans?.course_modules || []
  const usedMinutes = useMemo(() => sumMinutes(sessions), [sessions])

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
      application_id: application.id, course_plan_id: planId, allocated_minutes: minutes,
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
    const { error: insertError } = await supabase.from('class_sessions').insert({
      enrollment_id: enrollment.id,
      module_id: moduleId || null,
      session_at: new Date(sessionAt).toISOString(),
      duration_minutes: minutes,
      notes: notes.trim() || null,
      created_by: user?.id,
    })
    if (insertError) setError(insertError.message)
    else {
      setDurationHours('1')
      setNotes('')
      setSessionAt(localDateTimeValue())
      await load()
    }
    setBusy(false)
  }

  async function deleteSession(id) {
    if (!window.confirm('Delete this class entry? The used-hours total will be recalculated.')) return
    setBusy(true)
    const { error: deleteError } = await supabase.from('class_sessions').delete().eq('id', id)
    if (deleteError) setError(deleteError.message)
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
          <label>Total allocated hours<input type="number" min="0.25" step="0.25" value={allocatedHours} onChange={(event) => setAllocatedHours(event.target.value)} required /></label>
          <label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
          <button type="submit" disabled={busy || !selectedPlan}>Assign course</button>
        </form>
      ) : <>
        <div className={styles.adminHourSummary}>
          <div><span>Plan</span><strong>{enrollment.course_plans?.name}</strong></div>
          <div><span>Used</span><strong>{formatHours(usedMinutes)}</strong></div>
          <div><span>Remaining</span><strong>{formatHours(Math.max(enrollment.allocated_minutes - usedMinutes, 0))}</strong></div>
        </div>

        <div className={styles.allocationEditor}>
          <label>Allocated hours<input type="number" min="0.25" step="0.25" value={allocatedHours} onChange={(event) => setAllocatedHours(event.target.value)} /></label>
          <button type="button" onClick={saveAllocation} disabled={busy}>Save allocation</button>
          <button type="button" onClick={() => setEnrollmentStatus(enrollment.status === 'paused' ? 'active' : 'paused')} disabled={busy}>{enrollment.status === 'paused' ? 'Resume course' : 'Pause course'}</button>
          {enrollment.status !== 'completed' ? <button type="button" onClick={() => setEnrollmentStatus('completed')} disabled={busy}>Mark completed</button> : null}
        </div>

        <form className={styles.sessionForm} onSubmit={logSession}>
          <h4>Log completed class</h4>
          <label>Module<select value={moduleId} onChange={(event) => setModuleId(event.target.value)}><option value="">General / no module</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
          <label>Date and time<input type="datetime-local" value={sessionAt} onChange={(event) => setSessionAt(event.target.value)} required /></label>
          <label>Hours used<input type="number" min="0.25" step="0.25" value={durationHours} onChange={(event) => setDurationHours(event.target.value)} required /></label>
          <label className={styles.notesField}>Class notes<textarea rows="2" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What was covered?" /></label>
          <button type="submit" disabled={busy}>Add class</button>
        </form>

        <div className={styles.adminSessionList}>
          {sessions.map((session) => (
            <div key={session.id}><div><strong>{session.course_modules?.title || 'General session'}</strong><span>{formatDate(session.session_at)}{session.notes ? ` · ${session.notes}` : ''}</span></div><strong>{formatHoursLong(session.duration_minutes)}</strong><button type="button" onClick={() => deleteSession(session.id)} disabled={busy}>Delete</button></div>
          ))}
          {!sessions.length ? <p>No classes logged yet.</p> : null}
        </div>
      </>}
    </section>
  )
}

