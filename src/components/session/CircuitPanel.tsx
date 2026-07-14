'use client'

import { useMemo } from 'react'
import TrackMap from '@/components/TrackMap'
import { computeRanking, useRacers, useSession, useTrack } from '@/store/sessionStore'
import { formatGap, formatLapTime } from '@/engine/lapTime'

export default function CircuitPanel() {
  const session = useSession()
  const track = useTrack()
  const racers = useRacers()
  const ranking = useMemo(() => racers ? computeRanking(racers) : [], [racers])

  if (!session || !track) return null

  const userEntry = ranking.find((entry) => entry.isUser)
  const leader = ranking[0]
  const typeLabel = track.type === 'Street Circuit' ? 'STREET'
    : track.type === 'Hybrid Circuit' ? 'HYBRID'
    : 'PERMANENT'
  const recordMeta = [
    formatLapTime(track.trackBaseTimeMs),
    track.poleDriver,
    track.poleCar,
    track.poleYear,
  ].filter((value) => value != null && value !== '')

  return (
    <section className="dashboard-panel flex flex-col">
      <div className="flex items-start justify-between gap-4 flex-shrink-0" style={{ padding: '17px 20px 9px' }}>
        <div className="min-w-0">
          <div className="section-label">Live Circuit</div>
          <h1 className="truncate" style={{ marginTop: '5px', fontSize: '20px', lineHeight: 1.1, fontWeight: 900, letterSpacing: '-0.02em' }}>{track.name}</h1>
          <div className="flex flex-wrap items-center gap-x-2" style={{ marginTop: '7px', fontSize: '8px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
            <span>{track.lengthKm} KM</span>
            <span style={{ color: 'var(--text-disabled)' }}>·</span>
            <span>{track.turns} TURNS</span>
            <span style={{ color: 'var(--text-disabled)' }}>·</span>
            <span>{typeLabel}</span>
          </div>
          <div
            className="mono-value truncate"
            style={{ marginTop: '6px', fontSize: '8px', fontWeight: 650, color: 'var(--text-muted)', letterSpacing: '0.025em' }}
            title={`Record ${recordMeta.join(' · ')}`}
          >
            <span style={{ marginRight: '7px', color: 'var(--text-disabled)', fontFamily: 'inherit', letterSpacing: '0.09em' }}>RECORD</span>
            {recordMeta.join(' · ')}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="metric-card">
            <span className="section-label" style={{ fontSize: '8px' }}>Fastest Lap</span>
            <span className="mono-value" style={{ fontSize: '11px', fontWeight: 850, color: 'var(--accent-lime)' }}>
              {leader?.bestLap ? formatLapTime(leader.bestLap) : '—'}
            </span>
          </div>
          <div className="metric-card">
            <span className="section-label" style={{ fontSize: '8px' }}>Your Current Gap</span>
            <span className="mono-value" style={{ fontSize: '11px', fontWeight: 850 }}>
              {userEntry?.gap != null ? formatGap(userEntry.gap) : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 min-h-0" style={{ margin: '0 8px 8px', overflow: 'hidden', borderRadius: '15px' }}>
        <TrackMap />
      </div>
    </section>
  )
}
