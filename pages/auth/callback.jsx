import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import styles from '../../styles/callback.module.css'

export default function AuthCallback() {
  const router = useRouter()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    async function handleCallback() {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const searchParams = new URLSearchParams(window.location.search)
      const type = hashParams.get('type') || searchParams.get('type')

      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (!error) {
          router.replace(type === 'recovery' ? '/reset-password' : '/dashboard')
          return
        }
      }

      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          router.replace(type === 'recovery' ? '/reset-password' : '/dashboard')
          return
        }
      }

      router.replace(
        '/login?message=Verification+link+expired.+Please+sign+in+or+request+a+new+link.'
      )
    }

    handleCallback()
  }, [router])

  return (
    <div className={styles.page}>
      <div className={styles.spinner} />
      <p className={styles.text}>Verifying your email...</p>
    </div>
  )
}
