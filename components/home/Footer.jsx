import Link from 'next/link'
import styles from '../../styles/home.module.css'
import { Lang } from './LocalizedText'

export function FinalCta() {
  return (
    <section className={styles.finalCta} data-animate>
      <div className={styles.container}>
        <div className={styles.ctaContent}>
          <h2>
            <Lang zh="准备开启你的科研之旅了吗？" en="Ready to Begin Your Research Journey?" />
          </h2>
          <p>
            <Lang zh="名额有限，立即申请" en="Limited spots available, apply now" />
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/login" className={styles.btnApply}>
              <Lang zh="立即申请" en="Apply Now" />
              <span className={styles.arrow}>→</span>
            </Link>
          </div>
          <div className={styles.contactInfo}>
            <p>
              <Lang zh="邮箱: info@yondelabs.com" en="Email: info@yondelabs.com" />
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Footer({ onAnchorClick }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h4>
              <Lang zh="关于我们" en="About Us" />
            </h4>
            <p>
              <strong>Yonde Labs</strong>
            </p>
            <p>
              <Lang
                zh="专注为优秀高中生提供顶尖大学实验室科研体验的教育机构"
                en="Educational institution focused on providing top-tier university lab research experiences for outstanding high school students"
              />
            </p>
            <p className={styles.tagline}>
              <Lang
                zh="Beyond what you know — 走进世界科研最前沿"
                en="Beyond what you know — Step into the forefront of global research"
              />
            </p>
          </div>
          <div className={styles.footerSection}>
            <h4>
              <Lang zh="快速链接" en="Quick Links" />
            </h4>
            <ul>
              <FooterLink href="#partner-universities" zh="合作大学" en="Partner Universities" onAnchorClick={onAnchorClick} />
              <FooterLink href="#program" zh="项目详情" en="Program Details" onAnchorClick={onAnchorClick} />
              <FooterLink href="#research-areas" zh="研究领域" en="Research Areas" onAnchorClick={onAnchorClick} />
              <FooterLink href="#achievements" zh="学生成果" en="Student Achievements" onAnchorClick={onAnchorClick} />
            </ul>
          </div>
          <div className={styles.footerSection}>
            <h4>
              <Lang zh="联系我们" en="Contact" />
            </h4>
            <p>📍 Cambridge, MA 02139</p>
            <p>📧 info@yondelabs.com</p>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; 2024 Yonde Labs. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({ href, zh, en, onAnchorClick }) {
  return (
    <li>
      <a href={href} onClick={onAnchorClick}>
        <Lang zh={zh} en={en} />
      </a>
    </li>
  )
}
