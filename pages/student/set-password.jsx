import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AuthCard from '../../components/portal/AuthCard'
import PasswordInput from '../../components/portal/PasswordInput'
import { supabase } from '../../lib/supabaseClient'
import styles from '../../styles/portal.module.css'

export default function StudentSetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      const role = user?.app_metadata?.role || user?.user_metadata?.role
      if (!user || role !== 'student_portal') {
        router.replace('/student/login')
        return
      }

      const { data: account } = await supabase
        .from('student_portal_accounts')
        .select('must_change_password, status')
        .eq('portal_user_id', user.id)
        .maybeSingle()

      if (!account || account.status !== 'active') {
        await supabase.auth.signOut()
        router.replace('/student/login?message=Portal+access+is+unavailable.')
        return
      }

      if (!account.must_change_password) {
        router.replace('/student')
        return
      }
      setChecking(false)
    }

    checkAccess()
  }, [router])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (password.length < 10) {
      setError('Use at least 10 characters for your new password.')
      return
    }
    if (password !== confirmation) {
      setError('The passwords do not match.')
      return
    }

    setLoading(true)
    const { error: passwordError } = await supabase.auth.updateUser({ password })
    if (passwordError) {
      setError(passwordError.message || 'We could not update your password.')
      setLoading(false)
      return
    }

    const { error: completionError } = await supabase.rpc(
      'complete_student_portal_password_change'
    )
    if (completionError) {
      setError('Your password changed, but setup could not finish. Submit the form once more.')
      setLoading(false)
      return
    }

    router.replace('/student')
  }

  if (checking) return null

  return (
    <AuthCard
      eyebrow="First sign-in"
      title="Choose your own password"
      subtitle="Replace the temporary password before opening your private student workspace."
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <PasswordInput
          label="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="At least 10 characters"
        />
        <PasswordInput
          label="Confirm new password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />

        {error ? <div className={styles.errorMessage}>{error}</div> : null}

        <button className={styles.submitButton} type="submit" disabled={loading}>
          {loading ? 'Saving password…' : 'Save password and continue'}
        </button>
      </form>
    </AuthCard>
  )
}
