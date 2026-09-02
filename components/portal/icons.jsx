/**
 * Hand-rolled inline SVG. This project has no icon library and does not add
 * dependencies, matching components/admin/icons.jsx. Every icon inherits
 * currentColor and is aria-hidden — labels always come from adjacent text.
 */

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

export const IconProgram = (p) => (
  <svg {...base} {...p}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5z" /><path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H19v3H5.5" /></svg>
)
export const IconSchool = (p) => (
  <svg {...base} {...p}><path d="M12 4 2.5 9 12 14l9.5-5z" /><path d="M6.5 11.5v4.2c0 .6 2.3 2.3 5.5 2.3s5.5-1.7 5.5-2.3v-4.2" /></svg>
)
export const IconStage = (p) => (
  <svg {...base} {...p}><path d="M4 20V10" /><path d="M10 20V5" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
)
export const IconTarget = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.4" /></svg>
)
export const IconClock = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>
)
export const IconCadence = (p) => (
  <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8.5 3v4M15.5 3v4" /></svg>
)
export const IconCheckCircle = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="m8.6 12.2 2.3 2.3 4.5-4.7" /></svg>
)
// Neutral marker for Learning Map topics. Deliberately not a checkmark or
// checkbox: these are knowledge areas the program covers, not items a student
// ticks off, and a check glyph would imply completion tracking that does not
// exist.
export const IconTopic = (p) => (
  <svg {...base} {...p}><path d="M12 6.5 17.5 12 12 17.5 6.5 12z" /></svg>
)
export const IconSearch = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
)
export const IconChevron = (p) => (
  <svg {...base} {...p}><path d="m6 9.5 6 6 6-6" /></svg>
)

export const FIELD_ICONS = {
  Program: IconProgram,
  School: IconSchool,
  Stage: IconStage,
  'Project area': IconTarget,
  'Project goal': IconTarget,
  Duration: IconClock,
  'Learning cadence': IconCadence,
}
