'use client'
import { useEffect, useRef } from 'react'
import { Racer } from '@/engine/types'
import { getPointAtProgress } from '@/engine/svgPath'

interface DriverDotProps {
  racer: Racer
  trackId: string
  svgPath: string
  isUser: boolean
  pathOffset: number
  pathOffsetReversed?: boolean
  rotationAngle?: number
  scale?: number
}

export default function DriverDot({ racer, trackId, svgPath, isUser, pathOffset, pathOffsetReversed, rotationAngle = 0, scale = 1 }: DriverDotProps) {
  const groupRef = useRef<SVGGElement>(null)
  const isRev = !!pathOffsetReversed
  const calibratedProgress = isRev
    ? (1 - racer.progress + pathOffset + 1) % 1
    : (racer.progress + pathOffset) % 1
  const initialPos = getPointAtProgress(trackId, svgPath, calibratedProgress)
  const prevPos = useRef<{ x: number; y: number }>(initialPos)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    if (!groupRef.current) return

    const calibratedProgress = isRev
      ? (1 - racer.progress + pathOffset + 1) % 1
      : (racer.progress + pathOffset) % 1
    const targetPos = getPointAtProgress(trackId, svgPath, calibratedProgress)
    const startPos = prevPos.current
    const startTime = performance.now()
    const duration = 80 // ms — 부드러운 보간

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // easeInOut

      const x = startPos.x + (targetPos.x - startPos.x) * ease
      const y = startPos.y + (targetPos.y - startPos.y) * ease

      if (groupRef.current) {
        groupRef.current.setAttribute('transform', `translate(${x}, ${y})`)
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        prevPos.current = targetPos
      }
    }

    cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animFrameRef.current)
  }, [racer.progress, trackId, svgPath])

  // DNF는 흐리게
  const isDnf = racer.status === 'DNF'
  const isInPit = racer.status === 'IN_PIT' || racer.status === 'FORCED_PIT'

  // 피트에 있으면 숨김
  if (isInPit) return null

  // SVG viewBox는 500×500 — 도트를 트랙 두께 대비 적절한 크기로
  const dotRadius = (isUser ? 12 : 9.6) * scale
  const color = racer.teamColor

  return (
    <g
      ref={groupRef}
      opacity={isDnf ? 0.3 : 1}
      style={{ transition: 'opacity 0.3s' }}
      transform={`translate(${initialPos.x}, ${initialPos.y})`}
    >
      {/* 유저 강조 글로우 링 */}
      {isUser && (
        <>
          <circle r={dotRadius + 8.4 * scale} fill="none" stroke="white" strokeWidth={0.72 * scale} opacity={0.2} />
          <circle r={dotRadius + 4.8 * scale} fill="none" stroke="white" strokeWidth={1.2 * scale} opacity={0.55} />
        </>
      )}

      {/* 메인 점 — 흰 테두리로 모든 섹터 색 위에서 가시성 확보 */}
      <circle r={dotRadius + 1.8 * scale} fill="white" opacity={0.9} />
      <circle
        r={dotRadius}
        fill={color}
        stroke={isUser ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
        strokeWidth={isUser ? 2.4 * scale : 1.2 * scale}
      />

      {/* 드라이버 코드 라벨 */}
      <g transform={`translate(${dotRadius + 6 * scale}, ${dotRadius * 0.42}) rotate(${-rotationAngle})`}>
        <text
          x={0}
          y={0}
          fill="white"
          fontSize={12 * scale}
          fontWeight="bold"
          fontFamily="monospace"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          dominantBaseline="central"
        >
          {racer.id}
        </text>
      </g>
    </g>
  )
}
