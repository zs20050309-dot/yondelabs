import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import PortalNavbar from '../components/portal/PortalNavbar'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/apply.module.css'

const PROGRAMS = [
  {
    key: 'ra',
    title: 'In-Person Research Assistant',
    shortTitle: 'RA',
    description:
      'Step into an in-person lab, contribute hands-on to real research, and build toward a recommendation letter grounded in your work.',
    type: 'form',
  },
  {
    key: 'irp',
    title: 'Independent Research Program',
    shortTitle: 'IRP',
    description:
      'Own your research from question to outcome, with support for both a paper-ready deliverable and a compelling application narrative.',
    type: 'form',
  },
  {
    key: 'passion-project',
    title: 'Passion Project',
    shortTitle: 'PP',
    description:
      'Start from genuine interests and shape them into a community-rooted project, guided by a T15 mentor who helps sharpen the story.',
    type: 'form',
  },
  {
    key: 'isef',
    title: 'ISEF Mentorship',
    shortTitle: 'ISEF',
    description:
      'Prepare with a three-role team: PhD mentor, competition coach, and SSM, with a publication safety net supporting your project path.',
    contactEmail: 'info@yondelabs.com',
    type: 'contact',
  },
]

function ctaCopy(state) {
  if (state === 'submitted') return 'View status →'
  if (state === 'draft') return 'Continue draft →'
  return 'Apply Now →'
}

function badgeCopy(state) {
  if (state === 'submitted') return 'Submitted'
  if (state === 'draft') return 'Draft saved'
  return null
}

export default function Apply() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [byProgram, setByProgram] = useState({})
  const [isefExpanded, setIsefExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()

        if (cancelled) return

        if (!currentUser) {
          router.replace('/login')
          return
        }

        setUser(currentUser)

        const { data: apps, error: appsError } = await supabase
          .from('applications')
          .select('program, status')
          .eq('user_id', currentUser.id)

        if (cancelled) return

        if (appsError) {
          setError('We could not load your applications. Please refresh and try again.')
          setLoading(false)
          return
        }

        const map = {}
        for (const app of apps || []) {
          const existing = map[app.program]
          if (!existing || (existing.status === 'draft' && app.status !== 'draft')) {
            map[app.program] = app
          }
        }
        setByProgram(map)
        setLoading(false)
      } catch {
        if (cancelled) return
        setError('Something went wrong. Please refresh and try again.')
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [router])

  function programState(programKey) {
    const app = byProgram[programKey]
    if (!app) return 'new'
    if (app.status === 'draft') return 'draft'
    return 'submitted'
  }

  function handleProgramSelect(program) {
    if (program.type === 'contact') {
      setIsefExpanded(true)
      return
    }
    const state = programState(program.key)
    if (state === 'submitted') {
      router.push('/dashboard')
      return
    }
    router.push(`/apply/${program.key}`)
  }

  function handleProgramKeyDown(event, program) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    handleProgramSelect(program)
  }

  if (loading) {
    return (
      <div className={styles.loadingRoot}>
        <div className={styles.loadingInner}>
          <div className={styles.spinner} aria-hidden />
          <div className={styles.loadingText}>Loading application options...</div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className={styles.page}>
      <PortalNavbar user={user} />

      <main className={styles.main}>
        <section className={styles.pageHeader}>
          <div className={styles.eyebrow}>Select a program</div>
          <h1 className={styles.title}>What would you like to apply for?</h1>
          <p className={styles.subtitle}>
            Choose the program that best fits your goals. Each program has its own application
            process, and your progress is saved as you go.
          </p>
        </section>

        <section className={styles.programArea} aria-label="Program selection">
          {error ? <div className={styles.errorBanner}>{error}</div> : null}

          <div className={styles.grid}>
            {PROGRAMS.map((program) => {
              const isContact = program.type === 'contact'
              const state = isContact ? 'new' : programState(program.key)
              const badge = badgeCopy(state)
              const showIsefMessage = isefExpanded && program.key === 'isef'

              return (
                <div
                  key={program.key}
                  role="button"
                  tabIndex={0}
                  className={`${styles.card} ${isContact ? styles.contactCard : ''} ${
                    showIsefMessage ? styles.cardExpanded : ''
                  }`}
                  onClick={() => handleProgramSelect(program)}
                  onKeyDown={(event) => handleProgramKeyDown(event, program)}
                  aria-expanded={showIsefMessage}
                >
                  <div className={styles.cardBadgeRow}>
                    <span className={styles.badge}>{program.shortTitle}</span>
                    {badge ? (
                      <span
                        className={`${styles.statusPill} ${
                          state === 'submitted' ? styles.statusPillSubmitted : styles.statusPillDraft
                        }`}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </div>
                  <span className={styles.cardTitle}>{program.title}</span>
                  <span className={styles.description}>{program.description}</span>

                  <span className={styles.ctaRow}>
                    <span aria-hidden="true" />
                    <span className={isContact ? styles.contactCta : styles.formCta}>
                      {isContact ? 'Get in Touch →' : ctaCopy(state)}
                    </span>
                  </span>

                  {showIsefMessage ? (
                    <span className={styles.contactMessage}>
                      ISEF Coaching requires a personal consultation. Please reach out to us at{' '}
                      <a
                        href="mailto:info@yondelabs.com"
                        className={styles.contactLink}
                        onClick={(event) => event.stopPropagation()}
                      >
                        info@yondelabs.com
                      </a>{' '}
                      and our team will get back to you shortly.
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
