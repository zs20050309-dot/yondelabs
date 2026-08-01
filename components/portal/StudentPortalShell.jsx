import Link from 'next/link'
import PortalNavbar from './PortalNavbar'
import styles from '../../styles/studentPortal.module.css'

export const PROGRAM_LABELS = {
  ra: 'In-Person Research Assistant',
  irp: 'Independent Research Program',
  'passion-project': 'Passion Project',
  'portfolio-project': 'Portfolio Project',
  isef: 'ISEF Coaching',
}

export function PortalLoading({ message = 'Loading your student portal...' }) {
  return (
    <div className={styles.loadingRoot}>
      <div className={styles.loadingMark} aria-hidden />
      <p>{message}</p>
    </div>
  )
}

export function PortalEmpty({
  title,
  body,
  actionHref = '/dashboard',
  actionLabel = 'Return to overview',
}) {
  return (
    <section className={styles.emptyState}>
      <span className={styles.emptyMark} aria-hidden />
      <h2>{title}</h2>
      <p>{body}</p>
      <Link href={actionHref}>{actionLabel}</Link>
    </section>
  )
}

export default function StudentPortalShell({
  user,
  eyebrow,
  title,
  description,
  application,
  currentStudent,
  children,
}) {
  const profile = currentStudent || application
  const programName = profile
    ? PROGRAM_LABELS[profile.program] || profile.program
    : null

  return (
    <div className={styles.page}>
      <PortalNavbar user={user} studentPortal />
      <main className={styles.main}>
        <div className={styles.mainInner}>
          <section className={styles.pageHeader}>
            <div>
              <span className={styles.eyebrow}>{eyebrow}</span>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            {programName ? (
              <div className={styles.programPill}>
                <span>Current program</span>
                <strong>{programName}</strong>
              </div>
            ) : null}
          </section>
          {children}
        </div>
      </main>
      <footer className={styles.footer}>
        <span>Yonde Labs Student Portal</span>
        <a href="mailto:info@yondelabs.com">Need help?</a>
      </footer>
    </div>
  )
}
