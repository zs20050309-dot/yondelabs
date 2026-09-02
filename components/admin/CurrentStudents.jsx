import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CURRENT_STUDENT_PROGRAMS } from '../../lib/admin/currentStudents'
import { formatHours, sumMinutes } from '../../lib/courseHours'
import StudentCourseHours from './StudentCourseHours'
import StudentFiles from './StudentFiles'
import StudentPortalAccess from './StudentPortalAccess'
import AddCurrentStudent from './AddCurrentStudent'
import SessionNotesManager from './SessionNotesManager'
import StudentProjectFields from './StudentProjectFields'
import MentorAssignments from './MentorAssignments'
import styles from '../../styles/admin.module.css'

function currentEnrollment(student) {
  return [...(student.student_course_enrollments || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
}

export default function CurrentStudents({ students, loading, onStudentsChanged }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return students.filter((student) => {
      const mentors = (student.student_mentor_assignments || []).map((item) => item.mentors?.name).join(' ')
      const haystack = `${student.full_name} ${student.contact_email || ''} ${CURRENT_STUDENT_PROGRAMS[student.program] || student.program || ''} ${mentors}`.toLowerCase()
      return (status === 'all' || student.status === status) && (!needle || haystack.includes(needle))
    })
  }, [query, status, students])

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
        </div>
        <div className={styles.addStudentBar}>
          <AddCurrentStudent onCreated={onStudentsChanged} />
        </div>
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
                    <td data-label="Student"><button type="button" className={styles.studentLink} onClick={() => setSelected(student)}><strong>{student.full_name}</strong><span>{student.contact_email || 'Portal ID login only'}</span></button></td>
                    <td data-label="Program">{CURRENT_STUDENT_PROGRAMS[student.program] || student.program || <span className={styles.noCourse}>Not assigned</span>}</td>
                    <td data-label="Mentors">{mentorNames.join(', ') || 'Not assigned'}</td>
                    <td data-label="Course hours">{enrollment ? <span className={styles.courseHoursCell}><strong>{formatHours(used)}</strong><span> / {formatHours(enrollment.allocated_minutes)}{enrollment.course_plans?.allow_overage ? ' minimum' : ''}</span></span> : <span className={styles.noCourse}>Not assigned</span>}</td>
                    <td data-label="Status"><span className={`${styles.status} ${styles[`studentStatus_${student.status}`]}`}>{student.status}</span></td>
                    <td className={styles.rowActions}><button type="button" className={styles.viewButton} onClick={() => setSelected(student)}>View student</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!filtered.length ? <div className={styles.empty}>No current students match these filters.</div> : null}
        </div>
      </section>

      {selected ? <CurrentStudentDetail student={selected} onClose={() => setSelected(null)} /> : null}
    </>
  )
}

function Modal({ children, label, onClose }) {
  return <><button type="button" className={styles.backdrop} onClick={onClose} aria-label={label} /><aside className={styles.detailPanel}>{children}</aside></>
}

function CurrentStudentDetail({ student, onClose }) {
  const enrollment = currentEnrollment(student)
  const used = sumMinutes(enrollment?.class_sessions)
  return (
    <Modal label="Close student details" onClose={onClose}>
      <div className={styles.detailHeader}><div><span className={styles.eyebrow}>Current student</span><h2>{student.full_name}</h2><p>{student.contact_email || 'No contact email provided'}</p></div><button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">×</button></div>
      <div className={styles.detailActions}>
        <Link
          href={`/admin/student-preview/${student.id}`}
          className={styles.previewLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          View student portal ↗
        </Link>
        <span className={styles.previewHint}>Read-only. Opens in a new tab.</span>
      </div>
      <div className={styles.detailMeta}><div><span>Program</span><strong>{CURRENT_STUDENT_PROGRAMS[student.program] || student.program || 'Not assigned'}</strong></div><div><span>Status</span><strong>{student.status}</strong></div><div><span>Portal ID</span><strong>{student.student_portal_accounts?.[0]?.portal_id || 'Not created'}</strong></div></div>
      <section className={styles.detailSection}><span className={styles.eyebrow}>Course</span><h3>{enrollment?.course_plans?.name || 'No plan assigned'}</h3>{enrollment ? <div className={styles.detailList}><p><span>Hours used</span><strong>{formatHours(used)}</strong></p><p><span>{enrollment.course_plans?.allow_overage ? 'Minimum hours' : 'Allocated hours'}</span><strong>{formatHours(enrollment.allocated_minutes)}</strong></p>{(enrollment.student_hour_allocations || []).map((item) => <p key={item.id}><span>{item.label}</span><strong>{formatHours(item.allocated_minutes)}</strong></p>)}</div> : null}</section>
      <StudentProjectFields currentStudent={student} />
      <MentorAssignments currentStudent={student} />
      <StudentCourseHours currentStudent={student} />
      <SessionNotesManager
        enrollmentId={enrollment?.id}
        mentors={student.student_mentor_assignments}
      />
      <StudentPortalAccess currentStudent={student} />
      <StudentFiles currentStudent={student} />
    </Modal>
  )
}
