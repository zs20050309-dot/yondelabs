import CheckboxField from './fields/CheckboxField'
import DateField from './fields/DateField'
import RadioField from './fields/RadioField'
import SelectField from './fields/SelectField'
import TextAreaField from './fields/TextAreaField'
import TextField from './fields/TextField'
import styles from '../../styles/wizard.module.css'

const FIELD_COMPONENTS = {
  text: TextField,
  textarea: TextAreaField,
  date: DateField,
  select: SelectField,
  radio: RadioField,
  checkbox: CheckboxField,
}

export default function FieldRenderer({ field, value, onChange, onBlur, error }) {
  const Comp = FIELD_COMPONENTS[field.type]
  if (!Comp) return null

  return (
    <div className={styles.fieldRow}>
      <label
        id={`${field.id}-label`}
        htmlFor={field.id}
        className={styles.fieldLabel}
      >
        {field.label}
        {field.required ? <span className={styles.requiredMark} aria-hidden> *</span> : null}
      </label>
      {field.helper ? <p className={styles.fieldHelper}>{field.helper}</p> : null}

      <Comp
        field={field}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        error={error}
      />

      {error ? (
        <p id={`${field.id}-err`} className={styles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
