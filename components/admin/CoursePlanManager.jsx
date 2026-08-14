import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useConfirm } from './ConfirmProvider'
import { formatHours, hoursToMinutes, sumMinutes } from '../../lib/courseHours'
import styles from '../../styles/courseHours.module.css'

export default function CoursePlanManager({ onClose }) {
  const confirm = useConfirm()
  const [plans, setPlans] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [planName, setPlanName] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [planAllowsOverage, setPlanAllowsOverage] = useState(false)
  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleHours, setModuleHours] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingHours, setEditingHours] = useState('')
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDescription, setMilestoneDescription] = useState('')
  const [editingMilestoneId, setEditingMilestoneId] = useState(null)
  const [editingMilestoneTitle, setEditingMilestoneTitle] = useState('')
  const [editingMilestoneDescription, setEditingMilestoneDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadPlans(preferredId) {
    const { data, error: loadError } = await supabase
      .from('course_plans')
      .select('*, course_modules(*), course_milestones(*), student_course_enrollments(id)')
      .order('created_at', { ascending: false })
    if (loadError) {
      setError('Course plans or milestones are unavailable. Run the 2026-07-22 and 2026-07-23 course migrations.')
      return
    }
    const normalized = (data || []).map((plan) => ({
      ...plan,
      course_modules: [...(plan.course_modules || [])].sort((a, b) => a.sort_order - b.sort_order),
      course_milestones: [...(plan.course_milestones || [])].sort((a, b) => a.sort_order - b.sort_order),
    }))
    setPlans(normalized)
    setSelectedId(preferredId === null
      ? normalized[0]?.id || null
      : preferredId || selectedId || normalized[0]?.id || null)
  }

  useEffect(() => { loadPlans() }, [])

  const selected = plans.find((plan) => plan.id === selectedId) || null
  const planMinutes = useMemo(() => sumMinutes(selected?.course_modules, 'planned_minutes'), [selected])

  async function createPlan(event) {
    event.preventDefault()
    if (!planName.trim()) return
    setBusy(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: createError } = await supabase.from('course_plans').insert({
      name: planName.trim(), description: planDescription.trim() || null,
      allow_overage: planAllowsOverage, created_by: user?.id,
    }).select().single()
    if (createError) setError(createError.message)
    else {
      setPlanName('')
      setPlanDescription('')
      setPlanAllowsOverage(false)
      await loadPlans(data.id)
    }
    setBusy(false)
  }

  async function addModule(event) {
    event.preventDefault()
    const plannedMinutes = hoursToMinutes(moduleHours)
    if (!selected || !moduleTitle.trim() || !plannedMinutes) return
    setBusy(true)
    const { error: addError } = await supabase.from('course_modules').insert({
      course_plan_id: selected.id,
      title: moduleTitle.trim(),
      planned_minutes: plannedMinutes,
      sort_order: selected.course_modules.length,
    })
    if (addError) setError(addError.message)
    else {
      setModuleTitle('')
      setModuleHours('')
      await loadPlans(selected.id)
    }
    setBusy(false)
  }

  function beginEdit(module) {
    setEditingId(module.id)
    setEditingTitle(module.title)
    setEditingHours(String(module.planned_minutes / 60))
  }

  async function saveModule(moduleId) {
    const plannedMinutes = hoursToMinutes(editingHours)
    if (!editingTitle.trim() || !plannedMinutes) return
    setBusy(true)
    const { error: updateError } = await supabase.from('course_modules').update({
      title: editingTitle.trim(), planned_minutes: plannedMinutes, updated_at: new Date().toISOString(),
    }).eq('id', moduleId)
    if (updateError) setError(updateError.message)
    else {
      setEditingId(null)
      await loadPlans(selected.id)
    }
    setBusy(false)
  }

  async function deleteModule(moduleId) {
    const ok = await confirm({ title: 'Delete module', message: 'Delete this module from the plan? Existing session logs will be kept as general sessions.', danger: true, confirmLabel: 'Delete' })
    if (!ok) return
    setBusy(true)
    const { error: deleteError } = await supabase.from('course_modules').delete().eq('id', moduleId)
    if (deleteError) setError(deleteError.message)
    else await loadPlans(selected.id)
    setBusy(false)
  }

  async function togglePlan() {
    if (!selected) return
    setBusy(true)
    const { error: updateError } = await supabase.from('course_plans').update({ active: !selected.active, updated_at: new Date().toISOString() }).eq('id', selected.id)
    if (updateError) setError(updateError.message)
    else await loadPlans(selected.id)
    setBusy(false)
  }

  async function deletePlan() {
    if (!selected) return
    const enrollmentCount = selected.student_course_enrollments?.length || 0
    if (enrollmentCount) {
      setError(`This plan is assigned to ${enrollmentCount} student${enrollmentCount === 1 ? '' : 's'} and cannot be deleted. Archive it instead.`)
      return
    }
    const ok = await confirm({
      title: 'Permanently delete this course plan',
      message: `Its ${selected.course_modules.length} modules and ${selected.course_milestones.length} milestones will also be permanently deleted.`,
      requireText: selected.name,
      danger: true,
      confirmLabel: 'Delete permanently',
    })
    if (!ok) return
    setBusy(true)
    setError('')
    const { error: deleteError, count } = await supabase
      .from('course_plans')
      .delete({ count: 'exact' })
      .eq('id', selected.id)
    if (deleteError) setError(deleteError.message)
    else if (count !== 1) setError('The course plan was not deleted. Reload and try again.')
    else await loadPlans(null)
    setBusy(false)
  }

  async function toggleOveragePolicy() {
    if (!selected) return
    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.from('course_plans').update({
      allow_overage: !selected.allow_overage,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id)
    if (updateError) setError(updateError.message)
    else await loadPlans(selected.id)
    setBusy(false)
  }

  async function addMilestone(event) {
    event.preventDefault()
    if (!selected || !milestoneTitle.trim()) return
    setBusy(true)
    setError('')
    const { error: addError } = await supabase.from('course_milestones').insert({
      course_plan_id: selected.id,
      title: milestoneTitle.trim(),
      description: milestoneDescription.trim() || null,
      sort_order: selected.course_milestones.length,
    })
    if (addError) setError(addError.message)
    else {
      setMilestoneTitle('')
      setMilestoneDescription('')
      await loadPlans(selected.id)
    }
    setBusy(false)
  }

  function beginMilestoneEdit(milestone) {
    setEditingMilestoneId(milestone.id)
    setEditingMilestoneTitle(milestone.title)
    setEditingMilestoneDescription(milestone.description || '')
  }

  async function saveMilestone(milestoneId) {
    if (!editingMilestoneTitle.trim()) return
    setBusy(true)
    const { error: updateError } = await supabase.from('course_milestones').update({
      title: editingMilestoneTitle.trim(),
      description: editingMilestoneDescription.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', milestoneId)
    if (updateError) setError(updateError.message)
    else {
      setEditingMilestoneId(null)
      await loadPlans(selected.id)
    }
    setBusy(false)
  }

  async function deleteMilestone(milestoneId) {
    const ok = await confirm({ title: 'Delete milestone', message: 'Delete this milestone and its student progress records?', danger: true, confirmLabel: 'Delete' })
    if (!ok) return
    setBusy(true)
    const { error: deleteError } = await supabase.from('course_milestones').delete().eq('id', milestoneId)
    if (deleteError) setError(deleteError.message)
    else await loadPlans(selected.id)
    setBusy(false)
  }

  return (
    <aside className={styles.managerPanel} aria-label="Course plan manager">
      <div className={styles.managerHeader}>
        <div><span className={styles.eyebrow}>Course setup</span><h2>Course plans</h2><p>Create reusable plans and set the expected hours for each module.</p></div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close course plans">×</button>
      </div>
      {error ? <div className={styles.adminError}>{error}</div> : null}

      <div className={styles.managerGrid}>
        <div className={styles.planSidebar}>
          <form className={styles.compactForm} onSubmit={createPlan}>
            <h3>New course plan</h3>
            <label>Name<input value={planName} onChange={(event) => setPlanName(event.target.value)} required placeholder="e.g. 12-week Research Program" /></label>
            <label>Description<textarea value={planDescription} onChange={(event) => setPlanDescription(event.target.value)} rows="3" placeholder="Optional overview" /></label>
            <label className={styles.checkboxLabel}><input type="checkbox" checked={planAllowsOverage} onChange={(event) => setPlanAllowsOverage(event.target.checked)} /><span>Hours are a minimum; classes may continue beyond them</span></label>
            <button type="submit" disabled={busy}>Create plan</button>
          </form>
          <div className={styles.planList}>
            {plans.map((plan) => (
              <button type="button" key={plan.id} className={plan.id === selectedId ? styles.planSelected : ''} onClick={() => setSelectedId(plan.id)}>
                <strong>{plan.name}</strong><span>{plan.course_modules.length} modules · {plan.course_milestones.length} milestones · {plan.allow_overage ? 'minimum hours' : 'hard limit'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.planEditor}>
          {selected ? <>
            <div className={styles.planEditorHeader}>
              <div><h3>{selected.name}</h3><p>{selected.description || 'No description added.'}</p></div>
              <div><strong>{formatHours(planMinutes)}</strong><span>planned</span></div>
            </div>
            <div className={styles.planActions}>
              <button type="button" className={styles.textButton} onClick={togglePlan} disabled={busy}>{selected.active ? 'Archive plan' : 'Reactivate plan'}</button>
              <button
                type="button"
                className={styles.deletePlanButton}
                onClick={deletePlan}
                disabled={busy || Boolean(selected.student_course_enrollments?.length)}
                title={selected.student_course_enrollments?.length ? 'Assigned plans must be archived instead of deleted.' : 'Permanently delete this unused plan'}
              >
                Delete plan
              </button>
              {selected.student_course_enrollments?.length ? <span>{selected.student_course_enrollments.length} assigned student{selected.student_course_enrollments.length === 1 ? '' : 's'}</span> : null}
            </div>

            <div className={styles.policyControl}>
              <div><strong>{selected.allow_overage ? 'Minimum-hours plan' : 'Fixed-hours plan'}</strong><span>{selected.allow_overage ? 'Students may continue after fulfilling the minimum hours.' : 'Class entries cannot exceed the allocated hours.'}</span></div>
              <label className={styles.switchLabel}><input type="checkbox" checked={selected.allow_overage} onChange={toggleOveragePolicy} disabled={busy} /><span /></label>
            </div>

            <div className={styles.editableModules}>
              {selected.course_modules.map((module) => (
                <div className={styles.editableModule} key={module.id}>
                  {editingId === module.id ? <>
                    <input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} aria-label="Module title" />
                    <input type="number" min="0.25" step="0.25" value={editingHours} onChange={(event) => setEditingHours(event.target.value)} aria-label="Module hours" />
                    <button type="button" onClick={() => saveModule(module.id)} disabled={busy}>Save</button>
                    <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                  </> : <>
                    <div><strong>{module.title}</strong><span>{formatHours(module.planned_minutes)}</span></div>
                    <button type="button" onClick={() => beginEdit(module)}>Edit</button>
                    <button type="button" className={styles.dangerText} onClick={() => deleteModule(module.id)}>Delete</button>
                  </>}
                </div>
              ))}
            </div>

            <form className={styles.moduleForm} onSubmit={addModule}>
              <input value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} required placeholder="Module name" />
              <input type="number" min="0.25" step="0.25" value={moduleHours} onChange={(event) => setModuleHours(event.target.value)} required placeholder="Hours" />
              <button type="submit" disabled={busy}>Add module</button>
            </form>

            <div className={styles.milestoneEditor}>
              <div className={styles.editorSubheading}><div><span className={styles.eyebrow}>Student progress</span><h3>Milestones</h3></div><span>{selected.course_milestones.length} steps</span></div>
              <div className={styles.editableMilestones}>
                {selected.course_milestones.map((milestone, index) => (
                  <div className={styles.editableMilestone} key={milestone.id}>
                    <span className={styles.milestoneOrder}>{index + 1}</span>
                    {editingMilestoneId === milestone.id ? <div className={styles.milestoneEditFields}>
                      <input value={editingMilestoneTitle} onChange={(event) => setEditingMilestoneTitle(event.target.value)} aria-label="Milestone title" />
                      <textarea rows="2" value={editingMilestoneDescription} onChange={(event) => setEditingMilestoneDescription(event.target.value)} aria-label="Milestone description" />
                      <div><button type="button" onClick={() => saveMilestone(milestone.id)} disabled={busy}>Save</button><button type="button" onClick={() => setEditingMilestoneId(null)}>Cancel</button></div>
                    </div> : <>
                      <div><strong>{milestone.title}</strong>{milestone.description ? <span>{milestone.description}</span> : null}</div>
                      <button type="button" onClick={() => beginMilestoneEdit(milestone)}>Edit</button>
                      <button type="button" className={styles.dangerText} onClick={() => deleteMilestone(milestone.id)}>Delete</button>
                    </>}
                  </div>
                ))}
              </div>
              <form className={styles.milestoneForm} onSubmit={addMilestone}>
                <input value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.target.value)} required placeholder="Milestone name, e.g. Research question set" />
                <input value={milestoneDescription} onChange={(event) => setMilestoneDescription(event.target.value)} placeholder="Optional description" />
                <button type="submit" disabled={busy}>Add milestone</button>
              </form>
            </div>
          </> : <div className={styles.managerEmpty}>Create a course plan to begin adding modules.</div>}
        </div>
      </div>
    </aside>
  )
}
