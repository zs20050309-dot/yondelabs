import { IconMoon, IconSun } from './icons'
import styles from '../../styles/admin.module.css'

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <IconSun /> : <IconMoon />}
    </button>
  )
}
