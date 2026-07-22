import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatHours, hoursToMinutes, sumMinutes } from '../../lib/courseHours'
import styles from '../../styles/courseHours.module.css'

export default function CoursePlanManager({ onClose }) {
  const [plans, setPlans] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [planName, setPlanName] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleHours, setModuleHours] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingHours, setEditingHours] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadPlans(preferredId) {
    const { data, error: loadError } = await supabase
      .from('course_plans')
      .select('*, course_modules(*)')
      .order('created_at', { ascending: false })
    if (loadError) {
      setError('Course tables are unavailable. Run the 2026-07-22 course-hours migration.')
      return
    }
    const normalized = (data || []).map((plan) => ({
      ...plan,
      course_modules: [...(plan.course_modules || [])].sort((a, b) => a.sort_order - b.sort_order),
    }))
    setPlans(normalized)
    setSelectedId(preferredId || selectedId || normalized[0]?.id || null)
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
      name: planName.trim(), description: planDescription.trim() || null, created_by: user?.id,
    }).select().single()
    if (createError) setError(createError.message)
    else {
      setPlanName('')
      setPlanDescription('')
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
    if (!window.confirm('Delete this module from the plan? Existing session logs will be kept as general sessions.')) return
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
            <button type="submit" disabled={busy}>Create plan</button>
          </form>
          <div className={styles.planList}>
            {plans.map((plan) => (
              <button type="button" key={plan.id} className={plan.id === selectedId ? styles.planSelected : ''} onClick={() => setSelectedId(plan.id)}>
                <strong>{plan.name}</strong><span>{plan.course_modules.length} modules · {formatHours(sumMinutes(plan.course_modules, 'planned_minutes'))}</span>
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
            <button type="button" className={styles.textButton} onClick={togglePlan} disabled={busy}>{selected.active ? 'Archive plan' : 'Reactivate plan'}</button>

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
          </> : <div className={styles.managerEmpty}>Create a course plan to begin adding modules.</div>}
        </div>
      </div>
    </aside>
  )
}

