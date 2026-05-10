import Link from 'next/link'
import styles from '../../styles/home.module.css'
import { Lang } from './LocalizedText'

export default function Hero({ heroRef }) {
  return (
    <section id="home" className={styles.hero} ref={heroRef} data-animate>
      <div className={styles.heroBackground}></div>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>
          <span className={styles.langZh}>
            <p>从第一次科研探索，</p>
            <p>到终身的科学成长</p>
          </span>
          <span className={styles.langEn}>From your first project to a lifetime of scientific growth</span>
        </h1>
        <p className={styles.heroSubtitle}>
          <span className={styles.langZh}>
            走进MIT、Stanford实验室，参与真实科研，与世界顶尖科学家建立长期联系，
            <br />
            获得超越项目本身的科研陪伴与成长。
          </span>
          <span className={styles.langEn}>
            From MIT To Stanford - Experience Authentic Research, Build Long-Term Connections With Leading Scientists,
            Gain Mentorship That Lasts Beyond One Project.
          </span>
        </p>
        <div className={styles.heroCta}>
          <Link href="/login" className={styles.ctaPrimary}>
            <Lang zh="申请 2026 夏季项目" en="Apply for Summer 2026" />
          </Link>
          <Link href="/login" className={styles.ctaSecondary}>
            <Lang zh="申请其他时间段" en="Apply for Other Time Periods" />
          </Link>
        </div>
        <div className={styles.deadlineBanner}>
          <span className={styles.deadlineLabel}>Early Decision Deadline:</span>
          <span className={styles.deadlineDate}>December 15, 2025</span>
          <span className={styles.deadlineSeparator}>|</span>
          <span className={styles.deadlineLabel}>Regular Decision:</span>
          <span className={styles.deadlineDate}>March 15, 2026</span>
        </div>
      </div>
    </section>
  )
}
