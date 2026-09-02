import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from './ToastProvider'
import styles from '../../styles/courseHours.module.css'

/**
 * Per-student project area and goal.
 *
 * These are student-level rather than plan-level: several students share one
 * program (e.g. Prof. Gu's) but each has their own project. An empty goal is
 * shown to the student as "Exploring Project Direction", so leaving it blank is
 * a valid state, not an incomplete one.
 */
export default function StudentProjectFields({ currentStudent, onSaved }) {
  const showToast = useToast()
  const [projectArea, setProjectArea] = useState('')
  const [projectGoal, setProjectGoal] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error: loadError } = await supabase
        .from('current_students')
        .select('project_area, project_goal')
        .eq('id', currentStudent.id)
        .maybeSingle()
      if (!active) return
      if (loadError) {
        setError('Project fields are unavailable. Run the 2026-09-02 student journey migration.')
      } else {
        setProjectArea(data?.project_area || '')
        setProjectGoal(data?.project_goal || '')
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [currentStudent.id])

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const { error: saveError } = await supabase.from('current_students').update({
      project_area: projectArea.trim() || null,
      project_goal: projectGoal.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', currentStudent.id)

    if (saveError) setError(saveError.message)
    else {
      showToast('Project details saved.')
      if (onSaved) await onSaved()
    }
    setBusy(false)
  }

  if (loading) return null

  return (
    <form className={styles.journeyEditor} onSubmit={save}>
      <div className={styles.editorSubheading}>
        <div><span className={styles.eyebrow}>Student-facing</span><h3>Project details</h3></div>
      </div>
      {error ? <div className={styles.adminError}>{error}</div> : null}

      <label className={styles.stackedField}>
        <span>Project area</span>
        <input
          type="text"
          value={projectArea}
          onChange={(event) => setProjectArea(event.target.value)}
          placeholder="e.g. AI × Fashion"
        />
      </label>
      <label className={styles.stackedField}>
        <span>Project goal</span>
        <textarea
          rows="2"
          value={projectGoal}
          onChange={(event) => setProjectGoal(event.target.value)}
          placeholder="Leave blank while the direction is still being explored"
        />
      </label>
      <p className={styles.assignHint}>
        A blank goal is shown to the student as &quot;Exploring Project Direction&quot;.
      </p>
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save project details'}</button>
    </form>
  )
}
