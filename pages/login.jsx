import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AuthCard from '../components/portal/AuthCard'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/portal.module.css'

function decodeMessageParam(message) {
  if (typeof message !== 'string') return ''
  try {
    return decodeURIComponent(message)
  } catch {
    return message
  }
}

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showRegistered, setShowRegistered] = useState(false)
  const [pageMessage, setPageMessage] = useState(null)

  useEffect(() => {
    if (!router.isReady) return
    setShowRegistered(router.query.registered === 'true')
    const raw = router.query.message
    const msg = Array.isArray(raw) ? raw[0] : raw
    setPageMessage(msg ? decodeMessageParam(msg) : null)
  }, [router.isReady, router.query])

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setError('Please verify your email before signing in. Check your inbox for a verification link.')
      } else {
        setError('Incorrect email or password. Please try again.')
      }
      setLoading(false)
      return
    }

    const role = data.user.user_metadata?.role
    router.push(role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Sign in to your application"
      subtitle="Track your status and manage your Scholar Program journey."
    >
      {pageMessage ? <div className={styles.infoBanner}>{pageMessage}</div> : null}

      {showRegistered ? (
        <div className={styles.successBanner}>
          Account created! Please check your email and click the verification link before signing in.
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleLogin}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Email address</label>
          <input
            className={styles.input}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.labelRow}>
            <label className={styles.label}>Password</label>
            <Link href="/forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>
          <div className={styles.inputWrapper}>
            <input
              className={styles.input}
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {error ? <div className={styles.errorMessage}>{error}</div> : null}

        <button className={styles.submitButton} type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className={styles.divider}>
        <div className={styles.dividerLine}></div>
        <span className={styles.dividerText}>first time here?</span>
        <div className={styles.dividerLine}></div>
      </div>
      <p className={styles.switchText}>
        Don&apos;t have an account?{' '}
        <Link href="/register" className={styles.switchLink}>
          Create one
        </Link>
      </p>

      <div className={styles.securityNote}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1L10 3V6.5C10 8.5 8.2 10.2 6 11C3.8 10.2 2 8.5 2 6.5V3L6 1Z"
            stroke="#C5C3BA" strokeWidth="1" strokeLinejoin="round"/>
        </svg>
        <span className={styles.securityText}>Secured with 256-bit encryption</span>
      </div>
    </AuthCard>
  )
}
