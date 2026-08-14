import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { IconAlert, IconCheck } from './icons'
import styles from '../../styles/admin.module.css'

const ToastContext = createContext(null)

export function useToast() {
  const showToast = useContext(ToastContext)
  if (!showToast) throw new Error('useToast must be used within a ToastProvider')
  return showToast
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const showToast = useCallback((message, type = 'success') => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message, type }])
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4000)
  }, [])

  function dismiss(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={styles.toastStack} aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
            <span className={styles.toastIcon}>{toast.type === 'error' ? <IconAlert /> : <IconCheck />}</span>
            <span>{toast.message}</span>
            <button type="button" className={styles.toastClose} onClick={() => dismiss(toast.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
