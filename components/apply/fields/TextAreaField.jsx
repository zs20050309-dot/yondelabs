import styles from '../../../styles/wizard.module.css'

export default function TextAreaField({ field, value, onChange, onBlur, error }) {
  return (
    <textarea
      id={field.id}
      className={`${styles.textarea} ${error ? styles.inputError : ''}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      rows={5}
      placeholder={field.placeholder || ''}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${field.id}-err` : undefined}
    />
  )
}
