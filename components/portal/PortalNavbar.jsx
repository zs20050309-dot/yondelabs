import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import styles from '../../styles/portalNavbar.module.css'

export default function PortalNavbar({ user }) {
  const router = useRouter()
  const [logoError, setLogoError] = useState(false)
  const displayName = user?.user_metadata?.preferred_name || user?.email || ''

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  function handleLogoClick() {
    router.push('/dashboard')
  }

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.headerLeft}
        aria-label="Go to dashboard"
        onClick={handleLogoClick}
      >
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
      </button>
      <div className={styles.headerRight}>
        <span className={styles.studentName}>{displayName}</span>
        <span className={styles.navDivider} aria-hidden="true" />
        <button type="button" className={styles.logout} onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  )
}
