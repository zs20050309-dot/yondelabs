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
    description: 'Step into an in-person lab, contribute hands-on to real research, and build toward a recommendation letter grounded in your work.',
    formUrl: 'https://forms.gle/io4J6YgvmUBCCbUUA',
    type: 'form',
  },
  {
    key: 'irp',
    title: 'Independent Research Program',
    shortTitle: 'IRP',
    description: 'Own your research from question to outcome, with support for both a paper-ready deliverable and a compelling application narrative.',
    formUrl: 'https://forms.gle/tX6EtMNaW1zxGjCR6',
    type: 'form',
  },
  {
    key: 'passion-project',
    title: 'Passion Project',
    shortTitle: 'PP',
    description: 'Start from genuine interests and shape them into a community-rooted project, guided by a T15 mentor who helps sharpen the story.',
    formUrl: 'https://forms.gle/jacuFwVv6SukLwTf6',
    type: 'form',
  },
  {
    key: 'isef',
    title: 'ISEF Mentorship',
    shortTitle: 'ISEF',
    description: 'Prepare with a three-role team: PhD mentor, competition coach, and SSM, with a publication safety net supporting your project path.',
    contactEmail: 'info@yondelabs.com',
    type: 'contact',
  },
]

const FORM_URLS = PROGRAMS.reduce((urls, program) => {
  if (program.type === 'form') {
    urls[program.key] = program.formUrl
  }
  return urls
}, {})

export default function Apply() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submittingKey, setSubmittingKey] = useState(null)
  const [error, setError] = useState(null)
  const [isefExpanded, setIsefExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()

        if (!currentUser) {
          router.replace('/login')
          return
        }

        setUser(currentUser)

        const { data: existing, error: existingError } = await supabase
          .from('applications')
          .select('id')
          .eq('user_id', currentUser.id)
          .limit(1)
          .maybeSingle()

        if (existingError) {
          setError('Something went wrong. Please try again or contact info@yondelabs.com.')
          setLoading(false)
          return
        }

        if (existing) {
          router.replace('/dashboard')
          return
        }

        setLoading(false)
      } catch {
        setError('Something went wrong. Please try again or contact info@yondelabs.com.')
        setLoading(false)
      }
    }

    load()
  }, [router])

  async function handleProgramSelect(program) {
    if (submitting) return

    setError(null)

    if (program.type === 'contact') {
      setIsefExpanded(true)
      return
    }

    if (!user) {
      router.replace('/login')
      return
    }

    setIsefExpanded(false)
    setSubmitting(true)
    setSubmittingKey(program.key)

    try {
      const programKey = program.key
      const { error: insertError } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          program: programKey,
          status: 'submitted',
          form_data: {},
        })

      if (insertError) {
        setSubmitting(false)
        setSubmittingKey(null)
        setError('Something went wrong. Please try again or contact info@yondelabs.com.')
        return
      }

      window.location.href = FORM_URLS[programKey]
    } catch {
      setSubmitting(false)
      setSubmittingKey(null)
      setError('Something went wrong. Please try again or contact info@yondelabs.com.')
    }
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
            process.
          </p>
        </section>

        <section className={styles.programArea} aria-label="Program selection">
          {error ? <div className={styles.errorBanner}>{error}</div> : null}

          <div className={styles.grid}>
            {PROGRAMS.map((program) => {
              const isSubmittingCard = submittingKey === program.key
              const isContact = program.type === 'contact'
              const showIsefMessage = isefExpanded && program.key === 'isef'

              return (
                <div
                  key={program.key}
                  role="button"
                  tabIndex={submitting ? -1 : 0}
                  className={`${styles.card} ${isContact ? styles.contactCard : ''} ${
                    submitting ? styles.cardDisabled : ''
                  } ${showIsefMessage ? styles.cardExpanded : ''}`}
                  onClick={() => handleProgramSelect(program)}
                  onKeyDown={(event) => handleProgramKeyDown(event, program)}
                  aria-disabled={submitting}
                  aria-expanded={showIsefMessage}
                >
                  <span className={styles.badge}>{program.shortTitle}</span>
                  <span className={styles.cardTitle}>{program.title}</span>
                  <span className={styles.description}>{program.description}</span>

                  <span className={styles.ctaRow}>
                    <span aria-hidden="true" />
                    <span className={isContact ? styles.contactCta : styles.formCta}>
                      {isSubmittingCard ? <span className={styles.inlineSpinner} aria-hidden /> : null}
                      {isContact ? 'Get in Touch' : 'Apply Now'} →
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
