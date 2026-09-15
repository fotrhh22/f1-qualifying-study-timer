'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSetupStore } from '@/store/setupStore'

export default function Home() {
  const router = useRouter()
  const reset = useSetupStore((s) => s.reset)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    if (!showInfo) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowInfo(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showInfo])

  const handleStart = () => {
    reset()
    router.push('/setup/driver')
  }

  return (
    <main
      className="relative flex flex-col items-center justify-center w-screen h-screen overflow-hidden"
      style={{ background: '#0D0D12' }}
    >
      {/* 배경 글로우 */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, rgba(225,6,0,0.06) 0%, transparent 70%)',
        }}
      />

      {/* F1 상단 라인 */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#E10600]" />

      <div className="relative z-10 flex flex-col items-center" style={{ gap: '40px' }}>
        {/* 로고 + 브랜드 */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9"
              style={{ background: '#E10600', borderRadius: '8px' }}
            >
              <span className="text-white text-xs font-black">F1</span>
            </div>
            <span
              className="text-[12px] font-bold tracking-[0.3em] uppercase"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              Qualifying Study Timer
            </span>
          </div>
        </div>

        {/* 타이틀 */}
        <div className="flex flex-col items-center gap-0">
          <h1
            className="font-black leading-none tracking-tight"
            style={{ fontSize: '56px', color: '#FFFFFF' }}
          >
            STUDY LIKE
          </h1>
          <h1
            className="font-black leading-none tracking-tight"
            style={{ fontSize: '56px', color: '#E10600' }}
          >
            YOU&apos;RE ON POLE
          </h1>
          <p
            className="text-sm tracking-widest mt-4"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            공부하는 동안 F1 퀄리파잉이 펼쳐집니다
          </p>
        </div>

        {/* 피처 힌트 */}
        <div className="flex items-center gap-6 relative">
          <div className="flex items-center gap-6">
            {['22명 드라이버', '22개 서킷', 'PIT STOP 시스템'].map((feat) => (
              <div key={feat} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-[#E10600]" />
                <span
                  className="text-[12px] tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {feat}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center justify-center transition-all hover:bg-white/10 active:scale-95"
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginLeft: '-8px',
            }}
          >
            ?
          </button>
        </div>

        {/* START 버튼 */}
        <button
          onClick={handleStart}
          className="relative overflow-hidden transition-all duration-150 active:scale-95"
          style={{
            padding: '16px 64px',
            background: '#E10600',
            borderRadius: '12px',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '900',
            letterSpacing: '0.2em',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = '#FF1800'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = '#E10600'
          }}
        >
          START QUALIFYING
        </button>
      </div>

      {/* 크레딧 */}
      <p
        className="absolute bottom-4 text-[10px] tracking-wider"
        style={{ color: 'rgba(255,255,255,0.15)' }}
      >
        Circuit layouts © julesr0y/f1-circuits-svg, CC-BY-4.0
      </p>

      {/* F1 퀄리파잉 공부 타이머 설명 다이얼로그 */}
      {showInfo && (
        <div
          className="dialog-overlay animate-fade-in"
          onClick={() => setShowInfo(false)}
          role="presentation"
        >
          <div
            className="dialog-panel guide-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
          >
            {/* 헤더 */}
            <div className="guide-dialog__header">
              <div className="guide-dialog__eyebrow">Session Briefing</div>
              <h2 id="guide-title" className="guide-dialog__title">
                F1 Qualifying Study Timer
              </h2>
            </div>

            {/* 본문 브리핑 카드 */}
            <div className="guide-dialog__body">
              <div className="guide-card">
                <div className="guide-card__header">
                  <span className="guide-card__name">공부 시간 = F1 퀄리파잉 세션</span>
                  <span className="guide-card__tag">01 · SESSION</span>
                </div>
                <p className="guide-card__desc">
                  설정한 공부 목표 시간 동안 22명의 F1 드라이버들과 함께 실시간 퀄리파잉(예선) 시뮬레이션이 진행됩니다.
                </p>
              </div>

              <div className="guide-card">
                <div className="guide-card__header">
                  <span className="guide-card__name">실시간 랭킹 & 페이스 경쟁</span>
                  <span className="guide-card__tag">02 · TELEMETRY</span>
                </div>
                <p className="guide-card__desc">
                  내가 집중해서 공부하는 동안, AI 드라이버들은 아웃랩·플라잉랩·쿨다운랩을 거치며 각자의 페이스대로 랩타임을 경신하고 순위를 다툽니다.
                </p>
              </div>

              <div className="guide-card">
                <div className="guide-card__header">
                  <span className="guide-card__name">PIT STOP (전략적 휴식 시스템)</span>
                  <span className="guide-card__tag">03 · STRATEGY</span>
                </div>
                <p className="guide-card__desc">
                  공부 중 휴식이 필요할 때 5분/10분/15분의 피트스톱을 선언할 수 있습니다. 내 타이머는 일시정지되지만, 경쟁 드라이버들은 멈추지 않고 트랙을 달립니다.
                </p>
              </div>

              <div className="guide-card">
                <div className="guide-card__header">
                  <span className="guide-card__name">최종 예선 성적표</span>
                  <span className="guide-card__tag">04 · CLASSIFICATION</span>
                </div>
                <p className="guide-card__desc">
                  세션이 종료되면 최종 그리드(출발 순위)와 함께, 순수한 공부 시간(피트스톱 제외)과 최고 랩타임 기록이 포함된 예선 성적표를 확인할 수 있습니다.
                </p>
              </div>
            </div>

            {/* 닫기 버튼 */}
            <div className="guide-dialog__actions">
              <button
                onClick={() => setShowInfo(false)}
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
