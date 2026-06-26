// ─────────────────────────────────────────────
// Pace 생성기
// 세션 시작 시 22명 pace를 basePace 기준으로 랜덤 생성
// ─────────────────────────────────────────────
import { DriverData } from './types'

const PACE_NOISE = 2.5 // ±2.5 범위 (부동소수점 — 동점 방지)

export function generatePaces(drivers: DriverData[]): Record<string, number> {
  const paces: Record<string, number> = {}
  for (const driver of drivers) {
    const noise = (Math.random() * 2 - 1) * PACE_NOISE
    // Math.round 제거 — 부동소수점 유지로 드라이버별 미묘한 차이 보장
    paces[driver.id] = Math.max(88, Math.min(99, driver.basePace + noise))
  }
  return paces
}
