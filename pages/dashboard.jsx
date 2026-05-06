import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import StatusTracker from '../components/portal/StatusTracker'
import ApplicationSummary from '../components/portal/ApplicationSummary'
import styles from '../styles/dashboard.module.css'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    async function load() {
      const {
        data: { user: u },
      } = await supabase.auth.getUser()

      if (!u) {
        router.push('/login')
        return
      }

      setUser(u)

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', u.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        setFetchError('Something went wrong loading your application.')
        setApplication(null)
      } else {
        setFetchError(null)
        setApplication(data)
      }

      setLoading(false)
    }

    load()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayName =
    user?.user_metadata?.preferred_name || (user?.email ? user.email.split('@')[0] : '')

  if (loading) {
    return (
      <div className={styles.loadingRoot}>
        <div className={styles.loadingInner}>
          <div className={styles.spinner} aria-hidden />
          <div className={styles.loadingText}>Loading your application...</div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.homeLink} aria-label="YondeLabs home">
            {logoError ? (
              <span className={styles.logoText}>YondeLabs</span>
            ) : (
              <img
                src="/images/logos/yondelabs-logo.svg"
                alt="YondeLabs"
                className={styles.logo}
                onError={() => setLogoError(true)}
              />
            )}
          </Link>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.greeting}>Hi, {displayName || user.email}</span>
          <button type="button" className={styles.logout} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <h1 className={styles.heroTitle}>My Application</h1>
            <p className={styles.heroSubtitle}>
              Track your application to Yonde Research Scholar Program
            </p>
          </div>
          <div className={styles.heroDeco} aria-hidden />
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.mainInner}>
          {fetchError ? <div className={styles.errorBox}>{fetchError}</div> : null}

          {!fetchError && application == null ? (
            <div className={styles.emptyCard}>
              <div className={styles.emptyIcon} aria-hidden>
                🎓
              </div>
              <div className={styles.emptyTitle}>No application submitted yet</div>
              <p className={styles.emptyBody}>
                Ready to take the next step? Apply to the Yonde Research Scholar Program and connect
                with leading researchers at MIT, Stanford, and Berkeley.
              </p>
              <Link className={styles.cta} href="/apply">
                Start Your Application
              </Link>
            </div>
          ) : null}

          {!fetchError && application ? (
            <>
              <StatusTracker status={application.status} />
              <div className={styles.blockGap}>
                <ApplicationSummary application={application} />
              </div>
              <div className={styles.appId}>
                Application ID: {String(application.id).slice(0, 8)}
              </div>
            </>
          ) : null}
        </div>
      </main>

      <footer className={styles.footer}>© 2026 YondeLabs. All rights reserved.</footer>
    </div>
  )
}
