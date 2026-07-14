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
  const remaining = Math.max(session.studyTargetMs - session.studyElapsedMs, 0)
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
  const statusClass = isFinished ? 'status-pill--complete'
    : isFast ? 'status-pill--fast'
    : isDnf ? 'status-pill--danger'
    : isPit || isApproaching ? 'status-pill--break'
    : 'status-pill--active'
  const pitLocked = isFast || isFinished || isDnf || isPit || isApproaching
  const endLocked = isFast || isFinished || isDnf

  return (
    <>
      <div
        className="surface-card"
        style={{
          position: 'fixed',
          zIndex: 30,
          left: '50%',
          bottom: '16px',
          width: 'min(620px, calc(100% - 32px))',
          minHeight: '52px',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '12px',
          padding: '5px 7px 5px 14px',
          transform: 'translateX(-50%)',
          background: 'rgba(19, 25, 37, 0.94)',
          boxShadow: '0 16px 45px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div className="min-w-0">
          <div className="section-label" style={{ fontSize: '8px' }}>{isPit ? 'Break Left' : isFast || isFinished ? 'Total Focus' : 'Focus Left'}</div>
          <div className="mono-value" style={{ marginTop: '3px', fontSize: '13px', fontWeight: 850 }}>
            {formatStudyTime(isPit ? pitRemaining : isFast || isFinished ? session.studyElapsedMs : remaining)}
          </div>
        </div>

        <span className={`status-pill ${statusClass}`}>{statusText}</span>

        {isFast ? (
          <div className="flex items-center justify-end gap-2">
            <div className="control-button" style={{ minHeight: '40px', gap: '10px', padding: '0 10px' }}>
              <button onClick={() => setFfMultiplier((value) => Math.max(8, value - 1))} aria-label="Decrease fast forward">−</button>
              <span className="mono-value" style={{ color: 'var(--accent-orange)' }}>×{ffMultiplier}</span>
              <button onClick={() => setFfMultiplier((value) => Math.min(20, value + 1))} aria-label="Increase fast forward">+</button>
            </div>
            <button onClick={skipFF} className="control-button" style={{ minHeight: '40px' }}>Skip</button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => !pitLocked && setShowPitModal(true)} disabled={pitLocked} className="control-button control-button--pit flex-col" style={{ minHeight: '40px', lineHeight: 1.05 }}>
              <span>{isApproaching ? `PIT IN ${approachRemaining}s` : isPit ? formatStudyTime(pitRemaining) : 'Take a Break'}</span>
              {!isApproaching && !isPit && <span style={{ marginTop: '2px', fontSize: '8px', opacity: 0.58 }}>PIT IN</span>}
            </button>
            <button onClick={() => !endLocked && setShowEndDialog(true)} disabled={endLocked} className="control-button control-button--danger flex-col" style={{ minHeight: '40px', lineHeight: 1.05 }}>
              <span>End Session</span>
              <span style={{ marginTop: '2px', fontSize: '8px', opacity: 0.65 }}>RETIRE</span>
            </button>
          </div>
        )}
      </div>

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
          <div className="section-label" style={{ color: 'var(--accent-red)' }}>Retire from session</div>
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
