import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { PROGRAM_LABELS } from './stages.js'

const PAGE = { width: 612, height: 792, margin: 58 }
const COLOR = { text: rgb(0.12, 0.12, 0.14), muted: rgb(0.38, 0.41, 0.47), line: rgb(0.84, 0.86, 0.89) }

function ascii(value) {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\n]/g, '')
}

function wrap(text, font, size, width) {
  const lines = []
  for (const paragraph of ascii(text).split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) { lines.push(''); continue }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate
      else { if (line) lines.push(line); line = word }
    }
    if (line) lines.push(line)
  }
  return lines
}

function displayDate(isoDate) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

function detailsFor(program, data) {
  const common = [
    ['Program', data.programName],
    ['Format', data.format],
  ]
  if (program === 'ra') return [...common, ['Location', data.location], ['Duration', data.programPeriod]]
  if (program === 'irp') return [
    ...common,
    ['Research Area', data.projectFocus],
    ['Mentorship', `Minimum ${data.minimumHours} hours${data.sessionCount ? `, typically ${data.sessionCount} sessions` : ''}`],
    ['Program Period', data.programPeriod],
  ]
  if (program === 'passion-project') return [
    ...common,
    ['Project Focus', data.projectFocus],
    ['Mentorship', `Minimum ${data.minimumHours} hours${data.sessionCount ? `, typically ${data.sessionCount} sessions` : ''}`],
    ['Program Period', data.programPeriod],
  ]
  return [
    ...common,
    ['Project Focus', data.projectFocus],
    ['Track 1', `${data.trackOneName} - ${data.trackOneHours} hours; ${data.trackOneDeliverable}`],
    ['Track 2', `${data.trackTwoName} - ${data.trackTwoHours} hours; ${data.trackTwoDeliverable}`],
    ['Program Period', data.programPeriod],
  ]
}

function introductionFor(program, data) {
  if (program === 'ra') {
    return `Congratulations! On behalf of Yonde Labs, we are pleased to offer you a place in the ${data.programName}. This personalized research placement is designed to give you meaningful exposure to an active academic research environment.`
  }
  if (program === 'irp') {
    return `Congratulations! On behalf of Yonde Labs, we are pleased to offer you a place in our Independent Research Scholar Program. Your customized project will provide structured, one-on-one mentorship as you develop a rigorous research project in ${data.projectFocus}.`
  }
  if (program === 'passion-project') {
    return `Congratulations! On behalf of Yonde Labs, we are pleased to offer you a place in our Passion Project Program. Your customized project will combine guided exploration, skill development, and a tangible final outcome focused on ${data.projectFocus}.`
  }
  return `Congratulations! On behalf of Yonde Labs, we are pleased to offer you a place in our Portfolio Project Program. Through personalized mentorship, you will build a polished project focused on ${data.projectFocus} that demonstrates both your process and your final work.`
}

export async function createOfferLetterPdf(application, data) {
  const document = await PDFDocument.create()
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const logoBytes = await readFile(path.join(process.cwd(), 'public', 'images', 'logos', 'yondelabs-logo.png'))
  const logo = await document.embedPng(logoBytes)
  const contentWidth = PAGE.width - PAGE.margin * 2
  let page
  let y

  function addPage() {
    page = document.addPage([PAGE.width, PAGE.height])
    y = PAGE.height - 48
    page.drawImage(logo, { x: PAGE.margin, y: y - 42, width: 42, height: 42 })
    page.drawText('YONDE LABS', { x: PAGE.margin + 54, y: y - 14, size: 15, font: bold, color: COLOR.text })
    page.drawText('Beyond what you know', { x: PAGE.margin + 54, y: y - 29, size: 8.5, font: regular, color: COLOR.muted })
    page.drawLine({ start: { x: PAGE.margin, y: y - 52 }, end: { x: PAGE.width - PAGE.margin, y: y - 52 }, thickness: 0.8, color: COLOR.line })
    y -= 82
  }

  function ensure(height) { if (y - height < 62) addPage() }

  function paragraph(text, options = {}) {
    const size = options.size || 10.5
    const font = options.bold ? bold : regular
    const lineHeight = options.lineHeight || 15.5
    const lines = wrap(text, font, size, contentWidth - (options.indent || 0))
    ensure(lines.length * lineHeight + (options.after ?? 12))
    for (const line of lines) {
      page.drawText(line || ' ', { x: PAGE.margin + (options.indent || 0), y, size, font, color: options.color || COLOR.text })
      y -= lineHeight
    }
    y -= options.after ?? 12
  }

  addPage()
  paragraph(displayDate(data.offerDate), { after: 20 })
  paragraph(`Dear ${data.studentName},`, { after: 16 })
  paragraph(introductionFor(application.program, data), { after: 15 })

  paragraph('Program Details', { bold: true, size: 12.5, after: 8 })
  for (const [label, value] of detailsFor(application.program, data)) {
    paragraph(`${label}: ${value}`, { indent: 12, after: 4 })
  }
  y -= 8

  paragraph('Your mentor will work with you to establish clear milestones, provide regular feedback, and adapt the project plan as your interests and progress develop.', { after: 15 })
  if (application.program === 'irp' && data.campusVisit) {
    paragraph(`The program may also include an optional one- to two-day campus visit to ${data.university}, subject to availability and separate scheduling.`, { after: 15 })
  }

  paragraph('Next Steps', { bold: true, size: 12.5, after: 8 })
  const nextSteps = [
    'Please reply to the offer email within two weeks to confirm that you would like to accept this place.',
    'After confirmation, we will send the enrollment agreement to your parent or guardian for review and signature.',
    'Your place is secured after the enrollment agreement is completed and the program invoice is paid.',
  ]
  nextSteps.forEach((step, index) => paragraph(`${index + 1}. ${step}`, { indent: 12, after: 5 }))
  y -= 8
  paragraph('We are excited about the possibility of supporting your work and look forward to welcoming you to Yonde Labs.', { after: 19 })
  paragraph('Warm regards,', { after: 5 })
  paragraph('Yonde Labs', { bold: true, after: 2 })
  paragraph('info@yondelabs.com', { color: COLOR.muted, after: 0 })

  const pages = document.getPages()
  pages.forEach((pdfPage, index) => {
    pdfPage.drawLine({ start: { x: PAGE.margin, y: 42 }, end: { x: PAGE.width - PAGE.margin, y: 42 }, thickness: 0.6, color: COLOR.line })
    pdfPage.drawText(`Yonde Labs | Offer Letter | Page ${index + 1} of ${pages.length}`, { x: PAGE.margin, y: 27, size: 7.5, font: regular, color: COLOR.muted })
  })

  document.setTitle(`${data.studentName} - ${PROGRAM_LABELS[application.program] || application.program} Offer Letter`)
  document.setAuthor('Yonde Labs')
  document.setCreator('Yonde Admin')
  return document.save()
}

export function offerLetterFilename(application, data) {
  const name = ascii(data.studentName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'student'
  return `${name}-${application.program}-offer-letter.pdf`
}
