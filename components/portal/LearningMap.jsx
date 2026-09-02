import JourneySection from './JourneySection'
import { IconCheckCircle } from './icons'
import styles from '../../styles/studentJourney.module.css'

/**
 * Category -> topic, exactly two levels by product decision: no subtopics, no
 * descriptions.
 *
 * Topics carry no completion state in the schema, so the badge counts topics
 * rather than claiming lessons completed, and the markers are uniformly neutral.
 * Showing dimmed/filled check states here would imply progress tracking that
 * does not exist. Adding it would need a per-student topic-progress table.
 */
export default function LearningMap({ categories = [] }) {
  const populated = categories.filter((category) => category.topics?.length)
  if (!populated.length) return null

  const totalTopics = populated.reduce((sum, category) => sum + category.topics.length, 0)

  return (
    <JourneySection
      eyebrow="What you are learning"
      title="Your Learning Map"
      id="learning-map"
      action={<span className={styles.countPill}>{totalTopics} topics</span>}
    >
      <div className={styles.moduleGrid}>
        {populated.map((category, index) => (
          <article className={styles.moduleCard} key={category.id}>
            <header className={styles.moduleHead}>
              <span className={styles.moduleIndex}>{String(index + 1).padStart(2, '0')}</span>
              <h3>{category.name}</h3>
              <span className={styles.modulePill}>{category.topics.length} topics</span>
            </header>
            <ul className={styles.topicList}>
              {category.topics.map((topic) => (
                <li key={topic.id}>
                  <IconCheckCircle className={styles.topicIcon} />
                  <span>{topic.name}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </JourneySection>
  )
}
