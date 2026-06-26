// ─────────────────────────────────────────────
// Race Engine — 순수 함수, React/DOM 완전 비의존
// tickEngine(state, deltaMs) → 새 SessionState
// ─────────────────────────────────────────────
import { FlagStatus, Racer, RacerStatus, SessionState } from './types'
import { calculateLapTime } from './lapTime'
import { TRACK_MAP } from '@/data/tracks'

// ── 상태별 속도 배율 ──────────────────────────
const SPEED_MULTIPLIER: Record<RacerStatus, number> = {
  OUT_LAP:     0.90,
  FLYING_LAP:  1.05,
  COOL_DOWN:   0.85,
  IN_PIT:      0,     // 피트는 stateDuration 카운트다운
  FORCED_PIT:  0,
  DNF:         0,
}

// 1랩 기준 시간 (ms) — 트랙의 trackBaseTimeMs 기반
function getLapDuration(status: RacerStatus, trackBaseTimeMs: number, pace: number): number {
  const mult = SPEED_MULTIPLIER[status]
  if (mult === 0) return 0
  // 기준 랩에 pace 보정 약간 반영 (pace 높을수록 조금 더 빠름)
  const paceAdj = 1 - (pace - 90) * 0.002
  let baseDuration = (trackBaseTimeMs * paceAdj) / mult

  if (status === 'OUT_LAP') {
    // Out Lap duration: ±30% 변동성 추가
    const factor = 0.7 + Math.random() * 0.6
    baseDuration *= factor
  } else if (status === 'COOL_DOWN') {
    // Cool Down duration: ±15% 변동성 추가
    const factor = 0.85 + Math.random() * 0.3
    baseDuration *= factor
  }

  return baseDuration
}

// IN_PIT 대기 시간 (15~90초 랜덤)
function randomPitDuration(): number {
  return (15 + Math.random() * 75) * 1000
}

// FF 전환 시 모든 IN_PIT 드라이버의 잔여 대기 시간을 배속만큼 압축
function compressPitTimesForFF(
  racers: Record<string, Racer>,
  now: number,
  multiplier: number
): Record<string, Racer> {
  const updated = { ...racers }
  for (const id of Object.keys(updated)) {
    const r = updated[id]
    if (r.status !== 'IN_PIT' && r.status !== 'FORCED_PIT') continue
    const elapsed = now - r.stateEnteredAt
    const remaining = Math.max(0, r.stateDuration - elapsed)
    // 잔여 대기 시간을 배속으로 나눠 stateEnteredAt을 앞당김
    const compressedRemaining = remaining / multiplier
    updated[id] = {
      ...r,
      stateEnteredAt: now - (r.stateDuration - compressedRemaining),
    }
  }
  return updated
}

// ── 초기 레이서 상태 생성 ───────────────────
// AI 드라이버: 균등 간격 + 지터로 분산 배치 (밀집 방지)
// 유저: 1~2분 후 출발
export function createRacers(
  driverIds: string[],
  userId: string,
  paces: Record<string, number>,
  trackBaseTimeMs: number,
  drivers: Array<{ id: string; name: string; shortName: string; team: string; teamColor: string; number: number }>
): Record<string, Racer> {
  const now = Date.now()
  const racers: Record<string, Racer> = {}

  // AI 드라이버를 랜덤 순서로 섞어 출발 시간 배분
  const aiIds = driverIds.filter((id) => id !== userId)
  const shuffled = [...aiIds].sort(() => Math.random() - 0.5)

  const waves = [6, 4, 7, 3]
  const waveBaseDelays = [30000, 180000, 330000, 480000] // ms

  shuffled.forEach((id, index) => {
    const driver = drivers.find((d) => d.id === id)!
    const pace = paces[id] ?? 92

    // Wave에 따른 출발 시간 배분
    let waveIdx = 0
    let accumulated = 0
    for (let i = 0; i < waves.length; i++) {
      if (index < accumulated + waves[i]) {
        waveIdx = i
        break
      }
      accumulated += waves[i]
      if (i === waves.length - 1) {
        waveIdx = i
      }
    }
    const indexInWave = index - accumulated

    // Wave별 기본 딜레이 + Wave 내 차량 간 3초 간격 + ±1초 미세 지터
    const baseDelay = waveBaseDelays[waveIdx] + indexInWave * 3000
    const jitter = (Math.random() * 2 - 1) * 1000
    const exitDelayMs = Math.max(10000, baseDelay + jitter)

    racers[id] = {
      id,
      name: driver.name,
      shortName: driver.shortName,
      team: driver.team,
      teamColor: driver.teamColor,
      number: driver.number,
      isUser: false,
      pace,
      status: 'IN_PIT',
      progress: 0,
      stateEnteredAt: now,
      stateDuration: exitDelayMs,
      bestLap: null,
      lastLap: null,
      lapCount: 0,
      totalLaps: 0,
      consecutiveFlyingLaps: 0,
      trafficPenaltyMs: 0,
      lapTimes: [],
    }
  })

  // 유저: 1~2분 후 출발
  const userDriver = drivers.find((d) => d.id === userId)!
  const userPace = paces[userId] ?? 92
  racers[userId] = {
    id: userId,
    name: userDriver.name,
    shortName: userDriver.shortName,
    team: userDriver.team,
    teamColor: userDriver.teamColor,
    number: userDriver.number,
    isUser: true,
    pace: userPace,
    status: 'IN_PIT',
    progress: 0,
    stateEnteredAt: now,
    stateDuration: 60000 + Math.random() * 60000,
    bestLap: null,
    lastLap: null,
    lapCount: 0,
    totalLaps: 0,
    consecutiveFlyingLaps: 0,
    trafficPenaltyMs: 0,
    lapTimes: [],
  }

  return racers
}

// ── 상태 전이 ────────────────────────────────
function transitionRacer(
  racer: Racer,
  now: number,
  trackBaseTimeMs: number,
  totalDnfCount: number,
  isSessionEnded: boolean,
  sessionProgress: number,
  yellowPenaltyMs = 0
): { racer: Racer; dnfOccurred: boolean } {
  let dnfOccurred = false

  // DNF / FORCED_PIT은 전이 안 함
  if (racer.status === 'DNF' || racer.status === 'FORCED_PIT') {
    return { racer, dnfOccurred }
  }

  // IN_PIT — 시간이 다 되면 OUT_LAP
  if (racer.status === 'IN_PIT') {
    // FF 중: 이미 랩 기록이 있는 드라이버는 새 랩 안 보냄 (한 번만 기회 부여)
    if (isSessionEnded && racer.bestLap !== null) return { racer, dnfOccurred }

    const nextDuration = getLapDuration('OUT_LAP', trackBaseTimeMs, racer.pace)
    return {
      racer: {
        ...racer,
        status: 'OUT_LAP',
        progress: Math.random() * 0.05,
        stateEnteredAt: now,
        stateDuration: nextDuration,
        totalLaps: racer.totalLaps + 1,  // OUT_LAP 시작 = 1랩 카운트
      },
      dnfOccurred,
    }
  }

  // OUT_LAP 완료 → FLYING_LAP
  if (racer.status === 'OUT_LAP') {
    const nextDuration = getLapDuration('FLYING_LAP', trackBaseTimeMs, racer.pace)
    const willDnf = !racer.isUser && totalDnfCount < 2 && Math.random() < 0.005
    const dnfAtProgress = willDnf ? 0.15 + Math.random() * 0.7 : null
    return {
      racer: {
        ...racer,
        status: 'FLYING_LAP',
        progress: 0,
        stateEnteredAt: now,
        stateDuration: nextDuration,
        totalLaps: racer.totalLaps + 1,
        consecutiveFlyingLaps: 1,
        trafficPenaltyMs: 0,
        dnfAtProgress,
      },
      dnfOccurred,
    }
  }

  // FLYING_LAP 완료 → 랩타임 기록 → COOL_DOWN
  if (racer.status === 'FLYING_LAP') {
    const totalPenalty = yellowPenaltyMs + (racer.trafficPenaltyMs ?? 0)
    const lapTime = calculateLapTime(racer.pace, trackBaseTimeMs, sessionProgress, totalPenalty)
    const newLapTimes = [...(racer.lapTimes ?? []), lapTime]
    const newBestLap = Math.min(...newLapTimes)

    const nextDuration = getLapDuration('COOL_DOWN', trackBaseTimeMs, racer.pace)
    return {
      racer: {
        ...racer,
        status: 'COOL_DOWN',
        progress: 0,
        stateEnteredAt: now,
        stateDuration: nextDuration,
        bestLap: newBestLap,
        lastLap: lapTime,
        lapCount: racer.lapCount + 1,
        totalLaps: racer.totalLaps + 1,
        trafficPenaltyMs: 0, // 완료되었으므로 리셋
        dnfAtProgress: null,
        lapTimes: newLapTimes,
      },
      dnfOccurred,
    }
  }

  // COOL_DOWN 완료 → IN_PIT 또는 확률적으로 다시 FLYING_LAP
  if (racer.status === 'COOL_DOWN') {
    const consecutive = racer.consecutiveFlyingLaps ?? 1
    // 세션 종료가 아니고, 연속 어택 3회 미만일 때 40% 확률로 재어택
    const shouldAttackAgain = !isSessionEnded && consecutive < 3 && Math.random() < 0.4

    if (shouldAttackAgain) {
      const nextDuration = getLapDuration('FLYING_LAP', trackBaseTimeMs, racer.pace)
      const willDnf = !racer.isUser && totalDnfCount < 2 && Math.random() < 0.005
      const dnfAtProgress = willDnf ? 0.15 + Math.random() * 0.7 : null
      return {
        racer: {
          ...racer,
          status: 'FLYING_LAP',
          progress: 0,
          stateEnteredAt: now,
          stateDuration: nextDuration,
          totalLaps: racer.totalLaps + 1,
          consecutiveFlyingLaps: consecutive + 1,
          trafficPenaltyMs: 0,
          dnfAtProgress,
        },
        dnfOccurred,
      }
    } else {
      // FF 중이면 아주 긴 대기 → 재출발 방지
      const nextDuration = isSessionEnded ? 999_999_000 : randomPitDuration()
      return {
        racer: {
          ...racer,
          status: 'IN_PIT',
          progress: 0,
          stateEnteredAt: now,
          stateDuration: nextDuration,
          totalLaps: racer.totalLaps + 1,
          consecutiveFlyingLaps: 0,
        },
        dnfOccurred,
      }
    }
  }

  return { racer, dnfOccurred }
}

// ── 랭킹 계산 ────────────────────────────────
export function computeRanking(racers: Record<string, Racer>) {
  const sorted = Object.values(racers)
    .sort((a, b) => {
      if (a.bestLap === null && b.bestLap === null) {
        // 둘 다 기록 없음: DNF는 비DNF보다 후순위
        if (a.status === 'DNF' && b.status !== 'DNF') return 1
        if (b.status === 'DNF' && a.status !== 'DNF') return -1
        return 0
      }
      if (a.bestLap === null) return 1
      if (b.bestLap === null) return -1
      return a.bestLap - b.bestLap
    })

  // 정렬된 리스트 중 가장 빠른 기록을 가진 P1 랩타임 찾기
  const p1Lap = sorted.find((x) => x.bestLap !== null)?.bestLap ?? null

  return sorted.map((r, idx) => ({
    position: idx + 1,
    racerId: r.id,
    name: r.name,
    shortName: r.shortName,
    teamName: r.team,
    teamColor: r.teamColor,
    isUser: r.isUser,
    bestLap: r.bestLap,
    gap:
      idx === 0 || r.bestLap === null || p1Lap === null
        ? null
        : r.bestLap - p1Lap,
    lapCount: r.lapCount,
    totalLaps: r.totalLaps,
    status: r.status,
    isDnf: r.status === 'DNF',
  }))
}

// ── 메인 tick 함수 ────────────────────────────
export function tickEngine(state: SessionState, deltaMs: number): SessionState {
  if (state.phase === 'IDLE' || state.phase === 'FINISHED') return state

  const track = TRACK_MAP[state.trackId]
  if (!track) return state

  const now = Date.now()
  const isFFMode = state.phase === 'FAST_FORWARD'
  const effectiveDelta = isFFMode ? deltaMs * state.fastForwardMultiplier : deltaMs
  const isSessionEnded = state.phase === 'FAST_FORWARD'

  // 현재 트랙 위를 주행 중인 차량 수 계산 (혼잡도 필터용)
  const activeCount = Object.values(state.racers).filter(
    (r) => r.status === 'OUT_LAP' || r.status === 'FLYING_LAP' || r.status === 'COOL_DOWN'
  ).length

  let exitProb = 0.10 // 기본값 (6 ~ 14대)
  if (activeCount >= 15) {
    exitProb = 0.05
  } else if (activeCount <= 5) {
    exitProb = 0.20
  }

  // 공부 타이머 갱신 — PIT 중에도 세션 시간 소모 (#10)
  // RUNNING / APPROACHING_PIT / PIT 모두 포함 (피트 시간이 세션 전체 시간에서 차감됨)
  const newElapsed =
    state.phase === 'RUNNING' && state.userStatus !== 'DNF'
      ? state.studyElapsedMs + deltaMs
      : state.studyElapsedMs

  const newAccumulatedPitMs =
    state.phase === 'RUNNING' && state.userStatus === 'PIT'
      ? (state.accumulatedPitMs ?? 0) + deltaMs
      : (state.accumulatedPitMs ?? 0)

  // 유저 PIT 종료 체크
  let newUserStatus = state.userStatus
  if (state.userStatus === 'PIT' && state.pitEndAt !== null && now >= state.pitEndAt) {
    newUserStatus = 'RUNNING'
  }

  // 깃발 만료 체크
  let newFlag: FlagStatus = state.currentFlag
  let newFlagEndAt = state.flagEndAt
  if (newFlag !== 'NONE' && newFlagEndAt !== null && now >= newFlagEndAt) {
    newFlag = 'NONE'
    newFlagEndAt = null
  }
  // 이번 틱에서 새 DNF 발생 여부 추적 (깃발 트리거용)
  let newDnfThisTick = false

  let newRacers = { ...state.racers }
  let newDnfCount = state.totalDnfCount

  // 각 레이서 progress 갱신 + 상태 전이
  for (const id of Object.keys(newRacers)) {
    let racer = { ...newRacers[id] }

    // 유저가 PIT 중이면 유저 레이서는 FORCED_PIT 그대로
    if (racer.isUser && state.userStatus === 'PIT') {
      newRacers[id] = racer
      continue
    }

    // APPROACHING_PIT: 유저가 트랙 위를 주행하며 피트 진입 대기 중
    if (racer.isUser && state.userStatus === 'APPROACHING_PIT') {
      // 시간 기반 진입 완료 체크 (세그먼트 완주 전에 시간이 만료된 경우)
      if (state.pitApproachEndAt !== null && now >= state.pitApproachEndAt) {
        const remainingPitMs = Math.max(0, (state.pitEndAt ?? now) - now)
        newRacers[id] = {
          ...racer,
          status: 'FORCED_PIT',
          stateEnteredAt: now,
          stateDuration: remainingPitMs,
          progress: 0,
        }
        newUserStatus = 'PIT'
        continue
      }

      // 아직 진입 전 → progress 정상 갱신
      const lapDuration = racer.stateDuration
      const actualDelta = lapDuration > 0 ? effectiveDelta / lapDuration : 0
      racer.progress = Math.min(1, racer.progress + actualDelta)

      if (racer.progress >= 1) {
        // 세그먼트 완주 → 피트 진입
        const remainingPitMs = Math.max(0, (state.pitEndAt ?? now) - now)
        newRacers[id] = {
          ...racer,
          status: 'FORCED_PIT',
          stateEnteredAt: now,
          stateDuration: remainingPitMs,
          progress: 0,
        }
        newUserStatus = 'PIT'
      } else {
        newRacers[id] = racer
      }
      continue
    }

    // DNF, FORCED_PIT, IN_PIT은 progress 갱신 안 함
    if (racer.status === 'DNF') {
      newRacers[id] = racer
      continue
    }
    if (racer.status === 'IN_PIT' || racer.status === 'FORCED_PIT') {
      // 피트 카운트다운
      const elapsed = now - racer.stateEnteredAt
      if (elapsed >= racer.stateDuration) {
        // AI 드라이버는 트랙 혼잡도 확률 필터 적용 (유저는 100% 즉시 복귀)
        const shouldExit = racer.isUser || Math.random() < exitProb
        if (shouldExit) {
          const sessionProgress = state.studyTargetMs > 0 ? Math.min(1, newElapsed / state.studyTargetMs) : 0
          const result = transitionRacer(racer, now, track.trackBaseTimeMs, newDnfCount, isSessionEnded, sessionProgress)
          newRacers[id] = result.racer
          if (result.dnfOccurred) { newDnfCount++; newDnfThisTick = true }
        } else {
          newRacers[id] = racer
        }
      } else {
        newRacers[id] = racer
      }
      continue
    }

    // 트랙 위 레이서: progress 갱신
    const lapDuration = racer.stateDuration
    const actualDelta = lapDuration > 0 ? effectiveDelta / lapDuration : 0
    const nextProgress = racer.progress + actualDelta

    // DNF 예정 체크 (FLYING_LAP 도중에 dnfAtProgress 지점에 도달하면 DNF 처리)
    if (
      racer.status === 'FLYING_LAP' &&
      racer.dnfAtProgress !== undefined &&
      racer.dnfAtProgress !== null &&
      nextProgress >= racer.dnfAtProgress
    ) {
      newRacers[id] = {
        ...racer,
        status: 'DNF',
        progress: racer.dnfAtProgress,
        trafficPenaltyMs: 0,
        dnfAtProgress: null,
      }
      newDnfCount++
      newDnfThisTick = true
      continue
    }

    racer.progress = Math.min(1, nextProgress)

    if (racer.progress >= 1) {
      // 옐로 플래그: flying lap 완료 시 1~3초 랜덤 페널티
      const yellowPenaltyMs =
        newFlag === 'YELLOW' && racer.status === 'FLYING_LAP'
          ? 1000 + Math.random() * 2000
          : 0
      const sessionProgress = state.studyTargetMs > 0 ? Math.min(1, newElapsed / state.studyTargetMs) : 0
      const result = transitionRacer(racer, now, track.trackBaseTimeMs, newDnfCount, isSessionEnded, sessionProgress, yellowPenaltyMs)
      newRacers[id] = result.racer
      if (result.dnfOccurred) { newDnfCount++; newDnfThisTick = true }
    } else {
      newRacers[id] = racer
    }
  }

  // DNF 발생 → 깃발 트리거 (FF 모드 제외)
  if (newDnfThisTick && newFlag === 'NONE' && !isSessionEnded) {
    const roll = Math.random()
    if (roll < 0.12) {
      // 레드 플래그: 모든 트랙 위 차량 피트인
      newFlag = 'RED'
      newFlagEndAt = now + 60000  // 60초 후 해제
      for (const id of Object.keys(newRacers)) {
        const r = newRacers[id]
        if (r.status !== 'DNF' && r.status !== 'IN_PIT' && r.status !== 'FORCED_PIT') {
          newRacers[id] = {
            ...r,
            status: 'IN_PIT',
            progress: 0,
            stateEnteredAt: now,
            stateDuration: 60000 + randomPitDuration(),  // 레드 플래그 대기 + 일반 피트
          }
        }
      }
    } else if (roll < 0.45) {
      // 옐로 플래그: 45초 지속
      newFlag = 'YELLOW'
      newFlagEndAt = now + 45000
    }
  }

  // 유저 PIT 종료 → FORCED_PIT에서 OUT_LAP으로 즉시 복귀
  if (state.userStatus === 'PIT' && newUserStatus === 'RUNNING') {
    const userRacer = newRacers[state.userId]
    if (userRacer?.status === 'FORCED_PIT') {
      newRacers[state.userId] = {
        ...userRacer,
        status: 'OUT_LAP',
        progress: 0.01,
        stateEnteredAt: now,
        stateDuration: getLapDuration('OUT_LAP', track.trackBaseTimeMs, userRacer.pace),
      }
    }
  }

  // 타이머 종료 → FAST_FORWARD 전환
  let newPhase: SessionState['phase'] = state.phase
  if (state.phase === 'RUNNING' && newElapsed >= state.studyTargetMs) {
    newPhase = 'FAST_FORWARD'
    // 피트 대기 시간을 FF 배속으로 압축
    newRacers = compressPitTimesForFF(newRacers, now, state.fastForwardMultiplier)
  }

  // FAST_FORWARD 종료 조건: 모든 차량이 IN_PIT / FORCED_PIT / DNF
  if (state.phase === 'FAST_FORWARD') {
    const allDone = Object.values(newRacers).every(
      (r) => r.status === 'IN_PIT' || r.status === 'DNF' || r.status === 'FORCED_PIT'
    )
    if (allDone) newPhase = 'FINISHED'
  }

  // ── 트랙 위 차량 포지션 및 갭 계산 + 트래픽 페널티 누적 ──
  const onTrackDrivers = Object.values(newRacers).filter(
    (r) => r.status === 'OUT_LAP' || r.status === 'FLYING_LAP' || r.status === 'COOL_DOWN'
  )

  if (onTrackDrivers.length > 0) {
    // progress 기준으로 오름차순 정렬 (index가 클수록 더 선두)
    const sorted = [...onTrackDrivers].sort((a, b) => a.progress - b.progress)
    const N = sorted.length

    for (let i = 0; i < N; i++) {
      const racer = sorted[i]
      const nextRacer = sorted[(i + 1) % N]
      const prevRacer = sorted[(i - 1 + N) % N]

      // gapAhead 계산: 루프 고려
      let gapAhead = 0
      if (i < N - 1) {
        gapAhead = nextRacer.progress - racer.progress
      } else {
        gapAhead = (sorted[0].progress + 1) - racer.progress
      }

      // gapBehind 계산: 루프 고려
      let gapBehind = 0
      if (i > 0) {
        gapBehind = racer.progress - prevRacer.progress
      } else {
        gapBehind = racer.progress - (sorted[N - 1].progress - 1)
      }

      // 1위부터 N위까지 매핑 (가장 선두인 N-1번째 인덱스가 1위)
      const trackPosition = N - i

      // 트래픽 페널티 계산 (Phase 2)
      // 현재 플라잉 랩 주행 중인 차량이 앞에 쿨다운/아웃랩 차량(FLYING_LAP이 아닌 차량)을 근거리(gapAhead < 0.03)에 둔 경우
      let penaltyAccum = racer.trafficPenaltyMs ?? 0
      if (
        racer.status === 'FLYING_LAP' &&
        nextRacer.status !== 'FLYING_LAP' &&
        gapAhead < 0.03 &&
        N > 1
      ) {
        // 초당 300ms 페널티 누적
        penaltyAccum += (effectiveDelta / 1000) * 300
      }

      // newRacers에 반영
      newRacers[racer.id] = {
        ...racer,
        trackPosition,
        gapAhead,
        gapBehind,
        trafficPenaltyMs: penaltyAccum,
      }
    }
  }

  // 피트에 있거나 리타이어한 차량들은 포지션 및 갭 리셋
  for (const id of Object.keys(newRacers)) {
    const racer = newRacers[id]
    if (racer.status === 'IN_PIT' || racer.status === 'FORCED_PIT' || racer.status === 'DNF') {
      newRacers[id] = {
        ...racer,
        trackPosition: undefined,
        gapAhead: null,
        gapBehind: null,
        trafficPenaltyMs: 0,
      }
    }
  }

  return {
    ...state,
    phase: newPhase,
    studyElapsedMs: Math.min(newElapsed, state.studyTargetMs),
    userStatus: newUserStatus,
    pitApproachEndAt: newUserStatus === 'APPROACHING_PIT' ? state.pitApproachEndAt : null,
    racers: newRacers,
    totalDnfCount: newDnfCount,
    accumulatedPitMs: newAccumulatedPitMs,
    currentFlag: newPhase === 'FINISHED' ? 'NONE' : newFlag,
    flagEndAt: newPhase === 'FINISHED' ? null : newFlagEndAt,
  }
}

// ── 유저 PIT 처리 ─────────────────────────────
export function applyUserPit(state: SessionState, minutes: number): SessionState {
  const now = Date.now()
  const pitMs = minutes * 60 * 1000
  const userId = state.userId
  const racer = state.racers[userId]
  if (!racer) return state

  // 트랙 위에 있으면 현재 세그먼트 잔여 시간만큼 피트 입구까지 주행
  const isOnTrack =
    racer.status === 'OUT_LAP' || racer.status === 'FLYING_LAP' || racer.status === 'COOL_DOWN'
  const remainingMs = isOnTrack
    ? Math.max(0, (1 - racer.progress) * racer.stateDuration)
    : 0

  if (remainingMs > 1000) {
    // 아직 피트 입구까지 주행 필요 → APPROACHING_PIT (racer는 그대로 주행 계속)
    return {
      ...state,
      userStatus: 'APPROACHING_PIT',
      pitApproachEndAt: now + remainingMs,
      pitEndAt: now + remainingMs + pitMs,
    }
  }

  // 이미 피트 근처이거나 IN_PIT 상태 → 즉시 FORCED_PIT
  const updatedRacer: Racer = {
    ...racer,
    status: 'FORCED_PIT',
    stateEnteredAt: now,
    stateDuration: pitMs,
    progress: 0,
  }

  return {
    ...state,
    userStatus: 'PIT',
    pitApproachEndAt: null,
    pitEndAt: now + pitMs,
    racers: {
      ...state.racers,
      [userId]: updatedRacer,
    },
  }
}

// ── 유저 DNF 처리 ─────────────────────────────
export function applyUserDnf(state: SessionState): SessionState {
  const userId = state.userId
  const racer = state.racers[userId]
  if (!racer) return state

  const now = Date.now()
  const multiplier = 12 + Math.floor(Math.random() * 8)
  const racersWithDnf = {
    ...state.racers,
    [userId]: { ...racer, status: 'DNF' as const },
  }

  return {
    ...state,
    phase: 'FAST_FORWARD',
    userStatus: 'DNF',
    pitApproachEndAt: null,
    fastForwardMultiplier: multiplier,
    racers: compressPitTimesForFF(racersWithDnf, now, multiplier),
    currentFlag: 'NONE',
    flagEndAt: null,
  }
}

// ── FF 즉시 종료 (SKIP) — 모든 드라이버 현재 상태 정산 후 FINISHED ──
export function applySkipFF(state: SessionState): SessionState {
  if (state.phase !== 'FAST_FORWARD') return state

  const track = TRACK_MAP[state.trackId]
  const now = Date.now()
  const updatedRacers = { ...state.racers }

  for (const id of Object.keys(updatedRacers)) {
    const racer = updatedRacers[id]

    // DNF → 기존 기록 그대로 (bestLap 있으면 순위 유지)
    if (racer.status === 'DNF') continue

    // IN_PIT / FORCED_PIT: 기록 없는 NPC는 랩 시뮬레이션
    if (racer.status === 'IN_PIT' || racer.status === 'FORCED_PIT') {
      if (racer.bestLap === null && !racer.isUser && track) {
        const lapTime = calculateLapTime(racer.pace, track.trackBaseTimeMs, 1.0)
        updatedRacers[id] = { ...racer, bestLap: lapTime, lastLap: lapTime, lapCount: 1 }
      }
      continue
    }

    if (track && (racer.status === 'FLYING_LAP' || racer.status === 'OUT_LAP')) {
      // FLYING_LAP: 진행 중 랩 즉시 기록
      // OUT_LAP: 어차피 flying lap 하려던 참 → 동일하게 기록
      const lapTime = calculateLapTime(racer.pace, track.trackBaseTimeMs, 1.0)
      const newBestLap = racer.bestLap === null || lapTime < racer.bestLap ? lapTime : racer.bestLap
      updatedRacers[id] = {
        ...racer,
        status: 'IN_PIT',
        bestLap: newBestLap,
        lastLap: lapTime,
        lapCount: racer.lapCount + 1,
        progress: 0,
        stateEnteredAt: now,
        stateDuration: 0,
      }
    } else {
      // COOL_DOWN → bestLap은 이미 FLYING_LAP 완주 시 기록됨, 그대로 IN_PIT
      updatedRacers[id] = {
        ...racer,
        status: 'IN_PIT',
        progress: 0,
        stateEnteredAt: now,
        stateDuration: 0,
      }
    }
  }

  return { ...state, phase: 'FINISHED', racers: updatedRacers, currentFlag: 'NONE', flagEndAt: null }
}
