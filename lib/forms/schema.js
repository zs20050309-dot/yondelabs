// Single source of truth for all three application forms (RA / IRP / PP).
// The wizard, validators, draft persistence, and admin renderer all read from here.
//
// Field shape:
//   {
//     id: snake_case key written into applications.form_data
//     label: question shown to student (sentence case, trimmed)
//     helper?: secondary hint shown under the label
//     type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date'
//     required: boolean
//     options?: string[]                     // for select/radio/checkbox
//     optionsRef?: 'countries'               // shared option set; resolved at render time
//     prefillFromAuth?: 'email'              // pre-populate from supabase auth user
//   }

import { COUNTRIES } from './countries'

const GRADE_OPTIONS = [
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
  'University - First Year',
  'University - Second Year',
  'University - Third Year',
  'University - Fourth Year',
  "Master's Student",
  'PhD Student',
  'Post University (e.g. currently working)',
  'Other',
]

const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to answer', 'Other']

const RESEARCH_AREA_OPTIONS = [
  'Computer Science / Artificial Intelligence',
  'Engineering (Mechanical, Electrical, etc.)',
  'Biology / Life Sciences',
  'Chemistry',
  'Physics & Astronomy',
  'Environmental Science / Sustainability',
  'Economics / Business',
  'Psychology / Cognitive Science',
  'Interdisciplinary (e.g., AI + Biology, AI + Society)',
]

const ENGLISH_PROFICIENCY_OPTIONS = [
  'Native / Near-native fluency (I can communicate naturally in English with ease across both academic and informal settings.)',
  'Fluent (I can communicate effectively and understand complex discussions, though I may occasionally search for words or phrases.)',
  'Intermediate (I can understand and respond in everyday situations, but may find research discussions or long explanations challenging.)',
  'Basic (I am still developing my English skills and may need support for research communication.)',
]

// Shared "Basic info" step used by RA and IRP (identical 13 questions).
const SHARED_BASIC_FIELDS = [
  { id: 'full_name', label: 'What is your full legal name?', type: 'text', required: true },
  { id: 'preferred_name', label: 'What is your preferred first name?', type: 'text', required: true },
  { id: 'gender', label: 'What gender do you most identify with?', type: 'select', required: false, options: GENDER_OPTIONS },
  { id: 'birthdate', label: 'What is your birthdate?', type: 'date', required: false },
  { id: 'school', label: 'What is your current or most recent school or university?', type: 'text', required: true },
  { id: 'grade', label: 'Which grade are you in?', type: 'select', required: false, options: GRADE_OPTIONS },
  { id: 'graduation_year', label: 'What year will you graduate from your current school?', type: 'text', required: false, placeholder: 'e.g. 2027' },
  { id: 'email', label: 'What is your email address?', type: 'text', required: true, prefillFromAuth: 'email' },
  { id: 'messaging_platform', label: 'What is your preferred messaging platform?', type: 'text', required: true, helper: 'e.g. WeChat, WhatsApp, iMessage — include your handle.' },
  { id: 'country_of_residence', label: 'Which country do you currently live in?', type: 'select', required: false, optionsRef: 'countries' },
  { id: 'citizenship', label: 'Which country are you a citizen of?', type: 'select', required: false, optionsRef: 'countries' },
  { id: 'city', label: 'Which city do you currently live in?', type: 'text', required: true },
  { id: 'timezone', label: 'What is your current timezone?', type: 'text', required: true, placeholder: 'e.g. UTC+8, EST, PST' },
]

const RA_SCHEMA = {
  program: 'ra',
  title: 'In-Person Research Assistant — Application',
  shortTitle: 'RA',
  steps: [
    {
      id: 'basic',
      title: 'Basic info',
      description: 'Tell us a bit about yourself so we can get in touch.',
      fields: SHARED_BASIC_FIELDS,
    },
    {
      id: 'academic',
      title: 'Academic & research interest',
      description: 'What you want to work on and why.',
      fields: [
        {
          id: 'cohort',
          label: 'Which cohort are you applying for?',
          type: 'radio',
          required: false,
          options: ['2026 Summer Cohort', '2026 Fall Cohort'],
        },
        {
          id: 'intended_period',
          label: 'What is your intended time period to complete our 4-week in-person research program?',
          type: 'text',
          required: true,
          placeholder: 'e.g. July 1 – July 28, 2026',
        },
        {
          id: 'research_area',
          label: 'Which general research area are you most interested in?',
          helper: 'Select all that apply — our team will match you with a suitable PhD lab.',
          type: 'checkbox',
          required: false,
          options: RESEARCH_AREA_OPTIONS,
        },
        {
          id: 'specific_interests',
          label: 'Please tell us more about your specific research interests.',
          type: 'textarea',
          required: false,
        },
        {
          id: 'why_interested',
          label: 'Why are you interested in the above area(s) of research?',
          type: 'textarea',
          required: false,
        },
        {
          id: 'why_fit',
          label: 'Why do you want to join the Yonde Research Scholar Program, and what makes you a strong fit for it?',
          type: 'textarea',
          required: false,
        },
      ],
    },
    {
      id: 'credentials',
      title: 'Background',
      description: 'A snapshot of your academic record.',
      fields: [
        {
          id: 'gpa',
          label: 'What is your most recent GPA, grade, or percentage?',
          helper: 'E.g. report GPA, IB score, A-level grades, percentile.',
          type: 'text',
          required: true,
        },
        {
          id: 'standardized_tests',
          label: 'If completed, please report your standardized test scores.',
          type: 'text',
          required: false,
          placeholder: 'e.g. SAT 1500, TOEFL 110',
        },
        {
          id: 'how_heard',
          label: 'How did you hear about Yonde Labs?',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      id: 'logistics',
      title: 'Logistics',
      description: 'Practical details for the in-person program.',
      fields: [
        {
          id: 'us_visa',
          label: 'Do you currently hold a valid U.S. visa or legal status that allows you to enter or stay in the United States?',
          type: 'radio',
          required: false,
          options: ['Yes', 'No'],
        },
        {
          id: 'preferred_university_lab',
          label: 'Do you have any particular university or lab you’re especially interested in?',
          type: 'text',
          required: true,
        },
        {
          id: 'english_proficiency',
          label: 'How would you describe your English proficiency, especially in communication and academic settings?',
          type: 'radio',
          required: false,
          options: ENGLISH_PROFICIENCY_OPTIONS,
        },
      ],
    },
    {
      id: 'guardian',
      title: 'Guardian & notes',
      description: 'Parent or guardian contact, plus anything else we should know.',
      fields: [
        { id: 'parent_name', label: 'What is your parent or guardian’s full name?', type: 'text', required: true },
        { id: 'parent_email', label: 'What is your parent or guardian’s email address?', type: 'text', required: true },
        { id: 'additional_notes', label: 'Anything else we should know?', helper: 'Optional — share anything you’d like our admissions team to consider.', type: 'textarea', required: false },
      ],
    },
  ],
}

const IRP_SCHEMA = {
  program: 'irp',
  title: 'Independent Research Program — Application',
  shortTitle: 'IRP',
  steps: [
    {
      id: 'basic',
      title: 'Basic info',
      description: 'Tell us a bit about yourself so we can get in touch.',
      fields: SHARED_BASIC_FIELDS,
    },
    {
      id: 'research',
      title: 'Research direction',
      description: 'The shape of the project you want to take on.',
      fields: [
        {
          id: 'target_major',
          label: 'What is your target college application major or field?',
          type: 'text',
          required: true,
        },
        {
          id: 'research_area',
          label: 'Which research area are you most interested in?',
          helper: 'Select all that apply.',
          type: 'checkbox',
          required: false,
          options: RESEARCH_AREA_OPTIONS,
        },
        {
          id: 'specific_interests',
          label: 'Tell us more about your specific research interests.',
          type: 'textarea',
          required: false,
        },
        {
          id: 'why_interested',
          label: 'Why are you interested in the above area(s) of research?',
          type: 'textarea',
          required: false,
        },
      ],
    },
    {
      id: 'commitment',
      title: 'Background & commitment',
      description: 'Where you are starting from and how you plan to invest your time.',
      fields: [
        {
          id: 'prior_background',
          label: 'Do you have any prior background in your area of interest?',
          type: 'radio',
          required: false,
          options: [
            'No background — I’m starting from scratch',
            'Some background — I’ve taken relevant courses or done some reading',
            'Strong background — I have prior research or project experience in this area',
          ],
        },
        {
          id: 'time_commitment',
          label: 'How much time can you realistically commit to this project outside of your class sessions each week?',
          type: 'radio',
          required: false,
          options: [
            '1–3 hours',
            '3–5 hours',
            '5+ hours',
            'It depends on the week — I’ll commit what it takes',
          ],
        },
        {
          id: 'project_goal',
          label: 'What are you hoping to get out of this research project?',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      id: 'credentials',
      title: 'Academic record',
      description: 'A snapshot of where you are academically.',
      fields: [
        {
          id: 'gpa',
          label: 'What is your most recent GPA, grade, or percentage?',
          helper: 'E.g. report GPA, IB score, A-level grades, percentile.',
          type: 'text',
          required: true,
        },
        {
          id: 'standardized_tests',
          label: 'If completed, please report your standardized test scores.',
          type: 'text',
          required: false,
          placeholder: 'e.g. SAT 1500, TOEFL 110',
        },
        {
          id: 'preferred_mentor',
          label: 'Is there a particular university, mentor background, or mentoring style you’d prefer?',
          type: 'text',
          required: false,
        },
      ],
    },
    {
      id: 'guardian',
      title: 'English & guardian',
      description: 'Final details before you submit.',
      fields: [
        {
          id: 'english_proficiency',
          label: 'How would you describe your English proficiency, especially in communication and academic settings?',
          type: 'radio',
          required: false,
          options: ENGLISH_PROFICIENCY_OPTIONS,
        },
        { id: 'parent_name', label: 'What is your parent or guardian’s full name?', type: 'text', required: true },
        { id: 'parent_email', label: 'What is your parent or guardian’s email address?', type: 'text', required: true },
        { id: 'additional_notes', label: 'Anything else we should know?', helper: 'Optional — share anything you’d like our admissions team to consider.', type: 'textarea', required: false },
      ],
    },
  ],
}

const PP_SCHEMA = {
  program: 'passion-project',
  title: 'Passion Project — Application',
  shortTitle: 'PP',
  steps: [
    {
      id: 'basic',
      title: 'Basic info',
      description: 'A few quick details so we know who you are.',
      fields: [
        { id: 'full_name', label: 'What is your full legal name?', type: 'text', required: true },
        {
          id: 'grade',
          label: 'Current grade',
          type: 'radio',
          required: false,
          options: ['9', '10', '11', '12'],
        },
        { id: 'school', label: 'School name', type: 'text', required: true },
        {
          id: 'school_type',
          label: 'School type',
          type: 'radio',
          required: false,
          options: ['International School', 'Boarding School', 'Public School', 'Private Day School'],
        },
        { id: 'email', label: 'Email address', type: 'text', required: true, prefillFromAuth: 'email' },
        {
          id: 'messaging_platform',
          label: 'What is your preferred messaging platform?',
          type: 'text',
          required: true,
          helper: 'e.g. WeChat, WhatsApp, iMessage — include your handle.',
        },
      ],
    },
    {
      id: 'academic_direction',
      title: 'Academic direction',
      description: 'Where your interests are pointing — even loosely.',
      fields: [
        {
          id: 'academic_interests',
          label: 'What academic fields are you currently interested in?',
          helper: 'Select all that apply.',
          type: 'checkbox',
          required: false,
          options: [
            'Biology / Biochemistry',
            'Environmental Science',
            'Computer Science / Data',
            'Social Science (Econ / PoliSci / Sociology, etc.)',
            'Humanities (History / Literature / Philosophy, etc.)',
            'Engineering',
            'Undecided',
          ],
        },
        {
          id: 'long_term_direction',
          label: 'Do you currently have a long-term direction in mind?',
          helper: 'E.g. pre-med, pre-law. If yes, please specify. If not, you may write "Not sure yet."',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      id: 'experience',
      title: 'Experience snapshot',
      description: 'A few experiences that represent you today.',
      fields: [
        {
          id: 'representative_experiences',
          label: 'Which 2–3 experiences best represent you?',
          type: 'textarea',
          required: false,
        },
        {
          id: 'strengths',
          label: 'What are your strengths?',
          helper: 'Pick 1–2 that fit you best.',
          type: 'checkbox',
          required: false,
          options: [
            'Academic research / reading / writing',
            'Competitions (academic or sports)',
            'Organizing events / initiatives',
            'Creative expression (music, writing, media, etc.)',
            'Leadership / teamwork',
            'Technical / data / programming',
          ],
        },
        {
          id: 'top_strength_detail',
          label: 'Among the strengths you selected, which one have you invested the most time in, and how?',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      id: 'expression',
      title: 'Interests & expression',
      description: 'How you tend to engage with the things you care about.',
      fields: [
        {
          id: 'consistent_interests',
          label: 'What activities or interests have you consistently invested time in, in or outside of school?',
          type: 'textarea',
          required: true,
        },
        {
          id: 'expression_forms',
          label: 'Which forms of expression feel most natural to you?',
          helper: 'Select all that apply.',
          type: 'checkbox',
          required: false,
          options: [
            'Writing (articles, essays, blogs)',
            'Speaking / interviewing / podcast',
            'Music / art / performance',
            'Data / analysis / visualization',
            'Building things (projects, platforms, tools)',
            'Not sure',
          ],
        },
        {
          id: 'engagement_approach',
          label: 'When you are interested in a topic, how do you usually start engaging with it?',
          helper: 'Select all that apply.',
          type: 'checkbox',
          required: false,
          options: [
            'Reading / researching',
            'Experimenting and trying things out',
            'Asking / talking to people',
            'Exploring through creative expression',
            'Not sure / depends',
          ],
        },
      ],
    },
    {
      id: 'community',
      title: 'Community & resources',
      description: 'The people and places you can already draw on.',
      fields: [
        {
          id: 'communities',
          label: 'Which communities are you currently part of?',
          helper: 'Select all that apply.',
          type: 'checkbox',
          required: false,
          options: [
            'School clubs / teams',
            'School teachers you know well',
            'Local community / NGOs',
            'Religious / cultural communities',
            'Online communities',
            'None of the above / not sure',
          ],
        },
        {
          id: 'community_roles',
          label: 'Describe 1–3 organizations or communities you are regularly involved in.',
          helper: 'What you usually do in each (specific tasks or activities are welcome), and any role you hold.',
          type: 'textarea',
          required: true,
        },
        {
          id: 'available_resources',
          label: 'Which resources could you realistically draw on right now?',
          helper: 'Select all that apply.',
          type: 'checkbox',
          required: false,
          options: [
            'A supportive teacher',
            'A club or organization you’re active in',
            'Access to people to interview',
            'A platform (school newspaper, website, social media, etc.)',
            'A physical space (farm, lab, kitchen, studio, etc.)',
            'Not sure yet',
          ],
        },
      ],
    },
    {
      id: 'project_thinking',
      title: 'Project thinking',
      description: 'Rough ideas welcome — most students start without a clear one.',
      fields: [
        {
          id: 'project_intent',
          label: 'Have you ever thought about starting your own project or initiative?',
          type: 'radio',
          required: false,
          options: [
            'Yes, I have some ideas',
            'I’ve thought about it, but not clearly',
            'Not really',
          ],
        },
        {
          id: 'rough_idea',
          label: 'If yes, briefly describe your rough idea.',
          helper: 'It doesn’t have to be polished — many students start without one.',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      id: 'commitment_pp',
      title: 'Time & commitment',
      description: 'A realistic look at how much you can take on.',
      fields: [
        {
          id: 'time_commitment_per_week',
          label: 'During the school term, approximately how much time can you commit per week?',
          type: 'radio',
          required: false,
          options: ['< 2 hours', '2–4 hours', '4–6 hours', '6+ hours'],
        },
        {
          id: 'pace_preference',
          label: 'Which working pace do you usually prefer?',
          type: 'radio',
          required: false,
          options: ['Structured milestones', 'Flexible exploration', 'A mix of both'],
        },
      ],
    },
    {
      id: 'guardian',
      title: 'Guardian',
      description: 'Parent or guardian contact.',
      fields: [
        { id: 'parent_name', label: 'What is your parent or guardian’s full name?', type: 'text', required: true },
        { id: 'parent_email', label: 'What is your parent or guardian’s email address?', type: 'text', required: true },
      ],
    },
  ],
}

export const FORM_SCHEMAS = {
  ra: RA_SCHEMA,
  irp: IRP_SCHEMA,
  'passion-project': PP_SCHEMA,
}

export function getSchema(program) {
  return FORM_SCHEMAS[program] || null
}

export function resolveOptions(field) {
  if (field.optionsRef === 'countries') return COUNTRIES
  return field.options || []
}

export function getAllFields(schema) {
  return schema.steps.flatMap((step) => step.fields)
}

export function findFieldStep(schema, fieldId) {
  for (let i = 0; i < schema.steps.length; i += 1) {
    if (schema.steps[i].fields.some((f) => f.id === fieldId)) return i
  }
  return -1
}
