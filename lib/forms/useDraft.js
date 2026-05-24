import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

const DEBOUNCE_MS = 2000

function localKey(program, userId) {
  return `yondelabs.draft.${program}.${userId}`
}

function readLocal(program, userId) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(localKey(program, userId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeLocal(program, userId, values) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      localKey(program, userId),
      JSON.stringify({ values, savedAt: Date.now() })
    )
  } catch {
    // localStorage may be unavailable (private mode, quota); silently skip
  }
}

function clearLocal(program, userId) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(localKey(program, userId))
  } catch {
    // ignore
  }
}

// Draft persistence with double-write (Supabase + localStorage).
// Supabase is the source of truth across devices; localStorage is the offline
// fallback when the server is unreachable.
export function useDraft({ program, user }) {
  const [applicationId, setApplicationId] = useState(null)
  const [initialValues, setInitialValues] = useState(null)
  const [status, setStatus] = useState('idle')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [submittedAlready, setSubmittedAlready] = useState(false)

  const valuesRef = useRef(null)
  const applicationIdRef = useRef(null)
  const timerRef = useRef(null)
  const userId = user?.id

  useEffect(() => {
    applicationIdRef.current = applicationId
  }, [applicationId])

  useEffect(() => {
    if (!userId || !program) return undefined
    let cancelled = false

    async function load() {
      try {
        const { data: existingSubmitted, error: subErr } = await supabase
          .from('applications')
          .select('id')
          .eq('user_id', userId)
          .eq('program', program)
          .neq('status', 'draft')
          .limit(1)
          .maybeSingle()

        if (cancelled) return

        if (!subErr && existingSubmitted) {
          setSubmittedAlready(true)
          setInitialValues({})
          return
        }

        const { data: draft, error: draftErr } = await supabase
          .from('applications')
          .select('id, form_data, updated_at')
          .eq('user_id', userId)
          .eq('program', program)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cancelled) return

        if (draftErr) {
          const local = readLocal(program, userId)
          setInitialValues(local?.values || {})
          setStatus('offline')
          setLoadError(
            'We could not reach the server — your work is being saved locally on this device for now.'
          )
          return
        }

        const local = readLocal(program, userId)

        if (draft) {
          setApplicationId(draft.id)
          const remoteAt = draft.updated_at ? Date.parse(draft.updated_at) : 0
          const localAt = local?.savedAt || 0
          if (local && localAt > remoteAt) {
            setInitialValues(local.values || {})
            valuesRef.current = local.values || {}
            applicationIdRef.current = draft.id
            void flushSave()
          } else {
            setInitialValues(draft.form_data || {})
          }
          setLastSavedAt(new Date(remoteAt || Date.now()))
          setStatus('saved')
        } else {
          setInitialValues(local?.values || {})
        }
      } catch {
        if (cancelled) return
        const local = readLocal(program, userId)
        setInitialValues(local?.values || {})
        setStatus('offline')
        setLoadError(
          'We could not reach the server — your work is being saved locally on this device for now.'
        )
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [program, userId])

  const flushSave = useCallback(async () => {
    if (!userId) return
    const values = valuesRef.current
    if (values == null) return

    setStatus('saving')

    try {
      if (applicationIdRef.current) {
        const { error } = await supabase
          .from('applications')
          .update({ form_data: values })
          .eq('id', applicationIdRef.current)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('applications')
          .insert({
            user_id: userId,
            program,
            status: 'draft',
            form_data: values,
          })
          .select('id')
          .single()
        if (error) throw error
        setApplicationId(data.id)
        applicationIdRef.current = data.id
      }
      setLastSavedAt(new Date())
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }, [program, userId])

  const save = useCallback(
    (values) => {
      valuesRef.current = values
      writeLocal(program, userId, values)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void flushSave()
      }, DEBOUNCE_MS)
    },
    [program, userId, flushSave]
  )

  const saveImmediate = useCallback(
    async (values) => {
      valuesRef.current = values
      writeLocal(program, userId, values)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      await flushSave()
    },
    [flushSave, program, userId]
  )

  const submit = useCallback(
    async (values) => {
      if (!userId) return { ok: false, error: 'You appear to be signed out. Please log in again.' }

      valuesRef.current = values
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      setStatus('saving')
      const submittedAt = new Date().toISOString()

      try {
        if (applicationIdRef.current) {
          const { error } = await supabase
            .from('applications')
            .update({
              form_data: values,
              status: 'submitted',
              submitted_at: submittedAt,
            })
            .eq('id', applicationIdRef.current)
          if (error) throw error
        } else {
          const { data, error } = await supabase
            .from('applications')
            .insert({
              user_id: userId,
              program,
              status: 'submitted',
              form_data: values,
              submitted_at: submittedAt,
            })
            .select('id')
            .single()
          if (error) throw error
          setApplicationId(data.id)
          applicationIdRef.current = data.id
        }
        clearLocal(program, userId)
        setStatus('saved')
        return { ok: true }
      } catch {
        setStatus('error')
        return {
          ok: false,
          error: 'We could not submit your application. Please try again or contact info@yondelabs.com.',
        }
      }
    },
    [program, userId]
  )

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  return {
    initialValues,
    isLoading: initialValues === null,
    submittedAlready,
    save,
    saveImmediate,
    submit,
    status,
    lastSavedAt,
    loadError,
  }
}
