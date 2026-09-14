'use client'
import { useEffect, useRef, useState } from 'react'
import { useRacers, useSession, useSessionStore } from '@/store/sessionStore'
import { formatLapTime } from '@/engine/lapTime'
import { computeRanking } from '@/engine/raceEngine'
import { RacerStatus } from '@/engine/types'
import DNF_REASONS from '@/data/dnfReasons'
import { TRACK_MAP } from '@/data/tracks'

type FeedEvent = {
  id: string
  type:
    | 'FASTEST_LAP'
    | 'DNF'
    | 'YELLOW_FLAG'
    | 'RED_FLAG'
    | 'IMPROVEMENT'       // Improves to Px (-X.XXs) / remains Px (-X.XXs)
    | 'PIT_EXIT'          // Leaves pit lane / starts final run
    | 'ATTACK_START'      // Begins final flying lap / attempt
    | 'TRAFFIC'           // Catches traffic / may be impeded
    | 'FIA_INVESTIGATION' // FIA under investigation
    | 'FIA_DECISION'      // FIA decision
  racerId: string
  teamColor: string
  ts: number
  text?: string
  subText?: string
  lapTime?: number
  delta?: number
  reason?: string
}

type RacerSnapshot = {
  status: RacerStatus
  progress: number
  bestLap: number | null
  lapCount: number
  position: number
  trafficPenaltyMs?: number
}

type PendingFia = {
  id: string
  racerId: string
  teamColor: string
  category: 'TRACK_LIMITS' | 'IMPEDING' | 'PIT_LANE_IMPEDING' | 'UNSAFE_RELEASE' | 'PIT_EXIT_LINE'
  triggerAt: number
}

function randomReason(): string {
  return DNF_REASONS[Math.floor(Math.random() * DNF_REASONS.length)]
}

function formatTs(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function stripLegacyEventIcon(text = ''): string {
  return text.replace(/^(?:\u{1F4C8}|\u{1F525}|\u26A0\uFE0F?|\u{1F7E2})\s*/u, '')
}

export default function BroadcastFeed() {
  const racers = useRacers()
  const session = useSession()
  const applyLapDelete = useSessionStore((s) => s.applyLapDelete)
  const applyTimePenalty = useSessionStore((s) => s.applyTimePenalty)
  const [events, setEvents] = useState<FeedEvent[]>([])

  const sessionBestRef = useRef<number>(Infinity)
  const dnfSetRef = useRef<Set<string>>(new Set())
  const lastCheckRef = useRef<number>(0)
  const idRef = useRef<number>(0)
  const feedRef = useRef<HTMLDivElement>(null)
  const lastFlagRef = useRef<string>('NONE')

  // 스냅샷 및 비동기 결정 Refs
  const prevRacersRef = useRef<Record<string, RacerSnapshot>>({})
  const trafficLoggedRef = useRef<Set<string>>(new Set())
  const pendingFiaDecisionsRef = useRef<PendingFia[]>([])

  const getNextEventId = () => String(++idRef.current)

  // Event detection & comparisons — 800ms 주기 실행
  useEffect(() => {
    if (!racers || !session) return
    const now = Date.now()
    if (now - lastCheckRef.current < 800) return
    lastCheckRef.current = now

    const newEvents: FeedEvent[] = []
    const remainingTimeMs = session.sessionTargetMs - session.sessionElapsedMs
    const isFinalMinutes = remainingTimeMs <= 180000 // 3분 이하

    // 1. 현재 랭킹 정보를 기반으로 드라이버별 포지션 구하기
    const ranking = computeRanking(racers)
    const currentPositions: Record<string, number> = {}
    ranking.forEach((entry) => {
      currentPositions[entry.racerId] = entry.position
    })

    // 2. 만약 이전 틱의 스냅샷 데이터가 없다면(초기 진입), 스냅샷을 구성하고 종료
    const prevKeys = Object.keys(prevRacersRef.current)
    if (prevKeys.length === 0) {
      Object.values(racers).forEach((r) => {
        prevRacersRef.current[r.id] = {
          status: r.status,
          progress: r.progress,
          bestLap: r.bestLap,
          lapCount: r.lapCount,
          position: currentPositions[r.id] ?? 22,
          trafficPenaltyMs: r.trafficPenaltyMs,
        }
        if (r.bestLap !== null && r.bestLap < sessionBestRef.current) {
          sessionBestRef.current = r.bestLap
        }
        if (r.status === 'DNF') {
          dnfSetRef.current.add(r.id)
        }
      })
      return
    }

    // 3. FIA 지연 결정(Decision) 체크 및 처리
    const stillPending: PendingFia[] = []
    pendingFiaDecisionsRef.current.forEach((pending) => {
      if (now >= pending.triggerAt) {
        // 결정 릴리즈
        const roll = Math.random()
        let decisionText = 'No Further Action'
        let subText = 'No penalty'

        if (pending.category === 'TRACK_LIMITS') {
          if (roll < 0.3) {
            decisionText = 'Lap Time Deleted'
            subText = 'Track limits at Turn 9'
            applyLapDelete(pending.racerId)
          }
        } else if (pending.category === 'IMPEDING') {
          if (roll < 0.05) {
            decisionText = 'Warning'
            subText = 'Impeding car ahead'
          }
        } else if (pending.category === 'PIT_LANE_IMPEDING') {
          if (roll < 0.1) {
            decisionText = 'Warning'
            subText = 'Impeding at pit exit lane'
          }
        } else if (pending.category === 'UNSAFE_RELEASE') {
          if (roll < 0.4) {
            decisionText = '5-Second Time Penalty'
            subText = 'Unsafe release from garage'
            applyTimePenalty(pending.racerId, 5000)
          }
        } else if (pending.category === 'PIT_EXIT_LINE') {
          if (roll < 0.2) {
            decisionText = 'Warning'
            subText = 'Crossed white line at pit exit'
          }
        }

        newEvents.push({
          id: getNextEventId(),
          type: 'FIA_DECISION',
          racerId: pending.racerId,
          teamColor: pending.teamColor,
          ts: now,
          text: decisionText,
          subText: `${pending.racerId} · ${subText}`,
        })
      } else {
        stillPending.push(pending)
      }
    })
    pendingFiaDecisionsRef.current = stillPending

    // 4. 각 레이서별 이전 상태와 현재 상태 비교
    Object.values(racers).forEach((racer) => {
      const prev = prevRacersRef.current[racer.id]
      const currPos = currentPositions[racer.id] ?? 22
      const prevPos = prev ? prev.position : currPos

      if (!prev) return

      // --- DNF 감지 ---
      if (racer.status === 'DNF' && !dnfSetRef.current.has(racer.id)) {
        dnfSetRef.current.add(racer.id)
        newEvents.push({
          id: getNextEventId(),
          type: 'DNF',
          racerId: racer.id,
          teamColor: racer.teamColor,
          ts: now,
          reason: randomReason(),
        })
      }

      // --- 트랙 출차 감지 (IN_PIT / FORCED_PIT -> OUT_LAP) ---
      const wasInPit = prev.status === 'IN_PIT' || prev.status === 'FORCED_PIT'
      const isOutLap = racer.status === 'OUT_LAP'
      if (wasInPit && isOutLap) {
        const text = isFinalMinutes
          ? `${racer.id} starts final run`
          : `${racer.id} leaves the pit lane`
        
        newEvents.push({
          id: getNextEventId(),
          type: 'PIT_EXIT',
          racerId: racer.id,
          teamColor: racer.teamColor,
          ts: now,
          text,
        })

        // 출차 조사 확률 하향 조정 (각 1%씩 발생)
        const roll = Math.random()
        let category: PendingFia['category'] | null = null
        let catText = ''

        if (roll < 0.01) {
          category = 'PIT_EXIT_LINE'
          catText = 'Pit Exit Line'
        } else if (roll < 0.02) {
          category = 'UNSAFE_RELEASE'
          catText = 'Unsafe Release'
        } else if (roll < 0.03) {
          category = 'PIT_LANE_IMPEDING'
          catText = 'Pit Lane Impeding'
        }

        if (category) {
          newEvents.push({
            id: getNextEventId(),
            type: 'FIA_INVESTIGATION',
            racerId: racer.id,
            teamColor: racer.teamColor,
            ts: now,
            text: `${racer.id} under investigation`,
            subText: catText,
          })
          pendingFiaDecisionsRef.current.push({
            id: getNextEventId(),
            racerId: racer.id,
            teamColor: racer.teamColor,
            category,
            triggerAt: now + 8000 + Math.random() * 7000,
          })
        }
      }

      // --- 마지막 어택 시작 감지 (OUT_LAP / COOL_DOWN -> FLYING_LAP) ---
      const wasNotFlying = prev.status === 'OUT_LAP' || prev.status === 'COOL_DOWN'
      const isFlying = racer.status === 'FLYING_LAP'
      if (wasNotFlying && isFlying) {
        if (isFinalMinutes || session.phase === 'FAST_FORWARD') {
          const text = Math.random() < 0.5
            ? `${racer.id} begins final flying lap`
            : `${racer.id} begins final attempt`
          
          newEvents.push({
            id: getNextEventId(),
            type: 'ATTACK_START',
            racerId: racer.id,
            teamColor: racer.teamColor,
            ts: now,
            text,
          })
        }

        // 어택 개시 시 3% 확률로 Impeding 조사
        if (Math.random() < 0.03) {
          newEvents.push({
            id: getNextEventId(),
            type: 'FIA_INVESTIGATION',
            racerId: racer.id,
            teamColor: racer.teamColor,
            ts: now,
            text: `${racer.id} under investigation`,
            subText: 'Impeding',
          })
          pendingFiaDecisionsRef.current.push({
            id: getNextEventId(),
            racerId: racer.id,
            teamColor: racer.teamColor,
            category: 'IMPEDING',
            triggerAt: now + 8000 + Math.random() * 7000,
          })
        }
      }

      // --- 개선(PB 및 순위 변동) 감지: 1개의 통합된 피드로 간소화 ---
      if (racer.lapCount > prev.lapCount) {
        const lastLap = racer.lastLap
        if (lastLap !== null) {
          // 경우 1: 개인 최고 기록 갱신 (기존 bestLap이 존재하고, 기존 bestLap보다 잘 나온 경우)
          if (prev.bestLap !== null && lastLap < prev.bestLap) {
            const deltaSec = (prev.bestLap - lastLap) / 1000
            
            // 시간 단축 정보와 순위 변동이 모두 담긴 1개의 카드로 통합
            const improvementText = currPos < prevPos
              ? `${racer.id} improves to P${currPos} (-${deltaSec.toFixed(3)}s)`
              : `${racer.id} improves but remains P${currPos} (-${deltaSec.toFixed(3)}s)`

            newEvents.push({
              id: getNextEventId(),
              type: 'IMPROVEMENT',
              racerId: racer.id,
              teamColor: racer.teamColor,
              ts: now,
              text: improvementText,
            })

            // 개인 최고 기록 갱신 시 15% 확률로 Track Limits 조사
            if (Math.random() < 0.15) {
              newEvents.push({
                id: getNextEventId(),
                type: 'FIA_INVESTIGATION',
                racerId: racer.id,
                teamColor: racer.teamColor,
                ts: now,
                text: `${racer.id} under investigation`,
                subText: 'Track Limits',
              })
              pendingFiaDecisionsRef.current.push({
                id: getNextEventId(),
                racerId: racer.id,
                teamColor: racer.teamColor,
                category: 'TRACK_LIMITS',
                triggerAt: now + 8000 + Math.random() * 7000,
              })
            }

          } else if (prev.bestLap === null) {
            // 경우 2: 첫 번째 랩 타임 완주
            newEvents.push({
              id: getNextEventId(),
              type: 'IMPROVEMENT',
              racerId: racer.id,
              teamColor: racer.teamColor,
              ts: now,
              text: `${racer.id} sets first time P${currPos}`,
            })
          }

          // --- 전체 세션 최고 랩타임(Fastest Lap) 체크 ---
          if (lastLap < sessionBestRef.current) {
            const prevBest = sessionBestRef.current
            const delta = prevBest === Infinity ? undefined : prevBest - lastLap
            sessionBestRef.current = lastLap
            
            newEvents.push({
              id: getNextEventId(),
              type: 'FASTEST_LAP',
              racerId: racer.id,
              teamColor: racer.teamColor,
              ts: now,
              lapTime: lastLap,
              delta,
            })
          }
        }
      }

      // --- 실시간 트래픽 감지 (중요 차량 또는 15% 무작위 확률 필터 추가로 노이즈 차단) ---
      if (
        racer.status === 'FLYING_LAP' &&
        (racer.trafficPenaltyMs ?? 0) > (prev.trafficPenaltyMs ?? 0)
      ) {
        const key = `${racer.id}-${racer.lapCount}`
        if (!trafficLoggedRef.current.has(key)) {
          trafficLoggedRef.current.add(key)

          // 유저 차량이거나 선두권(1~3위), 혹은 15% 무작위 조건일 때만 중계 출력
          const isSignificant = racer.isUser || currPos <= 3 || Math.random() < 0.15
          if (isSignificant) {
            const track = TRACK_MAP[session.trackId]
            const s1P = track?.sector1Progress ?? 0.333
            const s2P = track?.sector2Progress ?? 0.666
            const sector = racer.progress < s1P
              ? 'Sector 1'
              : racer.progress < s2P
              ? 'Sector 2'
              : 'Sector 3'

            const roll = Math.random()
            let text = `${racer.id} catches traffic`
            if (roll < 0.33) {
              text = `${racer.id} catches traffic in ${sector}`
            } else if (roll < 0.66) {
              text = `${racer.id} may be impeded`
            }

            newEvents.push({
              id: getNextEventId(),
              type: 'TRAFFIC',
              racerId: racer.id,
              teamColor: racer.teamColor,
              ts: now,
              text,
            })
          }
        }
      }
    })

    // 5. 스냅샷 데이터 최종 업데이트
    Object.values(racers).forEach((r) => {
      prevRacersRef.current[r.id] = {
        status: r.status,
        progress: r.progress,
        bestLap: r.bestLap,
        lapCount: r.lapCount,
        position: currentPositions[r.id] ?? 22,
        trafficPenaltyMs: r.trafficPenaltyMs,
      }
    })

    if (newEvents.length > 0) {
      setEvents((prev) => [...prev, ...newEvents].slice(-60))
    }
  }, [racers, session, applyLapDelete, applyTimePenalty])

  // 깃발 이벤트 감지
  useEffect(() => {
    if (!session) return
    const flag = session.currentFlag
    if (flag !== 'NONE' && flag !== lastFlagRef.current) {
      lastFlagRef.current = flag
      const now = Date.now()
      setEvents((prev) => [
        ...prev,
        {
          id: getNextEventId(),
          type: (flag === 'RED' ? 'RED_FLAG' : 'YELLOW_FLAG') as FeedEvent['type'],
          racerId: '',
          teamColor: flag === 'RED' ? '#E10600' : '#FFD200',
          ts: now,
        },
      ].slice(-60))
    }
    if (flag === 'NONE') lastFlagRef.current = 'NONE'
  }, [session?.currentFlag])

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [events])

  // Reset when session ends
  const isActive = !!session
  useEffect(() => {
    if (!isActive) {
      setEvents([])
      sessionBestRef.current = Infinity
      dnfSetRef.current = new Set()
      prevRacersRef.current = {}
      trafficLoggedRef.current = new Set()
      pendingFiaDecisionsRef.current = []
      idRef.current = 0
      lastFlagRef.current = 'NONE'
    }
  }, [isActive])

  return (
    <div
      className="session-section flex flex-col"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {/* 헤더 */}
      <div
        className="session-divider-heading"
        style={{
          gap: '7px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent-red)',
            flexShrink: 0,
            animation: isActive ? 'pulse-red 1.2s ease-in-out infinite' : undefined,
          }}
        />
        LIVE BROADCAST
      </div>

      {/* 피드 */}
      <div ref={feedRef} className="broadcast-feed-list">
        {events.length === 0 && (
          <div
            style={{
              padding: '28px 14px',
              textAlign: 'center',
              fontSize: '10px',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
            }}
          >
            WAITING...
          </div>
        )}
        {events.map((ev) => {
          switch (ev.type) {
            case 'FASTEST_LAP':
              return <FastestLapItem key={ev.id} event={ev} />
            case 'DNF':
              return <DnfItem key={ev.id} event={ev} />
            case 'YELLOW_FLAG':
            case 'RED_FLAG':
              return <FlagItem key={ev.id} event={ev} />
            case 'IMPROVEMENT':
              return <ImprovementItem key={ev.id} event={ev} />
            case 'PIT_EXIT':
              return <PitExitItem key={ev.id} event={ev} />
            case 'ATTACK_START':
              return <AttackStartItem key={ev.id} event={ev} />
            case 'TRAFFIC':
              return <TrafficItem key={ev.id} event={ev} />
            case 'FIA_INVESTIGATION':
              return <FiaInvestigationItem key={ev.id} event={ev} />
            case 'FIA_DECISION':
              return <FiaDecisionItem key={ev.id} event={ev} />
            default:
              return null
          }
        })}
      </div>
    </div>
  )
}

function FastestLapItem({ event }: { event: FeedEvent }) {
  return (
    <div
      className="broadcast-card broadcast-card--priority"
      style={{
        padding: '9px 14px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <span
          style={{
            fontSize: '8px',
            fontWeight: 900,
            letterSpacing: '0.08em',
            padding: '1px 5px',
            borderRadius: '3px',
            background: 'rgba(227,0,128,0.18)',
            border: '1px solid rgba(227,0,128,0.45)',
            color: '#E30080',
          }}
        >
          FASTEST LAP
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'rgba(255,255,255,0.18)' }}>
          {formatTs(event.ts)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 900,
            letterSpacing: '0.06em',
            color: event.teamColor,
          }}
        >
          {event.racerId}
        </span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: 'monospace',
            color: '#fff',
          }}
        >
          {event.lapTime ? formatLapTime(event.lapTime) : ''}
        </span>
        {event.delta !== undefined && (
          <span
            style={{
              fontSize: '10px',
              color: '#E30080',
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            -{(event.delta / 1000).toFixed(3)}
          </span>
        )}
      </div>
    </div>
  )
}

function FlagItem({ event }: { event: FeedEvent }) {
  const isRed = event.type === 'RED_FLAG'
  const color = isRed ? '#E10600' : '#FFD200'
  const bg = isRed ? 'rgba(225,6,0,0.12)' : 'rgba(255,210,0,0.12)'
  return (
    <div
      className="broadcast-card broadcast-card--priority"
      style={{
        padding: '9px 14px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: `${bg}`,
        borderLeft: `2px solid ${color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
        <span
          style={{
            fontSize: '8px',
            fontWeight: 900,
            letterSpacing: '0.08em',
            padding: '1px 5px',
            borderRadius: '3px',
            background: `${color}25`,
            border: `1px solid ${color}60`,
            color,
          }}
        >
          {isRed ? 'RED FLAG' : 'YELLOW FLAG'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'rgba(255,255,255,0.18)' }}>
          {formatTs(event.ts)}
        </span>
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
        {isRed
          ? 'RED FLAG - Session suspended, all cars return to pit lane'
          : 'YELLOW FLAG - Hazard on track, sector times affected'}
      </div>
    </div>
  )
}

function DnfItem({ event }: { event: FeedEvent }) {
  return (
    <div
      className="broadcast-card broadcast-card--priority"
      style={{
        padding: '9px 14px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <span
          style={{
            fontSize: '8px',
            fontWeight: 900,
            letterSpacing: '0.08em',
            padding: '1px 5px',
            borderRadius: '3px',
            background: 'rgba(225,6,0,0.18)',
            border: '1px solid rgba(225,6,0,0.4)',
            color: '#E10600',
          }}
        >
          DNF
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'rgba(255,255,255,0.18)' }}>
          {formatTs(event.ts)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 900,
            letterSpacing: '0.06em',
            color: event.teamColor,
          }}
        >
          {event.racerId}
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
          {event.reason}
        </span>
      </div>
    </div>
  )
}

// 개인 기록 개선 / 순위 등락 통합 렌더러
function ImprovementItem({ event }: { event: FeedEvent }) {
  return (
    <div className="broadcast-card broadcast-card--standard" style={{ padding: '7px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="broadcast-event-dot" style={{ background: 'var(--accent-blue)' }} aria-hidden="true" />
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#E4F9FF' }}>
          {stripLegacyEventIcon(event.text)}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '8px', color: 'rgba(255,255,255,0.15)' }}>
          {formatTs(event.ts)}
        </span>
      </div>
    </div>
  )
}

// 트랙 출차 렌더러
function PitExitItem({ event }: { event: FeedEvent }) {
  return (
    <div className="broadcast-card broadcast-card--standard" style={{ padding: '7px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="broadcast-event-dot" aria-hidden="true" />
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#34D399' }}>
          {stripLegacyEventIcon(event.text)}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '8px', color: 'rgba(255,255,255,0.15)' }}>
          {formatTs(event.ts)}
        </span>
      </div>
    </div>
  )
}

// 플라잉 랩 어택 시작 렌더러
function AttackStartItem({ event }: { event: FeedEvent }) {
  return (
    <div className="broadcast-card broadcast-card--standard" style={{ padding: '7px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="broadcast-event-dot" style={{ background: 'var(--accent-orange)' }} aria-hidden="true" />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#FB923C' }}>
          {stripLegacyEventIcon(event.text)}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '8px', color: 'rgba(255,255,255,0.15)' }}>
          {formatTs(event.ts)}
        </span>
      </div>
    </div>
  )
}

// 트래픽 경고 렌더러
function TrafficItem({ event }: { event: FeedEvent }) {
  return (
    <div className="broadcast-card broadcast-card--standard" style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(251,146,60,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="broadcast-event-dot" style={{ background: 'var(--accent-yellow)' }} aria-hidden="true" />
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#FBBF24' }}>
          {stripLegacyEventIcon(event.text)}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '8px', color: 'rgba(255,255,255,0.15)' }}>
          {formatTs(event.ts)}
        </span>
      </div>
    </div>
  )
}

// FIA 조사 중 렌더러
function FiaInvestigationItem({ event }: { event: FeedEvent }) {
  const eventText = event.text?.replace(/^\u{1F4DD}\s*FIA:\s*/u, '')

  return (
    <div
      className="broadcast-card broadcast-card--standard"
      style={{
        padding: '9px 14px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(255,255,255,0.02)',
        borderLeft: '2px solid rgba(255,255,255,0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
        <span style={{ fontSize: '8px', fontWeight: 950, letterSpacing: '0.14em', color: '#D6D8DF' }}>FIA</span>
        <span style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '0.12em', color: '#8B92A3' }}>· INVESTIGATION</span>
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'rgba(255,255,255,0.15)' }}>
          {formatTs(event.ts)}
        </span>
      </div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
        {eventText}
      </div>
      <div style={{ fontSize: '10px', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Reason: {event.subText}
      </div>
    </div>
  )
}

// FIA 판정 결과 렌더러
function FiaDecisionItem({ event }: { event: FeedEvent }) {
  const eventText = event.text?.replace(/^\u{1F4CB}\s*FIA Decision:\s*/u, '')
  const isNoFurtherAction = eventText?.includes('No Further Action')
  const borderCol = isNoFurtherAction ? '#10B981' : '#EF4444'
  const textCol = isNoFurtherAction ? '#34D399' : '#F87171'
  return (
    <div
      className="broadcast-card broadcast-card--priority"
      style={{
        padding: '9px 14px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: isNoFurtherAction ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
        borderLeft: `2px solid ${borderCol}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
        <span style={{ fontSize: '8px', fontWeight: 950, letterSpacing: '0.14em', color: '#D6D8DF' }}>FIA</span>
        <span style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '0.12em', color: textCol }}>· DECISION</span>
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'rgba(255,255,255,0.15)' }}>
          {formatTs(event.ts)}
        </span>
      </div>
      <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>
        {eventText}
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
        {event.subText}
      </div>
    </div>
  )
}
