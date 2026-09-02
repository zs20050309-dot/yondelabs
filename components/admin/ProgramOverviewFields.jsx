import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from './ToastProvider'
import styles from '../../styles/courseHours.module.css'

const FIELDS = ['learning_objective', 'capstone_goal', 'cadence', 'starts_on', 'expected_end_on']

function toDraft(plan) {
  return FIELDS.reduce((draft, field) => ({ ...draft, [field]: plan?.[field] || '' }), {})
}

/**
 * Program Overview copy for a course plan. These are the fields the student
 * sees at the top of /student, so they are edited alongside the plan rather
 * than per student; only project area and goal are per-student.
 */
export default function ProgramOverviewFields({ plan, onSaved }) {
  const showToast = useToast()
  const [draft, setDraft] = useState(() => toDraft(plan))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setDraft(toDraft(plan)) }, [plan?.id])

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const { error: saveError } = await supabase.from('course_plans').update({
      learning_objective: draft.learning_objective.trim() || null,
      capstone_goal: draft.capstone_goal.trim() || null,
      cadence: draft.cadence.trim() || null,
      // Empty date inputs must become null, not '', or Postgres rejects them.
      starts_on: draft.starts_on || null,
      expected_end_on: draft.expected_end_on || null,
      updated_at: new Date().toISOString(),
    }).eq('id', plan.id)

    if (saveError) {
      setError(saveError.message.includes('column')
        ? 'Program Overview fields are unavailable. Run the 2026-09-02 student journey migration.'
        : saveError.message)
    } else {
      showToast('Program overview saved.')
      if (onSaved) await onSaved()
    }
    setBusy(false)
  }

  if (!plan) return null

  function update(field) {
    return (event) => setDraft((current) => ({ ...current, [field]: event.target.value }))
  }

  return (
    <form className={styles.journeyEditor} onSubmit={save}>
      <div className={styles.editorSubheading}>
        <div><span className={styles.eyebrow}>Student-facing</span><h3>Program overview</h3></div>
      </div>
      {error ? <div className={styles.adminError}>{error}</div> : null}

      <label className={styles.stackedField}>
        <span>Learning objective</span>
        <textarea rows="2" value={draft.learning_objective} onChange={update('learning_objective')} placeholder="What the student is ultimately working towards" />
      </label>
      <label className={styles.stackedField}>
        <span>Capstone / project goal</span>
        <textarea rows="2" value={draft.capstone_goal} onChange={update('capstone_goal')} placeholder="e.g. Build a working demo prototype for an AI-powered fashion venture" />
      </label>
      <label className={styles.stackedField}>
        <span>Learning cadence</span>
        <textarea rows="3" value={draft.cadence} onChange={update('cadence')} placeholder={'Professor session — monthly\nTA sessions — 1–2 per month\n1:1 office hours — scheduled as needed'} />
      </label>
      <div className={styles.dateRow}>
        <label className={styles.stackedField}>
          <span>Starts</span>
          <input type="date" value={draft.starts_on} onChange={update('starts_on')} />
        </label>
        <label className={styles.stackedField}>
          <span>Expected end</span>
          <input type="date" value={draft.expected_end_on} onChange={update('expected_end_on')} />
        </label>
      </div>
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save program overview'}</button>
    </form>
  )
}
