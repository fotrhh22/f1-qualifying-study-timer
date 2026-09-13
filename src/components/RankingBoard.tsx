'use client'
import { useMemo } from 'react'
import Image from 'next/image'
import { useRacers, useSession, computeRanking } from '@/store/sessionStore'
import { formatLapTime, formatGap } from '@/engine/lapTime'
import { TEAM_LOGO } from '@/data/images'

export default function RankingBoard() {
  const racers = useRacers()
  const session = useSession()
  const ranking = useMemo(() => (racers ? computeRanking(racers) : []), [racers])

  if (!session) return null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 헤더 */}
      <div className="session-divider-heading" style={{ flexShrink: 0 }}>
        LIVE RANKING
      </div>

      <div className="flex-1 overflow-y-auto">
        {ranking.map((entry) => {
          const isDnf = entry.isDnf
          const isUser = entry.isUser
          const hasLap = entry.bestLap !== null
          const isInPit = entry.status === 'IN_PIT' || entry.status === 'FORCED_PIT'
          const logoSrc = TEAM_LOGO[entry.teamName]

          const posColor = entry.position === 1 ? 'var(--accent-lime)' : 'var(--text-muted)'

          const timeColor = isDnf ? 'var(--accent-red)'
            : !hasLap ? 'var(--text-muted)'
            : entry.position === 1 ? 'var(--text-primary)'
            : isUser ? 'var(--accent-yellow)'
            : 'var(--text-secondary)'

          return (
            <div
              key={entry.racerId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '38px',
                padding: '5px 10px 5px 0',
                borderBottom: '1px solid var(--divider)',
                borderLeft: `3px solid ${isUser ? 'var(--accent-red)' : 'transparent'}`,
                background: isUser ? 'var(--surface-hover)' : 'transparent',
                opacity: 1,
                transition: 'all 0.3s',
              }}
            >
              {/* 포지션 */}
              <span
                style={{
                  width: '24px',
                  textAlign: 'right',
                  fontSize: '13px',
                  fontWeight: 900,
                  fontVariantNumeric: 'tabular-nums',
                  color: posColor,
                  flexShrink: 0,
                  paddingLeft: '4px',
                }}
              >
                {entry.position}
              </span>

              {/* 팀 로고 */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {logoSrc ? (
                  <Image
                    src={logoSrc}
                    alt={entry.teamName}
                    width={22}
                    height={14}
                    style={{ objectFit: 'contain' }}
                    unoptimized
                  />
                ) : (
                  <div style={{ width: '2px', height: '14px', borderRadius: '99px', background: entry.teamColor }} />
                )}
              </div>

              {/* 드라이버 코드 */}
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  color: 'var(--text-primary)',
                  flexShrink: 0,
                  width: '35px',
                }}
              >
                {entry.racerId}
              </span>

              {/* PIT 배지 */}
              {isInPit && (
                <span
                  style={{
                    flexShrink: 0,
                    padding: '1px 5px',
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    fontSize: '9px',
                    borderRadius: '4px',
                    background: 'rgba(255,211,64,0.1)',
                    border: '1px solid rgba(255,211,64,0.35)',
                    color: 'var(--accent-yellow)',
                    lineHeight: 1.4,
                  }}
                >
                  P
                </span>
              )}

              {/* 랩타임 / 갭 */}
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right',
                  marginLeft: 'auto',
                  color: timeColor,
                  fontWeight: (entry.position === 1 || isUser) ? 700 : 400,
                }}
              >
                {isDnf ? 'DNF'
                  : !hasLap ? '—'
                  : entry.position === 1 ? formatLapTime(entry.bestLap!)
                  : entry.gap !== null ? formatGap(entry.gap)
                  : '—'
                }
              </span>
            </div>
          )
        })}

        {ranking.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
            WAITING...
          </div>
        )}
      </div>
    </div>
  )
}
