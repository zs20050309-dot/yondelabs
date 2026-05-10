import { useState } from 'react'
import styles from '../../styles/portal.module.css'

const universityLogos = [
  { name: 'Harvard University', src: '/images/uni-logos/harvard.png' },
  { name: 'Massachusetts Institute of Technology', src: '/images/uni-logos/MIT.png' },
  { name: 'Stanford University', src: '/images/uni-logos/stanford.png' },
  { name: 'California Institute of Technology', src: '/images/uni-logos/CalTech.svg' },
  { name: 'Vanderbilt University', src: '/images/uni-logos/Vanderbilt.png' },
  { name: 'Texas A&M University', src: '/images/uni-logos/Texas_A&M.png', shape: 'seal' },
  { name: 'Yale University', src: '/images/uni-logos/Yale.png', shape: 'seal' },
  { name: 'Cornell University', src: '/images/uni-logos/Cornell-rbg.png', shape: 'cornell' },
  { name: 'University of California, Berkeley', src: '/images/uni-logos/ucb.png', shape: 'seal' },
  { name: 'University of Cambridge', src: '/images/uni-logos/cambridge.png', shape: 'cambridge' },
  { name: 'University of Oxford', src: '/images/uni-logos/Oxford.svg', shape: 'compact' },
]

export default function AuthCard({ children, eyebrow, title, subtitle }) {
  const [logoFailed, setLogoFailed] = useState(false)
  const tripled = [...universityLogos, ...universityLogos, ...universityLogos]

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
                  src="/images/logos/yondelabs-white.svg"
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
              Real research at MIT, Stanford, Berkeley &amp; beyond.
              Work side-by-side with PhD mentors and
              produce outcomes that matter.
            </p>
          </div>

          {/* BOTTOM: University logos */}
          <div className={styles.leftFoot}>
            <p className={styles.partnerLabel}>PARTNER INSTITUTIONS</p>
            <div className={styles.marqueeOuter}>
              <div className={styles.marqueeTrack}>
                {tripled.map((uni, i) => (
                  <div key={`${uni.name}-${i}`} className={styles.marqueeItem}>
                    <img
                      src={uni.src}
                      alt={uni.name}
                      className={styles.universityLogo}
                      data-logo-shape={uni.shape || 'wordmark'}
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT PANEL — form area */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          <div className={styles.rightLogoBar}>
            <img
              src="/images/logos/yondelabs-logo.svg"
              alt="YondeLabs"
              className={styles.rightLogoImg}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </div>
          {eyebrow && <div className={styles.formEyebrow}>{eyebrow}</div>}
          {title && <h2 className={styles.heading}>{title}</h2>}
          {subtitle && <p className={styles.subtext}>{subtitle}</p>}
          {children}
        </div>
      </div>

    </div>
  )
}
