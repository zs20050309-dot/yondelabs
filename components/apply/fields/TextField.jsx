import styles from '../../../styles/wizard.module.css'

export default function TextField({ field, value, onChange, onBlur, error }) {
  return (
    <input
      id={field.id}
      type="text"
      className={`${styles.input} ${error ? styles.inputError : ''}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={field.placeholder || ''}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${field.id}-err` : undefined}
    />
  )
}
