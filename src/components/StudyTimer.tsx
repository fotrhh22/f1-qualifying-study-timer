'use client'
import { useSession } from '@/store/sessionStore'
import { formatStudyTime } from '@/engine/lapTime'

export default function StudyTimer() {
  const session = useSession()

  if (!session) return null

  const elapsed = session.studyElapsedMs
  const target = session.studyTargetMs
  const progress = Math.min(elapsed / target, 1)
  const remaining = Math.max(target - elapsed, 0)
  const isRunning = session.phase === 'RUNNING'
  const isPit = session.userStatus === 'PIT'
  const isFF = session.phase === 'FAST_FORWARD'
  const isFinished = session.phase === 'FINISHED'

  const stateColor = isFinished ? '#00A896'
    : isFF ? '#D06A00'
    : isPit ? '#B8920A'
    : '#C40000'

  return (
    <div className="flex flex-col">
      <div className="px-4 flex flex-col gap-3 items-center justify-center" style={{ minHeight: '130px' }}>
        {/* 상태 배지 */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '6px',
            background: isFinished ? 'rgba(0,168,150,0.12)'
              : isFF ? 'rgba(208,106,0,0.12)'
              : isPit ? 'rgba(184,146,10,0.12)'
              : 'rgba(196,0,0,0.10)',
            border: `1px solid ${stateColor}60`,
          }}
        >
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: stateColor,
              flexShrink: 0,
              ...(isPit || isFF ? { animation: 'pulse-red 1.2s ease-in-out infinite' } : {}),
            }}
          />
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', color: stateColor }}>
            {isFinished ? 'DONE' : isFF ? 'FAST FWD' : isPit ? 'IN PIT' : 'RUNNING'}
          </span>
        </div>

        {/* 메인 타이머 */}
        <div className="flex flex-col items-center">
          <div
            className="font-mono tabular-nums leading-none"
            style={{
              fontSize: '30px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: isFF || isFinished ? 'rgba(255,255,255,0.3)'
                : isPit ? '#FFF200'
                : '#FFFFFF',
            }}
          >
            {formatStudyTime(isFF || isFinished ? target : elapsed)}
          </div>

          <div className="mt-1 text-center" style={{ fontSize: '11px', minHeight: '16px' }}>
            {isRunning && !isPit && (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                {formatStudyTime(remaining)} left
              </span>
            )}
            {isPit && session.pitEndAt && (
              <span style={{ color: '#B8920A', fontFamily: 'monospace', fontWeight: 700 }}>
                {formatStudyTime(Math.max(session.pitEndAt - Date.now(), 0))} left
              </span>
            )}
            {isFF && (
              <span style={{ color: '#D06A00', fontWeight: 700 }}>SESSION ENDED</span>
            )}
          </div>
        </div>

        {/* 진행 바 */}
        <div style={{ width: '100%' }}>
          <div
            style={{
              height: '5px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '99px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: '99px',
                background: stateColor,
                width: `${progress * 100}%`,
                transition: 'width 1s linear',
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontFamily: 'monospace' }}>0:00</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontFamily: 'monospace' }}>
              {formatStudyTime(target)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
