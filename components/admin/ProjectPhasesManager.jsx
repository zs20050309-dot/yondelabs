import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useConfirm } from './ConfirmProvider'
import styles from '../../styles/courseHours.module.css'

const EMPTY_DRAFT = { name: '', estimated_duration: '', indicative_focus: '' }

/**
 * Project Journey phases for a course plan.
 *
 * estimated_duration is deliberately free text ("~4-6 weeks"): the product spec
 * avoids fixed calendar commitments. Phase status is not editable here because
 * it is derived from milestone progress on the student side, so the only thing
 * staff control is which milestones belong to which phase.
 */
export default function ProjectPhasesManager({ planId, milestones = [], onMilestonesChanged }) {
  const confirm = useConfirm()
  const [phases, setPhases] = useState([])
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState(null)
  const [editingDraft, setEditingDraft] = useState(EMPTY_DRAFT)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!planId) return
    const { data, error: loadError } = await supabase
      .from('project_phases')
      .select('id, name, estimated_duration, indicative_focus, display_order')
      .eq('course_plan_id', planId)
    if (loadError) {
      setError('Project Journey is unavailable. Run the 2026-09-02 student journey migration.')
      setPhases([])
      return
    }
    setError('')
    setPhases((data || []).sort((a, b) => a.display_order - b.display_order))
  }, [planId])

  useEffect(() => { load() }, [load])

  async function run(action, after) {
    setBusy(true)
    const { error: actionError } = await action()
    if (actionError) setError(actionError.message)
    else {
      await load()
      if (after) await after()
    }
    setBusy(false)
  }

  async function addPhase(event) {
    event.preventDefault()
    if (!draft.name.trim()) return
    await run(() => supabase.from('project_phases').insert({
      course_plan_id: planId,
      name: draft.name.trim(),
      estimated_duration: draft.estimated_duration.trim() || null,
      indicative_focus: draft.indicative_focus.trim() || null,
      display_order: phases.length,
    }))
    setDraft(EMPTY_DRAFT)
  }

  async function savePhase(phaseId) {
    if (!editingDraft.name.trim()) return
    await run(() => supabase.from('project_phases').update({
      name: editingDraft.name.trim(),
      estimated_duration: editingDraft.estimated_duration.trim() || null,
      indicative_focus: editingDraft.indicative_focus.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', phaseId))
    setEditingId(null)
  }

  async function deletePhase(phase) {
    const assigned = milestones.filter((item) => item.phase_id === phase.id).length
    const ok = await confirm({
      title: 'Delete phase',
      message: assigned
        ? `"${phase.name}" will be removed. Its ${assigned} milestone${assigned === 1 ? '' : 's'} will be kept but left unassigned.`
        : `"${phase.name}" will be removed from the Project Journey.`,
      danger: true,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    await run(() => supabase.from('project_phases').delete().eq('id', phase.id), onMilestonesChanged)
  }

  async function move(index, direction) {
    const target = index + direction
    if (target < 0 || target >= phases.length) return
    const a = phases[index]
    const b = phases[target]
    setBusy(true)
    const [first, second] = await Promise.all([
      supabase.from('project_phases').update({ display_order: b.display_order }).eq('id', a.id),
      supabase.from('project_phases').update({ display_order: a.display_order }).eq('id', b.id),
    ])
    if (first.error || second.error) setError((first.error || second.error).message)
    else await load()
    setBusy(false)
  }

  async function assignMilestone(milestoneId, phaseId) {
    setBusy(true)
    const { error: updateError } = await supabase
      .from('course_milestones')
      .update({ phase_id: phaseId || null, updated_at: new Date().toISOString() })
      .eq('id', milestoneId)
    if (updateError) setError(updateError.message)
    else if (onMilestonesChanged) await onMilestonesChanged()
    setBusy(false)
  }

  if (!planId) return null

  return (
    <div className={styles.journeyEditor}>
      <div className={styles.editorSubheading}>
        <div><span className={styles.eyebrow}>Project</span><h3>Project Journey</h3></div>
        <span>{phases.length} phases</span>
      </div>
      {error ? <div className={styles.adminError}>{error}</div> : null}

      {phases.map((phase, index) => (
        <div className={styles.phaseRow} key={phase.id}>
          {editingId === phase.id ? (
            <div className={styles.phaseEditFields}>
              <input value={editingDraft.name} onChange={(event) => setEditingDraft((d) => ({ ...d, name: event.target.value }))} aria-label="Phase name" placeholder="Phase name" />
              <input value={editingDraft.estimated_duration} onChange={(event) => setEditingDraft((d) => ({ ...d, estimated_duration: event.target.value }))} aria-label="Estimated duration" placeholder="~4-6 weeks" />
              <textarea rows="2" value={editingDraft.indicative_focus} onChange={(event) => setEditingDraft((d) => ({ ...d, indicative_focus: event.target.value }))} aria-label="Indicative focus" placeholder="Indicative focus (optional)" />
              <div>
                <button type="button" onClick={() => savePhase(phase.id)} disabled={busy}>Save</button>
                <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.phaseRowMain}>
                <span className={styles.milestoneOrder}>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{phase.name}</strong>
                  {phase.estimated_duration ? <span>{phase.estimated_duration}</span> : null}
                  {phase.indicative_focus ? <p>{phase.indicative_focus}</p> : null}
                </div>
              </div>
              <div className={styles.rowTools}>
                <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label="Move phase up">↑</button>
                <button type="button" onClick={() => move(index, 1)} disabled={busy || index === phases.length - 1} aria-label="Move phase down">↓</button>
                <button type="button" onClick={() => { setEditingId(phase.id); setEditingDraft({ name: phase.name, estimated_duration: phase.estimated_duration || '', indicative_focus: phase.indicative_focus || '' }) }}>Edit</button>
                <button type="button" className={styles.dangerText} onClick={() => deletePhase(phase)}>Delete</button>
              </div>
            </>
          )}
        </div>
      ))}

      <form className={styles.phaseForm} onSubmit={addPhase}>
        <input value={draft.name} onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))} placeholder="Phase name, e.g. Foundations Building" required />
        <input value={draft.estimated_duration} onChange={(event) => setDraft((d) => ({ ...d, estimated_duration: event.target.value }))} placeholder="~4-6 weeks" />
        <textarea rows="2" value={draft.indicative_focus} onChange={(event) => setDraft((d) => ({ ...d, indicative_focus: event.target.value }))} placeholder="Indicative focus (optional)" />
        <button type="submit" disabled={busy}>Add phase</button>
      </form>

      {milestones.length ? (
        <div className={styles.milestoneAssign}>
          <h4>Milestones by phase</h4>
          <p className={styles.assignHint}>
            Unassigned milestones still track progress but do not appear in the student&apos;s Project Journey.
          </p>
          {milestones.map((milestone) => (
            <label className={styles.assignRow} key={milestone.id}>
              <span>{milestone.title}</span>
              <select
                value={milestone.phase_id || ''}
                onChange={(event) => assignMilestone(milestone.id, event.target.value)}
                disabled={busy}
              >
                <option value="">Unassigned</option>
                {phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.name}</option>)}
              </select>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  )
}
