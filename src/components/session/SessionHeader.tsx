'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { DRIVER_MAP } from '@/data/drivers'
import { DRIVER_FACE } from '@/data/images'
import { useSession, useTrack } from '@/store/sessionStore'

export default function SessionHeader() {
  const session = useSession()
  const track = useTrack()
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const intervalId = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  if (!session || !track) return null

  const driver = DRIVER_MAP[session.userId]

  return (
    <header className="session-header">
      <div className="flex items-center min-w-0" style={{ width: 'fit-content', minWidth: '210px', gap: '14px' }}>
        <div
          className="relative overflow-hidden flex-shrink-0"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: `${driver?.teamColor ?? '#fff'}24`,
            border: `1px solid ${driver?.teamColor ?? 'var(--border)'}`,
          }}
        >
          {DRIVER_FACE[session.userId] && (
            <Image src={DRIVER_FACE[session.userId]} alt={driver?.name ?? session.userId} fill style={{ objectFit: 'cover', objectPosition: 'top center' }} unoptimized />
          )}
        </div>
        <span
          aria-hidden="true"
          style={{
            width: '3px',
            height: '32px',
            flexShrink: 0,
            background: driver?.teamColor ?? 'var(--accent-red)',
          }}
        />
        <div className="min-w-0">
          <div className="truncate" style={{ fontSize: '15px', lineHeight: 1.05, fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>{driver?.name ?? session.userId}</div>
          <div className="truncate" style={{ marginTop: '4px', fontSize: '11px', lineHeight: 1, fontWeight: 750, color: 'var(--text-secondary)' }}>{driver?.team}</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 min-w-0">
        <div className="flex items-center justify-center font-black" style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'var(--brand-red)', fontSize: '11px' }}>
          F1
        </div>
        <div className="min-w-0">
          <div className="truncate" style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '0.02em' }}>QUALIFYING</div>
          <div className="section-label" style={{ marginTop: '2px', fontSize: '8px' }}>STUDY SESSION</div>
        </div>
      </div>

      <div className="min-w-0" style={{ justifySelf: 'end' }}>
        <div className="section-label truncate">{track.gpName}</div>
        <div className="mono-value" style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-primary)' }}>
          {clock.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })} KST
        </div>
      </div>
    </header>
  )
}
