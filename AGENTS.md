# F1 Qualifying Study Timer — 현재 진행상황 및 문제점

## 프로젝트 개요
공부 타이머를 F1 퀄리파잉으로 시각화하는 Next.js 15 PWA 앱

## 기술 스택
- Next.js 15 (App Router, Static Export)
- TypeScript
- Zustand
- Framer Motion
- Tailwind CSS
- @ducanh2912/next-pwa
- Capacitor (iOS 래퍼)

## 완료된 작업

### Phase 0 — 데이터 확보 ✅
- 22개 트랙 SVG path 확보 (julesr0y/f1-circuits-svg, CC-BY-4.0)
- 22개 트랙 trackBaseTimeMs 확정 (퀄리파잉 폴 레코드 기준, motorsporttickets.com 2026-05-26 기준)
- 22명 드라이버 명단 확정 (2026 실제 그리드)
- SVG path 저장 위치: /home/Codex/f1-svg-ref/svgs/*.svg

### Phase 1 — 프로젝트 스캐폴딩 ✅
- Next.js 15 프로젝트 생성
- 패키지 설치 완료 (zustand, framer-motion, @ducanh2912/next-pwa, @capacitor/*)
- next.config.ts: PWA + output: 'export' 설정
- tailwind.config.ts: F1 다크 테마, 11개 팀 컬러
- globals.css: F1TV 스타일, portrait 경고 오버레이
- manifest.json: orientation: landscape
- capacitor.config.ts: webDir: 'out'

### Phase 2 — 타입 정의 + 정적 데이터 ✅
- src/engine/types.ts: RacerStatus, SessionPhase, Racer, SessionState, RankingEntry 등
- src/data/drivers.ts: 2026 그리드 22명 (id, name, team, teamColor, basePace, number)
- src/data/tracks.ts: 22개 트랙 (svgPath, viewBox, trackBaseTimeMs, lengthKm, turns, type)

### Phase 3-5 — 엔진 + Store ✅ (로직은 완성, 버그 있음)
- src/engine/svgPath.ts: 브라우저 네이티브 getPointAtLength() 래퍼
- src/engine/pace.ts: 세션 시작 시 22명 pace 랜덤 생성
- src/engine/lapTime.ts: 랩타임 계산 + 포맷 유틸
- src/engine/raceEngine.ts: 상태머신 tickEngine(), createRacers(), computeRanking()
- src/store/sessionStore.ts: Zustand store + rAF 루프

### Phase 6 — Setup 화면 ✅ (동작 확인됨)
- src/store/setupStore.ts: 3단계 Setup 공유 상태
- src/app/page.tsx: Home 화면
- src/app/setup/driver/page.tsx: Step 1 드라이버 선택
- src/app/setup/track/page.tsx: Step 2 트랙 선택
- src/app/setup/time/page.tsx: Step 3 시간 선택 + startSession() 호출

### Phase 7 — Session 화면 ⚠️ (버그 다수)
- src/components/StudyTimer.tsx
- src/components/RankingBoard.tsx
- src/components/DriverDot.tsx
- src/components/TrackMap.tsx
- src/components/PitModal.tsx
- src/components/ResultsOverlay.tsx
- src/app/session/page.tsx

---

## 현재 확인된 버그 목록

### 버그 1 — useRanking 무한루프 [CRITICAL]
**증상:** Console Error: "The result of getSnapshot should be cached to avoid an infinite loop"
**위치:** src/store/sessionStore.ts:137, RankingBoard.tsx:6
**원인:** useRanking 셀렉터가 매 렌더마다 computeRanking()으로 새 배열 반환 → Zustand가 참조 변경으로 감지 → 무한 리렌더
**수정 방법:**
```typescript
// 기존 (문제)
export const useRanking = () =>
  useSessionStore((s) => (s.session ? computeRanking(s.session.racers) : []))

// 수정: useRacers로 racers만 구독, 컴포넌트에서 useMemo 사용
export const useRacers = () =>
  useSessionStore((s) => s.session?.racers ?? null)
export { computeRanking }

// RankingBoard, ResultsOverlay에서:
const racers = useRacers()
const ranking = useMemo(() => (racers ? computeRanking(racers) : []), [racers])
```
**수정 여부:** 코드는 수정했으나 사용자 로컬에 파일이 제대로 교체되지 않아 아직 에러 발생 중

### 버그 2 — 트랙 SVG 미표시 [CRITICAL]
**증상:** Session 화면 중앙이 완전 검정, 트랙 안 보임
**원인 추정:**
- SVG path가 500x500 좌표계인데 컨테이너 크기와 맞지 않을 수 있음
- TrackMap의 SVG viewBox 설정 문제
- 'use client' + SSR 환경에서 SVG 렌더링 타이밍 문제
**수정 필요:** TrackMap.tsx SVG 렌더링 방식 재검토

### 버그 3 — 타이머 포맷 깨짐 [HIGH]
**증상:** `-00:59:51 remaining`, `0:0001:00:00` 등 이상한 값 표시
**원인:** formatStudyTime()이 남은 시간(remaining)을 잘못 계산하거나,
         studyElapsedMs가 음수 또는 비정상 값을 가짐
**위치:** src/engine/lapTime.ts formatStudyTime(), src/components/StudyTimer.tsx

### 버그 4 — 레이아웃 완전 깨짐 [HIGH]
**증상:** 3열 레이아웃(좌측 패널 / 중앙 트랙 / 우측 패널) 미적용, 텍스트만 나열
**원인 추정:**
- Tailwind 클래스가 제대로 빌드되지 않음
- 'use client' 컴포넌트들의 hydration 문제
- flex/grid 레이아웃 컨테이너 높이 미설정

### 버그 5 — DriverDot 미표시
**증상:** 트랙 SVG 자체가 안 보이므로 드라이버 점도 당연히 미표시
**원인:** 버그 2와 동일, SVG 렌더링 문제

---

## 수정되지 않은 알려진 코드 문제점

### raceEngine.ts
- progressDelta 미사용 변수 (actualDelta와 중복)
- performance.now()와 Date.now() 혼용

### sessionStore.ts
- rAF lastTime 전달 방식 불안정
- FF multiplier 변경 시 store.setState 직접 호출 (session/page.tsx에서)

### StudyTimer.tsx
- PIT 카운트다운이 pitEndAt - Date.now()를 렌더마다 계산하는데
  리렌더가 없으면 카운트다운이 멈춤

---

## 확정된 UI 레이아웃

```
┌──────────────────────────────────────────────────────────────────────┐
│ [드라이버 이름 + 팀]        QUALIFYING              [🔊] [⚙️]        │
├───────────┬────────────────────────────────────┬─────────────────────┤
│ STUDY     │                                    │ TRACK INFO          │
│ TIMER     │                                    │ 트랙명              │
│           │          TrackMap                  │ Length   5.3km      │
│ 01:23:45  │       (SVG + DriverDots)           │ Turns    19         │
│           │                                    │ Type     Street     │
│ ───────── │                                    │                     │
│ LIVE      │                                    │                     │
│ RANKING   │                                    │                     │
│ P1  NOR   │                                    │                     │
│ P2  VER   │                                    │                     │
│ ...       │                                    │                     │
├───────────┴────────────────────────────────────┴─────────────────────┤
│   [ PIT IN  00:00 ]    [ DNF  Give Up ]    STATUS     ×12 [ ▼ ▲ ]   │
└──────────────────────────────────────────────────────────────────────┘
```

## Setup 화면 흐름
```
/ → /setup/driver → /setup/track → /setup/time → /session
```

## 다음 해야 할 작업
1. 버그 1~5 전부 수정
2. 사용자가 "component 개별 디자인이 끔찍하다"고 언급 → Phase 10 디자인 개선 필요
3. Phase 8 인터랙션 마무리 (PIT 카운트다운, FF 배속 조절)
4. Phase 9 ResultsOverlay 검증
5. Phase 10 전체 디자인 polish
6. PWA/Capacitor 빌드 검증

## 파일 위치
- 프로젝트: /home/Codex/f1-study-timer/
- SVG 원본: /home/Codex/f1-svg-ref/svgs/
- 최신 zip: /mnt/user-data/outputs/f1-study-timer-phase7-fix.zip

## 드라이버 22명 (2026 그리드)
NOR, PIA (McLaren), LEC, HAM (Ferrari), VER, HAD (Red Bull),
RUS, ANT (Mercedes), ALO, STR (Aston Martin), GAS, COL (Alpine),
OCO, BEA (Haas), ALB, SAI (Williams), HUL, BOR (Audi),
LAW, LIN (Racing Bulls), PER, BOT (Cadillac)

## 트랙 22개 (2026 캘린더)
melbourne, shanghai, suzuka, miami, montreal, monaco,
catalunya, spielberg, silverstone, spa-francorchamps,
hungaroring, zandvoort, monza, madring, baku, marina-bay,
austin, mexico-city, interlagos, las-vegas, lusail, yas-marina

---

## Phase 8 — 인터랙션 연결 (미완료)
- PIT 버튼 → FORCED_PIT 전이 로직 연결
  - PIT 버튼 클릭 → PitModal (5/10/15분 선택) → userPit(minutes) 호출
  - 유저 레이서 FORCED_PIT 상태 전이
  - 하단 PIT IN 카운트다운 표시 (setInterval 기반으로 수정 필요)
- DNF 버튼 → 즉시 DNF + FAST_FORWARD 전이
  - 확인 다이얼로그 → userDnf() 호출
- 타이머 자연 종료 → 자동 FAST_FORWARD 전이
  - tickEngine 내부에서 studyElapsedMs >= studyTargetMs 감지 시 자동 전환
- FAST_FORWARD 종료 조건 감지 → 최종 결과 화면
  - 모든 레이서 IN_PIT 또는 DNF → phase: FINISHED → ResultsOverlay 표시
- FF 배속 조절: x8~x20 범위, ▼▲ 버튼, FAST_FORWARD 중에만 표시

## Phase 9 — 최종 순위 화면 (미완료)
- FAST_FORWARD 종료 후 최종 22명 순위 표시
- 유저 본인 순위 하이라이트 (붉은 테두리 + 배경)
- P1/P2/P3 금/은/동 색상
- 유저 요약: 공부 시간 / 최고 랩 / 최종 순위 P? / 22
- HOME / NEW SESSION 버튼

## Phase 10 — 다듬기 (미완료)
- F1TV 스타일 다크 테마 전반 개선
  - 사용자 피드백: "component 개별 디자인이 끔찍하다" → 전체 UI polish 필요
  - Tailwind 미적용 문제 해결 후 디자인 재검토
- 애니메이션 이징 보정 (DriverDot 움직임 부자연스러운 구간 수정)
- 22개 트랙 전수 시각 검증
- 출처 크레딧 표기: "Circuit layouts © julesr0y/f1-circuits-svg, CC-BY-4.0" (Home 화면 하단)
- PWA/Capacitor 빌드 검증

## 다음 해야 할 작업 (우선순위 순)
1. [CRITICAL] Tailwind CSS 미적용 문제 해결
   - 로컬에서 확인 필요: cat globals.css | head -3 / cat postcss.config.mjs
2. [CRITICAL] 버그 1 — useRanking 무한루프 (파일 교체 미적용 상태)
3. [CRITICAL] 버그 2 — 트랙 SVG 미표시 (TrackMap 재검토 필요)
4. [HIGH] 버그 3 — 타이머 포맷 깨짐
5. [HIGH] 버그 4/5 — 레이아웃/DriverDot (Tailwind 해결 시 자동 해결 예상)
6. Phase 8 인터랙션 연결 마무리
7. Phase 9 ResultsOverlay 검증
8. Phase 10 전체 디자인 polish
