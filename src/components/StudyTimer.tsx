'use client'
import { useEffect, useState } from 'react'
import { useSession } from '@/store/sessionStore'
import { formatStudyTime } from '@/engine/lapTime'

export default function StudyTimer() {
  const session = useSession()
  const [now, setNow] = useState(() => Date.now())

  const pitEndAt = session?.pitEndAt
  const isPitActive = session?.userStatus === 'PIT' && !!pitEndAt

  useEffect(() => {
    if (!isPitActive) return

    setNow(Date.now())
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [isPitActive, pitEndAt])

  if (!session) return null

  const elapsed = Number.isFinite(session.studyElapsedMs) ? Math.max(session.studyElapsedMs, 0) : 0
  const target = Number.isFinite(session.studyTargetMs) ? Math.max(session.studyTargetMs, 0) : 0
  const progress = target > 0 ? Math.min(elapsed / target, 1) : 0
  const remaining = Math.max(target - elapsed, 0)
  const isPit = session.userStatus === 'PIT'
  const isFF = session.phase === 'FAST_FORWARD'
  const isFinished = session.phase === 'FINISHED'

  const stateColor = isFinished ? 'var(--success)'
    : isFF ? 'var(--accent-orange)'
    : isPit ? 'var(--accent-yellow)'
    : 'var(--accent-lime)'

  const pitRemaining = isPit && session.pitEndAt
    ? Math.max(session.pitEndAt - now, 0)
    : 0
  const primaryTime = isPit ? pitRemaining : isFF || isFinished ? elapsed : remaining
  const primaryLabel = isFinished ? 'TOTAL FOCUS'
    : isFF ? 'FOCUS COMPLETE'
    : isPit ? 'BREAK REMAINING'
    : 'REMAINING'
  const statusLabel = isFinished ? 'COMPLETE'
    : isFF ? 'FINISHING'
    : isPit ? 'BREAK'
    : 'FOCUSING'

  return (
    <div className="flex flex-col" style={{ padding: '14px' }}>
      <div className="surface-card flex flex-col gap-4 justify-center" style={{ minHeight: '184px', padding: '14px' }}>
        <div className="flex items-center justify-between">
          <span className="section-label">Focus Timer</span>
          <span className={`status-pill ${isFinished ? 'status-pill--complete' : isFF ? 'status-pill--fast' : isPit ? 'status-pill--break' : 'status-pill--active'}`} style={{ minHeight: '22px', padding: '2px 8px', fontSize: '8px' }}>{statusLabel}</span>
        </div>

        {/* 메인 타이머 */}
        <div className="flex flex-col items-center">
          <div
            className="mono-value leading-none"
            style={{
              fontSize: 'clamp(38px, 3.7vw, 48px)',
              fontWeight: 900,
              color: isFF || isFinished ? 'var(--text-secondary)' : isPit ? 'var(--accent-yellow)' : 'var(--text-primary)',
            }}
          >
            {formatStudyTime(primaryTime)}
          </div>
          <span className="mt-1 section-label" style={{ color: stateColor }}>
            {primaryLabel}
          </span>
        </div>

        {/* 진행 바 */}
        <div style={{ width: '100%' }}>
          <div
            style={{
              height: '5px',
              background: 'var(--border)',
              borderRadius: '99px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: '99px',
                background: isPit ? 'var(--accent-yellow)' : 'var(--accent-red)',
                width: `${progress * 100}%`,
                transition: 'width 1s linear',
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="mono-value" style={{ color: 'var(--text-secondary)', fontSize: '8px' }}>
              {formatStudyTime(elapsed)} ELAPSED
            </span>
            <span className="mono-value" style={{ color: 'var(--text-muted)', fontSize: '8px' }}>
              {formatStudyTime(target)} GOAL
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
