'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useSetupStore } from '@/store/setupStore'
import { useSessionStore } from '@/store/sessionStore'
import { DRIVERS } from '@/data/drivers'
import { TRACKS } from '@/data/tracks'
import { DRIVER_FACE } from '@/data/images'

const PRESET_MINUTES = [25, 50, 60, 90]

export default function SetupTimePage() {
  const router = useRouter()
  const { driverId, trackId, studyMinutes, setStudyMinutes } = useSetupStore()
  const startSession = useSessionStore((s) => s.startSession)

  const [isCustom, setIsCustom] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [showMinInfo, setShowMinInfo] = useState(false)

  useEffect(() => {
    if (!driverId || !trackId) {
      router.replace('/setup/driver')
    }
  }, [driverId, trackId, router])

  useEffect(() => {
    if (!showMinInfo) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMinInfo(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showMinInfo])

  if (!driverId || !trackId) {
    return null
  }

  const selectedDriver = DRIVERS.find((d) => d.id === driverId)
  const selectedTrack = TRACKS.find((t) => t.id === trackId)

  const minMinutes = 10

  const handlePreset = (min: number) => {
    setIsCustom(false)
    setCustomInput('')
    setStudyMinutes(min)
  }

  const handleCustomInput = (val: string) => {
    setCustomInput(val)
    const num = parseInt(val)
    if (!isNaN(num) && num >= minMinutes && num <= 300) {
      setStudyMinutes(num)
    } else {
      setStudyMinutes(null)
    }
  }

  const handleStart = () => {
    if (!driverId || !trackId || !studyMinutes) return
    startSession(driverId, trackId, studyMinutes * 60 * 1000)
    router.push('/session')
  }

  const canStart = !!driverId && !!trackId && !!studyMinutes && studyMinutes >= minMinutes
  const faceImg = driverId ? DRIVER_FACE[driverId] : null

  const hh = studyMinutes ? String(Math.floor(studyMinutes / 60)).padStart(2, '0') : '--'
  const mm = studyMinutes ? String(studyMinutes % 60).padStart(2, '0') : '--'

  return (
    <main
      className="flex flex-col w-screen h-screen overflow-hidden"
      style={{ background: '#0D0D12' }}
    >
      <div className="h-[3px] bg-[#E10600]" />

      {/* 헤더 */}
      <div
        className="flex items-center justify-center px-8 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <StepIndicator current={3} />
      </div>

      {/* 스크롤 가능한 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="flex flex-col items-center px-8"
          style={{ paddingTop: '40px', paddingBottom: '40px', gap: '32px', minHeight: '100%', justifyContent: 'center' }}
        >

          {/* 로고 */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center"
                style={{ width: '52px', height: '52px', background: '#E10600', borderRadius: '12px' }}
              >
                <span className="text-white font-black" style={{ fontSize: '18px' }}>F1</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-white font-black tracking-[0.2em] uppercase leading-none" style={{ fontSize: '24px' }}>
                  QUALIFYING
                </span>
                <span className="font-bold tracking-[0.3em] uppercase leading-none" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>
                  STUDY TIMER
                </span>
              </div>
            </div>
          </div>

          {/* 선택 요약 — 드라이버 + 서킷 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#17171C',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              width: '100%',
              maxWidth: '520px',
            }}
          >
            {/* 드라이버 섹션 */}
            <div
              className="relative overflow-hidden"
              style={{
                padding: '14px 0 14px 16px',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                minHeight: '84px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  background: selectedDriver?.teamColor,
                }}
              />
              <div style={{ paddingLeft: '6px', paddingRight: faceImg ? '70px' : '12px' }}>
                <div className="text-[10px] tracking-widest uppercase font-bold mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Driver
                </div>
                <div className="text-white text-[14px] font-bold leading-none truncate">{selectedDriver?.name}</div>
                <div className="text-[10px] mt-1 font-bold" style={{ color: selectedDriver?.teamColor, opacity: 0.8 }}>
                  {selectedDriver?.team}
                </div>
              </div>
              {faceImg && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      right: '60px',
                      top: 0,
                      bottom: 0,
                      width: '22px',
                      background: 'linear-gradient(to right, #17171C, transparent)',
                      zIndex: 1,
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '68px',
                      overflow: 'hidden',
                    }}
                  >
                    <Image
                      src={faceImg}
                      alt={selectedDriver?.name ?? ''}
                      fill
                      style={{ objectFit: 'cover', objectPosition: 'top center', opacity: 0.9 }}
                      unoptimized
                    />
                  </div>
                </>
              )}
            </div>

            {/* 트랙 섹션 */}
            <div
              className="relative overflow-hidden"
              style={{ padding: '14px 0 14px 14px', minHeight: '84px' }}
            >
              <div style={{ paddingRight: '76px' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base leading-none flex-shrink-0">{selectedTrack?.flag}</span>
                  <span className="text-[10px] tracking-widest uppercase font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Circuit
                  </span>
                </div>
                <div className="text-white text-[13px] font-bold leading-none truncate">
                  {selectedTrack?.gpName.replace(' Grand Prix', '').replace(' GP', '')}
                </div>
                <div className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {selectedTrack?.lengthKm}km · {selectedTrack?.turns}T
                </div>
              </div>
              {selectedTrack && (
                <div
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: 0,
                    bottom: 0,
                    width: '70px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    viewBox={selectedTrack.viewBox}
                    style={{ width: '64px', height: '64px' }}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d={selectedTrack.svgPath}
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="18"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={selectedTrack.svgPath}
                      stroke="rgba(255,255,255,0.7)"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* 시간 선택 */}
          <div className="flex flex-col items-center gap-5 w-full max-w-[520px]">
            <div className="text-center">
              <div className="text-[11px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                STEP 3
              </div>
              <h2 className="text-white text-2xl font-black tracking-widest uppercase">
                SET STUDY TIME
              </h2>
            </div>

            {/* 최소 시간 안내 — 클릭 시 이유 팝업 */}
            <button
              onClick={() => setShowMinInfo(true)}
              style={{
                padding: '7px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.38)',
                letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
            >
              최소 <span style={{ color: '#FF8000', fontWeight: 700 }}>{minMinutes}min</span> <span style={{ color: 'rgba(255,255,255,0.2)' }}>?</span>
            </button>

            {/* 프리셋 */}
            <div className="flex gap-3">
              {PRESET_MINUTES.map((min) => {
                const isActive = !isCustom && studyMinutes === min
                const isDisabled = min < minMinutes
                return (
                  <button
                    key={min}
                    onClick={() => !isDisabled && handlePreset(min)}
                    disabled={isDisabled}
                    className="flex flex-col items-center justify-center transition-all duration-150"
                    style={{
                      width: '88px',
                      height: '80px',
                      background: isDisabled ? 'rgba(255,255,255,0.01)' : isActive ? 'rgba(225,6,0,0.1)' : 'rgba(255,255,255,0.03)',
                      border: isDisabled ? '1px solid rgba(255,255,255,0.04)' : isActive ? '1px solid rgba(225,6,0,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px',
                      gap: '4px',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.35 : 1,
                    }}
                  >
                    <span className="text-2xl font-black" style={{ color: isDisabled ? 'rgba(255,255,255,0.25)' : isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }}>
                      {min}
                    </span>
                    <span className="text-[10px] tracking-wider uppercase" style={{ color: isDisabled ? 'rgba(255,255,255,0.12)' : isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }}>
                      min
                    </span>
                  </button>
                )
              })}
              <button
                onClick={() => { setIsCustom(true); setStudyMinutes(null); setCustomInput('') }}
                className="flex flex-col items-center justify-center transition-all duration-150"
                style={{
                  width: '88px',
                  height: '80px',
                  background: isCustom ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                  border: isCustom ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px',
                }}
              >
                <span className="text-[11px] font-black tracking-wider" style={{ color: isCustom ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }}>
                  CUSTOM
                </span>
              </button>
            </div>

            {isCustom && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={minMinutes}
                    max={300}
                    value={customInput}
                    onChange={(e) => handleCustomInput(e.target.value)}
                    placeholder={String(minMinutes)}
                    autoFocus
                    className="text-white text-center text-xl font-bold focus:outline-none"
                    style={{
                      width: '96px',
                      height: '48px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                    }}
                  />
                  <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>minutes</span>
                </div>
                {customInput && parseInt(customInput) < minMinutes && (
                  <span style={{ fontSize: '11px', color: '#E10600', fontWeight: 600 }}>
                    최소 {minMinutes}min 이상 입력
                  </span>
                )}
              </div>
            )}

            {/* 선택된 시간 표시 */}
            <div
              className="font-black tabular-nums font-mono"
              style={{
                fontSize: '52px',
                letterSpacing: '-0.02em',
                color: canStart ? '#E10600' : 'rgba(255,255,255,0.1)',
              }}
            >
              {hh}:{mm}
            </div>
          </div>

          {/* 네비게이션 버튼 — 콘텐츠 흐름 안에 배치 */}
          <div
            className="flex items-center gap-3"
            style={{ width: '100%', maxWidth: '520px' }}
          >
            <button
              onClick={() => router.push('/setup/track')}
              className="transition-all duration-150 active:scale-95 flex-shrink-0"
              style={{
                padding: '16px 28px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '12px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '0.12em',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'
                ;(e.currentTarget as HTMLElement).style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)'
                ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'
              }}
            >
              ← BACK
            </button>

            <button
              onClick={handleStart}
              disabled={!canStart}
              className="transition-all duration-150 active:scale-95 flex-1"
              style={{
                padding: '16px 0',
                background: canStart ? '#E10600' : 'rgba(255,255,255,0.05)',
                border: '1px solid transparent',
                borderRadius: '12px',
                color: canStart ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                fontSize: '14px',
                fontWeight: '900',
                letterSpacing: '0.2em',
                cursor: canStart ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={(e) => {
                if (canStart) (e.currentTarget as HTMLElement).style.background = '#FF1800'
              }}
              onMouseLeave={(e) => {
                if (canStart) (e.currentTarget as HTMLElement).style.background = '#E10600'
              }}
            >
              START QUALIFYING
            </button>
          </div>

        </div>
      </div>

      {/* 최소 시간 안내 다이얼로그 */}
      {showMinInfo && (
        <div
          className="dialog-overlay animate-fade-in"
          onClick={() => setShowMinInfo(false)}
          role="presentation"
        >
          <div
            className="dialog-panel regulation-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="regulation-title"
          >
            {/* 헤더 */}
            <div className="guide-dialog__header">
              <div
                className="guide-dialog__eyebrow"
                style={{ color: '#FF8000' }}
              >
                FIA Regulation
              </div>
              <h2 id="regulation-title" className="guide-dialog__title">
                왜 최소 10분인가요?
              </h2>
            </div>

            {/* 본문 */}
            <div className="guide-dialog__body">
              <div className="regulation-flow" aria-hidden="true">
                <span className="regulation-flow__step">PIT EXIT</span>
                <span className="regulation-flow__arrow">→</span>
                <span className="regulation-flow__step">OUT LAP</span>
                <span className="regulation-flow__arrow">→</span>
                <span className="regulation-flow__step" style={{ color: '#FF8000' }}>FLYING LAP</span>
                <span className="regulation-flow__arrow">→</span>
                <span className="regulation-flow__step">IN LAP</span>
              </div>

              <div className="guide-card" style={{ borderLeftColor: '#FF8000' }}>
                <div className="guide-card__header">
                  <span className="guide-card__name">실제 퀄리파잉 랩 사이클</span>
                  <span className="guide-card__tag" style={{ color: '#FF8000' }}>4~6 MIN</span>
                </div>
                <p className="guide-card__desc">
                  드라이버가 피트에서 출차하여 타이어 웜업(Out Lap) 후 공식 랩타임(Flying Lap)을 완주하기까지 1회 런에 평균 4~6분이 소요됩니다.
                </p>
              </div>

              <div className="guide-card" style={{ borderLeftColor: '#FFFFFF' }}>
                <div className="guide-card__header">
                  <span className="guide-card__name">최소 퀄리파잉 세션 권장치</span>
                  <span className="guide-card__tag" style={{ color: '#FFFFFF' }}>10 MIN MINIMUM</span>
                </div>
                <p className="guide-card__desc">
                  22명의 AI 드라이버들이 공정하게 트랙에 나와 랩타임을 경신하고 순위를 다투는 실시간 시뮬레이션을 위해 세션 최솟값을 10분으로 규정했습니다.
                </p>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="guide-dialog__actions">
              <button
                onClick={() => setShowMinInfo(false)}
                className="control-button"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className="h-[3px] w-8 rounded-full transition-all"
          style={{ background: step <= current ? '#E10600' : 'rgba(255,255,255,0.1)' }}
        />
      ))}
    </div>
  )
}
