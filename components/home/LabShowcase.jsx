import Link from 'next/link'
import styles from '../../styles/home.module.css'
import { cx, Lang } from './LocalizedText'

const thumbnails = [
  { src: '/images/mit-koch-institute.jpg', alt: 'MIT Koch Institute' },
  { src: '/images/mit-eecs.png', alt: 'MIT EECS' },
  { src: '/images/mit-media-lab.jpg', alt: 'MIT Media Lab' },
]

const programCards = [
  {
    badge: 'RA',
    title: 'In-Person Research Assistant',
    description:
      'Step into an in-person lab, contribute hands-on to real research, and build toward a recommendation letter grounded in your work.',
    cta: 'Apply Now →',
  },
  {
    badge: 'IRP',
    title: 'Independent Research Program',
    description:
      'Own your research from question to outcome, with support for both a paper-ready deliverable and a compelling application narrative.',
    cta: 'Apply Now →',
  },
  {
    badge: 'PP',
    title: 'Passion Project',
    description:
      'Start from genuine interests and shape them into a community-rooted project, guided by a T15 mentor who helps sharpen the story.',
    cta: 'Apply Now →',
  },
  {
    badge: 'ISEF',
    title: 'ISEF Mentorship',
    description:
      'Prepare with a three-role team: PhD mentor, competition coach, and SSM, with a publication safety net supporting your project path.',
    cta: 'Get in Touch →',
  },
]

export default function LabShowcase({ activeLab, onSelectLab }) {
  return (
    <section id="lab" className={styles.labShowcase} data-animate>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Lang zh="沉浸式顶尖实验室体验" en="Immersive Experience in Top Research Labs" />
          </h2>
          <p className={styles.sectionSubtitle}>
            <Lang zh="走进真实科研现场，亲手操作，深度参与" en="Step into real research environments, hands-on operation, deep participation" />
          </p>
        </div>

        <div className={styles.labFeature}>
          <div className={styles.labGallery}>
            <div className={cx(styles.labImage, styles.main)}>
              <img src={activeLab.src} alt={activeLab.alt} />
              <div className={styles.labLabel}>{activeLab.alt}</div>
            </div>
            <div className={styles.labThumbnails}>
              {thumbnails.map((item) => (
                <img key={item.alt} src={item.src} alt={item.alt} onClick={() => onSelectLab(item)} />
              ))}
            </div>
          </div>

          <div className={styles.labProgramGrid}>
            {programCards.map((program) => (
              <Link key={program.badge} href="/login" className={styles.labProgramCard}>
                <span className={styles.labProgramBadge}>{program.badge}</span>
                <h3 className={styles.labProgramTitle}>{program.title}</h3>
                <p className={styles.labProgramDescription}>{program.description}</p>
                <span className={styles.labProgramCta}>{program.cta}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
