'use client'
import { useEffect } from 'react'
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

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="dialog-overlay animate-fade-in" onClick={onClose} role="presentation">
      <div className="dialog-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="break-dialog-title">
        <div style={{ padding: '28px 28px 22px' }}>
          <div className="section-label" style={{ color: 'var(--accent-yellow)' }}>Pit stop</div>
          <div id="break-dialog-title" className="font-black tracking-tight leading-none" style={{ marginTop: '8px', fontSize: '28px', color: 'var(--text-primary)' }}>
            휴식할까요?
          </div>
          <div className="mt-3 leading-relaxed" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            휴식 시간을 선택하면 공부 타이머가 멈추고 드라이버는 PIT로 들어갑니다.
          </div>
        </div>

        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {PIT_OPTIONS.map(({ minutes, label, desc }) => (
              <button
                key={minutes}
                onClick={() => handlePit(minutes)}
                className="flex-1 flex flex-col items-center justify-center transition-all active:scale-[0.97]"
                style={{
                  minHeight: '82px',
                  background: 'rgba(255,211,64,0.08)',
                  border: '1px solid rgba(255,211,64,0.24)',
                  borderRadius: 'var(--radius-control)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <span className="font-black leading-none" style={{ fontSize: '26px' }}>{label}</span>
                <span style={{ marginTop: '4px', fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent-yellow)' }}>
                  MIN · {desc}
                </span>
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            휴식 중 다른 드라이버는 계속 달립니다
          </div>
          <button
            onClick={onClose}
            className="control-button w-full"
          >
            계속하기
          </button>
        </div>
      </div>
    </div>
  )
}
