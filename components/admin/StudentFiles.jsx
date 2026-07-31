import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  STUDENT_FILE_ACCEPT,
  STUDENT_FILES_BUCKET,
  formatFileSize,
  safeStorageFilename,
  validateStudentFile,
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

function planName(enrollment) {
  return enrollment.course_plans?.name || 'Assigned course'
}

export default function StudentFiles({ application }) {
  const inputRef = useRef(null)
  const [enrollments, setEnrollments] = useState([])
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [visible, setVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const loadFiles = useCallback(async () => {
    if (!application?.id) return
    const { data, error: loadError } = await supabase
      .from('student_course_enrollments')
      .select('id, status, created_at, course_plans(name), student_files(*)')
      .eq('application_id', application.id)
      .order('created_at', { ascending: false })

    if (loadError) throw loadError
    const rows = (data || []).map((enrollment) => ({
      ...enrollment,
      student_files: [...(enrollment.student_files || [])]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    }))
    setEnrollments(rows)
    setSelectedEnrollmentId((current) => (
      rows.some((item) => item.id === current)
        ? current
        : (rows.find((item) => item.status === 'active')?.id || rows[0]?.id || '')
    ))
  }, [application?.id])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    loadFiles()
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Unable to load student files.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadFiles])

  const enrollment = enrollments.find((item) => item.id === selectedEnrollmentId)
  const files = enrollment?.student_files || []

  async function uploadFile(event) {
    event.preventDefault()
    const validationError = validateStudentFile(selectedFile)
    if (validationError) {
      setError(validationError)
      return
    }
    if (!enrollment) {
      setError('Assign a course before uploading student files.')
      return
    }

    setUploading(true)
    setError('')
    const path = `${application.user_id}/${enrollment.id}/${crypto.randomUUID()}-${safeStorageFilename(selectedFile.name)}`

    try {
      const { error: storageError } = await supabase.storage
        .from(STUDENT_FILES_BUCKET)
        .upload(path, selectedFile, {
          cacheControl: '3600',
          contentType: selectedFile.type,
          upsert: false,
        })
      if (storageError) throw storageError

      const { error: metadataError } = await supabase.from('student_files').insert({
        enrollment_id: enrollment.id,
        title: title.trim() || selectedFile.name,
        description: description.trim() || null,
        storage_path: path,
        original_filename: selectedFile.name,
        mime_type: selectedFile.type,
        size_bytes: selectedFile.size,
        visible_to_student: visible,
      })
      if (metadataError) {
        await supabase.storage.from(STUDENT_FILES_BUCKET).remove([path])
        throw metadataError
      }

      setTitle('')
      setDescription('')
      setSelectedFile(null)
      setVisible(true)
      if (inputRef.current) inputRef.current.value = ''
      await loadFiles()
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to upload the file.')
    } finally {
      setUploading(false)
    }
  }

  async function downloadFile(file) {
    setBusyId(file.id)
    setError('')
    const { data, error: signedUrlError } = await supabase.storage
      .from(STUDENT_FILES_BUCKET)
      .createSignedUrl(file.storage_path, 60, { download: file.original_filename })
    if (signedUrlError) {
      setError(signedUrlError.message || 'Unable to prepare the download.')
    } else {
      window.location.assign(data.signedUrl)
    }
    setBusyId(null)
  }

  async function toggleVisibility(file) {
    setBusyId(file.id)
    setError('')
    const { error: updateError } = await supabase
      .from('student_files')
      .update({
        visible_to_student: !file.visible_to_student,
        updated_at: new Date().toISOString(),
      })
      .eq('id', file.id)
    if (updateError) setError(updateError.message || 'Unable to update file visibility.')
    else await loadFiles()
    setBusyId(null)
  }

  async function deleteFile(file) {
    if (!window.confirm(`Delete “${file.title}”? The student will lose access immediately.`)) return
    setBusyId(file.id)
    setError('')
    const { error: storageError } = await supabase.storage
      .from(STUDENT_FILES_BUCKET)
      .remove([file.storage_path])
    if (storageError) {
      setError(storageError.message || 'Unable to remove the stored file.')
      setBusyId(null)
      return
    }
    const { error: deleteError } = await supabase
      .from('student_files')
      .delete()
      .eq('id', file.id)
    if (deleteError) setError(deleteError.message || 'Unable to remove the file record.')
    else await loadFiles()
    setBusyId(null)
  }

  return (
    <section className={styles.adminSection}>
      <div className={styles.heading}>
        <div>
          <span>Student resources</span>
          <h3>Files and materials</h3>
        </div>
        {enrollments.length > 1 ? (
          <select
            value={selectedEnrollmentId}
            onChange={(event) => setSelectedEnrollmentId(event.target.value)}
            aria-label="Choose course enrollment"
          >
            {enrollments.map((item) => (
              <option value={item.id} key={item.id}>
                {planName(item)} · {item.status}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {loading ? <p className={styles.muted}>Loading files…</p> : null}
      {!loading && !enrollments.length ? (
        <div className={styles.emptyAdmin}>
          Assign a course plan before uploading files for this student.
        </div>
      ) : null}

      {enrollment ? (
        <>
          <form className={styles.uploadForm} onSubmit={uploadFile}>
            <label>
              <span>File</span>
              <input
                ref={inputRef}
                type="file"
                accept={STUDENT_FILE_ACCEPT}
                onChange={(event) => {
                  const file = event.target.files?.[0] || null
                  setSelectedFile(file)
                  if (file && !title) setTitle(file.name.replace(/\.[^.]+$/, ''))
                }}
                required
              />
              <small>PDF, image, text, Word, Excel, or PowerPoint · maximum 20 MB</small>
            </label>
            <label>
              <span>Display title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Research paper template"
                maxLength={160}
              />
            </label>
            <label className={styles.descriptionField}>
              <span>Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional instructions for the student"
                rows={2}
                maxLength={1000}
              />
            </label>
            <label className={styles.visibilityField}>
              <input
                type="checkbox"
                checked={visible}
                onChange={(event) => setVisible(event.target.checked)}
              />
              <span>Visible to student immediately</span>
            </label>
            <button type="submit" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload file'}
            </button>
          </form>

          <div className={styles.adminList}>
            {files.map((file) => (
              <article key={file.id} className={styles.adminFile}>
                <div className={styles.fileIcon} aria-hidden>{file.original_filename.split('.').pop()?.slice(0, 4) || 'FILE'}</div>
                <div className={styles.fileCopy}>
                  <strong>{file.title}</strong>
                  <span>{file.original_filename} · {formatFileSize(file.size_bytes)} · {formatDate(file.created_at)}</span>
                  {file.description ? <p>{file.description}</p> : null}
                </div>
                <span className={file.visible_to_student ? styles.visibleBadge : styles.hiddenBadge}>
                  {file.visible_to_student ? 'Visible' : 'Hidden'}
                </span>
                <div className={styles.adminActions}>
                  <button type="button" disabled={busyId === file.id} onClick={() => downloadFile(file)}>Download</button>
                  <button type="button" disabled={busyId === file.id} onClick={() => toggleVisibility(file)}>
                    {file.visible_to_student ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" className={styles.deleteButton} disabled={busyId === file.id} onClick={() => deleteFile(file)}>Delete</button>
                </div>
              </article>
            ))}
            {!files.length ? <div className={styles.emptyAdmin}>No files uploaded for this course yet.</div> : null}
          </div>
        </>
      ) : null}

      {error ? <div className={styles.error}>{error}</div> : null}
    </section>
  )
}
