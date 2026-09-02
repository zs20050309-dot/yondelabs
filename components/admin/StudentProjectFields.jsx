import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from './ToastProvider'
import styles from '../../styles/courseHours.module.css'

/**
 * Student-level details: identity, school, and project.
 *
 * These are per student rather than per plan — several students share one
 * program (e.g. Prof. Gu's) but each has their own project. An empty goal is
 * shown to the student as "Exploring Project Direction", so leaving it blank is
 * a valid state, not an incomplete one.
 */
export default function StudentProjectFields({ currentStudent, onSaved }) {
  const showToast = useToast()
  const [fullName, setFullName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [school, setSchool] = useState('')
  const [stage, setStage] = useState('')
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
        .select('full_name, contact_email, school, stage, project_area, project_goal')
        .eq('id', currentStudent.id)
        .maybeSingle()
      if (!active) return
      if (loadError) {
        setError('Project fields are unavailable. Run the 2026-09-02 student journey migration.')
      } else {
        setFullName(data?.full_name || '')
        setContactEmail(data?.contact_email || '')
        setSchool(data?.school || '')
        setStage(data?.stage || '')
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
    if (!fullName.trim()) {
      setError('A full name is required.')
      return
    }
    setBusy(true)
    setError('')
    const { error: saveError } = await supabase.from('current_students').update({
      full_name: fullName.trim(),
      contact_email: contactEmail.trim() || null,
      school: school.trim() || null,
      stage: stage.trim() || null,
      project_area: projectArea.trim() || null,
      project_goal: projectGoal.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', currentStudent.id)

    if (saveError) {
      // 23505 is the unique index on lower(contact_email).
      setError(saveError.code === '23505'
        ? 'Another student already uses that contact email.'
        : saveError.message)
    } else {
      showToast('Student details saved.')
      if (onSaved) await onSaved()
    }
    setBusy(false)
  }

  if (loading) return null

  return (
    <form className={styles.journeyEditor} onSubmit={save}>
      <div className={styles.editorSubheading}>
        <div><span className={styles.eyebrow}>Student-facing</span><h3>Student details</h3></div>
      </div>
      {error ? <div className={styles.adminError}>{error}</div> : null}

      <div className={styles.dateRow}>
        <label className={styles.stackedField}>
          <span>Full name</span>
          <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </label>
        <label className={styles.stackedField}>
          <span>Contact email</span>
          <input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="Optional" />
        </label>
      </div>
      <div className={styles.dateRow}>
        <label className={styles.stackedField}>
          <span>School</span>
          <input type="text" value={school} onChange={(event) => setSchool(event.target.value)} placeholder="e.g. The Webb Schools" />
        </label>
        <label className={styles.stackedField}>
          <span>Stage</span>
          <input type="text" value={stage} onChange={(event) => setStage(event.target.value)} placeholder="e.g. Rising Sophomore" />
        </label>
      </div>
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
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save student details'}</button>
    </form>
  )
}
