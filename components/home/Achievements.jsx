import styles from '../../styles/home.module.css'
import { Lang } from './LocalizedText'

const stories = [
  {
    name: 'Timmy',
    photo: '/images/students-portraits/timmy.jpg',
    schoolZh: '华育高二',
    schoolEn: 'Huayu High School, Grade 11',
    quoteZh:
      '"第一天我还没写过一行代码。一周后，我做出了一个完整的 AI 摄影点评系统。在 MIT 实验室，我学会了大语言模型、全栈开发、API 部署...更重要的是，我找到了自己真正热爱的方向。"',
    quoteEn:
      '"Day one: never wrote a line of code. One week later: built a complete AI photography critique system. More importantly, I found what I truly love."',
    achievements: [
      ['AI 摄影教练系统（完整部署）', 'AI Photography Coach (fully deployed)'],
      ['GitHub 开源项目 200+ stars', 'GitHub open-source project 200+ stars'],
      ['掌握大语言模型 + 全栈开发', 'Mastered LLMs + Full-stack development'],
      ['获 MIT 教授推荐信', 'MIT professor recommendation letter'],
    ],
  },
  {
    name: 'Aiko',
    photo: '/images/students-portraits/aiko.jpg',
    schoolZh: '家居品牌创业者',
    schoolEn: 'Home Decor Entrepreneur',
    quoteZh:
      '"看到传统家居需要与前沿技术结合，我直接和 MIT 实验室合作。实验室负责技术，我负责艺术和商业化。这个项目把公司带到了全新高度。"',
    quoteEn:
      '"Saw that traditional home decor needed tech integration. Collaborated directly with MIT lab - they handle tech, I handle art and commercialization. This project took the company to the next level."',
    achievements: [
      ['传统艺术 × 智能交互创新产品', 'Traditional art × Smart interaction innovation'],
      ['商业化落地并量产', 'Commercialized and scaled'],
      ['与顶尖艺术家合作', 'Partnered with top artists'],
    ],
  },
]

export default function Achievements() {
  return (
    <section id="achievements" className={styles.achievements} data-animate>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Lang zh="学生成果与反馈" en="What Our Students Say & Achieve" />
          </h2>
          <p className={styles.sectionSubtitle}>
            <Lang zh="真实的成长故事，真实的项目成果" en="Real growth stories, real project outcomes" />
          </p>
        </div>

        <div className={styles.studentStoriesGrid}>
          {stories.map((story) => (
            <article className={styles.studentStoryCard} key={story.name}>
              <div className={styles.studentHeader}>
                <div className={styles.studentAvatar}>
                  <img src={story.photo} alt={`${story.name} Photo`} />
                </div>
                <div className={styles.studentMeta}>
                  <h3 className={styles.studentName}>{story.name}</h3>
                  <p className={styles.studentSchool}>
                    <Lang zh={story.schoolZh} en={story.schoolEn} />
                  </p>
                  <p className={styles.studentProgram}>
                    <span className={styles.programBadge}>MIT Media Lab</span>
                  </p>
                </div>
              </div>

              <div className={styles.studentQuoteHighlight}>
                <p>
                  <Lang zh={story.quoteZh} en={story.quoteEn} />
                </p>
              </div>

              <div className={styles.projectAchievements}>
                <h4>
                  <Lang zh="项目成果" en="Project Achievements" />
                </h4>
                <ul className={styles.achievementList}>
                  {story.achievements.map(([zh, en]) => (
                    <li key={en}>
                      <span className={styles.checkmark}>✓</span>
                      <span>
                        <Lang zh={zh} en={en} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
