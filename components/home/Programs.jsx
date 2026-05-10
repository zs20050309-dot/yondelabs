import styles from '../../styles/home.module.css'
import { cx, Lang } from './LocalizedText'

const programs = [
  {
    titleZh: '项目时长',
    titleEn: 'Program Duration',
    descZh: '4-8周沉浸式科研体验',
    descEn: '4-8 weeks immersive research',
    items: [
      ['线下实验室: 4周', 'On-site Lab: 4 weeks'],
      ['Hybrid模式: 6-8周', 'Hybrid Mode: 6-8 weeks'],
      ['灵活安排时间', 'Flexible scheduling'],
    ],
    icon: 'clock',
  },
  {
    titleZh: '个性化定制',
    titleEn: 'Personalized Match',
    descZh: '根据学生兴趣定制课题',
    descEn: 'Tailored to student interests',
    items: [
      ['1对1导师匹配', '1-on-1 mentor matching'],
      ['个人研究项目', 'Individual project'],
      ['深度专业指导', 'In-depth guidance'],
    ],
    icon: 'user',
  },
  {
    titleZh: '成果产出',
    titleEn: 'Tangible Outcomes',
    descZh: '可量化的学术成果',
    descEn: 'Quantifiable achievements',
    items: [
      ['研究论文/报告', 'Research paper/report'],
      ['GitHub 开源项目', 'GitHub project'],
      ['会议展示机会', 'Conference presentation'],
    ],
    icon: 'check',
  },
  {
    titleZh: '增值服务',
    titleEn: 'Add-On Services',
    descZh: '超越项目本身的持续支持',
    descEn: 'Ongoing support beyond project',
    items: [
      ['论文发表支持', 'Publication support'],
      ['ISEF 竞赛辅导', 'ISEF coaching'],
      ['大学申请指导', 'Application guidance'],
      ['持续 mentorship', 'Ongoing mentorship'],
    ],
    icon: 'star',
    premium: true,
  },
]

export default function Programs() {
  return (
    <section id="program" className={styles.programDetails} data-animate>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Lang zh="项目详情" en="Program Details" />
          </h2>
          <p className={styles.sectionSubtitle}>
            <Lang zh="量身定制的科研体验" en="Customized research experience" />
          </p>
        </div>

        <div className={styles.programGrid}>
          {programs.map((program) => (
            <div className={cx(styles.programCard, program.premium && styles.premium)} key={program.titleEn}>
              <div className={program.premium ? styles.programIconPremium : styles.programIcon}>
                <ProgramIcon type={program.icon} />
              </div>
              <h3>
                <Lang zh={program.titleZh} en={program.titleEn} />
              </h3>
              <p className={styles.cardDescription}>
                <Lang zh={program.descZh} en={program.descEn} />
              </p>
              <ul>
                {program.items.map(([zh, en]) => (
                  <li key={en}>
                    <Lang zh={zh} en={en} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProgramIcon({ type }) {
  if (type === 'clock') {
    return (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    )
  }

  if (type === 'user') {
    return (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    )
  }

  if (type === 'check') {
    return (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    )
  }

  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  )
}
