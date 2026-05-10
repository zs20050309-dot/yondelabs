import { useState } from 'react'
import { useRouter } from 'next/router'
import AuthCard from '../components/portal/AuthCard'
import PasswordInput from '../components/portal/PasswordInput'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/portal.module.css'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleReset(e) {
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

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  }

  return (
    <AuthCard
      eyebrow="Almost there"
      title="Set new password"
      subtitle="Choose a strong password for your account."
    >
      {success ? (
        <div className={styles.successBanner}>Password updated! Redirecting...</div>
      ) : (
        <form className={styles.form} onSubmit={handleReset}>
          <PasswordInput
            label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Minimum 8 characters"
          />

          <PasswordInput
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error ? <div className={styles.errorMessage}>{error}</div> : null}

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      )}
    </AuthCard>
  )
}
