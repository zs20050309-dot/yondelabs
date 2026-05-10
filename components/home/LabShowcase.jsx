import styles from '../../styles/home.module.css'
import { cx, Lang } from './LocalizedText'

const thumbnails = [
  { src: '/images/mit-koch-institute.jpg', alt: 'MIT Koch Institute' },
  { src: '/images/mit-eecs.png', alt: 'MIT EECS' },
  { src: '/images/mit-media-lab.jpg', alt: 'MIT Media Lab' },
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

          <div className={styles.labOutcomes}>
            <Outcome
              number="01"
              featured
              titleZh="操作价值 $2M+ 的专业设备"
              titleEn="Hands-On Access to $2M+ Equipment"
              bodyZh="使用 MIT / Stanford 实验室的专业级仪器--不是参观，是亲手操作与实验"
              bodyEn="Use professional-grade instruments in MIT/Stanford labs - not observing, but actually operating and experimenting"
            />
            <Outcome
              number="02"
              titleZh="参与真实的前沿研究项目"
              titleEn="Work on Actual Cutting-Edge Research"
              bodyZh="不是模拟课题，是导师团队正在研究的真实课题--你的工作将成为实验室成果的一部分"
              bodyEn="Not simulated projects, but real research your mentor's team is actively pursuing - your work becomes part of lab outcomes"
            />
            <Outcome
              number="03"
              titleZh="获得一线科研导师的深度指导"
              titleEn="One-on-One PhD Mentorship"
              bodyZh="博士每天带教，每周与教授讨论，获得 MIT/Stanford 导师正式推荐信"
              bodyEn="Daily PhD guidance, weekly professor discussions, formal MIT/Stanford recommendation letters"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function Outcome({ number, titleZh, titleEn, bodyZh, bodyEn, featured }) {
  return (
    <div className={cx(styles.outcomeItem, featured && styles.featured)}>
      <div className={styles.outcomeHeader}>
        <div className={styles.outcomeNumber}>{number}</div>
        <h4>
          <Lang zh={titleZh} en={titleEn} />
        </h4>
      </div>
      <p>
        <Lang zh={bodyZh} en={bodyEn} />
      </p>
    </div>
  )
}
