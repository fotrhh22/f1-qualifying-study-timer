'use client'

import { useCallback, useEffect, useState } from 'react'
import PitModal from '@/components/PitModal'
import { formatStudyTime } from '@/engine/lapTime'
import { useSession, useSessionStore } from '@/store/sessionStore'

export default function SessionControlDock() {
  const session = useSession()
  const { userDnf, skipFF } = useSessionStore()
  const [showPitModal, setShowPitModal] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [ffMultiplier, setFfMultiplier] = useState(12)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!session || (session.userStatus !== 'PIT' && session.userStatus !== 'APPROACHING_PIT')) return
    setNow(Date.now())
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [session?.userStatus, session?.pitEndAt, session?.pitApproachEndAt])

  useEffect(() => {
    if (session?.phase !== 'FAST_FORWARD') return
    useSessionStore.setState((state) => ({
      session: state.session ? { ...state.session, fastForwardMultiplier: ffMultiplier } : null,
    }))
  }, [ffMultiplier, session?.phase])

  const confirmEnd = useCallback(() => {
    userDnf()
    setShowEndDialog(false)
  }, [userDnf])

  if (!session) return null

  const racer = session.racers[session.userId]
  const isFast = session.phase === 'FAST_FORWARD'
  const isFinished = session.phase === 'FINISHED'
  const isPit = session.userStatus === 'PIT'
  const isApproaching = session.userStatus === 'APPROACHING_PIT'
  const isDnf = session.userStatus === 'DNF'
  const pitRemaining = isPit && session.pitEndAt ? Math.max(session.pitEndAt - now, 0) : 0
  const approachRemaining = isApproaching && session.pitApproachEndAt ? Math.max(Math.ceil((session.pitApproachEndAt - now) / 1000), 0) : 0
  const statusText = isFinished ? 'FINISHED'
    : isFast ? 'FAST FWD'
    : racer?.status === 'DNF' ? 'DNF'
    : racer?.status === 'FORCED_PIT' || racer?.status === 'IN_PIT' ? 'IN PIT'
    : racer?.status === 'OUT_LAP' ? 'OUT LAP'
    : racer?.status === 'FLYING_LAP' ? 'FLYING'
    : racer?.status === 'COOL_DOWN' ? 'COOL DOWN'
    : 'ON TRACK'
  const statusClass = isFinished ? 'session-status--complete'
    : isFast ? 'session-status--fast'
    : isDnf ? 'session-status--danger'
    : isPit || isApproaching ? 'session-status--break'
    : 'session-status--active'
  const pitLocked = isFast || isFinished || isDnf || isPit || isApproaching
  const endLocked = isFast || isFinished || isDnf

  return (
    <>
      <footer className="session-command-rail">
        <div className="session-command-rail__status">
          <span className={`session-status ${statusClass}`}>{statusText}</span>
        </div>

        {isFast ? (
          <div className="session-command-rail__actions">
            <div className="session-segmented-control">
              <button onClick={() => setFfMultiplier((value) => Math.max(8, value - 1))} aria-label="Decrease fast forward">−</button>
              <span className="mono-value">×{ffMultiplier}</span>
              <button onClick={() => setFfMultiplier((value) => Math.min(20, value + 1))} aria-label="Increase fast forward">+</button>
            </div>
            <button onClick={skipFF} className="session-command">Skip to results</button>
          </div>
        ) : (
          <div className="session-command-rail__actions">
            <button onClick={() => !pitLocked && setShowPitModal(true)} disabled={pitLocked} className="session-command session-command--pit" style={{ lineHeight: 1.05 }}>
              <span>{isApproaching ? `PIT IN ${approachRemaining}s` : isPit ? formatStudyTime(pitRemaining) : 'Take a Break'}</span>
              {!isApproaching && !isPit && <span style={{ marginTop: '2px', fontSize: '8px', opacity: 0.58 }}>PIT IN</span>}
            </button>
            <button onClick={() => !endLocked && setShowEndDialog(true)} disabled={endLocked} className="session-command session-command--danger" style={{ lineHeight: 1.05 }}>
              <span>End Session</span>
              <span style={{ marginTop: '2px', fontSize: '8px', opacity: 0.65 }}>RETIRE</span>
            </button>
          </div>
        )}
      </footer>

      {showPitModal && <PitModal onClose={() => setShowPitModal(false)} />}
      {showEndDialog && <EndSessionDialog onCancel={() => setShowEndDialog(false)} onConfirm={confirmEnd} />}
    </>
  )
}

function EndSessionDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div className="dialog-overlay animate-fade-in" onClick={onCancel} role="presentation">
      <div className="dialog-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="end-session-title">
        <div style={{ padding: '28px 28px 22px' }}>
          <div className="section-label" style={{ color: 'var(--brand-red)' }}>Retire from session</div>
          <h2 id="end-session-title" style={{ marginTop: '8px', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em' }}>공부를 끝낼까요?</h2>
          <p style={{ marginTop: '10px', fontSize: '13px', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
            현재 집중 세션을 종료하고 FAST FORWARD로 나머지 퀄리파잉 결과를 확인합니다.
          </p>
        </div>
        <div className="flex gap-3" style={{ padding: '0 20px 20px' }}>
          <button onClick={onCancel} className="control-button flex-1">계속하기</button>
          <button onClick={onConfirm} className="control-button control-button--danger flex-1">End Session</button>
        </div>
      </div>
    </div>
  )
}
