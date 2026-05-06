import { useState } from 'react'
import styles from '../../styles/portal.module.css'

const LAB_ITEMS = [
  { label: 'MIT Media Lab' },
  { label: 'Stanford HAI' },
  { label: 'UC Berkeley' },
  { label: 'MIT CSAIL' },
  { label: 'Stanford d.school' },
  { label: 'MIT Koch Institute' },
  { label: 'Berkeley AI Research' },
  { label: 'Stanford Medicine' },
]

const ITEMS_DOUBLED = [...LAB_ITEMS, ...LAB_ITEMS]

export default function AuthCard({ children, eyebrow, title, subtitle }) {
  const [logoFailed, setLogoFailed] = useState(false)

  return (
    <div className={styles.authPage}>

      {/* LEFT PANEL — brand story */}
      <div className={styles.leftPanel}>
        <div className={styles.photoBg} />
        <div className={styles.photoOverlay} />
        <div className={styles.gridPattern} />

        <div className={styles.leftContent}>

          {/* TOP: Logo */}
          <div className={styles.leftTop}>
            <div className={styles.lpLogo}>
              {logoFailed ? (
                <div className={styles.lpLogoFallback}>
                  <div className={styles.lpLogoIcon}>YL</div>
                  <span className={styles.lpLogoName}>YondeLabs</span>
                </div>
              ) : (
                <img
                  src="/images/logos/yondelabs-logo.svg"
                  alt="YondeLabs"
                  className={styles.lpLogoImg}
                  onError={() => setLogoFailed(true)}
                />
              )}
            </div>
          </div>

          {/* MIDDLE: Main copy — vertically centered */}
          <div className={styles.leftMid}>
            <div className={styles.portalPill}>
              <div className={styles.portalDot} />
              <span className={styles.portalLabel}>Applicant Portal</span>
            </div>
            <h1 className={styles.leftTitle}>
              Beyond<br />what you<br />
              <em className={styles.leftTitleAccent}>know.</em>
            </h1>
            <p className={styles.leftDesc}>
              Real research at MIT, Stanford &amp; Berkeley.
              Work side-by-side with PhD mentors and
              produce outcomes that matter.
            </p>
          </div>

          {/* BOTTOM: Scrolling lab badges */}
          <div className={styles.leftFoot}>
            <div className={styles.marqueeLabel}>Partner Institutions</div>
            <div className={styles.marqueeWrapper}>
              <div className={styles.marqueeTrack}>
                {ITEMS_DOUBLED.map((item, i) => (
                  <div key={i} className={styles.marqueeItem}>
                    <div className={styles.marqueeDot} />
                    <span className={styles.marqueeText}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT PANEL — form area */}
      <div className={styles.rightPanel}>
        {eyebrow && <div className={styles.formEyebrow}>{eyebrow}</div>}
        {title && <h2 className={styles.heading}>{title}</h2>}
        {subtitle && <p className={styles.subtext}>{subtitle}</p>}
        {children}
      </div>

    </div>
  )
}
