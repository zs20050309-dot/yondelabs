import styles from '../../styles/home.module.css'
import { Lang } from './LocalizedText'

const steps = [
  [
    '01',
    '提交申请',
    'Application Submission',
    '填写在线申请表，告诉我们你的学术背景、兴趣和目标。',
    'Complete the online application to tell us about your academic background, interests, and goals.',
  ],
  [
    '02',
    '初步沟通',
    'Initial Outreach',
    '审核申请后，我们的团队将与你联系，进一步了解你的兴趣和时间安排。',
    'After reviewing your application, our team will reach out to learn more about your interests and availability.',
  ],
  [
    '03',
    '博士面试',
    'PhD Interview',
    '入围候选人将与博士导师进行一对一面试，探讨你的动机、技能和潜在研究方向。',
    'Shortlisted candidates will interview one-on-one with a PhD mentor to explore your motivation, skills, and potential research directions.',
  ],
  [
    '04',
    '课题匹配与录取',
    'Topic Matching & Admission',
    '根据面试和你的兴趣，我们将设计符合你目标的定制化项目。条件录取后需支付 30% 项目费用，若无法匹配将全额退还。',
    "Based on your interview and interests, we'll design a customized placement that aligns with your goals. A 30% program fee is required upon conditional admission - fully refunded if no suitable match is found.",
  ],
]

const timeline = [
  ['项目期间', 'During Program', '4-8周沉浸式科研', '4-8 weeks immersive research'],
  ['项目结束', 'After Program', '成果发表与完善', 'Publication & refinement'],
  ['大学申请', 'College Applications', '推荐信与材料支持', 'Recommendation letters & support'],
  ['终身连接', 'Lifetime Connection', '持续mentorship', 'Ongoing mentorship'],
]

export function OurProcess() {
  return (
    <section className={styles.ourProcess} data-animate>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Lang zh="申请流程" en="Our Process" />
          </h2>
          <p className={styles.sectionSubtitle}>
            <Lang
              zh="从申请到实地科研体验，我们与每位学生的合作流程。"
              en="From application to in-person research experience, here's how we work with every student."
            />
          </p>
        </div>

        <div className={styles.processTimeline}>
          {steps.map(([number, titleZh, titleEn, descZh, descEn]) => (
            <div className={styles.processStep} key={number}>
              <div className={styles.stepNumber}>{number}</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>
                  <Lang zh={titleZh} en={titleEn} />
                </h3>
                <p className={styles.stepDescription}>
                  <Lang zh={descZh} en={descEn} />
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LongTermValue() {
  return (
    <section className={styles.longTermValue} data-animate>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Lang zh="构建终身科研网络" en="Lifetime Academic Network" />
          </h2>
          <p className={styles.sectionSubtitle}>
            <Lang zh="科研之旅的每一步都有我们陪伴" en="We're with you every step of the way" />
          </p>
        </div>

        <div className={styles.valueTimeline}>
          {timeline.map(([titleZh, titleEn, bodyZh, bodyEn], index) => (
            <FragmentWithArrow
              key={titleEn}
              titleZh={titleZh}
              titleEn={titleEn}
              bodyZh={bodyZh}
              bodyEn={bodyEn}
              showArrow={index < timeline.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FragmentWithArrow({ titleZh, titleEn, bodyZh, bodyEn, showArrow }) {
  return (
    <>
      <div className={styles.timelineStage}>
        <h4>
          <Lang zh={titleZh} en={titleEn} />
        </h4>
        <p>
          <Lang zh={bodyZh} en={bodyEn} />
        </p>
      </div>
      {showArrow ? <div className={styles.timelineArrow}>→</div> : null}
    </>
  )
}
