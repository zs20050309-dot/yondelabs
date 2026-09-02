import JourneySection from './JourneySection'
import styles from '../../styles/studentJourney.module.css'

function initials(name) {
  return name
    .split(/\s+/)
    .filter((part) => /[A-Za-z]/.test(part))
    .slice(-2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export default function YourTeam({ team = [] }) {
  const members = team.filter((item) => item.mentors?.name)
  if (!members.length) return null

  return (
    <JourneySection eyebrow="Who supports you" title="Your Team">
      <div className={styles.teamGrid}>
        {members.map((member) => (
          <article className={styles.teamCard} key={member.id}>
            <span className={styles.teamInitials} aria-hidden>{initials(member.mentors.name)}</span>
            <h3>{member.mentors.name}</h3>
            {member.role ? <span className={styles.teamRole}>{member.role}</span> : null}
            {member.mentors.responsibility ? (
              <p>{member.mentors.responsibility}</p>
            ) : null}
            {member.mentors.timezone ? (
              <span className={styles.teamTimezone}>{member.mentors.timezone}</span>
            ) : null}
          </article>
        ))}
      </div>
    </JourneySection>
  )
}
