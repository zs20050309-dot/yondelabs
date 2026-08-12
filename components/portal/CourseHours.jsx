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

export default function CourseHours({ applicationId, currentStudentId, mentors = [], showEmpty = false }) {
  const [enrollment, setEnrollment] = useState(null)
  const [modules, setModules] = useState([])
  const [sessions, setSessions] = useState([])
  const [milestones, setMilestones] = useState([])
  const [milestoneProgress, setMilestoneProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      let enrollmentQuery = supabase
        .from('student_course_enrollments')
        .select('*, course_plans(id, name, description, allow_overage), student_hour_allocations(id, label, allocated_minutes, sort_order)')
        .in('status', ['active', 'completed', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
      enrollmentQuery = currentStudentId
        ? enrollmentQuery.eq('current_student_id', currentStudentId)
        : enrollmentQuery.eq('application_id', applicationId)
      const enrollmentResult = await enrollmentQuery.maybeSingle()

      if (!active) return
      if (enrollmentResult.error) {
        setLoadError('Your course details are temporarily unavailable. Please try again later.')
        setLoading(false)
        return
      }
      if (!enrollmentResult.data) {
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
  }, [applicationId, currentStudentId])

  const usedMinutes = useMemo(() => sumMinutes(sessions), [sessions])
  if (loading) {
    return showEmpty ? (
      <section className={`${styles.studentCard} ${styles.courseState}`}>
        <span className={styles.courseStateMark} aria-hidden />
        <h2>Loading your course</h2>
        <p>Your learning plan and progress are being prepared.</p>
      </section>
    ) : null
  }

  if (!enrollment) {
    return showEmpty ? (
      <section className={`${styles.studentCard} ${styles.courseState}`}>
        <span className={styles.courseStateMark} aria-hidden />
        <h2>{loadError ? 'Course details unavailable' : 'Your course will appear here'}</h2>
        <p>
          {loadError || 'Once the Yonde Labs team assigns your course plan, you will see your hours, milestones, modules, and class history on this page.'}
        </p>
      </section>
    ) : null
  }

  const remainingMinutes = Math.max(enrollment.allocated_minutes - usedMinutes, 0)
  const additionalMinutes = Math.max(usedMinutes - enrollment.allocated_minutes, 0)
  const percentage = enrollment.allocated_minutes > 0
    ? Math.min((usedMinutes / enrollment.allocated_minutes) * 100, 100)
    : 0
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

      <div className={styles.progressOverview}>
        <div className={styles.progressRing} style={{ '--course-progress': `${percentage * 3.6}deg` }} role="img" aria-label={`${Math.round(percentage)} percent of course hours used`}>
          <div><strong>{Math.round(percentage)}%</strong><span>{allowsOverage ? 'of minimum' : 'used'}</span></div>
        </div>
        <div className={styles.progressContent}>
          <div className={styles.hourStats}>
            <div><span>{allowsOverage ? 'Minimum' : 'Allocated'}</span><strong>{formatHours(enrollment.allocated_minutes)}</strong></div>
            <div><span>Used</span><strong>{formatHours(usedMinutes)}</strong></div>
            <div><span>{allowsOverage && additionalMinutes > 0 ? 'Beyond minimum' : allowsOverage ? 'To minimum' : 'Remaining'}</span><strong>{formatHours(additionalMinutes > 0 && allowsOverage ? additionalMinutes : remainingMinutes)}</strong></div>
          </div>
          <div className={styles.progressTrack} aria-hidden><span style={{ width: `${percentage}%` }} /></div>
          <div className={styles.progressCaption}><span>{allowsOverage && percentage === 100 ? 'Minimum hours fulfilled' : 'Course hours progress'}</span><span>Started {enrollment.started_at}</span></div>
        </div>
      </div>

      {(enrollment.student_hour_allocations?.length || mentors?.length) ? (
        <div className={styles.studentColumns}>
          {enrollment.student_hour_allocations?.length ? <div><h3>Hour allocation</h3><div className={styles.moduleList}>{[...enrollment.student_hour_allocations].sort((a, b) => a.sort_order - b.sort_order).map((item) => { const used = sumMinutes(sessions.filter((session) => session.mentor_role && session.mentor_role.toLowerCase() === item.label.toLowerCase())); return <div className={styles.moduleRow} key={item.id}><div><strong>{item.label}</strong></div><span>{formatHours(used)} / {formatHours(item.allocated_minutes)}</span></div> })}</div></div> : null}
          {mentors?.length ? <div><h3>My mentors</h3><div className={styles.moduleList}>{[...mentors].sort((a, b) => a.sort_order - b.sort_order).map((item) => <div className={styles.moduleRow} key={item.id}><div><strong>{item.mentors?.name}</strong><span>{item.role}</span></div></div>)}</div></div> : null}
        </div>
      ) : null}

      {milestones.length ? (
        <details className={`${styles.studentMilestones} ${styles.courseDisclosure}`} open>
          <summary className={styles.milestoneHeading}>
            <div><span className={styles.eyebrow}>Current milestone</span><h3>{currentMilestone?.title || 'All milestones completed'}</h3></div>
            <span>{milestoneProgress.filter((item) => item.status === 'completed').length} / {milestones.length} complete <i aria-hidden>⌄</i></span>
          </summary>
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
        </details>
      ) : null}

      <div className={styles.courseSections}>
        <details className={styles.courseDisclosure} open>
          <summary><div><span className={styles.eyebrow}>Course structure</span><h3>Course modules</h3></div><span>{modules.length} modules <i aria-hidden>⌄</i></span></summary>
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
        </details>
        <details className={styles.courseDisclosure} open>
          <summary><div><span className={styles.eyebrow}>Learning record</span><h3>Class history</h3></div><span>{sessions.length} classes <i aria-hidden>⌄</i></span></summary>
          {sessions.length ? (
            <div className={styles.sessionList}>
              {sessions.map((session) => (
                <div className={styles.sessionRow} key={session.id}>
                  <div><strong>{session.course_modules?.title || 'General session'}</strong><span>{session.mentor_role ? `${session.mentor_role} · ` : ''}{formatSessionDate(session.session_at)}</span></div>
                  <strong>{formatHoursLong(session.duration_minutes)}</strong>
                </div>
              ))}
            </div>
          ) : <p className={styles.emptyText}>Your completed classes will appear here.</p>}
        </details>
      </div>
    </section>
  )
}
