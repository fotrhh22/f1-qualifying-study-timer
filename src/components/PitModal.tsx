'use client'
import { useSessionStore } from '@/store/sessionStore'
import { PitDuration } from '@/engine/types'

interface PitModalProps {
  onClose: () => void
}

const PIT_OPTIONS: { minutes: PitDuration; label: string; desc: string }[] = [
  { minutes: 5, label: '5', desc: 'SHORT' },
  { minutes: 10, label: '10', desc: 'MEDIUM' },
  { minutes: 15, label: '15', desc: 'LONG' },
]

export default function PitModal({ onClose }: PitModalProps) {
  const userPit = useSessionStore((s) => s.userPit)

  const handlePit = (minutes: PitDuration) => {
    userPit(minutes)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 바텀 시트 */}
      <div
        className="relative z-10 w-full animate-slide-up"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div className="flex justify-center pb-3 pt-1">
          <div className="w-10 h-1 rounded-full bg-[rgba(255,255,255,0.2)]" />
        </div>

        <div
          className="border border-[rgba(255,255,255,0.08)] overflow-hidden"
          style={{
            background: '#17171C',
            borderRadius: '16px 16px 0 0',
          }}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div>
              <div className="text-white text-base font-black tracking-tight">PIT STOP</div>
              <div className="text-[rgba(255,255,255,0.35)] text-[11px] mt-0.5 tracking-wider">
                공부 중단 시간을 선택하세요
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all"
            >
              ✕
            </button>
          </div>

          {/* 구분선 */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

          {/* 옵션들 */}
          <div className="flex gap-3 px-5 py-5">
            {PIT_OPTIONS.map(({ minutes, label, desc }) => (
              <button
                key={minutes}
                onClick={() => handlePit(minutes)}
                className="flex-1 flex flex-col items-center justify-center py-4 gap-1 transition-all duration-150 group"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = '#FFF200'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,242,0,0.06)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                }}
              >
                <span className="text-white text-3xl font-black leading-none">
                  {label}
                </span>
                <span className="text-[rgba(255,255,255,0.35)] text-[10px] tracking-widest">
                  MIN
                </span>
                <span className="text-[rgba(255,255,255,0.35)] text-[10px] tracking-widest uppercase mt-0.5">
                  {desc}
                </span>
              </button>
            ))}
          </div>

          {/* 안내 + 취소 */}
          <div className="px-5 pb-6 flex flex-col gap-2">
            <div
              className="text-[rgba(255,255,255,0.2)] text-[10px] tracking-wider text-center py-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              NPC 드라이버는 계속 달립니다
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 text-[rgba(255,255,255,0.5)] text-xs font-bold tracking-widest hover:text-white transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '10px',
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
