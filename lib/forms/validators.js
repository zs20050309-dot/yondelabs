const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isEmpty(value) {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

export function validateField(field, value) {
  if (field.required && isEmpty(value)) {
    return 'This field is required.'
  }
  if (isEmpty(value)) return null

  if ((field.id === 'email' || field.id === 'parent_email') && typeof value === 'string') {
    if (!EMAIL_RE.test(value.trim())) {
      return 'Please enter a valid email address.'
    }
  }

  return null
}

export function validateStep(step, values) {
  const errors = {}
  for (const field of step.fields) {
    const err = validateField(field, values[field.id])
    if (err) errors[field.id] = err
  }
  return errors
}

export function validateAll(schema, values) {
  const errors = {}
  for (const step of schema.steps) {
    Object.assign(errors, validateStep(step, values))
  }
  return errors
}

export function findFirstErrorStep(schema, errors) {
  if (!Object.keys(errors).length) return -1
  for (let i = 0; i < schema.steps.length; i += 1) {
    if (schema.steps[i].fields.some((f) => errors[f.id])) return i
  }
  return -1
}
