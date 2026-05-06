import { useState } from 'react'
import Link from 'next/link'
import AuthCard from '../components/portal/AuthCard'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/portal.module.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleForgotPassword(e) {
    e.preventDefault()
    setLoading(true)

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/callback?type=recovery',
    })

    setSubmitted(true)
    setLoading(false)
  }

  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      {submitted ? (
        <div className={styles.successBanner}>
          If an account exists for this email, you&apos;ll receive a password reset link shortly. Check your spam
          folder too.
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleForgotPassword}>
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

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}

      <div className={styles.divider}>
        <div className={styles.dividerLine}></div>
        <span className={styles.dividerText}>remember your password?</span>
        <div className={styles.dividerLine}></div>
      </div>
      <p className={styles.switchText}>
        <Link href="/login" className={styles.switchLink}>
          ← Back to sign in
        </Link>
      </p>
    </AuthCard>
  )
}
