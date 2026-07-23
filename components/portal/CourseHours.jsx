import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatHours, formatHoursLong, sumMinutes } from '../../lib/courseHours'
import styles from '../../styles/courseHours.module.css'

function formatSessionDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function CourseHours({ applicationId }) {
  const [enrollment, setEnrollment] = useState(null)
  const [modules, setModules] = useState([])
  const [sessions, setSessions] = useState([])
  const [milestones, setMilestones] = useState([])
  const [milestoneProgress, setMilestoneProgress] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      const enrollmentResult = await supabase
        .from('student_course_enrollments')
        .select('*, course_plans(id, name, description, allow_overage)')
        .eq('application_id', applicationId)
        .in('status', ['active', 'completed', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!active) return
      if (enrollmentResult.error || !enrollmentResult.data) {
        setLoading(false)
        return
      }

      const current = enrollmentResult.data
      const [modulesResult, sessionsResult, milestonesResult, progressResult] = await Promise.all([
        supabase.from('course_modules').select('*').eq('course_plan_id', current.course_plan_id).order('sort_order'),
        supabase.from('class_sessions').select('*, course_modules(id, title)').eq('enrollment_id', current.id).order('session_at', { ascending: false }),
        supabase.from('course_milestones').select('*').eq('course_plan_id', current.course_plan_id).order('sort_order'),
        supabase.from('student_milestone_progress').select('*').eq('enrollment_id', current.id),
      ])

      if (!active) return
      setEnrollment(current)
      setModules(modulesResult.data || [])
      setSessions(sessionsResult.data || [])
      setMilestones(milestonesResult.data || [])
      setMilestoneProgress(progressResult.data || [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [applicationId])

  const usedMinutes = useMemo(() => sumMinutes(sessions), [sessions])
  if (loading || !enrollment) return null

  const remainingMinutes = Math.max(enrollment.allocated_minutes - usedMinutes, 0)
  const additionalMinutes = Math.max(usedMinutes - enrollment.allocated_minutes, 0)
  const percentage = Math.min((usedMinutes / enrollment.allocated_minutes) * 100, 100)
  const allowsOverage = Boolean(enrollment.course_plans?.allow_overage)
  const progressByMilestone = new Map(milestoneProgress.map((item) => [item.milestone_id, item]))
  const currentMilestone = milestones.find((item) => progressByMilestone.get(item.id)?.status === 'in_progress')
    || milestones.find((item) => progressByMilestone.get(item.id)?.status !== 'completed')

  return (
    <section className={styles.studentCard}>
      <div className={styles.studentHeader}>
        <div>
          <span className={styles.eyebrow}>Course hours</span>
          <h2>{enrollment.course_plans?.name || 'Your course plan'}</h2>
          {enrollment.course_plans?.description ? <p>{enrollment.course_plans.description}</p> : null}
        </div>
        <span className={styles.enrollmentStatus}>{enrollment.status}</span>
      </div>

      <div className={styles.hourStats}>
        <div><span>{allowsOverage ? 'Minimum' : 'Allocated'}</span><strong>{formatHours(enrollment.allocated_minutes)}</strong></div>
        <div><span>Used</span><strong>{formatHours(usedMinutes)}</strong></div>
        <div><span>{allowsOverage && additionalMinutes > 0 ? 'Beyond minimum' : allowsOverage ? 'To minimum' : 'Remaining'}</span><strong>{formatHours(additionalMinutes > 0 && allowsOverage ? additionalMinutes : remainingMinutes)}</strong></div>
      </div>

      <div className={styles.progressTrack} aria-label={`${Math.round(percentage)} percent of course hours used`}>
        <span style={{ width: `${percentage}%` }} />
      </div>
      <div className={styles.progressCaption}><span>{allowsOverage && percentage === 100 ? 'Minimum hours fulfilled' : `${Math.round(percentage)}% ${allowsOverage ? 'of minimum' : 'used'}`}</span><span>Started {enrollment.started_at}</span></div>

      {milestones.length ? (
        <div className={styles.studentMilestones}>
          <div className={styles.milestoneHeading}>
            <div><span className={styles.eyebrow}>Current milestone</span><h3>{currentMilestone?.title || 'All milestones completed'}</h3></div>
            <span>{milestoneProgress.filter((item) => item.status === 'completed').length} / {milestones.length} complete</span>
          </div>
          <ol className={styles.milestoneList}>
            {milestones.map((milestone, index) => {
              const progress = progressByMilestone.get(milestone.id)
              const status = progress?.status || 'not_started'
              return (
                <li key={milestone.id} className={styles[`milestone_${status}`]}>
                  <span className={styles.milestoneNumber}>{status === 'completed' ? '✓' : index + 1}</span>
                  <div><strong>{milestone.title}</strong>{milestone.description ? <p>{milestone.description}</p> : null}</div>
                  <span className={styles.milestoneStatus}>{status.replace('_', ' ')}</span>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}

      <div className={styles.studentColumns}>
        <div>
          <h3>Course modules</h3>
          <div className={styles.moduleList}>
            {modules.map((module) => {
              const moduleUsed = sumMinutes(sessions.filter((session) => session.module_id === module.id))
              return (
                <div className={styles.moduleRow} key={module.id}>
                  <div><strong>{module.title}</strong><span>{formatHours(moduleUsed)} used</span></div>
                  <span>{formatHours(module.planned_minutes)} planned</span>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <h3>Class history</h3>
          {sessions.length ? (
            <div className={styles.sessionList}>
              {sessions.map((session) => (
                <div className={styles.sessionRow} key={session.id}>
                  <div><strong>{session.course_modules?.title || 'General session'}</strong><span>{formatSessionDate(session.session_at)}</span></div>
                  <strong>{formatHoursLong(session.duration_minutes)}</strong>
                </div>
              ))}
            </div>
          ) : <p className={styles.emptyText}>Your completed classes will appear here.</p>}
        </div>
      </div>
    </section>
  )
}
