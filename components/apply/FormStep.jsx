import FieldRenderer from './FieldRenderer'
import styles from '../../styles/wizard.module.css'

export default function FormStep({ step, stepIndex, totalSteps, values, errors, touched, onChange, onBlur }) {
  return (
    <section className={styles.stepCard}>
      <header className={styles.stepHeader}>
        <p className={styles.stepCounter}>
          Step {stepIndex + 1} of {totalSteps}
        </p>
        <h2 className={styles.stepTitle}>{step.title}</h2>
        {step.description ? <p className={styles.stepDescription}>{step.description}</p> : null}
      </header>

      <div className={styles.fieldList}>
        {step.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(v) => onChange(field.id, v)}
            onBlur={() => onBlur(field.id)}
            error={touched[field.id] ? errors[field.id] : null}
          />
        ))}
      </div>
    </section>
  )
}
