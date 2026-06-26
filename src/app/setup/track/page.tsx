'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TRACKS } from '@/data/tracks'
import { useSetupStore } from '@/store/setupStore'

export default function SetupTrackPage() {
  const router = useRouter()
  const { driverId, trackId, setTrack } = useSetupStore()

  useEffect(() => {
    if (!driverId) {
      router.replace('/setup/driver')
    }
  }, [driverId, router])

  if (!driverId) {
    return null
  }

  const handleNext = () => {
    if (!trackId) return
    router.push('/setup/time')
  }

  const selectedTrack = TRACKS.find((t) => t.id === trackId)

  return (
    <main
      className="flex flex-col w-screen h-screen overflow-hidden"
      style={{ background: '#0D0D12' }}
    >
      <div className="h-[3px] bg-[#E10600]" />

      {/* 헤더 */}
      <div
        className="flex items-center justify-center px-8 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <StepIndicator current={2} />
      </div>

      {/* 제목 */}
      <div className="px-8 pt-6 pb-4">
        <div className="text-[12px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          STEP 2
        </div>
        <h2 className="text-white text-2xl font-black tracking-widest uppercase">
          SELECT CIRCUIT
        </h2>
        <p className="text-[12px] tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          2026 F1 CALENDAR — 22 CIRCUITS
        </p>
      </div>

      {/* 트랙 그리드 */}
      <div className="flex-1 overflow-y-auto px-8 pb-24">
        <div className="grid grid-cols-4 gap-2">
          {TRACKS.map((track) => {
            const isSelected = trackId === track.id
            const typeColor =
              track.type === 'Street Circuit' ? '#FF8000'
              : track.type === 'Hybrid Circuit' ? '#00D2BE'
              : 'rgba(255,255,255,0.25)'

            return (
              <button
                key={track.id}
                onClick={() => setTrack(track.id)}
                className="relative flex text-left transition-all duration-150 overflow-hidden"
                style={{
                  padding: '12px',
                  background: isSelected ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                  border: isSelected
                    ? '1px solid rgba(255,255,255,0.35)'
                    : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 w-2 h-2 rounded-full"
                    style={{ background: '#E10600' }}
                  />
                )}

                {/* 왼쪽 — 텍스트 정보 */}
                <div className="flex flex-col flex-1 min-w-0">
                  {/* 국기 + 나라 */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base leading-none">{track.flag}</span>
                    <span
                      className="text-[10px] tracking-wider uppercase font-bold truncate"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      {track.country}
                    </span>
                  </div>

                  {/* 트랙명 */}
                  <span className="text-white text-[12px] font-bold tracking-wide leading-tight">
                    {track.name}
                  </span>

                  {/* 스탯 */}
                  <span
                    className="text-[10px] mt-1"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    {track.lengthKm}km · {track.turns}T
                  </span>

                  {/* 타입 배지 */}
                  <span
                    className="mt-2 text-[10px] tracking-wider uppercase font-bold"
                    style={{ color: typeColor }}
                  >
                    {track.type === 'Street Circuit' ? 'STREET'
                      : track.type === 'Hybrid Circuit' ? 'HYBRID'
                      : 'PERM'}
                  </span>
                </div>

                {/* 오른쪽 — 트랙 SVG 미니맵 */}
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: '72px', height: '72px' }}
                >
                  <svg
                    viewBox={track.viewBox}
                    style={{ width: '100%', height: '100%' }}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* 배경 두께감 */}
                    <path
                      d={track.svgPath}
                      stroke={isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}
                      strokeWidth="18"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* 트랙 라인 */}
                    <path
                      d={track.svgPath}
                      stroke={isSelected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)'}
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '12px',
          padding: '20px 48px',
        }}
      >
        {/* BACK */}
        <button
          onClick={() => router.push('/setup/driver')}
          className="transition-all duration-150 active:scale-95"
          style={{
            justifySelf: 'start',
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

        {/* 선택된 서킷 요약 */}
        {selectedTrack ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl flex-shrink-0">{selectedTrack.flag}</span>
            <span className="text-white font-bold truncate" style={{ fontSize: '18px' }}>{selectedTrack.gpName}</span>
          </div>
        ) : (
          <span className="tracking-wider" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.32)' }}>
            서킷을 선택하세요
          </span>
        )}

        {/* NEXT */}
        <button
          onClick={handleNext}
          disabled={!trackId}
          className="transition-all duration-150 active:scale-95"
          style={{
            justifySelf: 'end',
            padding: '16px 32px',
            background: trackId ? '#E10600' : 'rgba(255,255,255,0.05)',
            border: '1px solid transparent',
            borderRadius: '12px',
            color: trackId ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
            fontSize: '13px',
            fontWeight: '900',
            letterSpacing: '0.15em',
            cursor: trackId ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => {
            if (trackId) (e.currentTarget as HTMLElement).style.background = '#FF1800'
          }}
          onMouseLeave={(e) => {
            if (trackId) (e.currentTarget as HTMLElement).style.background = '#E10600'
          }}
        >
          NEXT →
        </button>
      </div>
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
