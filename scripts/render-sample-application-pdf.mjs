import { mkdir, writeFile } from 'node:fs/promises'
import { createApplicationPdf } from '../lib/admin/applicationPdf.js'

const sample = {
  id: '00000000-0000-4000-8000-000000000001',
  program: 'ra',
  status: 'submitted',
  submitted_at: '2026-07-17T08:30:00.000Z',
  contact_email: 'sample.student@example.com',
  form_data: {
    full_name: 'Sample Student',
    preferred_name: 'Sam',
    gender: 'Prefer not to answer',
    birthdate: '2008-04-12',
    school: 'International Academy',
    grade: '11th',
    graduation_year: '2027',
    email: 'sample.student@example.com',
    messaging_platform: 'WhatsApp: +1 555 0100',
    country_of_residence: 'United States',
    citizenship: 'United States',
    city: 'Boston',
    timezone: 'EST',
    cohort: '2026 Summer Cohort',
    intended_period: 'July 1 - July 28, 2026',
    research_area: ['Computer Science / Artificial Intelligence', 'Biology / Life Sciences'],
    specific_interests: 'I am interested in using machine learning to identify patterns in biological data and to understand how computational tools can support earlier disease detection.',
    why_interested: 'This area combines my strongest academic interests. I enjoy programming, but I also want the work I do to answer meaningful scientific questions and contribute to practical outcomes.',
    why_fit: 'I am consistent, curious, and comfortable revising my work after feedback. Through a school data project, I learned how important careful documentation and clear communication are when a project develops over several weeks.',
    gpa: '3.9 / 4.0',
    standardized_tests: 'SAT 1480',
    how_heard: 'School counselor',
    us_visa: 'Yes',
    preferred_university_lab: 'A computational biology or biomedical engineering lab',
    english_proficiency: 'Fluent',
    parent_name: 'Sample Parent',
    parent_email: 'sample.parent@example.com',
    additional_notes: 'Available on weekday afternoons and flexible on weekends.',
  },
}

await mkdir('tmp/pdfs', { recursive: true })
const bytes = await createApplicationPdf(sample)
await writeFile('tmp/pdfs/sample-application.pdf', bytes)
console.log(`Generated tmp/pdfs/sample-application.pdf (${bytes.length} bytes)`)
