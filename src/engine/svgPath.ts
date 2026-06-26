// ─────────────────────────────────────────────
// SVG Path 유틸리티
// 브라우저 네이티브 SVGPathElement.getPointAtLength() 사용
// progress (0~1) → {x, y} 좌표 변환
// ─────────────────────────────────────────────

// 서버사이드 렌더링 안전 가드
const isBrowser = typeof window !== 'undefined'

// 트랙별 캐시된 path element
const pathCache = new Map<string, SVGPathElement>()

function getOrCreatePath(trackId: string, svgPathD: string): SVGPathElement | null {
  if (!isBrowser) return null
  if (pathCache.has(trackId)) return pathCache.get(trackId)!

  const svgNS = 'http://www.w3.org/2000/svg'
  const svgEl = document.createElementNS(svgNS, 'svg')
  const pathEl = document.createElementNS(svgNS, 'path') as SVGPathElement
  pathEl.setAttribute('d', svgPathD)
  svgEl.appendChild(pathEl)
  // DOM에 붙이지 않아도 getTotalLength/getPointAtLength 동작함 (Chrome/Safari/Firefox 모두)
  pathCache.set(trackId, pathEl)
  return pathEl
}

export function getPathLength(trackId: string, svgPathD: string): number {
  const path = getOrCreatePath(trackId, svgPathD)
  if (!path) return 1000 // SSR fallback
  return path.getTotalLength()
}

export function getPointAtProgress(
  trackId: string,
  svgPathD: string,
  progress: number // 0~1
): { x: number; y: number } {
  const path = getOrCreatePath(trackId, svgPathD)
  if (!path) return { x: 250, y: 250 } // SSR fallback

  const totalLength = path.getTotalLength()
  const point = path.getPointAtLength(progress * totalLength)
  return { x: point.x, y: point.y }
}

export function clearPathCache() {
  pathCache.clear()
}
