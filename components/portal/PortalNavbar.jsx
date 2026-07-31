import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import styles from '../../styles/portalNavbar.module.css'

const STUDENT_NAV_ITEMS = [
  { href: '/student', label: 'Overview' },
  { href: '/student/course', label: 'My course' },
  { href: '/student/files', label: 'Files' },
]

export default function PortalNavbar({ user, studentPortal = false }) {
  const router = useRouter()
  const [logoError, setLogoError] = useState(false)
  const displayName = user?.user_metadata?.preferred_name || user?.email || ''

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace(studentPortal ? '/student/login' : '/login')
  }

  const homeHref = studentPortal ? '/student' : '/dashboard'

  return (
    <header className={styles.header}>
      <Link className={styles.headerLeft} aria-label="Go to portal home" href={homeHref}>
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
        <span className={styles.portalLabel}>
          {studentPortal ? 'Student portal' : 'Application portal'}
        </span>
      </Link>

      {studentPortal ? (
        <nav className={styles.navigation} aria-label="Student portal">
          {STUDENT_NAV_ITEMS.map((item) => {
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
      ) : (
        <span className={styles.navigationSpacer} />
      )}

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
