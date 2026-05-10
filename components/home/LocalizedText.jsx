import styles from '../../styles/home.module.css'

export function Lang({ zh, en }) {
  return (
    <>
      <span className={styles.langZh}>{zh}</span>
      <span className={styles.langEn}>{en}</span>
    </>
  )
}

export function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}
