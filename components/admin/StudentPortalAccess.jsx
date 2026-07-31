import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import styles from '../../styles/admin.module.css'

export default function StudentPortalAccess({ application }) {
  const [account, setAccount] = useState(null)
  const [hasEnrollment, setHasEnrollment] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      const [accountResult, enrollmentResult] = await Promise.all([
        supabase
          .from('student_portal_accounts')
          .select('portal_id, status, must_change_password, created_at')
          .eq('application_id', application.id)
          .maybeSingle(),
        supabase
          .from('student_course_enrollments')
          .select('id')
          .eq('application_id', application.id)
          .limit(1)
          .maybeSingle(),
      ])

      if (!active) return
      setAccount(accountResult.data || null)
      setHasEnrollment(Boolean(enrollmentResult.data))
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [application.id])

  async function manageCredentials(method) {
    setBusy(true)
    setError('')
    setTemporaryPassword('')
    setCopied('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Please sign in again.')

      const response = await fetch(
        `/api/admin/applications/${application.id}/portal-access`,
        {
          method,
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to create credentials')

      setAccount(body.account)
      setTemporaryPassword(body.temporaryPassword)
    } catch (requestError) {
      setError(requestError.message || 'Unable to create credentials')
    } finally {
      setBusy(false)
    }
  }

  async function copyValue(label, value) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
    } catch {
      setError('Copy failed. Select the credential and copy it manually.')
    }
  }

  return (
    <section className={styles.portalAccessSection}>
      <div className={styles.portalAccessHeading}>
        <div>
          <span className={styles.eyebrow}>Student portal</span>
          <h3>Separate portal credentials</h3>
          <p>Create a portal ID and temporary password after assigning the student a course.</p>
        </div>
        {account ? (
          <span className={styles.portalAccessStatus}>
            {account.must_change_password ? 'Password change required' : 'Active'}
          </span>
        ) : null}
      </div>

      {loading ? <p className={styles.portalAccessMuted}>Checking portal access…</p> : null}

      {!loading && !hasEnrollment ? (
        <div className={styles.portalAccessNotice}>
          Assign a course plan before creating student portal credentials.
        </div>
      ) : null}

      {!loading && hasEnrollment && !account ? (
        <button
          type="button"
          className={styles.primaryButton}
          disabled={busy}
          onClick={() => manageCredentials('POST')}
        >
          {busy ? 'Creating credentials…' : 'Create portal credentials'}
        </button>
      ) : null}

      {account ? (
        <div className={styles.portalCredentialPanel}>
          <div className={styles.portalCredential}>
            <span>Portal ID</span>
            <strong>{account.portal_id}</strong>
            <button type="button" onClick={() => copyValue('id', account.portal_id)}>
              {copied === 'id' ? 'Copied' : 'Copy'}
            </button>
          </div>

          {temporaryPassword ? (
            <div className={styles.portalCredential}>
              <span>Temporary password</span>
              <strong>{temporaryPassword}</strong>
              <button
                type="button"
                onClick={() => copyValue('password', temporaryPassword)}
              >
                {copied === 'password' ? 'Copied' : 'Copy'}
              </button>
            </div>
          ) : null}

          {temporaryPassword ? (
            <div className={styles.portalPasswordWarning}>
              Save and give these credentials to the student now. The temporary password
              cannot be viewed again after this panel closes.
            </div>
          ) : (
            <p className={styles.portalAccessMuted}>
              The password is hidden. Reset it to issue a new temporary password.
            </p>
          )}

          <button
            type="button"
            className={styles.secondaryButton}
            disabled={busy}
            onClick={() => manageCredentials('PUT')}
          >
            {busy ? 'Resetting password…' : 'Reset temporary password'}
          </button>
        </div>
      ) : null}

      {error ? <div className={styles.inlineError}>{error}</div> : null}
    </section>
  )
}
