import styles from '../../styles/home.module.css'
import { Lang } from './LocalizedText'

const categories = [
  {
    key: 'science',
    titleZh: '自然科学',
    titleEn: 'Natural Sciences',
    topics: [
      ['物理与天文学', 'Physics & Astronomy', ' — 量子物理、天体物理、材料科学', ' — quantum physics, astrophysics, materials science'],
      ['化学', 'Chemistry', ' — 有机/无机化学、生物化学、化学工程', ' — organic/inorganic chemistry, biochemistry, chemical engineering'],
      ['生物与生命科学', 'Biology & Life Sciences', ' — 分子生物学、遗传学、生物信息学', ' — molecular biology, genetics, bioinformatics'],
      ['地球与环境科学', 'Earth & Environmental Sciences', ' — 气候变化、海洋学、可持续发展', ' — climate change, oceanography, sustainability'],
    ],
  },
  {
    key: 'engineering',
    titleZh: '计算机科学与工程',
    titleEn: 'Computer Science & Engineering',
    topics: [
      ['计算机科学', 'Computer Science', ' — 人工智能、机器学习、数据科学、AR/VR', ' — AI, machine learning, data science, AR/VR'],
      ['电气与计算机工程', 'Electrical & Computer Engineering', ' — 电路、嵌入式系统、信号处理', ' — circuits, embedded systems, signal processing'],
      ['机械/航空航天工程', 'Mechanical / Aerospace Engineering', ' — 机器人、能源系统、自动驾驶', ' — robotics, energy systems, autonomous vehicles'],
      ['土木/环境工程', 'Civil / Environmental Engineering', ' — 智慧城市、结构工程、城市交通', ' — smart cities, structural engineering, urban mobility'],
    ],
  },
  {
    key: 'social',
    titleZh: '社会科学',
    titleEn: 'Social Sciences',
    topics: [
      ['心理学与行为科学', 'Psychology & Behavioral Science', ' — 认知科学、社会行为、教育学', ' — cognitive science, social behavior, education'],
      ['经济学与商业', 'Economics & Business', ' — 金融、创业、计量经济学、公共政策', ' — finance, entrepreneurship, econometrics, public policy'],
      ['政治学与国际关系', 'Political Science & International Relations', ' — 治理、外交、冲突研究', ' — governance, diplomacy, conflict studies'],
    ],
  },
  {
    key: 'interdisciplinary',
    titleZh: '跨学科与新兴领域',
    titleEn: 'Interdisciplinary & Emerging Fields',
    topics: [
      ['量化营销', 'Quantitative Marketing', '', ''],
      ['人工智能与社会 / 人机交互', 'AI + Society / Human-AI Interaction', '', ''],
      ['城市研究 / 智慧出行', 'Urban Studies / Smart Mobility', '', ''],
    ],
  },
]

export default function ResearchAreas() {
  return (
    <section id="research-areas" className={styles.researchAreas} data-animate>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Lang zh="研究领域" en="Research Areas" />
          </h2>
          <p className={styles.sectionSubtitle}>
            <Lang
              zh="我们的实验室专注于不同学科，为学生提供广泛领域的科研体验。探索最适合你兴趣的方向。"
              en="Our labs specialize in different disciplines, offering research exposure across a wide range of areas. Find the field that matches your interests."
            />
          </p>
        </div>

        <div className={styles.researchAreasGrid}>
          {categories.map((category) => (
            <div className={styles.researchCategory} key={category.key}>
              <div className={styles.categoryIcon}>
                <CategoryIcon type={category.key} />
              </div>
              <h3 className={styles.categoryTitle}>
                <Lang zh={category.titleZh} en={category.titleEn} />
              </h3>
              <ul className={styles.researchTopics}>
                {category.topics.map(([titleZh, titleEn, textZh, textEn]) => (
                  <li key={titleEn}>
                    <strong>
                      <Lang zh={titleZh} en={titleEn} />
                    </strong>
                    {textZh ? (
                      <>
                        <span className={styles.langZh}>{textZh}</span>
                        <span className={styles.langEn}>{textEn}</span>
                      </>
                    ) : null}
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

function CategoryIcon({ type }) {
  if (type === 'science') {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6m9.66-9H15m-6 0H3m16.66 5l-4.24-4.24m-6 6L5.34 19M19 5l-4.24 4.24m-6 6L5.34 5"></path>
      </svg>
    )
  }

  if (type === 'engineering') {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
    )
  }

  if (type === 'social') {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    )
  }

  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  )
}
