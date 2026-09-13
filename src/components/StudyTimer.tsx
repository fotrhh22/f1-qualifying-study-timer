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
    <div className="flex flex-col justify-center" style={{ minHeight: '190px', padding: '18px 16px 16px' }}>
      <div className="flex items-center justify-between">
        <span className="section-label">Focus Timer</span>
        <span className={`session-status ${isFinished ? 'session-status--complete' : isFF ? 'session-status--fast' : isPit ? 'session-status--break' : 'session-status--active'}`}>
          {statusLabel}
        </span>
      </div>

      <div style={{ marginTop: '23px' }}>
        <div
          className="mono-value leading-none"
          style={{
            fontSize: 'clamp(35px, 3.25vw, 47px)',
            fontWeight: 900,
            color: isFF || isFinished ? 'var(--text-secondary)' : isPit ? 'var(--accent-yellow)' : 'var(--text-primary)',
          }}
        >
          {formatStudyTime(primaryTime)}
        </div>
        <span className="section-label" style={{ display: 'block', marginTop: '7px', color: stateColor }}>
          {primaryLabel}
        </span>
      </div>

      <div style={{ width: '100%', marginTop: '24px' }}>
        <div style={{ height: '3px', background: 'var(--border)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              background: isPit ? 'var(--accent-yellow)' : 'var(--accent-red)',
              width: `${progress * 100}%`,
              transition: 'width 1s linear',
            }}
          />
        </div>
        <div className="flex justify-between" style={{ marginTop: '7px' }}>
          <span className="mono-value" style={{ color: 'var(--text-secondary)', fontSize: '8px' }}>
            {formatStudyTime(elapsed)} ELAPSED
          </span>
          <span className="mono-value" style={{ color: 'var(--text-muted)', fontSize: '8px' }}>
            {formatStudyTime(target)} GOAL
          </span>
        </div>
      </div>
    </div>
  )
}
