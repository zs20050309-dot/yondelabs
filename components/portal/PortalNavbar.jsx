import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import styles from '../../styles/portalNavbar.module.css'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/course', label: 'My course' },
  { href: '/files', label: 'Files' },
]

export default function PortalNavbar({ user }) {
  const router = useRouter()
  const [logoError, setLogoError] = useState(false)
  const displayName = user?.user_metadata?.preferred_name || user?.email || ''

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <header className={styles.header}>
      <Link className={styles.headerLeft} aria-label="Go to student portal" href="/dashboard">
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
        <span className={styles.portalLabel}>Student portal</span>
      </Link>

      <nav className={styles.navigation} aria-label="Student portal">
        {NAV_ITEMS.map((item) => {
          const active = router.pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

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
