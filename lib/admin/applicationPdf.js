import { readFile } from 'node:fs/promises'
import path from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { getSchema } from '../forms/schema.js'
import { PROGRAM_LABELS, STATUS_LABELS, studentEmail, studentName } from './stages.js'

const PAGE = { width: 612, height: 792, margin: 52 }
const COLORS = {
  navy: rgb(0.012, 0.145, 0.424),
  blue: rgb(0.145, 0.255, 0.698),
  text: rgb(0.105, 0.105, 0.105),
  muted: rgb(0.39, 0.43, 0.5),
  line: rgb(0.88, 0.9, 0.93),
  soft: rgb(0.965, 0.972, 0.98),
}

let unicodeFontBytesPromise

function loadUnicodeFontBytes() {
  if (!unicodeFontBytesPromise) {
    unicodeFontBytesPromise = readFile(path.join(
      process.cwd(),
      'public',
      'fonts',
      'YondeSansSC-Regular.ttf'
    ))
  }
  return unicodeFontBytesPromise
}

function safeText(value) {
  if (Array.isArray(value)) value = value.join(', ')
  if (value === true) value = 'Yes'
  if (value === false) value = 'No'
  if (value === null || value === undefined || value === '') value = 'Not provided'

  return String(value)
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
}

function splitLongToken(token, font, size, maxWidth) {
  const characters = Array.from(token)
  const chunks = []
  let start = 0

  while (start < characters.length) {
    let end = start + 1
    while (
      end < characters.length &&
      font.widthOfTextAtSize(characters.slice(start, end + 1).join(''), size) <= maxWidth
    ) {
      end += 1
    }
    chunks.push(characters.slice(start, end).join(''))
    start = end
  }
  return chunks
}

function wrapText(text, font, size, maxWidth) {
  const lines = []
  for (const paragraph of safeText(text).split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }

    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate
      } else {
        if (current) lines.push(current)
        const chunks = splitLongToken(word, font, size, maxWidth)
        lines.push(...chunks.slice(0, -1))
        current = chunks.at(-1) || ''
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

export async function createApplicationPdf(application) {
  const document = await PDFDocument.create()
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const dynamicText = [
    studentName(application),
    studentEmail(application),
    ...Object.values(application.form_data || {}),
  ].map(safeText).join('\n')
  const needsUnicodeFont = /[^\x20-\x7E\n]/.test(dynamicText)
  let contentFont = regular

  if (needsUnicodeFont) {
    document.registerFontkit(fontkit)
    // fontkit's CJK subsetting corrupts mixed Latin/CJK glyph mappings here.
    // Embed the pre-instanced regular-weight font directly for correct output.
    contentFont = await document.embedFont(await loadUnicodeFontBytes())
  }
  const schema = getSchema(application.program)
  const contentWidth = PAGE.width - PAGE.margin * 2
  let page
  let y

  function addPage() {
    page = document.addPage([PAGE.width, PAGE.height])
    y = PAGE.height - PAGE.margin
    page.drawText('YondeLabs', { x: PAGE.margin, y, size: 18, font: bold, color: COLORS.navy })
    page.drawText('Application Profile', { x: PAGE.margin, y: y - 19, size: 9, font: bold, color: COLORS.blue })
    page.drawLine({ start: { x: PAGE.margin, y: y - 32 }, end: { x: PAGE.width - PAGE.margin, y: y - 32 }, thickness: 1, color: COLORS.line })
    y -= 54
  }

  function ensureSpace(height) {
    if (y - height < 58) addPage()
  }

  function drawLines(lines, { font = regular, size = 10, color = COLORS.text, lineHeight = 14, indent = 0 } = {}) {
    for (const line of lines) {
      ensureSpace(lineHeight)
      page.drawText(line || ' ', { x: PAGE.margin + indent, y, size, font, color })
      y -= lineHeight
    }
  }

  function drawMeta(label, value, x, width) {
    page.drawText(label.toUpperCase(), { x, y, size: 7.5, font: bold, color: COLORS.muted })
    const lines = wrapText(value, bold, 10, width)
    lines.slice(0, 2).forEach((line, index) => {
      page.drawText(line, { x, y: y - 15 - index * 13, size: 10, font: bold, color: COLORS.text })
    })
  }

  addPage()
  drawLines(wrapText(studentName(application), contentFont, 24, contentWidth), { font: contentFont, size: 24, color: COLORS.navy, lineHeight: 31 })
  y -= 6
  drawLines(wrapText(studentEmail(application), regular, 10, contentWidth), { size: 10, color: COLORS.muted, lineHeight: 14 })
  y -= 17

  const metaTop = y
  page.drawRectangle({ x: PAGE.margin, y: y - 58, width: contentWidth, height: 70, color: COLORS.soft })
  y = metaTop
  drawMeta('Program', PROGRAM_LABELS[application.program] || application.program, PAGE.margin + 14, 145)
  drawMeta('Status', STATUS_LABELS[application.status] || application.status, PAGE.margin + 186, 120)
  drawMeta('Submitted', new Date(application.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), PAGE.margin + 340, 140)
  y = metaTop - 82

  const sections = schema?.steps || [{
    id: 'submitted-form',
    title: 'Submitted form',
    fields: Object.keys(application.form_data || {}).map((id) => ({ id, label: id.replaceAll('_', ' ') })),
  }]

  for (const section of sections) {
    ensureSpace(44)
    page.drawText(safeText(section.title), { x: PAGE.margin, y, size: 15, font: bold, color: COLORS.navy })
    y -= 10
    page.drawLine({ start: { x: PAGE.margin, y }, end: { x: PAGE.width - PAGE.margin, y }, thickness: 1.2, color: COLORS.blue })
    y -= 22

    for (const field of section.fields) {
      const questionLines = wrapText(field.label, bold, 9, contentWidth)
      const answerLines = wrapText(application.form_data?.[field.id], contentFont, 10, contentWidth - 12)
      ensureSpace(questionLines.length * 12 + Math.max(answerLines.length, 1) * 15 + 20)
      drawLines(questionLines, { font: bold, size: 9, color: COLORS.muted, lineHeight: 12 })
      y -= 3
      drawLines(answerLines, { font: contentFont, size: 10, color: COLORS.text, lineHeight: 15, indent: 12 })
      y -= 13
    }
    y -= 4
  }

  const pages = document.getPages()
  pages.forEach((pdfPage, index) => {
    const footer = `Application ${safeText(application.id)}  |  Page ${index + 1} of ${pages.length}`
    pdfPage.drawLine({ start: { x: PAGE.margin, y: 42 }, end: { x: PAGE.width - PAGE.margin, y: 42 }, thickness: 0.7, color: COLORS.line })
    pdfPage.drawText(footer, { x: PAGE.margin, y: 27, size: 7.5, font: regular, color: COLORS.muted })
  })

  document.setTitle(`${studentName(application)} - YondeLabs Application`)
  document.setAuthor('YondeLabs Admissions')
  document.setCreator('YondeLabs Admin')
  return document.save()
}

export function applicationPdfFilename(application) {
  const name = safeText(studentName(application)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'student'
  return `${name}-${application.program}-application.pdf`
}
