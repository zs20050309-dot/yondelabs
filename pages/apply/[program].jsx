import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import FormWizard from '../../components/apply/FormWizard'
import PortalNavbar from '../../components/portal/PortalNavbar'
import { supabase } from '../../lib/supabaseClient'
import { getSchema } from '../../lib/forms/schema'
import pageStyles from '../../styles/apply.module.css'
import styles from '../../styles/wizard.module.css'

export default function ApplyProgram() {
  const router = useRouter()
  const programKey = router.query.program
  const schema = router.isReady ? getSchema(programKey) : null
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!router.isReady) return undefined
    if (programKey && !schema) {
      router.replace('/apply')
      return undefined
    }

    let cancelled = false
    async function load() {
      try {
        const {
          data: { user: u },
        } = await supabase.auth.getUser()
        if (cancelled) return
        if (!u) {
          router.replace('/login')
          return
        }
        setUser(u)
        setLoading(false)
      } catch {
        if (cancelled) return
        router.replace('/login')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [router, router.isReady, programKey, schema])

  if (!router.isReady || !schema || loading || !user) {
    return (
      <div className={pageStyles.page}>
        <div className={styles.loadingCard}>
          <div className={styles.spinner} aria-hidden />
          <p>Loading your application…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={pageStyles.page}>
      <PortalNavbar user={user} />
      <FormWizard schema={schema} user={user} />
    </div>
  )
}
