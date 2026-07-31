import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../supabaseClient'

export default function useStudentPortal() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [application, setApplication] = useState(null)
  const [portalAccount, setPortalAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadPortal() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()

        const role =
          currentUser?.app_metadata?.role || currentUser?.user_metadata?.role
        if (!currentUser || role !== 'student_portal') {
          router.replace('/student/login')
          return
        }

        const { data: account, error: accountError } = await supabase
          .from('student_portal_accounts')
          .select(`
            application_id,
            portal_id,
            status,
            must_change_password,
            applications(id, program, status, submitted_at, form_data)
          `)
          .eq('portal_user_id', currentUser.id)
          .maybeSingle()

        if (!active) return
        setUser(currentUser)
        setPortalAccount(accountError ? null : account)
        setApplication(accountError ? null : account?.applications || null)
        setError(accountError || !account || account.status !== 'active'
          ? 'Your student portal access is unavailable. Please contact Yonde Labs.'
          : '')

        if (account?.must_change_password && router.pathname !== '/student/set-password') {
          router.replace('/student/set-password')
        }
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

  return { user, application, portalAccount, loading, error }
}
