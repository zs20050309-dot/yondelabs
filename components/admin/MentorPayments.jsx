import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from './ToastProvider'
import {
  PAYMENT_SOURCE_LABELS,
  PAYMENT_STATUS_LABELS,
  amountToCents,
  centsToAmount,
  formatCents,
  sumCents,
} from '../../lib/admin/mentorPayments'
import styles from '../../styles/admin.module.css'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PaymentRow({ record, onUpdated }) {
  const showToast = useToast()
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState(centsToAmount(record.amount_cents))
  const [notes, setNotes] = useState(record.notes || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(status) {
    const cents = status === 'paid' ? amountToCents(amount) : record.amount_cents
    if (status === 'paid' && cents === null) {
      setError('Enter a valid amount.')
      return
    }
    setBusy(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('set_mentor_payment_status', {
      p_record_id: record.id,
      p_status: status,
      p_amount_cents: cents,
      p_notes: notes.trim() || null,
    })
    if (rpcError) {
      setError(rpcError.message)
      showToast(rpcError.message || 'Payment update failed.', 'error')
    } else {
      onUpdated(data)
      setEditing(false)
      showToast(status === 'paid' ? 'Marked as paid.' : 'Reverted to pending.')
    }
    setBusy(false)
  }

  return (
    <div className={styles.paymentRow}>
      <div className={styles.paymentInfo}>
        <strong>{record.current_students?.full_name || 'Unknown student'}</strong>
        <span>{PAYMENT_SOURCE_LABELS[record.source_type]} · {formatDate(record.created_at)}</span>
        {record.notes ? <span>{record.notes}</span> : null}
      </div>
      <div className={styles.paymentAmount}>
        <strong>{formatCents(record.amount_cents, record.currency)}</strong>
        <span className={`${styles.status} ${record.status === 'paid' ? styles.statusPaymentPaid : styles.statusPaymentPending}`}>
          {PAYMENT_STATUS_LABELS[record.status]}
        </span>
      </div>
      <div className={styles.rowActions}>
        {record.status === 'pending' && !editing ? (
          <button type="button" className={styles.viewButton} onClick={() => setEditing(true)}>Mark paid</button>
        ) : null}
        {record.status === 'paid' ? (
          <button type="button" className={styles.viewButton} disabled={busy} onClick={() => submit('pending')}>Revert to pending</button>
        ) : null}
      </div>
      {editing ? (
        <form className={styles.markPaidForm} onSubmit={(event) => { event.preventDefault(); submit('paid') }}>
          <label><span>Amount paid</span><input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
          <label><span>Notes</span><input type="text" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" /></label>
          <div>
            <button type="button" className={styles.secondaryButton} onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            <button type="submit" className={styles.primaryButton} disabled={busy}>{busy ? 'Saving…' : 'Confirm paid'}</button>
          </div>
        </form>
      ) : null}
      {error ? <div className={styles.inlineError}>{error}</div> : null}
    </div>
  )
}

function ManualLineItemForm({ mentor, assignments, onAdded }) {
  const [assignmentId, setAssignmentId] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    const assignment = assignments.find((item) => item.id === assignmentId)
    const cents = amountToCents(amount)
    if (!assignment || cents === null) {
      setError('Choose a student and enter a valid amount.')
      return
    }
    setBusy(true)
    setError('')
    const { data, error: insertError } = await supabase
      .from('mentor_payment_records')
      .insert({
        mentor_id: mentor.id,
        current_student_id: assignment.current_student_id,
        assignment_id: assignment.id,
        source_type: 'manual',
        amount_cents: cents,
        notes: notes.trim() || null,
      })
      .select('*, current_students(full_name)')
      .single()
    if (insertError) setError(insertError.message)
    else {
      setAssignmentId('')
      setAmount('')
      setNotes('')
      onAdded(data)
    }
    setBusy(false)
  }

  if (!assignments.length) return null

  return (
    <form className={styles.manualLineForm} onSubmit={submit}>
      <label>
        <span>Student</span>
        <select value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} required>
          <option value="">Choose a student</option>
          {assignments.map((item) => <option key={item.id} value={item.id}>{item.current_students?.full_name} · {item.role}</option>)}
        </select>
      </label>
      <label><span>Amount</span><input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
      <label><span>Notes</span><input type="text" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reason for adjustment" /></label>
      <button type="submit" className={styles.secondaryButton} disabled={busy}>{busy ? 'Adding…' : 'Add line item'}</button>
      {error ? <div className={styles.inlineError}>{error}</div> : null}
    </form>
  )
}

function MentorDetail({ mentor, onClose, onRecordsChanged }) {
  const [assignments, setAssignments] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [assignmentsResult, recordsResult] = await Promise.all([
      supabase
        .from('student_mentor_assignments')
        .select('id, role, current_student_id, current_students(full_name), mentor_payment_settings(payment_type, hourly_rate_cents), mentor_milestone_rates(amount_cents, course_milestones(title))')
        .eq('mentor_id', mentor.id),
      supabase
        .from('mentor_payment_records')
        .select('*, current_students(full_name)')
        .eq('mentor_id', mentor.id)
        .order('created_at', { ascending: false }),
    ])
    if (assignmentsResult.error || recordsResult.error) {
      setError('Mentor payments are unavailable. Run the 2026-08-13 mentor payments migration.')
    } else {
      setError('')
      setAssignments(assignmentsResult.data || [])
      setRecords(recordsResult.data || [])
    }
    setLoading(false)
  }, [mentor.id])

  useEffect(() => { load() }, [load])

  function handleRecordUpdated(updated) {
    setRecords((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
    onRecordsChanged()
  }

  function handleRecordAdded(record) {
    setRecords((current) => [record, ...current])
    onRecordsChanged()
  }

  const pendingTotal = sumCents(records.filter((item) => item.status === 'pending'))
  const paidTotal = sumCents(records.filter((item) => item.status === 'paid'))

  return (
    <>
      <button type="button" className={styles.backdrop} onClick={onClose} aria-label="Close mentor" />
      <aside className={styles.detailPanel} aria-label="Mentor payments">
        <div className={styles.detailHeader}>
          <div>
            <span className={styles.eyebrow}>Mentor</span>
            <h2>{mentor.name}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">×</button>
        </div>

        {loading ? <p className={styles.portalAccessMuted}>Loading…</p> : (
          <>
            {error ? <div className={styles.inlineErrorStandalone}>{error}</div> : null}

            <div className={styles.detailMeta}>
              <div><span>Assigned students</span><strong>{assignments.length}</strong></div>
              <div><span>Pending</span><strong>{formatCents(pendingTotal)}</strong></div>
              <div><span>Paid</span><strong>{formatCents(paidTotal)}</strong></div>
            </div>

            <section className={styles.detailSection}>
              <span className={styles.eyebrow}>Assignments</span>
              <h3>Students &amp; rates</h3>
              <div className={styles.detailList}>
                {assignments.map((item) => {
                  const settings = item.mentor_payment_settings?.[0] || item.mentor_payment_settings
                  const milestoneRates = item.mentor_milestone_rates || []
                  return (
                    <div key={item.id} className={styles.assignmentSummary}>
                      <p>
                        <span>{item.current_students?.full_name} · {item.role}</span>
                        <strong>
                          {!settings
                            ? 'No payment type set'
                            : settings.payment_type === 'hourly'
                              ? `Hourly · ${formatCents(settings.hourly_rate_cents)}`
                              : `Per milestone · ${milestoneRates.length ? `${milestoneRates.length} priced` : 'none priced yet'}`}
                        </strong>
                      </p>
                      {settings?.payment_type === 'milestone' && milestoneRates.length ? (
                        <ul className={styles.milestoneRateSummary}>
                          {milestoneRates.map((rate, index) => (
                            <li key={index}>{rate.course_milestones?.title} <span>{formatCents(rate.amount_cents)}</span></li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  )
                })}
                {!assignments.length ? <p>No students assigned to this mentor yet. Assign them from the student's profile.</p> : null}
              </div>
            </section>

            {(() => {
              const pendingRecords = records.filter((item) => item.status === 'pending')
              const paidRecords = records.filter((item) => item.status === 'paid')
              return (
                <>
                  <section className={`${styles.detailSection} ${styles.toProcessSection}`}>
                    <div className={styles.sectionHeading}>
                      <div>
                        <span className={styles.eyebrow}>Needs action</span>
                        <h3>To be paid{pendingRecords.length ? ` (${pendingRecords.length})` : ''}</h3>
                      </div>
                      {pendingRecords.length ? <strong className={styles.toProcessTotal}>{formatCents(pendingTotal)}</strong> : null}
                    </div>
                    <div className={styles.paymentList}>
                      {pendingRecords.map((record) => <PaymentRow key={record.id} record={record} onUpdated={handleRecordUpdated} />)}
                      {!pendingRecords.length ? <p className={styles.allClearNotice}>Nothing owed right now — every logged milestone and session is paid up.</p> : null}
                    </div>
                    <ManualLineItemForm mentor={mentor} assignments={assignments} onAdded={handleRecordAdded} />
                  </section>

                  <details className={`${styles.detailSection} ${styles.historyDisclosure}`}>
                    <summary>
                      <div>
                        <span className={styles.eyebrow}>Record</span>
                        <h3>Payment history{paidRecords.length ? ` (${paidRecords.length})` : ''}</h3>
                      </div>
                      <strong>{formatCents(paidTotal)}</strong>
                    </summary>
                    <div className={styles.paymentList}>
                      {paidRecords.map((record) => <PaymentRow key={record.id} record={record} onUpdated={handleRecordUpdated} />)}
                      {!paidRecords.length ? <p>Nothing paid yet.</p> : null}
                    </div>
                  </details>
                </>
              )
            })()}
          </>
        )}
      </aside>
    </>
  )
}

export default function MentorPayments() {
  const [mentors, setMentors] = useState([])
  const [summaries, setSummaries] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedMentorId, setSelectedMentorId] = useState(null)
  const [newMentorName, setNewMentorName] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [mentorsResult, recordsResult] = await Promise.all([
      supabase.from('mentors').select('id, name, active').order('name', { ascending: true }),
      supabase.from('mentor_payment_records').select('mentor_id, amount_cents, status'),
    ])
    if (mentorsResult.error || recordsResult.error) {
      setError('Mentor payments are unavailable. Run the 2026-08-13 mentor payments migration.')
      setMentors([])
    } else {
      setError('')
      setMentors(mentorsResult.data || [])
      const grouped = {}
      for (const record of recordsResult.data || []) {
        const bucket = grouped[record.mentor_id] || { pending: 0, paid: 0, pendingCount: 0 }
        if (record.status === 'paid') bucket.paid += Number(record.amount_cents) || 0
        else {
          bucket.pending += Number(record.amount_cents) || 0
          bucket.pendingCount += 1
        }
        grouped[record.mentor_id] = bucket
      }
      setSummaries(grouped)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addMentor(event) {
    event.preventDefault()
    if (!newMentorName.trim()) return
    setBusy(true)
    const { error: insertError } = await supabase.from('mentors').insert({ name: newMentorName.trim() })
    if (insertError) setError(insertError.message)
    else {
      setNewMentorName('')
      await load()
    }
    setBusy(false)
  }

  const [needsPaymentOnly, setNeedsPaymentOnly] = useState(false)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return mentors
      .filter((mentor) => !needle || mentor.name.toLowerCase().includes(needle))
      .filter((mentor) => !needsPaymentOnly || (summaries[mentor.id]?.pendingCount || 0) > 0)
      .sort((a, b) => (summaries[b.id]?.pending || 0) - (summaries[a.id]?.pending || 0) || a.name.localeCompare(b.name))
  }, [mentors, query, needsPaymentOnly, summaries])

  const selectedMentor = mentors.find((mentor) => mentor.id === selectedMentorId) || null

  const totals = useMemo(() => {
    const values = Object.values(summaries)
    return {
      pending: values.reduce((sum, item) => sum + item.pending, 0),
      pendingMentors: values.filter((item) => item.pendingCount > 0).length,
      paid: values.reduce((sum, item) => sum + item.paid, 0),
    }
  }, [summaries])

  if (loading) return <section className={styles.tableCard}><div className={styles.empty}>Loading mentors…</div></section>

  return (
    <>
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.paymentsSummaryBar} aria-label="Mentor payments summary">
        <div className={styles.paymentsSummaryCard}>
          <span>Needs to be paid</span>
          <strong>{formatCents(totals.pending)}</strong>
          <span className={styles.paymentsSummaryHint}>{totals.pendingMentors ? `across ${totals.pendingMentors} mentor${totals.pendingMentors === 1 ? '' : 's'}` : 'all caught up'}</span>
        </div>
        <div className={styles.paymentsSummaryCard}>
          <span>Paid out</span>
          <strong>{formatCents(totals.paid)}</strong>
          <span className={styles.paymentsSummaryHint}>total recorded</span>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.toolbar}>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mentors" aria-label="Search mentors" />
          <label className={styles.needsPaymentToggle}>
            <input type="checkbox" checked={needsPaymentOnly} onChange={(event) => setNeedsPaymentOnly(event.target.checked)} />
            <span>Needs payment only</span>
          </label>
          <form className={styles.addMentorInline} onSubmit={addMentor}>
            <input type="text" value={newMentorName} onChange={(event) => setNewMentorName(event.target.value)} placeholder="New mentor name" aria-label="New mentor name" />
            <button type="submit" className={styles.secondaryButton} disabled={busy}>Add mentor</button>
          </form>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Mentor</th><th>Pending</th><th>Paid</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
            <tbody>
              {filtered.map((mentor) => {
                const summary = summaries[mentor.id] || { pending: 0, paid: 0, pendingCount: 0 }
                return (
                  <tr key={mentor.id} className={summary.pendingCount ? styles.needsPaymentRow : undefined}>
                    <td><button type="button" className={styles.studentLink} onClick={() => setSelectedMentorId(mentor.id)}><strong>{mentor.name}</strong>{!mentor.active ? <span>Inactive</span> : null}</button></td>
                    <td>
                      {summary.pendingCount ? (
                        <span className={`${styles.status} ${styles.statusPaymentPending}`}>{formatCents(summary.pending)} · {summary.pendingCount} unpaid</span>
                      ) : (
                        <span className={styles.noCourse}>Nothing due</span>
                      )}
                    </td>
                    <td>{formatCents(summary.paid)}</td>
                    <td className={styles.rowActions}><button type="button" className={styles.viewButton} onClick={() => setSelectedMentorId(mentor.id)}>View ledger</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filtered.length ? <div className={styles.empty}>{needsPaymentOnly ? 'No mentors currently need payment.' : 'No mentors match this search.'}</div> : null}
        </div>
      </section>

      {selectedMentor ? (
        <MentorDetail mentor={selectedMentor} onClose={() => setSelectedMentorId(null)} onRecordsChanged={load} />
      ) : null}
    </>
  )
}
