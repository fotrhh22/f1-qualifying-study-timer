// ─────────────────────────────────────────────
// Racer Status State Machine
// ─────────────────────────────────────────────
export type RacerStatus =
  | 'IN_PIT'       // 피트에서 대기 (15~90초)
  | 'OUT_LAP'      // 워밍업 랩 (속도 0.9배)
  | 'FLYING_LAP'   // 기록 측정 랩 (속도 1.05배)
  | 'COOL_DOWN'    // 쿨다운 랩 (속도 0.85배)
  | 'DNF'          // 리타이어
  | 'FORCED_PIT'   // 유저 휴식 중 강제 피트

// ─────────────────────────────────────────────
// Session Phase
// ─────────────────────────────────────────────
export type SessionPhase =
  | 'IDLE'          // 세션 시작 전
  | 'RUNNING'       // 공부 타이머 진행 중
  | 'FAST_FORWARD'  // 타이머 종료 후 남은 랩 진행
  | 'FINISHED'      // 모든 차량 완료

// ─────────────────────────────────────────────
// Flag Status
// ─────────────────────────────────────────────
export type FlagStatus = 'NONE' | 'YELLOW' | 'RED'

// ─────────────────────────────────────────────
// User Status (유저 전용)
// ─────────────────────────────────────────────
export type UserStatus = 'RUNNING' | 'APPROACHING_PIT' | 'PIT' | 'DNF'

// ─────────────────────────────────────────────
// Driver Data (정적 데이터)
// ─────────────────────────────────────────────
export interface DriverData {
  id: string           // 'VER', 'NOR', ...
  name: string         // 'Max Verstappen'
  shortName: string    // 'Verstappen'
  team: string         // 'Red Bull'
  teamColor: string    // '#3671C6'
  basePace: number     // 90~99, 팀/드라이버 기준 베이스라인
  number: number       // 레이서 번호
}

// ─────────────────────────────────────────────
// Track Data (정적 데이터)
// ─────────────────────────────────────────────
export interface CornerData {
  number: number     // 코너 번호 (1-based)
  letter: string     // 복합 코너 구분 ('A', 'B', '' 등)
  length: number     // 스타트라인 기준 누적 거리 (m) — progress 계산용
  shiftDistance?: number // 수직 법선 오프셋 (기본 0)
  xOffset?: number       // 화면 기준 수평 X축 오프셋
  yOffset?: number       // 화면 기준 수직 Y축 오프셋
}

export interface TrackData {
  id: string
  name: string          // 'Circuit de Monaco'
  gpName: string        // 'Monaco Grand Prix'
  country: string       // 'Monaco'
  flag: string          // '🇲🇨'
  svgPath: string       // SVG path d 속성값
  viewBox: string       // '0 0 500 500'
  trackBaseTimeMs: number  // 역대 퀄리파잉 폴 레코드 (ms)
  lengthKm: number      // 트랙 길이 km
  turns: number         // 코너 수
  type: 'Street Circuit' | 'Permanent Circuit' | 'Hybrid Circuit'
  pathOffset?: number   // 트랙 시작/종료 라인 오프셋 (0~1)
  pathOffsetReversed?: boolean // 트랙 진행 방향이 역방향(reversed)인지 여부
  sector1Progress?: number // Sector 1 progress split (0~1)
  sector2Progress?: number // Sector 2 progress split (0~1)
  rotationAngle?: number   // Rotation angle for visual display (0~360)
  poleDriver?: string   // 폴 포지션 드라이버 코드 (예: 'NOR')
  poleCar?: string      // 폴 포지션 머신 (예: 'McLaren MCL39')
  poleYear?: number     // 폴 포지션 연도
}

// ─────────────────────────────────────────────
// Racer (런타임 상태)
// ─────────────────────────────────────────────
export interface Racer {
  // 기본 정보
  id: string
  name: string
  shortName: string
  team: string
  teamColor: string
  number: number
  isUser: boolean

  // 퀄리파잉 성능
  pace: number              // 세션 시작 시 랜덤 생성된 실제 pace (90~99)

  // 상태 머신
  status: RacerStatus
  progress: number          // 0~1 (현재 트랙 위 위치)
  stateEnteredAt: number    // 현재 상태 진입 타임스탬프 (ms)
  stateDuration: number     // 현재 상태 총 지속 시간 (ms)

  // 랩 기록
  bestLap: number | null    // 최고 랩타임 (ms)
  lastLap: number | null    // 직전 랩타임 (ms)
  lapCount: number          // 완료한 FLYING_LAP 수
  totalLaps: number         // OUT_LAP + FLYING_LAP + COOL_DOWN 전체 합계

  // 트랙 상의 위치/갭 정보 (Phase 1)
  trackPosition?: number
  gapAhead?: number | null
  gapBehind?: number | null

  // 페널티 및 어택 제어 (Phase 2)
  trafficPenaltyMs?: number
  consecutiveFlyingLaps?: number
  dnfAtProgress?: number | null
  lapTimes?: number[]
}

// ─────────────────────────────────────────────
// Session State (Zustand store)
// ─────────────────────────────────────────────
export interface SessionState {
  // 세션 설정
  phase: SessionPhase
  trackId: string
  userId: string            // 유저가 선택한 드라이버 id
  studyTargetMs: number     // 목표 공부 시간 (ms)
  studyElapsedMs: number    // 경과 공부 시간 (ms)

  // 유저 상태
  userStatus: UserStatus
  pitApproachEndAt: number | null  // 피트 진입 카운트다운 종료 타임스탬프
  pitEndAt: number | null          // 휴식 종료 예정 타임스탬프

  // 레이서들
  racers: Record<string, Racer>

  // FAST FORWARD
  fastForwardMultiplier: number   // 8~20배
  totalDnfCount: number           // 세션 전체 DNF 수 (0~2 캡)
  accumulatedPitMs: number        // 누적 피트인 휴식 시간 (ms)

  // 깃발
  currentFlag: FlagStatus
  flagEndAt: number | null
}

// ─────────────────────────────────────────────
// Ranking Entry (UI용)
// ─────────────────────────────────────────────
export interface RankingEntry {
  position: number
  racerId: string
  name: string
  shortName: string
  teamName: string
  teamColor: string
  isUser: boolean
  bestLap: number | null    // ms
  gap: number | null        // P1 대비 gap (ms), P1은 null
  lapCount: number          // 완료한 FLYING_LAP 수
  totalLaps: number         // 전체 랩 수 (out+flying+cooldown)
  status: RacerStatus
  isDnf: boolean
}

// ─────────────────────────────────────────────
// Pit Duration Options
// ─────────────────────────────────────────────
export type PitDuration = 5 | 10 | 15  // 분
