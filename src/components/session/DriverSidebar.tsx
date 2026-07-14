'use client'

import RankingBoard from '@/components/RankingBoard'
import StudyTimer from '@/components/StudyTimer'

export default function DriverSidebar() {
  return (
    <aside className="dashboard-panel flex flex-col">
      <div className="flex-shrink-0" style={{ borderBottom: '1px solid var(--divider)' }}>
        <StudyTimer />
      </div>

      <RankingBoard />
    </aside>
  )
}
