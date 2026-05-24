import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import FormStep from './FormStep'
import ReviewStep from './ReviewStep'
import { useDraft } from '../../lib/forms/useDraft'
import { findFirstErrorStep, validateAll, validateField, validateStep } from '../../lib/forms/validators'
import styles from '../../styles/wizard.module.css'

function formatRelative(date) {
  if (!date) return null
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

function SaveIndicator({ status, lastSavedAt }) {
  const [, force] = useState(0)
  // Tick once every 10s so the relative time stays fresh
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 10000)
    return () => clearInterval(id)
  }, [])

  if (status === 'saving') {
    return (
      <span className={styles.saveStatus}>
        <span className={styles.saveDot} aria-hidden />
        Saving…
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className={`${styles.saveStatus} ${styles.saveStatusError}`}>
        Could not save — your work is kept locally on this device.
      </span>
    )
  }
  if (status === 'offline') {
    return (
      <span className={`${styles.saveStatus} ${styles.saveStatusOffline}`}>
        Offline — saved locally
      </span>
    )
  }
  if (status === 'saved' && lastSavedAt) {
    return <span className={styles.saveStatus}>Saved {formatRelative(lastSavedAt)}</span>
  }
  return <span className={styles.saveStatus}>&nbsp;</span>
}

export default function FormWizard({ schema, user }) {
  const router = useRouter()
  const draft = useDraft({ program: schema.program, user })

  const [values, setValues] = useState(null)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [stepIndex, setStepIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const totalDataSteps = schema.steps.length
  const reviewStepIndex = totalDataSteps
  const isReview = stepIndex === reviewStepIndex

  useEffect(() => {
    if (draft.initialValues == null || values != null) return
    const initial = { ...draft.initialValues }
    for (const step of schema.steps) {
      for (const field of step.fields) {
        if (field.prefillFromAuth === 'email' && !initial[field.id]) {
          initial[field.id] = user?.email || ''
        }
      }
    }
    setValues(initial)
  }, [draft.initialValues, schema, user, values])

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [stepIndex])

  const fieldsById = useMemo(() => {
    const map = {}
    for (const step of schema.steps) for (const field of step.fields) map[field.id] = field
    return map
  }, [schema])

  function handleChange(fieldId, newValue) {
    setValues((prev) => {
      const next = { ...prev, [fieldId]: newValue }
      draft.save(next)
      return next
    })
    if (errors[fieldId]) {
      setErrors((e) => {
        const next = { ...e }
        delete next[fieldId]
        return next
      })
    }
  }

  function handleBlur(fieldId) {
    setTouched((t) => ({ ...t, [fieldId]: true }))
    const field = fieldsById[fieldId]
    if (!field || !values) return
    const err = validateField(field, values[fieldId])
    setErrors((e) => {
      const next = { ...e }
      if (err) next[fieldId] = err
      else delete next[fieldId]
      return next
    })
  }

  function markStepTouched(step) {
    setTouched((t) => {
      const next = { ...t }
      for (const f of step.fields) next[f.id] = true
      return next
    })
  }

  function goNext() {
    if (isReview) return
    const step = schema.steps[stepIndex]
    const stepErrors = validateStep(step, values || {})
    if (Object.keys(stepErrors).length > 0) {
      setErrors((e) => ({ ...e, ...stepErrors }))
      markStepTouched(step)
      return
    }
    setStepIndex(stepIndex + 1)
  }

  function goPrev() {
    if (stepIndex === 0) return
    setStepIndex(stepIndex - 1)
  }

  function gotoStep(i) {
    if (i < 0 || i > reviewStepIndex) return
    setStepIndex(i)
  }

  async function handleSubmit() {
    const allErrors = validateAll(schema, values || {})
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      const newTouched = {}
      for (const id of Object.keys(allErrors)) newTouched[id] = true
      setTouched((t) => ({ ...t, ...newTouched }))
      const errStep = findFirstErrorStep(schema, allErrors)
      setStepIndex(errStep >= 0 ? errStep : 0)
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    const result = await draft.submit(values)
    setSubmitting(false)
    if (!result.ok) {
      setSubmitError(result.error)
      return
    }
    setSubmitted(true)
    router.replace('/dashboard')
  }

  if (draft.submittedAlready) {
    return (
      <div className={styles.alreadyCard}>
        <div className={styles.alreadyCheck} aria-hidden>✓</div>
        <h2 className={styles.alreadyTitle}>You’ve already submitted this application.</h2>
        <p className={styles.alreadyBody}>
          To update something on this application, please contact{' '}
          <a href="mailto:info@yondelabs.com" className={styles.alreadyLink}>
            info@yondelabs.com
          </a>{' '}
          and our team will handle edits on our side.
        </p>
        <div className={styles.alreadyActions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => router.push('/dashboard')}
          >
            Go to dashboard
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => router.push('/apply')}
          >
            Apply for another program
          </button>
        </div>
      </div>
    )
  }

  if (draft.isLoading || values == null) {
    return (
      <div className={styles.loadingCard}>
        <div className={styles.spinner} aria-hidden />
        <p>Loading your application…</p>
      </div>
    )
  }

  return (
    <div className={styles.wizardRoot}>
      <header className={styles.wizardHeader}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => router.push('/apply')}
        >
          ← Back to programs
        </button>
        <h1 className={styles.wizardTitle}>{schema.title}</h1>
        {draft.loadError ? (
          <p className={styles.wizardWarning}>{draft.loadError}</p>
        ) : null}
      </header>

      <nav className={styles.progress} aria-label="Application progress">
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.round(((stepIndex) / reviewStepIndex) * 100)}%` }}
          />
        </div>
        <ol className={styles.stepDots}>
          {schema.steps.map((step, i) => {
            const isActive = i === stepIndex
            const isDone = i < stepIndex
            return (
              <li
                key={step.id}
                className={`${styles.stepDot} ${isActive ? styles.stepDotActive : ''} ${
                  isDone ? styles.stepDotDone : ''
                }`}
              >
                <button
                  type="button"
                  className={styles.stepDotBtn}
                  onClick={() => gotoStep(i)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className={styles.stepDotIndex} aria-hidden>
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span className={styles.stepDotLabel}>{step.title}</span>
                </button>
              </li>
            )
          })}
          <li
            className={`${styles.stepDot} ${isReview ? styles.stepDotActive : ''}`}
          >
            <button
              type="button"
              className={styles.stepDotBtn}
              onClick={() => gotoStep(reviewStepIndex)}
              aria-current={isReview ? 'step' : undefined}
            >
              <span className={styles.stepDotIndex} aria-hidden>
                {reviewStepIndex + 1}
              </span>
              <span className={styles.stepDotLabel}>Review</span>
            </button>
          </li>
        </ol>
      </nav>

      <main className={styles.wizardMain}>
        {isReview ? (
          <ReviewStep
            schema={schema}
            values={values}
            errors={errors}
            totalSteps={totalDataSteps}
            onEdit={gotoStep}
          />
        ) : (
          <FormStep
            step={schema.steps[stepIndex]}
            stepIndex={stepIndex}
            totalSteps={totalDataSteps}
            values={values}
            errors={errors}
            touched={touched}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        )}

        {submitError ? (
          <div className={styles.submitError} role="alert">
            {submitError}
          </div>
        ) : null}
      </main>

      <footer className={styles.wizardFooter}>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={goPrev}
          disabled={stepIndex === 0 || submitting || submitted}
        >
          ← Previous
        </button>

        <SaveIndicator status={draft.status} lastSavedAt={draft.lastSavedAt} />

        {isReview ? (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleSubmit}
            disabled={submitting || submitted}
          >
            {submitting ? 'Submitting…' : 'Submit application'}
          </button>
        ) : (
          <button type="button" className={styles.primaryBtn} onClick={goNext}>
            Next →
          </button>
        )}
      </footer>
    </div>
  )
}
