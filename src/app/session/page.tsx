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
    <main className="dashboard-shell flex h-screen w-screen flex-col overflow-hidden select-none" style={{ padding: '16px 20px 82px', gap: '16px' }}>
      <SessionHeader />

      <div className="dashboard-grid flex-1">
        <DriverSidebar />
        <CircuitPanel />
        <div className="dashboard-broadcast min-w-0 min-h-0">
          <BroadcastFeed />
        </div>
      </div>

      <SessionControlDock />
      {session.phase === 'FINISHED' && <ResultsOverlay />}
    </main>
  )
}
