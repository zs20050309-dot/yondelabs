import { resolveOptions } from '../../../lib/forms/schema'
import styles from '../../../styles/wizard.module.css'

export default function RadioField({ field, value, onChange, onBlur }) {
  const options = resolveOptions(field)
  return (
    <div role="radiogroup" aria-labelledby={`${field.id}-label`} className={styles.choiceGroup}>
      {options.map((opt) => {
        const checked = value === opt
        return (
          <label key={opt} className={`${styles.choice} ${checked ? styles.choiceChecked : ''}`}>
            <input
              type="radio"
              name={field.id}
              value={opt}
              checked={checked}
              onChange={() => onChange(opt)}
              onBlur={onBlur}
              className={styles.choiceInput}
            />
            <span className={styles.choiceLabel}>{opt}</span>
          </label>
        )
      })}
    </div>
  )
}
