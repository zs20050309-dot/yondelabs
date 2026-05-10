import styles from '../../styles/home.module.css'
import { cx, Lang } from './LocalizedText'

export default function WeChatModal({ open, onClose }) {
  if (!open) return null

  return (
    <div className={cx(styles.modal, styles.open)} onClick={onClose}>
      <div className={cx(styles.modalContent, styles.wechatModalContent)} onClick={(event) => event.stopPropagation()}>
        <button className={styles.close} onClick={onClose} type="button" aria-label="Close consultation modal">
          &times;
        </button>
        <h2>
          <Lang zh="预约咨询" en="Schedule Consultation" />
        </h2>
        <p className={styles.wechatInstruction}>
          <Lang zh="添加微信预约一对一咨询" en="Add WeChat to schedule your one-on-one consultation" />
        </p>
        <div className={styles.wechatInfo}>
          <p className={styles.wechatId}>
            <strong>
              <Lang zh="微信号：" en="WeChat ID: " />
            </strong>
            YondeLabs-Abrielle
          </p>
          <div className={styles.wechatQr}>
            <img src="/images/weixin.jpg" alt="WeChat QR Code" />
            <p className={styles.qrLabel}>
              <Lang zh="扫码添加" en="Scan to Add" />
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
