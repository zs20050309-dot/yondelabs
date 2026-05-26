import Link from 'next/link'
import styles from '../../styles/home.module.css'

export default function AnnouncementBanner({ onClose }) {
  return null

  /*
   * BANNER DISABLED — re-enable and update text for next cohort announcement.
   *
   * return (
   *   <div id="announcementBanner" className={styles.announcementBanner}>
   *     <div className={styles.announcementContent}>
   *       <p className={styles.announcementText}>
   *         <span className={styles.langZh}>
   *           冬季项目申请截止日期为2025年11月30日晚11:59（美东时间）！
   *           <Link href="/login" className={styles.announcementLink}>
   *             点击申请
   *           </Link>
   *         </span>
   *         <span className={styles.langEn}>
   *           The Winter Cohort application deadline is on November 30, 2025, 11:59 PM EDT!
   *           <Link href="/login" className={styles.announcementLink}>
   *             Click here to apply
   *           </Link>
   *         </span>
   *       </p>
   *       <button className={styles.announcementClose} onClick={onClose} aria-label="Close announcement">
   *         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
   *           <path d="M18 6L6 18M6 6l12 12" />
   *         </svg>
   *       </button>
   *     </div>
   *   </div>
   * )
   */
}
