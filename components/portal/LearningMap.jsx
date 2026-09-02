import JourneySection from './JourneySection'
import styles from '../../styles/studentJourney.module.css'

/**
 * Category -> topic, exactly two levels. The hierarchy is capped by product
 * decision: no subtopics, no descriptions, no bullet points beneath a topic.
 */
export default function LearningMap({ categories = [] }) {
  const populated = categories.filter((category) => category.topics?.length)
  if (!populated.length) return null

  return (
    <JourneySection eyebrow="What you are learning" title="Your Learning Map">
      <div className={styles.mapGrid}>
        {populated.map((category) => (
          <article className={styles.mapCategory} key={category.id}>
            <h3>{category.name}</h3>
            <ul>
              {category.topics.map((topic) => (
                <li key={topic.id}>{topic.name}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </JourneySection>
  )
}
