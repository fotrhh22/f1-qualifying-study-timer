// ─────────────────────────────────────────────
// Zustand Session Store
// raceEngine 연결 + rAF 기반 tick 루프
// ─────────────────────────────────────────────
import { create } from 'zustand'
import { SessionState, PitDuration } from '@/engine/types'
import { DRIVERS, DRIVER_MAP } from '@/data/drivers'
import { TRACK_MAP } from '@/data/tracks'
import { DRIVER_FACE } from '@/data/images'
import { generatePaces } from '@/engine/pace'
import { createRacers, tickEngine, applyUserPit, applyUserDnf, applySkipFF, computeRanking } from '@/engine/raceEngine'


interface SessionStore {
  session: SessionState | null
  rafId: number | null

  // 액션
  startSession: (driverId: string, trackId: string, sessionTargetMs: number) => void
  stopSession: () => void
  userPit: (minutes: PitDuration) => void
  userDnf: () => void
  skipFF: () => void
  resetSession: () => void
  applyLapDelete: (racerId: string) => void
  applyTimePenalty: (racerId: string, penaltyMs: number) => void

  // 내부
  _tick: (deltaMs: number) => void
}

const INITIAL_FF_MULTIPLIER = 12

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  rafId: null,

  startSession: (driverId, trackId, sessionTargetMs) => {
    // Cancel only the web animation loop here. Native startActivity replaces any
    // stale Live Activity atomically; calling stop/start back-to-back can race.
    const existingRafId = get().rafId
    if (existingRafId !== null) {
      cancelAnimationFrame(existingRafId)
      set({ rafId: null })
    }

    const track = TRACK_MAP[trackId]
    if (!track) return

    // USER 드라이버가 목록에 없으면 추가 (유저가 선택한 드라이버 = 실제 F1 드라이버)
    const driverData = DRIVER_MAP[driverId]
    if (!driverData) return

    // 22명 pace 생성
    const paces = generatePaces(DRIVERS)

    // 레이서 생성
    const racers = createRacers(
      DRIVERS.map((d) => d.id),
      driverId,
      paces,
      track.trackBaseTimeMs,
      DRIVERS.map((d) => ({
        id: d.id,
        name: d.name,
        shortName: d.shortName,
        team: d.team,
        teamColor: d.teamColor,
        number: d.number,
      }))
    )

    const initialSession: SessionState = {
      phase: 'RUNNING',
      trackId,
      userId: driverId,
      sessionTargetMs,
      sessionElapsedMs: 0,
      focusElapsedMs: 0,
      userStatus: 'RUNNING',
      pitApproachEndAt: null,
      pitEndAt: null,
      racers,
      fastForwardMultiplier: INITIAL_FF_MULTIPLIER,
      totalDnfCount: 0,
      accumulatedPitMs: 0,
      currentFlag: 'NONE' as const,
      flagEndAt: null,
    }

    set({ session: initialSession })

    // rAF 루프 시작
    const startLoop = (lastTime: number) => {
      const rafId = requestAnimationFrame(() => {
        const now = Date.now()
        const deltaMs = now - lastTime
        get()._tick(deltaMs)
        const currentSession = get().session
        if (currentSession && currentSession.phase !== 'FINISHED') {
          startLoop(now)
        }
      })
      set({ rafId })
    }

    startLoop(Date.now())
  },

  _tick: (deltaMs: number) => {
    const { session } = get()
    if (!session) return
    if (session.phase === 'IDLE' || session.phase === 'FINISHED') return

    let remainingMs = Math.max(0, deltaMs)
    // Cap maximum catch-up at 30 minutes (1,800,000 ms) to prevent infinite loops / CPU freezing
    const MAX_CATCH_UP_MS = 1800000
    if (remainingMs > MAX_CATCH_UP_MS) {
      remainingMs = MAX_CATCH_UP_MS
    }

    let currentSession = session
    const stepSize = 200 // 200ms tick increments for simulation accuracy

    while (remainingMs > 0) {
      if (currentSession.phase === 'FINISHED') break
      const step = Math.min(remainingMs, stepSize)
      currentSession = tickEngine(currentSession, step)
      remainingMs -= step
    }

    const prevStatus = session.userStatus
    const nextStatus = currentSession.userStatus
    const prevPhase = session.phase
    const nextPhase = currentSession.phase

    set({ session: currentSession })
  },

  stopSession: () => {
    const { rafId } = get()
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      set({ rafId: null })
    }
  },

  userPit: (minutes) => {
    const { session } = get()
    if (!session) return
    const newSession = applyUserPit(session, minutes)
    set({ session: newSession })
  },

  userDnf: () => {
    const { session } = get()
    if (!session) return
    const newSession = applyUserDnf(session)
    set({ session: newSession })
  },

  skipFF: () => {
    const { session } = get()
    if (!session) return
    set({ session: applySkipFF(session) })
  },

  resetSession: () => {
    const { stopSession } = get()
    stopSession()
    set({ session: null })
  },

  applyLapDelete: (racerId) => {
    const { session } = get()
    if (!session) return
    const racer = session.racers[racerId]
    if (!racer) return
    const currentLapTimes = racer.lapTimes ?? []
    if (currentLapTimes.length === 0) return

    const newLapTimes = [...currentLapTimes]
    newLapTimes.pop()

    const newBestLap = newLapTimes.length > 0 ? Math.min(...newLapTimes) : null
    const newLastLap = newLapTimes.length > 0 ? newLapTimes[newLapTimes.length - 1] : null

    set({
      session: {
        ...session,
        racers: {
          ...session.racers,
          [racerId]: {
            ...racer,
            lapTimes: newLapTimes,
            bestLap: newBestLap,
            lastLap: newLastLap,
            lapCount: newLapTimes.length,
          }
        }
      }
    })
  },

  applyTimePenalty: (racerId, penaltyMs) => {
    const { session } = get()
    if (!session) return
    const racer = session.racers[racerId]
    if (!racer) return
    const currentLapTimes = racer.lapTimes ?? []
    if (currentLapTimes.length === 0) return

    const newLapTimes = [...currentLapTimes]
    newLapTimes[newLapTimes.length - 1] += penaltyMs

    const newBestLap = Math.min(...newLapTimes)
    const newLastLap = newLapTimes[newLapTimes.length - 1]

    set({
      session: {
        ...session,
        racers: {
          ...session.racers,
          [racerId]: {
            ...racer,
            lapTimes: newLapTimes,
            bestLap: newBestLap,
            lastLap: newLastLap,
          }
        }
      }
    })
  },
}))

// ── 편의 셀렉터 ──────────────────────────────
export const useSession = () => useSessionStore((s) => s.session)

// useRanking: racers 객체만 구독, 컴포넌트에서 computeRanking 호출
export const useRacers = () =>
  useSessionStore((s) => s.session?.racers ?? null)

export const useUserRacer = () =>
  useSessionStore((s) =>
    s.session ? s.session.racers[s.session.userId] ?? null : null
  )
export const useTrack = () =>
  useSessionStore((s) => (s.session ? TRACK_MAP[s.session.trackId] ?? null : null))

// ranking은 훅이 아닌 일반 함수로 제공 — 컴포넌트에서 useMemo와 함께 사용
export { computeRanking }
