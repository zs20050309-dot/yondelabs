import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import styles from '../../styles/portalNavbar.module.css'

// Anchors point at the section ids rendered by JourneySection on /student.
const STUDENT_NAV_ITEMS = [
  { href: '/student', label: 'Dashboard' },
  { href: '/student#learning-map', label: 'Modules' },
  { href: '/student#project-journey', label: 'Milestones' },
  { href: '/student/course', label: 'Course' },
  { href: '/student/files', label: 'Resources' },
]

function initials(value) {
  const source = (value || '').trim()
  if (!source) return 'Y'
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}

export default function PortalNavbar({ user, studentPortal = false, portalId, programName }) {
  const router = useRouter()
  const [logoError, setLogoError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const displayName = user?.user_metadata?.preferred_name || user?.email || ''

  // Close the profile menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return undefined
    function onPointer(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    function onKey(event) { if (event.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

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
            const active = router.asPath === item.href
              || (item.href === '/student' && router.asPath === '/student')
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
        {studentPortal ? (
          <div className={styles.profileWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.avatarButton}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className={styles.avatar} aria-hidden>{initials(displayName)}</span>
              <span className={styles.avatarName}>{displayName}</span>
              <span className={styles.avatarCaret} aria-hidden>⌄</span>
            </button>
            {menuOpen ? (
              <div className={styles.profileMenu} role="menu">
                <div className={styles.profileMeta}>
                  <strong>{displayName}</strong>
                  {programName ? <span>{programName}</span> : null}
                  {portalId ? <span className={styles.profilePortalId}>Portal ID {portalId}</span> : null}
                </div>
                <button type="button" role="menuitem" className={styles.profileAction} onClick={handleLogout}>
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <span className={styles.studentName}>{displayName}</span>
            <span className={styles.navDivider} aria-hidden="true" />
            <button type="button" className={styles.logout} onClick={handleLogout}>
              Log out
            </button>
          </>
        )}
      </div>
    </header>
  )
}
