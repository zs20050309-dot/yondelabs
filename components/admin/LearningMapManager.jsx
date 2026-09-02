import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useConfirm } from './ConfirmProvider'
import styles from '../../styles/courseHours.module.css'

/**
 * Category -> topic editor for a course plan's Learning Map.
 *
 * The hierarchy is intentionally capped at two levels by product decision:
 * topics have no children and no description, so this editor offers no way to
 * create either. Reordering swaps display_order with the neighbour rather than
 * renumbering the whole list, which keeps each move to two row updates.
 */
export default function LearningMapManager({ planId }) {
  const confirm = useConfirm()
  const [categories, setCategories] = useState([])
  const [categoryName, setCategoryName] = useState('')
  const [topicDrafts, setTopicDrafts] = useState({})
  const [editing, setEditing] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!planId) return
    const { data, error: loadError } = await supabase
      .from('learning_map_categories')
      .select('id, name, display_order, learning_map_topics(id, name, display_order)')
      .eq('course_plan_id', planId)
    if (loadError) {
      setError('Learning Map is unavailable. Run the 2026-09-02 student journey migration.')
      setCategories([])
      return
    }
    setError('')
    setCategories((data || [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((category) => ({
        ...category,
        topics: [...(category.learning_map_topics || [])].sort((a, b) => a.display_order - b.display_order),
      })))
  }, [planId])

  useEffect(() => { load() }, [load])

  async function run(action) {
    setBusy(true)
    const { error: actionError } = await action()
    if (actionError) setError(actionError.message)
    else await load()
    setBusy(false)
  }

  async function addCategory(event) {
    event.preventDefault()
    if (!categoryName.trim()) return
    await run(() => supabase.from('learning_map_categories').insert({
      course_plan_id: planId,
      name: categoryName.trim(),
      display_order: categories.length,
    }))
    setCategoryName('')
  }

  async function addTopic(event, category) {
    event.preventDefault()
    const name = (topicDrafts[category.id] || '').trim()
    if (!name) return
    await run(() => supabase.from('learning_map_topics').insert({
      category_id: category.id,
      name,
      display_order: category.topics.length,
    }))
    setTopicDrafts((current) => ({ ...current, [category.id]: '' }))
  }

  async function rename(table, id) {
    if (!editingValue.trim()) return
    await run(() => supabase.from(table).update({
      name: editingValue.trim(), updated_at: new Date().toISOString(),
    }).eq('id', id))
    setEditing(null)
  }

  async function remove(table, id, label, message) {
    const ok = await confirm({ title: `Delete ${label}`, message, danger: true, confirmLabel: 'Delete' })
    if (!ok) return
    await run(() => supabase.from(table).delete().eq('id', id))
  }

  async function move(table, list, index, direction) {
    const target = index + direction
    if (target < 0 || target >= list.length) return
    const a = list[index]
    const b = list[target]
    setBusy(true)
    const [first, second] = await Promise.all([
      supabase.from(table).update({ display_order: b.display_order }).eq('id', a.id),
      supabase.from(table).update({ display_order: a.display_order }).eq('id', b.id),
    ])
    if (first.error || second.error) setError((first.error || second.error).message)
    else await load()
    setBusy(false)
  }

  if (!planId) return null

  return (
    <div className={styles.journeyEditor}>
      <div className={styles.editorSubheading}>
        <div><span className={styles.eyebrow}>Curriculum</span><h3>Learning Map</h3></div>
        <span>{categories.length} categories</span>
      </div>
      {error ? <div className={styles.adminError}>{error}</div> : null}

      {categories.map((category, categoryIndex) => (
        <div className={styles.mapCategoryRow} key={category.id}>
          <div className={styles.mapCategoryHead}>
            {editing === `c:${category.id}` ? (
              <>
                <input value={editingValue} onChange={(event) => setEditingValue(event.target.value)} aria-label="Category name" />
                <button type="button" onClick={() => rename('learning_map_categories', category.id)} disabled={busy}>Save</button>
                <button type="button" onClick={() => setEditing(null)}>Cancel</button>
              </>
            ) : (
              <>
                <strong>{category.name}</strong>
                <div className={styles.rowTools}>
                  <button type="button" onClick={() => move('learning_map_categories', categories, categoryIndex, -1)} disabled={busy || categoryIndex === 0} aria-label="Move category up">↑</button>
                  <button type="button" onClick={() => move('learning_map_categories', categories, categoryIndex, 1)} disabled={busy || categoryIndex === categories.length - 1} aria-label="Move category down">↓</button>
                  <button type="button" onClick={() => { setEditing(`c:${category.id}`); setEditingValue(category.name) }}>Rename</button>
                  <button type="button" className={styles.dangerText} onClick={() => remove('learning_map_categories', category.id, 'category', `"${category.name}" and its ${category.topics.length} topics will be removed from the Learning Map.`)}>Delete</button>
                </div>
              </>
            )}
          </div>

          <ul className={styles.mapTopicList}>
            {category.topics.map((topic, topicIndex) => (
              <li key={topic.id}>
                {editing === `t:${topic.id}` ? (
                  <>
                    <input value={editingValue} onChange={(event) => setEditingValue(event.target.value)} aria-label="Topic name" />
                    <button type="button" onClick={() => rename('learning_map_topics', topic.id)} disabled={busy}>Save</button>
                    <button type="button" onClick={() => setEditing(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span>{topic.name}</span>
                    <div className={styles.rowTools}>
                      <button type="button" onClick={() => move('learning_map_topics', category.topics, topicIndex, -1)} disabled={busy || topicIndex === 0} aria-label="Move topic up">↑</button>
                      <button type="button" onClick={() => move('learning_map_topics', category.topics, topicIndex, 1)} disabled={busy || topicIndex === category.topics.length - 1} aria-label="Move topic down">↓</button>
                      <button type="button" onClick={() => { setEditing(`t:${topic.id}`); setEditingValue(topic.name) }}>Rename</button>
                      <button type="button" className={styles.dangerText} onClick={() => remove('learning_map_topics', topic.id, 'topic', `"${topic.name}" will be removed from the Learning Map.`)}>Delete</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

          <form className={styles.inlineAddForm} onSubmit={(event) => addTopic(event, category)}>
            <input
              value={topicDrafts[category.id] || ''}
              onChange={(event) => setTopicDrafts((current) => ({ ...current, [category.id]: event.target.value }))}
              placeholder="Add a topic"
            />
            <button type="submit" disabled={busy}>Add topic</button>
          </form>
        </div>
      ))}

      <form className={styles.inlineAddForm} onSubmit={addCategory}>
        <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Add a category, e.g. AI & ML Foundations" />
        <button type="submit" disabled={busy}>Add category</button>
      </form>
    </div>
  )
}
