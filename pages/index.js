import Head from 'next/head'
import { useCallback, useEffect, useRef, useState } from 'react'
import Achievements from '../components/home/Achievements'
import AnnouncementBanner from '../components/home/AnnouncementBanner'
import Footer, { FinalCta } from '../components/home/Footer'
import Hero from '../components/home/Hero'
import LabShowcase from '../components/home/LabShowcase'
import Navbar from '../components/home/Navbar'
import { PartnerLabs, PartnerUniversities } from '../components/home/PartnerSections'
import { LongTermValue, OurProcess } from '../components/home/ProcessAndValue'
import Programs from '../components/home/Programs'
import ResearchAreas from '../components/home/ResearchAreas'
import styles from '../styles/home.module.css'
import { cx } from '../components/home/LocalizedText'

const initialLab = { src: '/images/mit-media-lab.jpg', alt: 'MIT Media Lab' }

export default function Home() {
  const [announcementVisible, setAnnouncementVisible] = useState(true)
  const [activeLab, setActiveLab] = useState(initialLab)
  const heroRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.pageYOffset * 0.5}px)`
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.animated)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    document.querySelectorAll('[data-animate]').forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const handleAnchorClick = useCallback((event) => {
    const href = event.currentTarget.getAttribute('href')
    if (!href || !href.startsWith('#')) return

    const target = document.querySelector(href)
    if (!target) return

    event.preventDefault()
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - 20

    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    })
  }, [])

  return (
    <>
      <Head>
        <title>Yonde Labs</title>
        <link rel="icon" type="image/png" href="/images/logos/yondelabs-w.png" />
      </Head>

      <div className={cx(styles.homePage, styles.en)}>
        {announcementVisible ? <AnnouncementBanner onClose={() => setAnnouncementVisible(false)} /> : null}
        <Navbar
          onAnchorClick={handleAnchorClick}
        />
        <Hero heroRef={heroRef} />
        <PartnerUniversities />
        <LabShowcase activeLab={activeLab} onSelectLab={setActiveLab} />
        <PartnerLabs />
        <Programs />
        <ResearchAreas />
        <Achievements />
        <OurProcess />
        <LongTermValue />
        <FinalCta />
        <Footer onAnchorClick={handleAnchorClick} />
      </div>
    </>
  )
}
