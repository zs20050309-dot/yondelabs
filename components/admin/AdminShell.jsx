import { IconApplications, IconArchive, IconLogout, IconPayments, IconStudents } from './icons'
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
  return (
    <div className={styles.shell} data-theme={theme}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <img src="/images/logos/yondelabs-logo.svg" alt="YondeLabs" />
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
                onClick={() => onSectionChange(item.key)}
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

      <div className={styles.content}>
        <header className={styles.topbar}>
          <span className={styles.topbarTitle}>{TOPBAR_TITLES[section] || 'Admin'}</span>
          <div className={styles.topbarActions}>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
