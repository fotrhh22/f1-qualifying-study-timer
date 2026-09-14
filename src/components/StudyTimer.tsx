'use client'
import { useSession } from '@/store/sessionStore'
import { formatStudyTime } from '@/engine/lapTime'

export default function StudyTimer() {
  const session = useSession()

  if (!session) return null

  const focusElapsed = Number.isFinite(session.focusElapsedMs) ? Math.max(session.focusElapsedMs, 0) : 0
  const sessionElapsed = Number.isFinite(session.sessionElapsedMs) ? Math.max(session.sessionElapsedMs, 0) : 0
  const sessionTarget = Number.isFinite(session.sessionTargetMs) ? Math.max(session.sessionTargetMs, 0) : 0
  const sessionRemaining = Math.max(sessionTarget - sessionElapsed, 0)
  const remainingProgress = sessionTarget > 0 ? Math.min(sessionRemaining / sessionTarget, 1) : 0
  const isUserBreak = session.userStatus === 'PIT' || session.userStatus === 'APPROACHING_PIT'
  const isFF = session.phase === 'FAST_FORWARD'
  const isFinished = session.phase === 'FINISHED'

  const stateColor = isFinished ? 'var(--success)'
    : isFF ? 'var(--accent-orange)'
    : isUserBreak ? 'var(--accent-yellow)'
    : 'var(--accent-lime)'

  const primaryLabel = isFinished ? 'TOTAL FOCUS'
    : isFF ? 'FOCUS COMPLETE'
    : isUserBreak ? 'FOCUS PAUSED'
    : 'FOCUSED'
  const statusLabel = isFinished ? 'COMPLETE'
    : isFF ? 'FINISHING'
    : isUserBreak ? 'BREAK'
    : 'FOCUSING'

  return (
    <div className="flex flex-col justify-center" style={{ minHeight: '190px', padding: '18px 16px 16px' }}>
      <div className="flex items-center justify-between">
        <span className="section-label">Focus Timer</span>
        <span className={`session-status ${isFinished ? 'session-status--complete' : isFF ? 'session-status--fast' : isUserBreak ? 'session-status--break' : 'session-status--active'}`}>
          {statusLabel}
        </span>
      </div>

      <div style={{ marginTop: '23px' }}>
        <div
          className="mono-value leading-none"
          style={{
            fontSize: 'clamp(35px, 3.25vw, 47px)',
            fontWeight: 900,
            color: isFF || isFinished ? 'var(--text-secondary)' : isUserBreak ? 'var(--accent-yellow)' : 'var(--text-primary)',
          }}
        >
          {formatStudyTime(focusElapsed)}
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
              background: isUserBreak ? 'var(--accent-yellow)' : 'var(--accent-red)',
              width: `${remainingProgress * 100}%`,
              transition: 'width 1s linear',
            }}
          />
        </div>
        <div className="flex justify-between" style={{ marginTop: '7px' }}>
          <span className="mono-value" style={{ color: 'var(--text-secondary)', fontSize: '8px' }}>
            {formatStudyTime(sessionRemaining)} SESSION LEFT
          </span>
          <span className="mono-value" style={{ color: 'var(--text-muted)', fontSize: '8px' }}>
            {formatStudyTime(sessionTarget)} TOTAL
          </span>
        </div>
      </div>
    </div>
  )
}
