import styles from '../../styles/wizard.module.css'

function formatValue(value) {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) return value.length === 0 ? '—' : value.join(', ')
  return String(value)
}

export default function ReviewStep({ schema, values, errors, totalSteps, onEdit }) {
  const missingRequired = Object.keys(errors).length > 0

  return (
    <section className={styles.stepCard}>
      <header className={styles.stepHeader}>
        <p className={styles.stepCounter}>Step {totalSteps + 1} of {totalSteps + 1}</p>
        <h2 className={styles.stepTitle}>Review your application</h2>
        <p className={styles.stepDescription}>
          Take a moment to look over your answers. You can jump back to any section to make edits.
        </p>
      </header>

      {missingRequired ? (
        <div className={styles.reviewWarning} role="alert">
          Some required fields are still missing. Please complete them before submitting.
        </div>
      ) : null}

      <div className={styles.reviewSections}>
        {schema.steps.map((step, i) => {
          const stepHasErrors = step.fields.some((f) => errors[f.id])
          return (
            <div
              key={step.id}
              className={`${styles.reviewSection} ${stepHasErrors ? styles.reviewSectionError : ''}`}
            >
              <div className={styles.reviewSectionHeader}>
                <h3 className={styles.reviewSectionTitle}>{step.title}</h3>
                <button type="button" className={styles.reviewEditBtn} onClick={() => onEdit(i)}>
                  Edit
                </button>
              </div>

              <dl className={styles.reviewList}>
                {step.fields.map((field) => {
                  const hasError = !!errors[field.id]
                  return (
                    <div key={field.id} className={styles.reviewItem}>
                      <dt className={styles.reviewLabel}>{field.label}</dt>
                      <dd className={`${styles.reviewValue} ${hasError ? styles.reviewValueMissing : ''}`}>
                        {hasError ? 'Required — please complete' : formatValue(values[field.id])}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </div>
          )
        })}
      </div>
    </section>
  )
}
