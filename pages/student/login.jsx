import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AuthCard from '../../components/portal/AuthCard'
import PasswordInput from '../../components/portal/PasswordInput'
import { supabase } from '../../lib/supabaseClient'
import {
  normalizePortalId,
  portalIdToInternalEmail,
} from '../../lib/studentPortalCredentials'
import styles from '../../styles/portal.module.css'

export default function StudentPortalLogin() {
  const router = useRouter()
  const [portalId, setPortalId] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!router.isReady) return
    const value = Array.isArray(router.query.message)
      ? router.query.message[0]
      : router.query.message
    setMessage(value || '')
  }, [router.isReady, router.query.message])

  async function handleLogin(event) {
    event.preventDefault()
    setError('')

    const internalEmail = portalIdToInternalEmail(portalId)
    if (!internalEmail) {
      setError('Enter a valid portal ID in the format YL-XXXXXXXX.')
      return
    }

    setLoading(true)
    try {
      await supabase.auth.signOut()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      })

      const role =
        data?.user?.app_metadata?.role || data?.user?.user_metadata?.role
      if (signInError || role !== 'student_portal') {
        await supabase.auth.signOut()
        setError('Incorrect portal ID or password. Please check the credentials from your administrator.')
        setLoading(false)
        return
      }

      const { data: account, error: accountError } = await supabase
        .from('student_portal_accounts')
        .select('status, must_change_password')
        .eq('portal_user_id', data.user.id)
        .maybeSingle()

      if (accountError || !account || account.status !== 'active') {
        await supabase.auth.signOut()
        setError('This portal account is unavailable. Please contact Yonde Labs.')
        setLoading(false)
        return
      }

      router.replace(account.must_change_password ? '/student/set-password' : '/student')
    } catch {
      setError('We could not sign you in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthCard
      eyebrow="Student portal"
      title="Sign in to your program"
      subtitle="Use the separate portal ID and password provided by your Yonde Labs administrator."
    >
      {message ? <div className={styles.infoBanner}>{message}</div> : null}

      <form className={styles.form} onSubmit={handleLogin}>
        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="portal-id">Portal ID</label>
          <input
            id="portal-id"
            className={styles.input}
            type="text"
            required
            autoCapitalize="characters"
            autoComplete="username"
            value={portalId}
            onChange={(event) => setPortalId(normalizePortalId(event.target.value))}
            placeholder="YL-XXXXXXXX"
          />
        </div>

        <PasswordInput
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error ? <div className={styles.errorMessage}>{error}</div> : null}

        <button className={styles.submitButton} type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in to student portal'}
        </button>
      </form>

      <div className={styles.divider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerText}>application account</span>
        <div className={styles.dividerLine} />
      </div>
      <p className={styles.switchText}>
        Applying to Yonde Labs?{' '}
        <Link href="/login" className={styles.switchLink}>
          Application sign in
        </Link>
      </p>
    </AuthCard>
  )
}
