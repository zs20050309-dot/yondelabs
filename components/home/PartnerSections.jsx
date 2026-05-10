import styles from '../../styles/home.module.css'
import { cx, Lang } from './LocalizedText'

const universities = [
  ['/images/uni-logos/harvard.png', 'Harvard University'],
  ['/images/uni-logos/MIT.png', 'Massachusetts Institute of Technology'],
  ['/images/uni-logos/stanford.png', 'Stanford University'],
  ['/images/uni-logos/CalTech.svg', 'California Institute of Technology'],
  ['/images/uni-logos/Vanderbilt.png', 'Vanderbilt University'],
  ['/images/uni-logos/Texas_A&M.png', 'Texas A&M University'],
  ['/images/uni-logos/Yale.png', 'Yale University'],
  ['/images/uni-logos/Cornell-rbg.png', 'Cornell University'],
  ['/images/uni-logos/ucb.png', 'University of California, Berkeley'],
  ['/images/uni-logos/cambridge.png', 'University of Cambridge', true],
  ['/images/uni-logos/Oxford.svg', 'University of Oxford'],
]

const labs = [
  ['/images/lab-logos/mit-be.png', 'MIT Biological Engineering', 'MIT 生物工程', 'MIT Biological Engineering'],
  ['/images/lab-logos/MIT-dusp.svg', 'MIT DUSP', 'MIT 城市研究与规划', 'MIT Urban Studies & Planning'],
  ['/images/lab-logos/mit-eaps.png', 'MIT EAPS', 'MIT 地球、大气与行星科学', 'MIT Earth, Atmospheric & Planetary Sciences'],
  ['/images/lab-logos/mit-lids.png', 'MIT LIDS', 'MIT 信息与决策系统实验室', 'MIT Laboratory for Information & Decision Systems'],
  ['/images/lab-logos/mit-media-lab.png', 'MIT Media Lab', 'MIT 媒体实验室', 'MIT Media Lab'],
  ['/images/lab-logos/haas-marketing.png', 'UCB Haas Marketing Group', 'UCB Haas 营销研究组', 'UCB Haas Marketing Group'],
  ['/images/lab-logos/caltech-gps.png', 'Caltech Geological and Planetary Sciences', 'Caltech 地质与行星科学', 'Caltech Geological & Planetary Sciences'],
]

export function PartnerUniversities() {
  const marqueeItems = [...universities, ...universities]

  return (
    <section id="partner-universities" className={styles.partnerUniversities} data-animate>
      <div className={styles.container}>
        <h3 className={styles.universitiesHeading}>
          <Lang zh="合作大学" en="Partner Universities" />
        </h3>
      </div>
      <div className={styles.universitiesMarquee}>
        <div className={styles.universitiesTrack}>
          {marqueeItems.map(([src, alt, large], index) => (
            <div className={styles.universityItem} key={`${alt}-${index}`}>
              <img
                src={src}
                alt={alt}
                className={cx(styles.universityLogo, large && styles.universityLogoLarge)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PartnerLabs() {
  return (
    <section id="labs" className={styles.partnerLabs} data-animate>
      <div className={styles.container}>
        <h3 className={styles.labsHeading}>
          <Lang zh="精选研究实验室" en="Selected Research Labs" />
        </h3>
      </div>
      <div className={styles.container}>
        <div className={styles.labsGrid}>
          {labs.map(([src, alt, zh, en]) => (
            <div className={styles.labItem} key={alt}>
              <img src={src} alt={alt} className={styles.labLogo} />
              <p className={styles.labName}>
                <Lang zh={zh} en={en} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
