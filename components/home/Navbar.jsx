import Link from 'next/link'
import styles from '../../styles/home.module.css'
import { cx, Lang } from './LocalizedText'

const NAV_ITEMS = [
  { href: '#home', zh: '首页', en: 'Home' },
  { href: '#labs', zh: '实验室', en: 'Labs' },
  { href: '#program', zh: '项目介绍', en: 'Program' },
  { href: '#research-areas', zh: '研究领域', en: 'Research Areas' },
  { href: '#achievements', zh: '学生成果', en: 'Achievements' },
]

export default function Navbar({ onAnchorClick }) {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <a href="#home" className={styles.logoLink} onClick={onAnchorClick}>
          <img src="/images/logos/yondelabs-logo.svg" alt="Yonde Labs" className={styles.companyLogo} />
        </a>

        <div className={styles.navMenu}>
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink} onClick={onAnchorClick}>
              <Lang zh={item.zh} en={item.en} />
            </a>
          ))}
          <Link href="/login" className={cx(styles.navLink, styles.applyBtn)}>
            <Lang zh="立即申请" en="Apply Now" />
          </Link>
        </div>

      </div>
    </nav>
  )
}
