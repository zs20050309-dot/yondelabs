import JourneySection from './JourneySection'
import { IconTopic } from './icons'
import styles from '../../styles/studentJourney.module.css'

/**
 * Category -> topic, exactly two levels by product decision: no subtopics, no
 * descriptions.
 *
 * These are the knowledge areas the program covers, not a checklist. No counts
 * and no check glyphs: students should not be reading this as items to tick off
 * or audit against what was taught in class.
 */
export default function LearningMap({ categories = [] }) {
  const populated = categories.filter((category) => category.topics?.length)
  if (!populated.length) return null

  return (
    <JourneySection
      eyebrow="What you are learning"
      title="Your Learning Map"
      id="learning-map"
    >
      <div className={styles.moduleGrid}>
        {populated.map((category, index) => (
          <article className={styles.moduleCard} key={category.id}>
            <header className={styles.moduleHead}>
              <span className={styles.moduleIndex}>{String(index + 1).padStart(2, '0')}</span>
              <h3>{category.name}</h3>
            </header>
            <ul className={styles.topicList}>
              {category.topics.map((topic) => (
                <li key={topic.id}>
                  <IconTopic className={styles.topicIcon} />
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
