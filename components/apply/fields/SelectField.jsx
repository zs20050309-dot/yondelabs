import { resolveOptions } from '../../../lib/forms/schema'
import styles from '../../../styles/wizard.module.css'

export default function SelectField({ field, value, onChange, onBlur, error }) {
  const options = resolveOptions(field)
  return (
    <div className={styles.selectWrap}>
      <select
        id={field.id}
        className={`${styles.select} ${error ? styles.inputError : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${field.id}-err` : undefined}
      >
        <option value="">Select an option</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span className={styles.selectChevron} aria-hidden>
        ▾
      </span>
    </div>
  )
}
