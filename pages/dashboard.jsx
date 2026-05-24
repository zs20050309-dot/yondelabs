import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import PortalNavbar from '../components/portal/PortalNavbar'
import { supabase } from '../lib/supabaseClient'
import StatusTracker from '../components/portal/StatusTracker'
import styles from '../styles/dashboard.module.css'

const PROGRAM_LABELS = {
  ra: 'In-Person Research Assistant',
  irp: 'Independent Research Program',
  'passion-project': 'Passion Project',
  isef: 'ISEF Coaching',
}

const STATUS_LABELS = {
  submitted: {
    label: 'Application Submitted',
    className: 'statusSubmitted',
    icon: '✓',
  },
  interview: {
    label: 'Interview Scheduled',
    className: 'statusInterview',
  },
  offer: {
    label: 'Offer Sent',
    className: 'statusOffer',
  },
  rejected: {
    label: 'Application Reviewed',
    className: 'statusReviewed',
  },
}

function formatDate(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getStatusMeta(status) {
  return STATUS_LABELS[status] || STATUS_LABELS.submitted
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [application, setApplication] = useState(null)
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user: u },
        } = await supabase.auth.getUser()

        if (!u) {
          router.replace('/login')
          return
        }

        setUser(u)

        const [submittedResult, draftsResult] = await Promise.all([
          supabase
            .from('applications')
            .select('*')
            .eq('user_id', u.id)
            .neq('status', 'draft')
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('applications')
            .select('id, program, updated_at')
            .eq('user_id', u.id)
            .eq('status', 'draft')
            .order('updated_at', { ascending: false }),
        ])

        if (submittedResult.error || draftsResult.error) {
          setFetchError('Something went wrong. Please try again or contact info@yondelabs.com.')
          setApplication(null)
          setDrafts([])
        } else {
          setFetchError(null)
          setApplication(submittedResult.data)
          setDrafts(draftsResult.data || [])
        }

        setLoading(false)
      } catch {
        setFetchError('Something went wrong. Please try again or contact info@yondelabs.com.')
        setApplication(null)
        setDrafts([])
        setLoading(false)
      }
    }

    load()
  }, [router])

  const greetingName =
    user?.user_metadata?.preferred_name || (user?.email ? user.email.split('@')[0] : '')
  const programLabel = application ? PROGRAM_LABELS[application.program] || '—' : '—'
  const cohort = application?.form_data?.cohort || '—'
  const submittedDate = formatDate(application?.submitted_at)
  const currentStatus = application ? getStatusMeta(application.status) : null

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

  const hasDrafts = drafts.length > 0
  const noApplicationAtAll = !application && !hasDrafts

  return (
    <div className={styles.page}>
      <PortalNavbar user={user} />

      <main className={styles.main}>
        <div className={styles.mainInner}>
          {fetchError ? (
            <div className={styles.errorBox}>
              <strong>Unable to load your application.</strong>
              <span>{fetchError} Please refresh the page or try again later.</span>
            </div>
          ) : null}

          {!fetchError && noApplicationAtAll ? (
            <>
              <section className={styles.welcomeCard}>
                <div className={styles.welcomeCopy}>
                  <h1 className={styles.welcomeTitle}>
                    Welcome,
                    <span className={styles.welcomeName}>{greetingName}.</span>
                  </h1>
                  <p className={styles.welcomeText}>
                    Thanks for your interest in joining our research community.
                  </p>
                </div>
              </section>

              <section className={styles.emptyCard}>
                <div className={styles.emptyIcon} aria-hidden>
                  <span />
                </div>
                <div className={styles.emptyTitle}>Start your application</div>
                <p className={styles.emptyBody}>
                  Choose a program and get started. Your progress is saved automatically as you go.
                </p>
                <button
                  type="button"
                  className={styles.emptyCta}
                  onClick={() => router.push('/apply')}
                >
                  Start an application →
                </button>
              </section>
            </>
          ) : null}

          {!fetchError && !application && hasDrafts ? (
            <>
              <section className={styles.welcomeCard}>
                <div className={styles.welcomeCopy}>
                  <h1 className={styles.welcomeTitle}>
                    Welcome back,
                    <span className={styles.welcomeName}>{greetingName}.</span>
                  </h1>
                  <p className={styles.welcomeText}>
                    You have an application in progress — pick up where you left off.
                  </p>
                </div>
              </section>

              <section className={styles.draftListCard}>
                <div className={styles.draftListHeader}>
                  <h2 className={styles.draftListTitle}>Drafts in progress</h2>
                  <p className={styles.draftListSub}>
                    Your answers are saved. Come back any time to finish.
                  </p>
                </div>
                <ul className={styles.draftList}>
                  {drafts.map((draft) => (
                    <li key={draft.id} className={styles.draftItem}>
                      <div className={styles.draftItemMain}>
                        <span className={styles.draftItemProgram}>
                          {PROGRAM_LABELS[draft.program] || draft.program}
                        </span>
                        <span className={styles.draftItemMeta}>
                          Last edited {formatDate(draft.updated_at)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.draftItemCta}
                        onClick={() => router.push(`/apply/${draft.program}`)}
                      >
                        Continue →
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}

          {!fetchError && application ? (
            <>
              <section className={styles.welcomeCard}>
                <div className={styles.welcomeTop}>
                  <div className={styles.welcomeCopy}>
                    <h1 className={styles.welcomeTitle}>
                      Welcome back,
                      <span className={styles.welcomeName}>{greetingName}.</span>
                    </h1>
                    <p className={styles.welcomeText}>
                      Thanks for your interest in joining our research community.
                    </p>
                  </div>

                  <div className={styles.infoGrid} aria-label="Application summary">
                    <div className={`${styles.infoItem} ${styles.programItem}`}>
                      <span className={styles.infoLabel}>Program</span>
                      <span className={styles.infoValue}>{programLabel}</span>
                    </div>
                    <div className={`${styles.infoItem} ${styles.cohortItem}`}>
                      <span className={styles.infoLabel}>Cohort</span>
                      <span className={styles.infoValue}>{cohort}</span>
                    </div>
                    <div className={`${styles.infoItem} ${styles.dateItem}`}>
                      <span className={styles.infoLabel}>Date Submitted</span>
                      <span className={styles.infoValue}>{submittedDate}</span>
                    </div>
                    <div className={`${styles.infoItem} ${styles.statusItem}`}>
                      <span className={styles.infoLabel}>Current Status</span>
                      <span
                        className={`${styles.statusBadge} ${
                          styles[currentStatus.className]
                        }`}
                      >
                        {currentStatus.icon ? (
                          <span className={styles.statusIcon} aria-hidden="true">
                            {currentStatus.icon}
                          </span>
                        ) : null}
                        {currentStatus.label}
                      </span>
                    </div>
                  </div>
                </div>

                {application.status === 'submitted' ? (
                  <div className={styles.infoBanner}>
                    <span className={styles.infoBannerIcon} aria-hidden="true">
                      i
                    </span>
                    <span>
                      Your application has been received. Our team will review your materials and
                      be in touch if we have any questions. Need to update something? Email{' '}
                      <a href="mailto:info@yondelabs.com" className={styles.infoBannerLink}>
                        info@yondelabs.com
                      </a>
                      .
                    </span>
                  </div>
                ) : null}
              </section>

              <StatusTracker status={application.status} submittedAt={application.submitted_at} />

              {hasDrafts ? (
                <section className={styles.draftListCard}>
                  <div className={styles.draftListHeader}>
                    <h2 className={styles.draftListTitle}>Drafts in progress</h2>
                    <p className={styles.draftListSub}>
                      Other programs you’ve started but not yet submitted.
                    </p>
                  </div>
                  <ul className={styles.draftList}>
                    {drafts.map((draft) => (
                      <li key={draft.id} className={styles.draftItem}>
                        <div className={styles.draftItemMain}>
                          <span className={styles.draftItemProgram}>
                            {PROGRAM_LABELS[draft.program] || draft.program}
                          </span>
                          <span className={styles.draftItemMeta}>
                            Last edited {formatDate(draft.updated_at)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={styles.draftItemCta}
                          onClick={() => router.push(`/apply/${draft.program}`)}
                        >
                          Continue →
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <div className={styles.anotherProgramRow}>
                <button
                  type="button"
                  className={styles.anotherProgramBtn}
                  onClick={() => router.push('/apply')}
                >
                  Apply for another program →
                </button>
              </div>

              <div className={styles.notificationLine}>
                <svg
                  className={styles.notificationIcon}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 6.5h16v11H4v-11Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m5 7.5 7 5.5 7-5.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>We&apos;ll notify you by email when your status changes.</span>
              </div>
            </>
          ) : null}
        </div>
      </main>

      <footer className={styles.footer}>YondeLabs Application Portal</footer>
    </div>
  )
}
