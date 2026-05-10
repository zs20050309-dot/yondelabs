import { useState } from 'react'
import styles from '../../styles/portal.module.css'

export default function PasswordInput({
  label,
  value,
  onChange,
  placeholder = '••••••••',
  hint,
  extra,
  required = true,
}) {
  const [show, setShow] = useState(false)

  const inputId = `password-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className={styles.inputGroup}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={inputId}>{label}</label>
        {extra}
      </div>
      <div className={styles.inputWrapper}>
        <input
          id={inputId}
          className={styles.input}
          type={show ? 'text' : 'password'}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
        <button
          type="button"
          className={styles.eyeButton}
          onClick={() => setShow(!show)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOffIcon /> : <EyeOnIcon />}
        </button>
      </div>
      {hint ? <span className={styles.inputHint}>{hint}</span> : null}
    </div>
  )
}

function EyeOnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
