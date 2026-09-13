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
      <div className="dialog-panel end-session-dialog break-session-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="break-dialog-title">
        <div className="end-session-dialog__body">
          <div className="end-session-dialog__icon break-session-dialog__icon" aria-hidden="true">
            <span />
          </div>
          <div className="section-label break-session-dialog__eyebrow">Pit stop</div>
          <h2 id="break-dialog-title">휴식할까요?</h2>
          <p>
            휴식 시간을 선택하면 공부 타이머가 멈추고 드라이버는 PIT로 들어갑니다.
          </p>
          <div className="break-session-dialog__options" aria-label="휴식 시간 선택">
            {PIT_OPTIONS.map(({ minutes, label, desc }) => (
              <button
                key={minutes}
                onClick={() => handlePit(minutes)}
                className="break-session-dialog__option"
              >
                <strong className="mono-value">{label}</strong>
                <span>
                  MIN · {desc}
                </span>
              </button>
            ))}
          </div>
          <div className="break-session-dialog__note">
            휴식 중 다른 드라이버는 계속 달립니다
          </div>
        </div>
        <div className="end-session-dialog__actions break-session-dialog__actions">
          <button
            onClick={onClose}
            className="control-button"
          >
            세션으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}
