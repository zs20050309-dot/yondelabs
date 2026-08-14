import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useConfirm } from './ConfirmProvider'
import {
  OFFER_TEMPLATE_LABELS,
  defaultOfferLetterData,
  offerTemplateFields,
} from '../../lib/admin/offerLetterTemplates'
import styles from '../../styles/admin.module.css'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function OfferLetterSender({ application, onSent }) {
  const confirm = useConfirm()
  const initialData = useMemo(() => defaultOfferLetterData(application), [application])
  const fields = offerTemplateFields(application.program)
  const [form, setForm] = useState(initialData)
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [preparing, setPreparing] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const formRef = useRef(null)

  useEffect(() => { setForm(initialData) }, [initialData])

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (!previewUrl) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function closeOnEscape(event) {
      if (event.key === 'Escape') setPreviewUrl('')
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [previewUrl])

  useEffect(() => {
    let active = true
    async function loadHistory() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const response = await fetch(`/api/admin/applications/${application.id}/offer-letter`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = await response.json().catch(() => ({}))
      if (!active) return
      if (response.ok) setHistory(body.sends || [])
      else setError(body.error || 'Offer-letter history could not be loaded.')
    }
    loadHistory()
    return () => { active = false }
  }, [application.id])

  if (!fields.length || !['interview', 'offer'].includes(application.status)) return null

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function preparePdf(mode) {
    if (!formRef.current?.reportValidity()) return
    setError('')
    setSuccess('')
    setPreparing(mode)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Please sign in again.')
      const response = await fetch(`/api/admin/applications/${application.id}/offer-letter-preview?download=${mode === 'download' ? '1' : '0'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'The offer-letter PDF could not be generated.')
      }
      const blobUrl = URL.createObjectURL(await response.blob())
      if (mode === 'preview') {
        setPreviewUrl(blobUrl)
      } else {
        const disposition = response.headers.get('content-disposition') || ''
        const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'offer-letter.pdf'
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(blobUrl)
      }
    } catch (previewError) {
      setError(previewError.message || 'The offer-letter PDF could not be generated.')
    } finally {
      setPreparing('')
    }
  }

  async function sendOffer(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    const ok = await confirm({ title: 'Send offer letter', message: `Email the ${OFFER_TEMPLATE_LABELS[application.program]} to ${form.recipientEmail}? A PDF will be attached.` })
    if (!ok) return
    setSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Please sign in again.')
      const response = await fetch(`/api/admin/applications/${application.id}/offer-letter`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'The offer letter could not be sent.')
      setHistory((current) => [{ id: body.id, recipient_email: body.recipient, status: 'sent', sent_at: body.sentAt, created_at: body.sentAt }, ...current])
      setSuccess(body.stageUpdated
        ? `Offer letter emailed to ${body.recipient}.`
        : `Offer letter emailed to ${body.recipient}, but the stage could not be updated. Move it to Offer sent manually.`)
      setOpen(false)
      await onSent?.()
    } catch (sendError) {
      setError(sendError.message || 'The offer letter could not be sent.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className={styles.offerLetterCard}>
      <div className={styles.offerLetterHeading}>
        <div>
          <span className={styles.eyebrow}>Offer letter</span>
          <h3>{OFFER_TEMPLATE_LABELS[application.program]}</h3>
          <p>Complete the program details, then email a personalized PDF directly to the student. Sending from Interview also moves the application to Offer sent.</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={() => setOpen((value) => !value)}>
          {open ? 'Close form' : history.some((item) => item.status === 'sent') ? 'Send again' : 'Create & send'}
        </button>
      </div>

      {success ? <div className={styles.inlineSuccess}>{success}</div> : null}
      {error ? <div className={styles.inlineErrorStandalone}>{error}</div> : null}

      {open ? (
        <form ref={formRef} className={styles.offerLetterForm} onSubmit={sendOffer}>
          <label>
            <span>Recipient email</span>
            <input type="email" required value={form.recipientEmail || ''} onChange={(event) => update('recipientEmail', event.target.value)} />
          </label>
          <label>
            <span>Student name</span>
            <input type="text" required value={form.studentName || ''} onChange={(event) => update('studentName', event.target.value)} />
          </label>
          <label>
            <span>Offer date</span>
            <input type="date" required value={form.offerDate || ''} onChange={(event) => update('offerDate', event.target.value)} />
          </label>
          {fields.map((field) => {
            if (field.dependsOn && !form[field.dependsOn]) return null
            if (field.type === 'checkbox') return (
              <label className={styles.offerCheckbox} key={field.key}>
                <input type="checkbox" checked={Boolean(form[field.key])} onChange={(event) => update(field.key, event.target.checked)} />
                <span>{field.label}</span>
              </label>
            )
            return (
              <label key={field.key} className={field.key.toLowerCase().includes('deliverable') ? styles.offerWideField : undefined}>
                <span>{field.label}</span>
                <input
                  type={field.type || 'text'} required={field.required} min={field.min} step={field.step}
                  placeholder={field.placeholder || ''} value={form[field.key] ?? ''}
                  onChange={(event) => update(field.key, event.target.value)}
                />
              </label>
            )
          })}
          <div className={styles.offerFormActions}>
            <span>The attachment is generated privately and is not stored publicly.</span>
            <div>
              <button type="button" className={styles.secondaryButton} disabled={sending || Boolean(preparing)} onClick={() => preparePdf('preview')}>
                {preparing === 'preview' ? 'Preparing preview…' : 'Preview PDF'}
              </button>
              <button type="button" className={styles.secondaryButton} disabled={sending || Boolean(preparing)} onClick={() => preparePdf('download')}>
                {preparing === 'download' ? 'Preparing download…' : 'Download PDF'}
              </button>
              <button type="submit" className={styles.primaryButton} disabled={sending || Boolean(preparing)}>{sending ? 'Generating & sending…' : 'Send PDF offer letter'}</button>
            </div>
          </div>
        </form>
      ) : null}

      {previewUrl ? (
        <div className={styles.offerPreviewBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewUrl('') }}>
          <section className={styles.offerPreviewModal} role="dialog" aria-modal="true" aria-labelledby="offer-preview-title">
            <div>
              <div><span className={styles.eyebrow}>PDF preview</span><h3 id="offer-preview-title">Review offer letter</h3></div>
              <button type="button" className={styles.iconButton} onClick={() => setPreviewUrl('')} aria-label="Close offer-letter preview" autoFocus>×</button>
            </div>
            <iframe src={previewUrl} title="Offer letter PDF preview" />
            <div className={styles.offerPreviewActions}>
              <span>Review all details before sending.</span>
              <button type="button" className={styles.secondaryButton} onClick={() => preparePdf('download')}>Download PDF</button>
              <button type="button" className={styles.primaryButton} onClick={() => setPreviewUrl('')}>Done reviewing</button>
            </div>
          </section>
        </div>
      ) : null}

      {history.length ? (
        <div className={styles.offerHistory}>
          <strong>Delivery history</strong>
          {history.slice(0, 5).map((item) => (
            <div key={item.id}>
              <span>{item.recipient_email}</span>
              <span className={item.status === 'sent' ? styles.offerSent : styles.offerFailed}>
                {item.status === 'sent' ? `Sent ${formatDate(item.sent_at)}` : `${item.status} ${formatDate(item.created_at)}`}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
