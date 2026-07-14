'use client'
import { useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession, useSessionStore, useTrack, useRacers, computeRanking } from '@/store/sessionStore'
import { useSetupStore } from '@/store/setupStore'
import { formatLapTime, formatGap, formatStudyTime } from '@/engine/lapTime'
import { DRIVER_FACE } from '@/data/images'
import type { RankingEntry } from '@/engine/types'

const TEAM_FULL_NAMES: Record<string, string> = {
  'Alpine': 'BWT Alpine Formula One Team',
  'McLaren': 'McLaren Mastercard Formula 1 Team',
  'Mercedes': 'Mercedes-AMG PETRONAS Formula 1 Team',
  'Red Bull': 'Oracle Red Bull Racing',
  'Ferrari': 'Scuderia Ferrari HP',
  'Williams': 'Atlassian Williams F1 Team',
  'Racing Bulls': 'Visa Cash App Racing Bulls Formula One Team',
  'Aston Martin': 'Aston Martin Aramco Formula One Team',
  'Haas': 'TGR HAAS F1 TEAM',
  'Audi': 'Audi Revolut F1 Team',
  'Cadillac': 'Cadillac Formula 1 Team',
}

export default function ResultsOverlay() {
  const router = useRouter()
  const session = useSession()
  const racers = useRacers()
  const track = useTrack()
  const { stopSession } = useSessionStore()
  const resetSetup = useSetupStore((s) => s.reset)
  const ranking = useMemo(() => (racers ? computeRanking(racers) : []), [racers])

  if (!session || !track) return null

  const userEntry = ranking.find((r) => r.isUser)
  const top3 = ranking.slice(0, 3)
  const focusTimeMs = Math.max(0, session.studyElapsedMs - (session.accumulatedPitMs ?? 0))
  const focusCompletion = session.studyTargetMs > 0
    ? Math.min(100, Math.round((focusTimeMs / session.studyTargetMs) * 100))
    : 0

  const handleRestart = () => {
    stopSession()
    resetSetup()
    router.push('/setup/driver')
  }

  const handleHome = () => {
    stopSession()
    resetSetup()
    router.push('/')
  }

  return (
    <div className="dialog-overlay animate-fade-in">
      <div
        className="flex flex-col overflow-hidden shadow-2xl"
        style={{
          width: '580px',
          maxHeight: '92vh',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-panel)',
          boxShadow: 'var(--shadow-dialog)',
        }}
      >
        {/* 타이틀 */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: '14px 20px 0' }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '16px' }}>{track.flag}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
              {track.gpName}
            </span>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}>
            FOCUS SESSION COMPLETE
          </span>
        </div>

        {/* 공부 결과를 레이스 결과보다 먼저 요약 */}
        <div
          style={{
            margin: '12px 16px 0',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            borderRadius: '12px',
            flexShrink: 0,
          }}
          className="surface-card"
        >
          <div>
            <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.32)' }}>
              TOTAL FOCUS
            </div>
            <div className="font-mono tabular-nums" style={{ marginTop: '2px', fontSize: '26px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
              {formatStudyTime(focusTimeMs)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 900, color: focusCompletion >= 100 ? '#00D2BE' : '#FF8000' }}>
              {focusCompletion}%
            </div>
            <div style={{ marginTop: '2px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>
              GOAL COMPLETED
            </div>
          </div>
        </div>

        {/* 포디움 */}
        {top3.length >= 3 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '6px',
              padding: '12px 16px 0',
              flexShrink: 0,
            }}
          >
            <PodiumCard entry={top3[1]} place={2} />
            <PodiumCard entry={top3[0]} place={1} />
            <PodiumCard entry={top3[2]} place={3} />
          </div>
        )}

        {/* 유저 요약 */}
        {userEntry && (
          <div
            style={{
              margin: '10px 16px 0',
              display: 'flex',
              borderRadius: '10px',
              overflow: 'hidden',
              background: 'rgba(225,6,0,0.07)',
              border: '1px solid rgba(225,6,0,0.22)',
              flexShrink: 0,
            }}
          >
            <StatCard label="집중 시간" value={formatStudyTime(focusTimeMs)} />
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch' }} />
            <StatCard label="최고 랩" value={userEntry.bestLap ? formatLapTime(userEntry.bestLap) : '—'} />
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch' }} />
            <StatCard
              label="최종 순위"
              value={`P${userEntry.position}`}
              highlight={userEntry.position <= 3}
              subValue="/ 22"
            />
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch' }} />
            <StatCard label="전체 랩" value={`${userEntry.totalLaps}L`} />
          </div>
        )}

        {/* 헤더 구분선 */}
        <div style={{ margin: '10px 0 0', height: '1px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

        {/* 순위 테이블 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '5px 13px 5px 16px',
            flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <span style={{ width: '28px', fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.1em' }}>#</span>
          <div style={{ width: '34px' }} />
          <span style={{ width: '120px', fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.1em' }}>NAME</span>
          <span style={{ flex: 1, fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.1em' }}>TEAM</span>
          <span style={{ width: '72px', fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.1em', textAlign: 'right' }}>TIME</span>
          <span style={{ width: '54px', fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.1em', textAlign: 'right' }}>GAP</span>
          <span style={{ width: '28px', fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.1em', textAlign: 'right' }}>LAP</span>
        </div>

        {/* 랭킹 리스트 */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {ranking.map((entry) => {
            const isUser = entry.isUser
            const isDnf = entry.isDnf
            const hasLap = entry.bestLap !== null
            const medalColor =
              entry.position === 1 ? '#FFD700'
              : entry.position === 2 ? '#C0C0C0'
              : entry.position === 3 ? '#CD7F32'
              : null

            return (
              <div
                key={entry.racerId}
                className={`flex items-center gap-0 ${isDnf && !hasLap ? 'opacity-35' : ''}`}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: isUser ? 'rgba(225,6,0,0.06)' : undefined,
                  borderLeft: isUser ? '3px solid #E10600' : '3px solid transparent',
                  padding: '6px 13px 6px 16px',
                }}
              >
                {/* 포지션 */}
                <span
                  style={{
                    width: '28px',
                    fontSize: '12px',
                    fontWeight: 900,
                    textAlign: 'center',
                    color: medalColor ?? (entry.position <= 10 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)'),
                    flexShrink: 0,
                    fontFamily: 'monospace',
                  }}
                >
                  {entry.position}
                </span>

                {/* 드라이버 사진 */}
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                    marginRight: '6px',
                    background: entry.teamColor + '30',
                    border: `1px solid ${entry.teamColor}55`,
                    position: 'relative',
                  }}
                >
                  {DRIVER_FACE[entry.racerId] ? (
                    <Image
                      src={DRIVER_FACE[entry.racerId]}
                      alt={entry.racerId}
                      fill
                      style={{ objectFit: 'cover', objectPosition: 'top center' }}
                      unoptimized
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: entry.teamColor + '40' }} />
                  )}
                </div>

                {/* NAME (driver full name) */}
                <span
                  style={{
                    width: '120px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isUser ? '#FFF' : 'rgba(255,255,255,0.75)',
                    flexShrink: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.name}
                </span>

                {/* TEAM */}
                <span style={{ flex: 1, fontSize: '10px', color: isUser ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {TEAM_FULL_NAMES[entry.teamName] || entry.teamName}
                </span>

                {/* 시간 (모든 row에 실제 랩타임 표시) */}
                <span
                  style={{
                    width: '72px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    textAlign: 'right',
                    flexShrink: 0,
                    color: isDnf && !hasLap ? '#E10600'
                      : !hasLap ? 'rgba(255,255,255,0.18)'
                      : entry.position === 1 ? '#FFFFFF'
                      : isUser ? '#FF8000'
                      : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {isDnf && !hasLap ? 'DNF' : !hasLap ? '—' : formatLapTime(entry.bestLap!)}
                </span>

                {/* 차이 (P1은 공백, P2+는 gap) */}
                <span
                  style={{
                    width: '54px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    textAlign: 'right',
                    flexShrink: 0,
                    color: 'rgba(255,255,255,0.32)',
                  }}
                >
                  {entry.position === 1 || !hasLap || entry.gap === null ? '' : formatGap(entry.gap)}
                </span>

                {/* 랩 수 */}
                <span
                  style={{
                    width: '28px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    textAlign: 'right',
                    flexShrink: 0,
                    color: 'rgba(255,255,255,0.38)',
                  }}
                >
                  {entry.totalLaps > 0 ? entry.totalLaps : '—'}
                </span>
              </div>
            )
          })}
        </div>

        {/* 버튼 */}
        <div
          className="flex gap-3 flex-shrink-0"
          style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={handleHome}
            className="flex-1 transition-all hover:text-white"
            style={{
              padding: '14px 0',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '11px',
              fontWeight: 900,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            HOME
          </button>
          <button
            onClick={handleRestart}
            className="flex-1 transition-all hover:opacity-85 active:scale-95"
            style={{
              padding: '14px 0',
              background: '#E10600',
              borderRadius: '10px',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 900,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            NEW SESSION
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 포디움 카드 (레퍼런스 이미지 스타일) ──────────────────────
function PodiumCard({ entry, place }: { entry: RankingEntry; place: 1 | 2 | 3 }) {
  const cardWidth = place === 1 ? '38%' : '29%'
  const imageHeight = place === 1 ? 210 : place === 2 ? 175 : 145
  const posSize = place === 1 ? 30 : 24
  const isUser = entry.isUser

  // "George Russell" → "G. Russell"
  const nameParts = entry.name.trim().split(' ')
  const displayName = nameParts.length >= 2
    ? `${nameParts[0][0]}. ${nameParts[nameParts.length - 1]}`
    : entry.name

  return (
    <div style={{ width: cardWidth, display: 'flex', flexDirection: 'column' }}>
      {/* 이미지 카드 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: `min(${imageHeight}px, 21vh)`,
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.04)',
          border: isUser
            ? '2px solid rgba(225,6,0,0.6)'
            : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {DRIVER_FACE[entry.racerId] ? (
          <Image
            src={DRIVER_FACE[entry.racerId]}
            alt={entry.racerId}
            fill
            style={{ objectFit: 'cover', objectPosition: 'top center' }}
            unoptimized
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: entry.teamColor + '18' }} />
        )}

        {/* P# 오버레이 — 우상단 */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '10px',
            fontSize: `${posSize}px`,
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1,
            textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)',
          }}
        >
          P{place}
        </div>

        {/* 유저 배지 */}
        {isUser && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              padding: '2px 6px',
              background: '#E10600',
              borderRadius: '4px',
              fontSize: '8px',
              fontWeight: 900,
              color: '#FFF',
              letterSpacing: '0.08em',
            }}
          >
            YOU
          </div>
        )}
      </div>

      {/* 하단: 팀 마크 + 드라이버 이름 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 4px 0',
        }}
      >
        {/* 팀 컬러 마크 (평행사변형) */}
        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '6px',
                height: '16px',
                background: entry.teamColor,
                clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)',
                opacity: i === 0 ? 0.5 : i === 1 ? 0.75 : 1,
              }}
            />
          ))}
        </div>

        {/* 드라이버 이름 */}
        <span
          style={{
            fontSize: place === 1 ? '14px' : '12px',
            fontWeight: 800,
            color: isUser ? '#FF8080' : '#FFFFFF',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </span>
      </div>

      {/* 랩타임 */}
      <div style={{ padding: '2px 4px 0', fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
        {entry.bestLap ? formatLapTime(entry.bestLap) : '—'}
      </div>
    </div>
  )
}

// ── 유저 요약 StatCard ─────────────────────────────────────────
function StatCard({
  label,
  value,
  highlight,
  subValue,
}: {
  label: string
  value: string
  highlight?: boolean
  subValue?: string
}) {
  return (
    <div className="flex-1 flex flex-col items-center py-3 px-2 gap-0.5">
      <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          style={{ fontWeight: 900, fontSize: '14px', fontFamily: 'monospace', color: highlight ? '#FFD700' : '#FFFFFF' }}
        >
          {value}
        </span>
        {subValue && (
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)' }}>{subValue}</span>
        )}
      </div>
    </div>
  )
}
