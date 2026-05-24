import { resolveOptions } from '../../../lib/forms/schema'
import styles from '../../../styles/wizard.module.css'

export default function CheckboxField({ field, value, onChange, onBlur }) {
  const options = resolveOptions(field)
  const selected = Array.isArray(value) ? value : []

  function toggle(opt) {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  return (
    <div role="group" aria-labelledby={`${field.id}-label`} className={styles.choiceGroup}>
      {options.map((opt) => {
        const checked = selected.includes(opt)
        return (
          <label key={opt} className={`${styles.choice} ${checked ? styles.choiceChecked : ''}`}>
            <input
              type="checkbox"
              value={opt}
              checked={checked}
              onChange={() => toggle(opt)}
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
