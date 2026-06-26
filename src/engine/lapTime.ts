// ─────────────────────────────────────────────
// 랩타임 계산기
// pace 90 = 폴 레코드 대비 5% 느림
// pace 99 = 폴 레코드 대비 0.5% 느림 (레코드 갱신 불가)
// ±1.2% 노이즈 → 동일 pace라도 매 랩 다른 기록
// ─────────────────────────────────────────────

const NOISE_RANGE = 0.012  // ±1.2% 랜덤 노이즈

export function calculateLapTime(
  pace: number,
  trackBaseTimeMs: number,
  sessionProgress: number,
  yellowPenaltyMs = 0
): number {
  const prog = Math.min(1, Math.max(0, sessionProgress));
  
  // pace 90→1.05x, pace 99→1.005x (폴 레코드보다 항상 느림)
  const factor = 1.05 - (pace - 90) * 0.005;
  const noise = (Math.random() * 2 - 1) * NOISE_RANGE * trackBaseTimeMs;
  
  // 세션 진행도(공부 경과율)에 따른 초반 페널티 부과
  // 초반(prog=0)에는 트랙 레코드의 5%만큼 느려지는 페널티가 부여되며, 진행할수록(prog=1) 0으로 수렴합니다.
  const maxSessionPenalty = trackBaseTimeMs * 0.05;
  const sessionPenalty = maxSessionPenalty * (1 - prog);

  const rawTime = trackBaseTimeMs * factor + noise + sessionPenalty;
  
  // 절대 최저선: 폴 레코드 99% (거의 도달 불가 — 극단적 노이즈 방지용)
  return Math.max(trackBaseTimeMs * 0.99, rawTime) + yellowPenaltyMs;
}

// ms → "1:23.456" 포맷
export function formatLapTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const millis = Math.floor(ms % 1000)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

// ms → "+0.123" 갭 포맷
export function formatGap(ms: number): string {
  const seconds = ms / 1000
  return `+${seconds.toFixed(3)}`
}

// ms → "01:23:45" 공부 타이머 포맷
export function formatStudyTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
