import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  STUDENT_FILES_BUCKET,
  formatFileSize,
} from '../../lib/studentFiles'
import styles from '../../styles/studentFiles.module.css'

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function StudentFiles({ applicationId, showEmpty = false }) {
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!applicationId) return undefined
    let active = true

    async function loadFiles() {
      setLoading(true)
      setError('')
      const { data, error: loadError } = await supabase
        .from('student_course_enrollments')
        .select('id, status, created_at, course_plans(name), student_files(*)')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })

      if (!active) return
      if (loadError) {
        setError('Files are temporarily unavailable. Please try again later.')
        setEnrollments([])
      } else {
        setEnrollments(data || [])
      }
      setLoading(false)
    }

    loadFiles()
    return () => {
      active = false
    }
  }, [applicationId])

  const files = useMemo(() => (
    enrollments
      .flatMap((enrollment) => (enrollment.student_files || []).map((file) => ({
        ...file,
        courseName: enrollment.course_plans?.name || 'Your course',
      })))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  ), [enrollments])

  async function downloadFile(file) {
    setBusyId(file.id)
    setError('')
    const { data, error: signedUrlError } = await supabase.storage
      .from(STUDENT_FILES_BUCKET)
      .createSignedUrl(file.storage_path, 60, { download: file.original_filename })

    if (signedUrlError) {
      setError('We could not prepare this download. Please try again.')
    } else {
      window.location.assign(data.signedUrl)
    }
    setBusyId(null)
  }

  if (loading) {
    return showEmpty ? (
      <section className={`${styles.studentSection} ${styles.studentPageState}`}>
        <span className={styles.studentStateMark} aria-hidden />
        <h2>Loading your files</h2>
        <p>We are checking for materials shared with your account.</p>
      </section>
    ) : null
  }

  if (!enrollments.length) {
    return showEmpty ? (
      <section className={`${styles.studentSection} ${styles.studentPageState}`}>
        <span className={styles.studentStateMark} aria-hidden />
        <h2>{error ? 'Files temporarily unavailable' : 'No course files yet'}</h2>
        <p>
          {error || 'Once you are enrolled, documents shared by your admin or mentor will be available on this page.'}
        </p>
      </section>
    ) : null
  }

  return (
    <section className={styles.studentSection}>
      <div className={styles.studentHeading}>
        <div>
          <span>Course resources</span>
          <h2>Files and materials</h2>
          <p>Documents, templates, and feedback shared with you by the Yonde Labs team.</p>
        </div>
        <span className={styles.studentCount} aria-label={`${files.length} files`}>
          {files.length}
        </span>
      </div>

      {files.length ? (
        <div className={styles.studentList}>
          {files.map((file) => (
            <article className={styles.studentFile} key={file.id}>
              <div className={styles.fileIcon} aria-hidden>
                {file.original_filename.split('.').pop()?.slice(0, 4) || 'FILE'}
              </div>
              <div className={styles.fileCopy}>
                <strong>{file.title}</strong>
                <span>
                  {file.courseName} · {formatFileSize(file.size_bytes)} · Shared {formatDate(file.created_at)}
                </span>
                {file.description ? <p>{file.description}</p> : null}
              </div>
              <button
                type="button"
                disabled={busyId === file.id}
                onClick={() => downloadFile(file)}
              >
                {busyId === file.id ? 'Preparing…' : 'Download'}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.studentEmpty}>
          Your course is active. Files shared by your admin or mentor will appear here.
        </div>
      )}

      {error ? <div className={styles.error}>{error}</div> : null}
    </section>
  )
}
