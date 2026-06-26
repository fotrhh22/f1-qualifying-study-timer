'use client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { DRIVERS } from '@/data/drivers'
import { useSetupStore } from '@/store/setupStore'
import { DRIVER_FACE } from '@/data/images'

export default function SetupDriverPage() {
  const router = useRouter()
  const { driverId, setDriver } = useSetupStore()

  const handleNext = () => {
    if (!driverId) return
    router.push('/setup/track')
  }

  const selectedDriver = DRIVERS.find((d) => d.id === driverId)

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
        <StepIndicator current={1} />
      </div>

      {/* 제목 */}
      <div className="px-8 pt-6 pb-4">
        <div className="text-[12px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          STEP 1
        </div>
        <h2 className="text-white text-2xl font-black tracking-widest uppercase">
          SELECT YOUR DRIVER
        </h2>
        <p className="text-[12px] tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          2026 F1 GRID — 22 DRIVERS
        </p>
      </div>

      {/* 드라이버 그리드 */}
      <div className="flex-1 overflow-y-auto px-8 pb-4">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '10px',
          }}
        >
          {DRIVERS.map((driver) => {
            const isSelected = driverId === driver.id
            const faceImg = DRIVER_FACE[driver.id]

            return (
              <button
                key={driver.id}
                onClick={() => setDriver(driver.id)}
                className="relative overflow-hidden transition-all duration-150 active:scale-[0.98]"
                style={{
                  height: '104px',
                  background: isSelected ? '#1C1712' : '#17171C',
                  border: isSelected
                    ? `1.5px solid ${driver.teamColor}`
                    : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  textAlign: 'left',
                }}
              >
                {/* 팀 컬러 좌측 바 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: driver.teamColor,
                    borderRadius: '12px 0 0 12px',
                  }}
                />

                {/* 텍스트 영역 — 항상 우측 88px 확보 */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    padding: '14px 106px 14px 18px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '19px',
                      fontWeight: 900,
                      color: '#FFFFFF',
                      letterSpacing: '0.08em',
                      lineHeight: 1,
                    }}
                  >
                    {driver.id}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {driver.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <div
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: driver.teamColor,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '11px',
                        color: driver.teamColor,
                        opacity: 0.85,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {driver.team}
                    </span>
                  </div>
                </div>

                {/* 우측 영역: 얼굴 이미지 또는 번호 플레이스홀더 */}
                {faceImg ? (
                  <>
                    {/* 그라디언트 페이드 */}
                    <div
                      style={{
                        position: 'absolute',
                        right: '96px',
                        top: 0,
                        bottom: 0,
                        width: '40px',
                        background: isSelected
                          ? 'linear-gradient(to right, #1C1712, transparent)'
                          : 'linear-gradient(to right, #17171C, transparent)',
                        zIndex: 1,
                        pointerEvents: 'none',
                      }}
                    />
                    {/* 얼굴 이미지 */}
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '104px',
                        zIndex: 0,
                        overflow: 'hidden',
                      }}
                    >
                      <Image
                        src={faceImg}
                        alt={driver.name}
                        fill
                        style={{
                          objectFit: 'cover',
                          objectPosition: 'top center',
                          opacity: isSelected ? 1 : 0.88,
                        }}
                        unoptimized
                      />
                    </div>
                  </>
                ) : (
                  /* 이미지 없는 드라이버 → 번호 플레이스홀더 */
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '104px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `linear-gradient(135deg, transparent 40%, ${driver.teamColor}1A)`,
                      zIndex: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '34px',
                        fontWeight: 900,
                        color: driver.teamColor,
                        opacity: isSelected ? 0.4 : 0.22,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {driver.number}
                    </span>
                  </div>
                )}
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
          onClick={() => router.push('/')}
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

        {/* 선택된 드라이버 요약 */}
        {selectedDriver ? (
          <div className="flex items-center gap-2 min-w-0">
            {DRIVER_FACE[selectedDriver.id] && (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${selectedDriver.teamColor}60`,
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <Image
                  src={DRIVER_FACE[selectedDriver.id]}
                  alt={selectedDriver.name}
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'top center' }}
                  unoptimized
                />
              </div>
            )}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-white font-black leading-none truncate" style={{ fontSize: '18px' }}>
                {selectedDriver.name}
              </span>
              <span
                style={{ fontSize: '11px', color: selectedDriver.teamColor, opacity: 0.85, fontWeight: 700, lineHeight: 1 }}
              >
                {selectedDriver.team}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-[12px] tracking-wider" style={{ color: 'rgba(255,255,255,0.32)' }}>
            드라이버를 선택하세요
          </span>
        )}

        {/* NEXT */}
        <button
          onClick={handleNext}
          disabled={!driverId}
          className="transition-all duration-150 active:scale-95"
          style={{
            justifySelf: 'end',
            padding: '16px 32px',
            background: driverId ? '#E10600' : 'rgba(255,255,255,0.05)',
            border: '1px solid transparent',
            borderRadius: '12px',
            color: driverId ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
            fontSize: '13px',
            fontWeight: '900',
            letterSpacing: '0.15em',
            cursor: driverId ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => {
            if (driverId) (e.currentTarget as HTMLElement).style.background = '#FF1800'
          }}
          onMouseLeave={(e) => {
            if (driverId) (e.currentTarget as HTMLElement).style.background = '#E10600'
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
