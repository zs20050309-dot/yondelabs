export const STUDENT_FILES_BUCKET = 'student-files'
export const MAX_STUDENT_FILE_BYTES = 20 * 1024 * 1024

export const ACCEPTED_STUDENT_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

export const STUDENT_FILE_ACCEPT = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
].join(',')

export function formatFileSize(bytes) {
  if (!Number.isFinite(Number(bytes))) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function safeStorageFilename(filename) {
  const extension = filename.includes('.') ? `.${filename.split('.').pop().toLowerCase()}` : ''
  const stem = filename
    .slice(0, extension ? -extension.length : undefined)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'file'
  return `${stem}${extension}`
}

export function validateStudentFile(file) {
  if (!file) return 'Choose a file to upload.'
  if (file.size <= 0) return 'The selected file is empty.'
  if (file.size > MAX_STUDENT_FILE_BYTES) return 'Files must be 20 MB or smaller.'
  if (!ACCEPTED_STUDENT_FILE_TYPES.includes(file.type)) {
    return 'Use a PDF, image, text, Word, Excel, or PowerPoint file.'
  }
  return ''
}
