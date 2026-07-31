import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../supabaseClient'

export default function useStudentPortal() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadPortal() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()

        if (!currentUser) {
          router.replace('/login')
          return
        }

        const { data, error: applicationError } = await supabase
          .from('applications')
          .select('id, program, status, submitted_at, form_data')
          .eq('user_id', currentUser.id)
          .neq('status', 'draft')
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!active) return
        setUser(currentUser)
        setApplication(applicationError ? null : data)
        setError(applicationError ? 'We could not load your portal details. Please try again.' : '')
      } catch {
        if (!active) return
        setError('We could not load your portal details. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPortal()
    return () => {
      active = false
    }
  }, [router])

  return { user, application, loading, error }
}
