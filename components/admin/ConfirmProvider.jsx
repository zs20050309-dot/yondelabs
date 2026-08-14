import { createContext, useCallback, useContext, useRef, useState } from 'react'
import styles from '../../styles/admin.module.css'

const ConfirmContext = createContext(null)

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used within a ConfirmProvider')
  return confirm
}

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const [typedText, setTypedText] = useState('')
  const resolverRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setTypedText('')
      setRequest(options)
    })
  }, [])

  function settle(result) {
    resolverRef.current?.(result)
    resolverRef.current = null
    setRequest(null)
  }

  const requireText = request?.requireText
  const canConfirm = !requireText || typedText === requireText

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request ? (
        <div className={styles.confirmBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) settle(false) }}>
          <section
            className={`${styles.confirmModal} ${request.danger ? styles.confirmModalDanger : ''}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <h3 id="confirm-dialog-title">{request.title}</h3>
            {request.message ? <p>{request.message}</p> : null}
            {requireText ? (
              <>
                <label className={styles.confirmInputLabel} htmlFor="confirm-dialog-input">
                  Type &ldquo;{requireText}&rdquo; to confirm
                </label>
                <input
                  id="confirm-dialog-input"
                  className={styles.confirmInput}
                  value={typedText}
                  onChange={(event) => setTypedText(event.target.value)}
                  autoFocus
                  autoComplete="off"
                />
              </>
            ) : null}
            <div className={styles.confirmActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => settle(false)} autoFocus={!requireText}>
                {request.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                className={request.danger ? styles.deleteButton : styles.primaryButton}
                onClick={() => settle(true)}
                disabled={!canConfirm}
              >
                {request.confirmLabel || 'Confirm'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}
