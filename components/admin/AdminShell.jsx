import { useEffect, useState } from 'react'
import { IconApplications, IconArchive, IconClose, IconLogout, IconMenu, IconPayments, IconStudents } from './icons'
import ThemeToggle from './ThemeToggle'
import styles from '../../styles/admin.module.css'

const NAV_ITEMS = [
  { key: 'applications', label: 'Applications', icon: IconApplications },
  { key: 'students', label: 'Current students', icon: IconStudents },
  { key: 'payments', label: 'Mentor payments', icon: IconPayments },
  { key: 'archived', label: 'Archived', icon: IconArchive },
]

const TOPBAR_TITLES = {
  applications: 'Admissions',
  students: 'Programs',
  payments: 'Accounting',
  archived: 'Admissions archive',
}

export default function AdminShell({ theme, onToggleTheme, section, onSectionChange, archivedCount, onSignOut, children }) {
  const [navOpen, setNavOpen] = useState(false)

  // Close the drawer whenever the section changes (mobile tap-through).
  useEffect(() => { setNavOpen(false) }, [section])

  // Escape closes; lock background scroll while the drawer covers the page.
  useEffect(() => {
    if (!navOpen) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') setNavOpen(false) }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [navOpen])

  return (
    <div className={styles.shell} data-theme={theme}>
      <aside className={navOpen ? `${styles.sidebar} ${styles.sidebarOpen}` : styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <img src="/images/logos/yondelabs-logo.svg" alt="YondeLabs" />
          <button
            type="button"
            className={styles.navClose}
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <IconClose />
          </button>
        </div>
        <nav className={styles.sidebarNav} aria-label="Admin sections">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = section === item.key
            return (
              <button
                key={item.key}
                type="button"
                className={active ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
                onClick={() => { onSectionChange(item.key); setNavOpen(false) }}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.navIcon}><Icon /></span>
                <span className={styles.navLabel}>{item.label}</span>
                {item.key === 'archived' && archivedCount ? <span className={styles.navBadge}>{archivedCount}</span> : null}
              </button>
            )
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.navItem} onClick={onSignOut}>
            <span className={styles.navIcon}><IconLogout /></span>
            <span className={styles.navLabel}>Log out</span>
          </button>
        </div>
      </aside>

      {navOpen ? <div className={styles.navBackdrop} onClick={() => setNavOpen(false)} aria-hidden="true" /> : null}

      <div className={styles.content}>
        <header className={styles.topbar}>
          <div className={styles.topbarLead}>
            <button
              type="button"
              className={styles.navToggle}
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              aria-expanded={navOpen}
            >
              <IconMenu />
            </button>
            <img className={styles.topbarBrand} src="/images/logos/yondelabs-logo.svg" alt="YondeLabs" />
            <span className={styles.topbarTitle}>{TOPBAR_TITLES[section] || 'Admin'}</span>
          </div>
          <div className={styles.topbarActions}>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
