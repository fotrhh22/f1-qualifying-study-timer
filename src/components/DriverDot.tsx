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
  showLabel?: boolean
}

export default function DriverDot({ racer, trackId, svgPath, isUser, pathOffset, pathOffsetReversed, rotationAngle = 0, showLabel = false }: DriverDotProps) {
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

  // 레퍼런스처럼 섹터 선 위에서도 즉시 구분되는 큰 팀 컬러 마커
  const dotRadius = isUser ? 11 : 9.5
  const color = racer.teamColor
  const labelOnLeft = initialPos.x > 250
  const labelX = labelOnLeft ? -(dotRadius + 7) : dotRadius + 7
  const labelAnchor = labelOnLeft ? 'end' : 'start'

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
          <circle r={dotRadius + 8} fill="none" stroke={color} strokeWidth={1.2} opacity={0.22} />
          <circle r={dotRadius + 5} fill="none" stroke="white" strokeWidth={1.1} opacity={0.45} />
        </>
      )}

      {/* 흰 링 + 팀 컬러 채움: 어떤 섹터 위에서도 동일한 대비 유지 */}
      <circle r={dotRadius + 3.4} fill="#080A10" opacity={0.82} />
      <circle r={dotRadius + 2.2} fill={color} stroke="#F7F8FB" strokeWidth={2.6} />
      <circle
        r={dotRadius - 1.1}
        fill={color}
        stroke="rgba(6, 8, 13, 0.32)"
        strokeWidth={0.8}
      />

      {/* 레퍼런스처럼 배경 pill 없이 선명한 드라이버 코드 표시 */}
      {(showLabel || isUser) && <g transform={`translate(${labelX}, 0) rotate(${-rotationAngle})`}>
        <text
          x={0}
          y={0.5}
          fill="#F7F8FB"
          stroke="#080A10"
          strokeWidth={2.8}
          paintOrder="stroke"
          fontSize={11.5}
          fontWeight={900}
          fontFamily="'JetBrains Mono', 'SFMono-Regular', Consolas, monospace"
          letterSpacing="0.02em"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          dominantBaseline="central"
          textAnchor={labelAnchor}
        >
          {racer.id}
        </text>
      </g>}
    </g>
  )
}
