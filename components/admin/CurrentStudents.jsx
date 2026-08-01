import { useMemo, useRef, useState } from 'react'
import { CURRENT_STUDENT_PROGRAMS, parseCurrentStudentsCsv } from '../../lib/admin/currentStudents'
import { formatHours, sumMinutes } from '../../lib/courseHours'
import { supabase } from '../../lib/supabaseClient'
import StudentCourseHours from './StudentCourseHours'
import StudentFiles from './StudentFiles'
import styles from '../../styles/admin.module.css'

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function currentEnrollment(student) {
  return [...(student.student_course_enrollments || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
}

export default function CurrentStudents({ students, loading, onReload }) {
  const fileInput = useRef(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [preview, setPreview] = useState([])
  const [selected, setSelected] = useState(null)
  const [credentials, setCredentials] = useState([])
  const [failures, setFailures] = useState([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return students.filter((student) => {
      const mentors = (student.student_mentor_assignments || []).map((item) => item.mentors?.name).join(' ')
      const haystack = `${student.full_name} ${student.contact_email || ''} ${CURRENT_STUDENT_PROGRAMS[student.program] || student.program} ${mentors}`.toLowerCase()
      return (status === 'all' || student.status === status) && (!needle || haystack.includes(needle))
    })
  }, [query, status, students])

  async function chooseFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setCredentials([])
    setFailures([])
    try {
      const rows = parseCurrentStudentsCsv(await file.text())
      if (!rows.length) throw new Error('No student rows were found in this CSV file.')
      setPreview(rows)
    } catch (parseError) {
      setPreview([])
      setError(parseError.message || 'The CSV file could not be read.')
    }
    event.target.value = ''
  }

  async function importStudents() {
    if (!preview.length || preview.some((row) => row.errors.length)) return
    setImporting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your admin session has expired. Please sign in again.')
      const response = await fetch('/api/admin/current-students/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ students: preview }),
      })
      const result = await response.json()
      if (!response.ok && !result.imported?.length) throw new Error(result.error || 'No students were imported.')
      setCredentials(result.imported || [])
      setFailures(result.failed || [])
      setPreview([])
      await onReload()
    } catch (importError) {
      setError(importError.message || 'The students could not be imported.')
    } finally {
      setImporting(false)
    }
  }

  function downloadCredentials() {
    const lines = [
      ['Name', 'Email', 'Portal ID', 'Temporary Password'].map(csvCell).join(','),
      ...credentials.map((item) => [item.name, item.email || '', item.portalId, item.temporaryPassword].map(csvCell).join(',')),
    ]
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `yonde-student-credentials-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <section className={styles.tableCard}><div className={styles.empty}>Loading current students...</div></section>

  return (
    <>
      <section className={styles.tableCard}>
        <div className={styles.toolbar}>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students, programs, or mentors" aria-label="Search current students" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter current students">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <input ref={fileInput} className={styles.srOnly} type="file" accept=".csv,text/csv" onChange={chooseFile} />
          <button type="button" className={styles.primaryButton} onClick={() => fileInput.current?.click()}>Import CSV</button>
        </div>
        {error ? <div className={styles.inlineBannerError}>{error}</div> : null}
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Student</th><th>Program</th><th>Mentors</th><th>Course hours</th><th>Status</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
            <tbody>
              {filtered.map((student) => {
                const enrollment = currentEnrollment(student)
                const used = sumMinutes(enrollment?.class_sessions)
                const mentorNames = (student.student_mentor_assignments || []).map((item) => item.mentors?.name).filter(Boolean)
                return (
                  <tr key={student.id}>
                    <td><button type="button" className={styles.studentLink} onClick={() => setSelected(student)}><strong>{student.full_name}</strong><span>{student.contact_email || 'Portal ID login only'}</span></button></td>
                    <td>{CURRENT_STUDENT_PROGRAMS[student.program] || student.program}</td>
                    <td>{mentorNames.join(', ') || 'Not assigned'}</td>
                    <td>{enrollment ? <span className={styles.courseHoursCell}><strong>{formatHours(used)}</strong><span> / {formatHours(enrollment.allocated_minutes)}{enrollment.course_plans?.allow_overage ? ' minimum' : ''}</span></span> : <span className={styles.noCourse}>Not assigned</span>}</td>
                    <td><span className={`${styles.status} ${styles[`studentStatus_${student.status}`]}`}>{student.status}</span></td>
                    <td className={styles.rowActions}><button type="button" className={styles.viewButton} onClick={() => setSelected(student)}>View student</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filtered.length ? <div className={styles.empty}>No current students match these filters.</div> : null}
        </div>
      </section>

      {preview.length ? <ImportPreview rows={preview} importing={importing} onCancel={() => setPreview([])} onImport={importStudents} /> : null}
      {credentials.length || failures.length ? <CredentialResults credentials={credentials} failures={failures} onDownload={downloadCredentials} onClose={() => { setCredentials([]); setFailures([]) }} /> : null}
      {selected ? <CurrentStudentDetail student={selected} onClose={() => setSelected(null)} /> : null}
    </>
  )
}

function Modal({ children, label, onClose }) {
  return <><button type="button" className={styles.backdrop} onClick={onClose} aria-label={label} /><aside className={styles.detailPanel}>{children}</aside></>
}

function ImportPreview({ rows, importing, onCancel, onImport }) {
  const invalid = rows.filter((row) => row.errors.length)
  return (
    <Modal label="Close import preview" onClose={onCancel}>
      <div className={styles.detailHeader}><div><span className={styles.eyebrow}>CSV onboarding</span><h2>Review {rows.length} students</h2><p>Passwords from the source file are ignored. Strong temporary passwords will be generated.</p></div><button type="button" className={styles.iconButton} onClick={onCancel} aria-label="Close">×</button></div>
      <div className={styles.importSummary}><span>{rows.length - invalid.length} ready</span><span className={invalid.length ? styles.importProblem : ''}>{invalid.length} need attention</span></div>
      <div className={styles.previewList}>
        {rows.map((row) => <div key={row.rowNumber} className={row.errors.length ? styles.previewInvalid : styles.previewRow}><div><strong>{row.name || `Row ${row.rowNumber}`}</strong><span>{row.email || 'No email'} · {CURRENT_STUDENT_PROGRAMS[row.program] || row.program || 'Unknown program'}</span></div><span>{formatHours(row.totalMinutes)}{row.allowOverage ? ' minimum' : ''}</span>{row.errors.length ? <p>{row.errors.join(' · ')}</p> : null}</div>)}
      </div>
      <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button><button type="button" className={styles.primaryButton} disabled={importing || invalid.length > 0} onClick={onImport}>{importing ? 'Importing...' : `Import ${rows.length} students`}</button></div>
    </Modal>
  )
}

function CredentialResults({ credentials, failures, onDownload, onClose }) {
  return (
    <Modal label="Close import results" onClose={onClose}>
      <div className={styles.detailHeader}><div><span className={styles.eyebrow}>Import complete</span><h2>{credentials.length} students onboarded</h2><p>Download the credentials now. Temporary passwords are not stored in readable form.</p></div><button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">×</button></div>
      {credentials.length ? <><div className={styles.credentialNotice}>This is the only time these temporary passwords will be shown.</div><div className={styles.previewList}>{credentials.map((item) => <div className={styles.previewRow} key={item.portalId}><div><strong>{item.name}</strong><span>{item.portalId}</span></div><code>{item.temporaryPassword}</code></div>)}</div><button type="button" className={styles.primaryButton} onClick={onDownload}>Download credentials CSV</button></> : null}
      {failures.length ? <div className={styles.failureList}><strong>{failures.length} rows were not imported</strong>{failures.map((item) => <p key={`${item.rowNumber}-${item.name}`}>Row {item.rowNumber}, {item.name || 'unnamed'}: {item.error}</p>)}</div> : null}
    </Modal>
  )
}

function CurrentStudentDetail({ student, onClose }) {
  const enrollment = currentEnrollment(student)
  const used = sumMinutes(enrollment?.class_sessions)
  return (
    <Modal label="Close student details" onClose={onClose}>
      <div className={styles.detailHeader}><div><span className={styles.eyebrow}>Current student</span><h2>{student.full_name}</h2><p>{student.contact_email || 'No contact email provided'}</p></div><button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">×</button></div>
      <div className={styles.detailMeta}><div><span>Program</span><strong>{CURRENT_STUDENT_PROGRAMS[student.program]}</strong></div><div><span>Status</span><strong>{student.status}</strong></div><div><span>Portal ID</span><strong>{student.student_portal_accounts?.[0]?.portal_id || 'Not created'}</strong></div></div>
      <section className={styles.detailSection}><span className={styles.eyebrow}>Course</span><h3>{enrollment?.course_plans?.name || 'No plan assigned'}</h3>{enrollment ? <div className={styles.detailList}><p><span>Hours used</span><strong>{formatHours(used)}</strong></p><p><span>{enrollment.course_plans?.allow_overage ? 'Minimum hours' : 'Allocated hours'}</span><strong>{formatHours(enrollment.allocated_minutes)}</strong></p>{(enrollment.student_hour_allocations || []).map((item) => <p key={item.id}><span>{item.label}</span><strong>{formatHours(item.allocated_minutes)}</strong></p>)}</div> : null}</section>
      <section className={styles.detailSection}><span className={styles.eyebrow}>Mentors</span><h3>Assigned team</h3><div className={styles.detailList}>{(student.student_mentor_assignments || []).map((item) => <p key={item.id}><span>{item.role}</span><strong>{item.mentors?.name}</strong></p>)}{!student.student_mentor_assignments?.length ? <p>No mentors assigned.</p> : null}</div></section>
      <StudentCourseHours currentStudent={student} />
      <StudentFiles currentStudent={student} />
    </Modal>
  )
}
