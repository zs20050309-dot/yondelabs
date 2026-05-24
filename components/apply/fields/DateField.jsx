import styles from '../../../styles/wizard.module.css'

export default function DateField({ field, value, onChange, onBlur, error }) {
  return (
    <input
      id={field.id}
      type="date"
      className={`${styles.input} ${error ? styles.inputError : ''}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${field.id}-err` : undefined}
    />
  )
}
