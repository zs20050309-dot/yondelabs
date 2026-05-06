import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AuthCard from '../components/portal/AuthCard'
import PasswordInput from '../components/portal/PasswordInput'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/portal.module.css'

export default function Register() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleRegister(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback',
        data: {
          role: 'student'
        }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/login?registered=true')
  }

  return (
    <AuthCard
      eyebrow="Get started"
      title="Create your account"
      subtitle="Apply to the Yonde Research Scholar Program."
    >
      {error && <div className={styles.errorMessage}>{error}</div>}

      <form className={styles.form} onSubmit={handleRegister}>
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

        <PasswordInput
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Minimum 8 characters"
        />

        <PasswordInput
          label="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          className={styles.submitButton}
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className={styles.divider}>
        <div className={styles.dividerLine}></div>
        <span className={styles.dividerText}>existing applicant?</span>
        <div className={styles.dividerLine}></div>
      </div>
      <p className={styles.switchText}>
        Already have an account?{' '}
        <Link href="/login" className={styles.switchLink}>Sign in</Link>
      </p>
    </AuthCard>
  )
}
