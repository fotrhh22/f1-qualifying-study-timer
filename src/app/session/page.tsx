'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useSession, useSessionStore, useTrack } from '@/store/sessionStore'
import { DRIVER_MAP } from '@/data/drivers'
import { DRIVER_FACE } from '@/data/images'
import TrackMap from '@/components/TrackMap'
import StudyTimer from '@/components/StudyTimer'
import RankingBoard from '@/components/RankingBoard'
import BroadcastFeed from '@/components/BroadcastFeed'
import PitModal from '@/components/PitModal'
import ResultsOverlay from '@/components/ResultsOverlay'

export default function SessionPage() {
  const router = useRouter()
  const session = useSession()
  const track = useTrack()
  const { userDnf, skipFF, stopSession } = useSessionStore()

  const [showPitModal, setShowPitModal] = useState(false)
  const [showDnfConfirm, setShowDnfConfirm] = useState(false)
  const [ffMultiplier, setFfMultiplier] = useState(12)

  useEffect(() => {
    if (!session) {
      router.replace('/setup/driver')
    }
  }, [session, router])

  useEffect(() => {
    if (session?.phase === 'FAST_FORWARD') {
      useSessionStore.setState((s) => ({
        session: s.session ? { ...s.session, fastForwardMultiplier: ffMultiplier } : null,
      }))
    }
  }, [ffMultiplier, session?.phase])

  const handleDnfConfirm = useCallback(() => {
    userDnf()
    setShowDnfConfirm(false)
  }, [userDnf])

  const handleExitSession = useCallback(() => {
    stopSession()
    router.replace('/')
  }, [stopSession, router])

  if (!session || !track) return null

  const driverData = DRIVER_MAP[session.userId]
  const isFF = session.phase === 'FAST_FORWARD'
  const isFinished = session.phase === 'FINISHED'
  const isPit = session.userStatus === 'PIT'
  const isApproaching = session.userStatus === 'APPROACHING_PIT'
  const isDnf = session.userStatus === 'DNF'
  const pitButtonLocked = isFF || isFinished || isDnf || isPit || isApproaching
  const dnfButtonLocked = isFF || isFinished || isDnf

  // 유저 레이서 실제 트랙 상태
  const userRacer = session.racers[session.userId]
  const racerStatus = userRacer?.status

  const statusText = isFinished ? 'FINISHED'
    : isFF ? 'FAST FWD'
    : racerStatus === 'DNF' ? 'DNF'
    : (racerStatus === 'FORCED_PIT' || racerStatus === 'IN_PIT') ? 'IN PIT'
    : racerStatus === 'OUT_LAP' ? 'OUT LAP'
    : racerStatus === 'FLYING_LAP' ? 'FLYING'
    : racerStatus === 'COOL_DOWN' ? 'COOL DOWN'
    : '—'

  const statusColor = isFinished ? '#00D2BE'
    : isFF ? '#FF8000'
    : racerStatus === 'DNF' ? '#E10600'
    : (racerStatus === 'FORCED_PIT' || racerStatus === 'IN_PIT') ? '#FFD600'
    : racerStatus === 'FLYING_LAP' ? '#E10600'
    : racerStatus === 'COOL_DOWN' ? 'rgba(255,255,255,0.45)'
    : '#27F4D2'

  // PIT 카운트다운
  const pitRemaining = isPit && session.pitEndAt
    ? Math.max(session.pitEndAt - Date.now(), 0)
    : 0
  const pitMinutes = Math.floor(pitRemaining / 60000)
  const pitSeconds = Math.floor((pitRemaining % 60000) / 1000)

  // APPROACHING_PIT 카운트다운 (초 단위)
  const approachRemaining = isApproaching && session.pitApproachEndAt
    ? Math.max(0, Math.ceil((session.pitApproachEndAt - Date.now()) / 1000))
    : 0

  return (
    <main className="flex flex-col w-screen h-screen overflow-hidden select-none" style={{ background: '#0E0F1A' }}>

      {/* ── 상단 헤더 (60px) ── */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ height: '60px', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#090A14' }}
      >
        {/* 드라이버 정보 */}
        <div className="flex items-center gap-3">
          {/* 드라이버 얼굴 */}
          {DRIVER_FACE[session.userId] && (
            <div
              className="overflow-hidden flex-shrink-0"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: `1.5px solid ${driverData?.teamColor ?? '#fff'}60`,
              }}
            >
              <Image
                src={DRIVER_FACE[session.userId]}
                alt={driverData?.name ?? session.userId}
                width={36}
                height={36}
                style={{ objectFit: 'cover', objectPosition: 'top center' }}
                unoptimized
              />
            </div>
          )}
          <div
            className="w-[3px] rounded-full flex-shrink-0"
            style={{ height: '32px', backgroundColor: driverData?.teamColor ?? '#fff' }}
          />
          <div>
            <div className="text-white font-black tracking-wide leading-none" style={{ fontSize: '15px' }}>
              {driverData?.name ?? session.userId}
            </div>
            <div className="tracking-wider leading-none mt-1 font-bold" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              {driverData?.team}
            </div>
          </div>
        </div>

        {/* 중앙 타이틀 */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-2">
            <div style={{ background: '#E10600', borderRadius: '4px', padding: '2px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="text-white font-black" style={{ fontSize: '9px', lineHeight: 1 }}>F1</span>
            </div>
            <span className="text-white font-black tracking-[0.22em] uppercase" style={{ fontSize: '12px' }}>
              QUALIFYING
            </span>
          </div>
          <span className="font-bold tracking-[0.25em] uppercase" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.38)' }}>
            STUDY TIMER
          </span>
          {isFF && (
            <span className="text-[#FF8000] text-[10px] tracking-widest font-bold animate-pulse-red">
              FAST FORWARD ×{ffMultiplier}
            </span>
          )}
        </div>

        {/* 우측 — 플래그 인디케이터 */}
        <div style={{ width: '80px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {session.currentFlag === 'YELLOW' && (
            <div
              style={{
                padding: '3px 8px',
                borderRadius: '5px',
                background: 'rgba(255,210,0,0.15)',
                border: '1px solid rgba(255,210,0,0.5)',
                fontSize: '10px',
                fontWeight: 900,
                letterSpacing: '0.1em',
                color: '#FFD200',
                animation: 'pulse-red 0.8s ease-in-out infinite',
              }}
            >
              🟡 YELLOW
            </div>
          )}
          {session.currentFlag === 'RED' && (
            <div
              style={{
                padding: '3px 8px',
                borderRadius: '5px',
                background: 'rgba(225,6,0,0.15)',
                border: '1px solid rgba(225,6,0,0.5)',
                fontSize: '10px',
                fontWeight: 900,
                letterSpacing: '0.1em',
                color: '#E10600',
                animation: 'pulse-red 0.8s ease-in-out infinite',
              }}
            >
              🔴 RED FLAG
            </div>
          )}
        </div>
      </div>

      {/* ── 메인 컨텐츠 ── */}
      <div className="flex flex-1 min-h-0">

        {/* 좌측 패널 — STUDY TIMER + TRACK INFO + LIVE RANKING */}
        <div
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{
            width: '248px',
            background: '#0D0E1A',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <StudyTimer />
          </div>
          {/* TRACK INFO 컴팩트 */}
          <div
            className="flex-shrink-0"
            style={{ padding: '9px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              style={{
                fontSize: '9px',
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              TRACK INFO
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.85)', marginBottom: '4px', lineHeight: 1.35 }}>
              {track.flag} {track.name}
              {track.poleDriver && track.poleYear && (
                <span style={{ fontWeight: 600, fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>
                  ({track.gpName.replace(' Grand Prix', ' GP')})
                </span>
              )}
            </div>
            {track.poleDriver && track.poleYear && (
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginBottom: '4px', lineHeight: 1.5 }}>
                <span style={{ color: 'rgba(255,255,255,0.22)', fontWeight: 700, letterSpacing: '0.08em' }}>RECORD</span>
                {' '}
                <span style={{ color: '#FFFFFF', fontWeight: 900, fontFamily: 'monospace' }}>{formatMsToLapTime(track.trackBaseTimeMs)}</span>
                {'  '}
                <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{track.poleDriver}</span>
                {track.poleCar && (
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}> · {track.poleCar}</span>
                )}
                <span style={{ color: 'rgba(255,255,255,0.25)' }}> · {track.poleYear}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{track.lengthKm}km</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{track.turns}T</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color:
                    track.type === 'Street Circuit' ? '#FF8000'
                    : track.type === 'Hybrid Circuit' ? '#00D2BE'
                    : 'rgba(255,255,255,0.35)',
                }}
              >
                {track.type === 'Street Circuit' ? 'STREET'
                  : track.type === 'Hybrid Circuit' ? 'HYBRID'
                  : 'PERM'}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: 'rgba(255,255,255,0.35)',
                }}
              >
                {track.poleDriver ? '' : formatMsToLapTime(track.trackBaseTimeMs)}
              </span>
            </div>
          </div>
          <RankingBoard />
        </div>

        {/* 중앙 — TrackMap */}
        <div className="flex-1 relative overflow-hidden" style={{ background: '#1A1B28' }}>
          <TrackMap />

          {/* FF 배속 조절 + SKIP — 트랙 상단 우측 오버레이 */}
          {isFF && (
            <div
              className="absolute top-4 right-4 flex items-center gap-3"
              style={{ backdropFilter: 'blur(8px)' }}
            >
              {/* 배속 조절 */}
              <div
                className="flex items-center gap-2"
                style={{
                  background: 'rgba(9,10,20,0.90)',
                  border: '1px solid rgba(255,128,0,0.4)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                }}
              >
                <button
                  onClick={() => setFfMultiplier((v) => Math.max(8, v - 1))}
                  className="text-[#FF8000] text-xs font-black w-5 text-center hover:text-white transition-colors"
                >
                  ▼
                </button>
                <span className="text-[#FF8000] text-sm font-black w-8 text-center tabular-nums">
                  ×{ffMultiplier}
                </span>
                <button
                  onClick={() => setFfMultiplier((v) => Math.min(20, v + 1))}
                  className="text-[#FF8000] text-xs font-black w-5 text-center hover:text-white transition-colors"
                >
                  ▲
                </button>
              </div>

              {/* SKIP 버튼 */}
              <button
                onClick={skipFF}
                className="transition-all active:scale-95 hover:opacity-80"
                style={{
                  background: 'rgba(9,10,20,0.90)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  padding: '6px 16px',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                }}
              >
                SKIP →
              </button>
            </div>
          )}
        </div>

        {/* 우측 패널 — 중계 탭 */}
        <BroadcastFeed />
      </div>

      {/* ── 하단 버튼 바 ── */}
      <div
        className="flex-shrink-0"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 48px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: '#090A14',
        }}
      >
        {/* 왼쪽 — 빈 공간 */}
        <div />

        {/* 중앙 — 상태 */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] tracking-widest font-bold uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
            STATUS
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: `${statusColor}18`,
              border: `1px solid ${statusColor}55`,
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: statusColor,
                flexShrink: 0,
                ...(racerStatus === 'FLYING_LAP' || isFF ? { animation: 'pulse-red 0.8s ease-in-out infinite' } : {}),
              }}
            />
            <span
              className="font-black tracking-wider"
              style={{ fontSize: '12px', color: statusColor }}
            >
              {statusText}
            </span>
          </div>
        </div>

        {/* 오른쪽 — PIT IN + DNF 나란히 */}
        <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* PIT IN */}
          <button
            onClick={() => !pitButtonLocked && setShowPitModal(true)}
            disabled={pitButtonLocked}
            className="flex flex-col items-center justify-center transition-all duration-150"
            style={{
              padding: '6px 24px',
              height: '44px',
              border: isApproaching
                ? '1px solid rgba(255,128,0,0.5)'
                : isPit
                ? '1px solid rgba(255,242,0,0.5)'
                : pitButtonLocked
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              background: isApproaching
                ? 'rgba(255,128,0,0.06)'
                : isPit
                ? 'rgba(255,242,0,0.06)'
                : 'transparent',
              cursor: pitButtonLocked ? 'not-allowed' : 'pointer',
            }}
          >
            <span
              className="text-[11px] font-black tracking-widest"
              style={{
                color: isApproaching
                  ? '#FF8000'
                  : isPit
                  ? '#FFF200'
                  : pitButtonLocked
                  ? 'rgba(255,255,255,0.2)'
                  : '#FFFFFF',
              }}
            >
              {isApproaching ? 'PIT IN IN' : 'PIT IN'}
            </span>
            <span
              className="text-[10px] font-mono tabular-nums"
              style={{
                color: isApproaching ? '#FF8000' : isPit ? '#FFF200' : 'rgba(255,255,255,0.25)',
              }}
            >
              {isApproaching
                ? `${approachRemaining}s`
                : isPit
                ? `${String(pitMinutes).padStart(2, '0')}:${String(pitSeconds).padStart(2, '0')}`
                : '──:──'
              }
            </span>
          </button>

          {/* RETIRE */}
          <button
            onClick={() => !dnfButtonLocked && setShowDnfConfirm(true)}
            disabled={dnfButtonLocked}
            className="flex items-center justify-center transition-all duration-150"
            style={{
              padding: '6px 24px',
              height: '44px',
              border: dnfButtonLocked
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(225,6,0,0.4)',
              borderRadius: '10px',
              background: dnfButtonLocked ? 'transparent' : 'rgba(225,6,0,0.07)',
              cursor: dnfButtonLocked ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!dnfButtonLocked) {
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(225,6,0,0.15)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(225,6,0,0.7)'
              }
            }}
            onMouseLeave={(e) => {
              if (!dnfButtonLocked) {
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(225,6,0,0.07)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(225,6,0,0.4)'
              }
            }}
          >
            <span
              className="text-[11px] font-black tracking-widest"
              style={{ color: dnfButtonLocked ? 'rgba(255,255,255,0.2)' : '#E10600' }}
            >
              RETIRE
            </span>
          </button>
        </div>
      </div>

      {/* ── 모달 ── */}
      {showPitModal && <PitModal onClose={() => setShowPitModal(false)} />}

      {showDnfConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowDnfConfirm(false)}
        >
          <div
            className="flex flex-col w-full overflow-hidden"
            style={{
              maxWidth: '480px',
              background: '#17181F',
              borderRadius: '28px 28px 0 0',
              paddingBottom: 'env(safe-area-inset-bottom, 16px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* 본문 */}
            <div style={{ padding: '28px 32px 24px' }}>
              <div
                className="font-black tracking-tight leading-none"
                style={{ fontSize: '32px', color: '#FFFFFF' }}
              >
                리타이어할까요?
              </div>
              <div
                className="mt-3 leading-relaxed"
                style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}
              >
                공부를 중단하고 FAST FORWARD로<br />
                나머지 결과를 확인합니다.
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleDnfConfirm}
                className="w-full transition-all active:scale-[0.97]"
                style={{
                  padding: '18px 0',
                  background: '#E10600',
                  borderRadius: '16px',
                  color: '#FFFFFF',
                  fontSize: '17px',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                RETIRE
              </button>
              <button
                onClick={() => setShowDnfConfirm(false)}
                className="w-full transition-all active:scale-[0.97]"
                style={{
                  padding: '18px 0',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: '17px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                계속하기
              </button>
            </div>
          </div>
        </div>
      )}

      {isFinished && <ResultsOverlay />}
    </main>
  )
}

function InfoRow({ label, value, typeColor }: { label: string; value: string; typeColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[9px] tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>
        {label}
      </span>
      <span
        className="text-[11px] font-bold"
        style={{ color: typeColor ?? 'rgba(255,255,255,0.7)' }}
      >
        {value}
      </span>
    </div>
  )
}

function formatMsToLapTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const millis = Math.floor(ms % 1000)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}
