import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const EMPTY = {
  enrollment: null,
  plan: null,
  studentProfile: null,
  categories: [],
  phases: [],
  milestones: [],
  progress: [],
  team: [],
  notes: [],
}

function byOrder(field = 'display_order') {
  return (a, b) => (a[field] ?? 0) - (b[field] ?? 0)
}

/**
 * Loads everything the six-section journey page needs.
 *
 * Every journey query is issued and handled independently on purpose: the
 * 2026-09-02 student-journey migration may not have been applied yet, and a
 * missing table or column must degrade that one section rather than take the
 * whole portal down. Sections with no data are hidden by their components.
 */
export default function useStudentJourney({ applicationId, currentStudentId, fallbackTeam = [] }) {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!applicationId && !currentStudentId) {
      setLoading(false)
      return undefined
    }
    let active = true

    async function load() {
      setLoading(true)

      let enrollmentQuery = supabase
        .from('student_course_enrollments')
        .select('id, course_plan_id, status, started_at, course_plans(id, name, description)')
        .in('status', ['active', 'completed', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
      enrollmentQuery = currentStudentId
        ? enrollmentQuery.eq('current_student_id', currentStudentId)
        : enrollmentQuery.eq('application_id', applicationId)

      const { data: enrollment } = await enrollmentQuery.maybeSingle()
      if (!active) return

      const planId = enrollment?.course_plan_id
      const enrollmentId = enrollment?.id

      // Program-overview columns are selected separately from the enrollment
      // join above so that, if the migration has not run, only this narrow
      // query fails and the rest of the page is unaffected.
      const [planResult, categoryResult, phaseResult, milestoneResult, progressResult, teamResult, profileResult, notesResult] =
        await Promise.all([
          planId
            ? supabase.from('course_plans')
              .select('id, name, description, learning_objective, capstone_goal, cadence, starts_on, expected_end_on')
              .eq('id', planId).maybeSingle()
            : Promise.resolve({ data: null }),
          planId
            ? supabase.from('learning_map_categories')
              .select('id, name, display_order, learning_map_topics(id, name, display_order)')
              .eq('course_plan_id', planId)
            : Promise.resolve({ data: [] }),
          planId
            ? supabase.from('project_phases')
              .select('id, name, estimated_duration, indicative_focus, display_order')
              .eq('course_plan_id', planId)
            : Promise.resolve({ data: [] }),
          planId
            ? supabase.from('course_milestones')
              .select('id, title, description, sort_order, phase_id')
              .eq('course_plan_id', planId)
            : Promise.resolve({ data: [] }),
          enrollmentId
            ? supabase.from('student_milestone_progress')
              .select('milestone_id, status').eq('enrollment_id', enrollmentId)
            : Promise.resolve({ data: [] }),
          currentStudentId
            ? supabase.from('student_mentor_assignments')
              .select('id, role, sort_order, mentors(id, name, responsibility, timezone)')
              .eq('current_student_id', currentStudentId)
            : Promise.resolve({ data: [] }),
          // Project fields are queried here rather than added to
          // useStudentPortal's select list: that query gates the entire portal,
          // and a column that does not exist yet would lock every student out.
          currentStudentId
            ? supabase.from('current_students')
              .select('id, project_area, project_goal')
              .eq('id', currentStudentId).maybeSingle()
            : Promise.resolve({ data: null }),
          enrollmentId
            ? supabase.from('session_notes')
              .select('id, session_date, title, mentor_name, notes, mentors(name)')
              .eq('enrollment_id', enrollmentId)
              .order('session_date', { ascending: false })
            : Promise.resolve({ data: [] }),
        ])

      if (!active) return

      const categories = (categoryResult.data || []).sort(byOrder()).map((category) => ({
        ...category,
        topics: [...(category.learning_map_topics || [])].sort(byOrder()),
      }))

      setData({
        enrollment: enrollment || null,
        // Fall back to the basic plan record from the enrollment join when the
        // program-overview columns do not exist yet.
        plan: planResult.data || enrollment?.course_plans || null,
        studentProfile: profileResult.data || null,
        categories,
        phases: (phaseResult.data || []).sort(byOrder()),
        milestones: (milestoneResult.data || []).sort(byOrder('sort_order')),
        progress: progressResult.data || [],
        // fallbackTeam keeps names and roles visible if the mentors table has
        // not gained responsibility/timezone yet.
        team: (teamResult.data && teamResult.data.length ? teamResult.data : fallbackTeam || [])
          .slice().sort(byOrder('sort_order')),
        notes: notesResult.data || [],
      })
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [applicationId, currentStudentId])

  return { ...data, loading }
}

/**
 * Phase status is derived, never stored, so it can never disagree with the
 * milestone progress it summarises. A phase is completed when it has milestones
 * and all are complete; the first phase that is not completed is current.
 */
export function derivePhaseStatuses(phases, milestones, progress) {
  const statusByMilestone = new Map(progress.map((item) => [item.milestone_id, item.status]))
  let currentAssigned = false

  return phases.map((phase) => {
    const phaseMilestones = milestones.filter((item) => item.phase_id === phase.id)
    const completed = phaseMilestones.length > 0
      && phaseMilestones.every((item) => statusByMilestone.get(item.id) === 'completed')

    let status = 'upcoming'
    if (completed) {
      status = 'completed'
    } else if (!currentAssigned) {
      status = 'current'
      currentAssigned = true
    }

    return {
      ...phase,
      status,
      milestones: phaseMilestones.map((item) => ({
        ...item,
        status: statusByMilestone.get(item.id) || 'not_started',
      })),
    }
  })
}
