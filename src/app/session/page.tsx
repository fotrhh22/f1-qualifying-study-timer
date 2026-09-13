'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BroadcastFeed from '@/components/BroadcastFeed'
import ResultsOverlay from '@/components/ResultsOverlay'
import CircuitPanel from '@/components/session/CircuitPanel'
import DriverSidebar from '@/components/session/DriverSidebar'
import SessionControlDock from '@/components/session/SessionControlDock'
import SessionHeader from '@/components/session/SessionHeader'
import { useSession } from '@/store/sessionStore'

export default function SessionPage() {
  const router = useRouter()
  const session = useSession()

  useEffect(() => {
    if (!session) router.replace('/setup/driver')
  }, [router, session])

  if (!session) return null

  return (
    <main className="dashboard-shell session-frame select-none">
      <div className="session-top-rule" aria-hidden="true" />
      <SessionHeader />

      <div className="session-grid">
        <DriverSidebar />
        <CircuitPanel />
        <div className="dashboard-broadcast session-content-above-rail min-w-0 min-h-0" style={{ borderLeft: '1px solid var(--session-rule-strong)' }}>
          <BroadcastFeed />
        </div>
      </div>

      <SessionControlDock />
      {session.phase === 'FINISHED' && <ResultsOverlay />}
    </main>
  )
}
