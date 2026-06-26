'use client'
import { useState, useEffect } from 'react'
import { useSession } from '@/store/sessionStore'
import { TRACK_MAP } from '@/data/tracks'
import { CORNERS } from '@/data/corners'
import { CornerData } from '@/engine/types'
import { getPointAtProgress } from '@/engine/svgPath'
import DriverDot from './DriverDot'

const S1 = '#E91B8C'
const S2 = '#FFD100'
const S3 = '#00A3E0'

export default function TrackMap() {
  const session = useSession()
  const track = session ? TRACK_MAP[session.trackId] : null

  const [bounds, setBounds] = useState({ minX: 0, minY: 0, w: 500, h: 500, cx: 250, cy: 250 })

  const p = track?.svgPath || ''
  const rotAngle = track?.rotationAngle ?? 0

  // Calculate rotated bounding box dynamically when track or rotation angle changes
  useEffect(() => {
    if (!track || !p) return

    const pts = []
    // 100 points is enough for a bounding box
    for (let i = 0; i <= 100; i++) {
      const pt = getPointAtProgress(track.id, p, i / 100)
      pts.push(pt)
    }
    
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (const pt of pts) {
      if (pt.x < minX) minX = pt.x
      if (pt.x > maxX) maxX = pt.x
      if (pt.y < minY) minY = pt.y
      if (pt.y > maxY) maxY = pt.y
    }

    const cx = minX + (maxX - minX) / 2
    const cy = minY + (maxY - minY) / 2

    const rad = (rotAngle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    let rMinX = Infinity, rMaxX = -Infinity
    let rMinY = Infinity, rMaxY = -Infinity

    for (const pt of pts) {
      const dx = pt.x - cx
      const dy = pt.y - cy
      const rx = cx + dx * cos - dy * sin
      const ry = cy + dx * sin + dy * cos
      if (rx < rMinX) rMinX = rx
      if (rx > rMaxX) rMaxX = rx
      if (ry < rMinY) rMinY = ry
      if (ry > rMaxY) rMaxY = ry
    }

    const pad = 24
    setBounds({
      minX: rMinX - pad,
      minY: rMinY - pad,
      w: rMaxX - rMinX + 2 * pad,
      h: rMaxY - rMinY + 2 * pad,
      cx,
      cy
    })
  }, [track?.id, p, rotAngle])

  if (!session || !track) return null

  const racers = Object.values(session.racers)
  const corners = CORNERS[track.id] ?? []
  const offset = track.pathOffset ?? 0
  const isRev = !!track.pathOffsetReversed

  // Helper to calculate exact dash properties, handling wrap-around at 0/100 boundary
  const getSectorDashProps = (startProgress: number, length: number) => {
    const A = ((startProgress % 100) + 100) % 100
    const B = (((startProgress + length) % 100) + 100) % 100

    if (A < B) {
      return {
        strokeDasharray: `${length} 100`,
        strokeDashoffset: -A
      }
    } else {
      // Wraps around boundary
      const firstDashLength = B
      const firstGapLength = A - B
      const secondDashLength = 100 - A
      return {
        strokeDasharray: `${firstDashLength} ${firstGapLength} ${secondDashLength} 100`,
        strokeDashoffset: 0
      }
    }
  }

  const s1P = track.sector1Progress ?? 0.333
  const s2P = track.sector2Progress ?? 0.666

  const s1Start = isRev ? (offset - s1P) * 100 : offset * 100
  const s2Start = isRev ? (offset - s2P) * 100 : (offset + s1P) * 100
  const s3Start = isRev ? (offset - 1.000) * 100 : (offset + s2P) * 100

  const s1Props = getSectorDashProps(s1Start, s1P * 100)
  const s2Props = getSectorDashProps(s2Start, (s2P - s1P) * 100)
  const s3Props = getSectorDashProps(s3Start, (1.0 - s2P) * 100)

  const scale = Math.max(bounds.w, bounds.h) / 500

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      style={{ padding: '24px', background: '#1A1B28' }}
    >
      <svg
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.w} ${bounds.h}`}
        style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Rotation Group wrapper */}
        <g transform={`rotate(${rotAngle}, ${bounds.cx}, ${bounds.cy})`}>
          {/* ── 트랙 레이어 ── */}
          {/* 외곽 검정 테두리: colored(8) 대비 2px씩만 넓혀 겹침 방지 */}
          <path d={p} stroke="#0C0C0C" strokeWidth={10 * scale} fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* 섹터 컬러 (pathLength 정규화) */}
          <path d={p} pathLength="100" stroke={S1} strokeWidth={8 * scale} fill="none" strokeLinecap="butt" strokeLinejoin="round" {...s1Props} />
          <path d={p} pathLength="100" stroke={S2} strokeWidth={8 * scale} fill="none" strokeLinecap="butt" strokeLinejoin="round" {...s2Props} />
          <path d={p} pathLength="100" stroke={S3} strokeWidth={8 * scale} fill="none" strokeLinecap="butt" strokeLinejoin="round" {...s3Props} />

          {/* 중앙 진한 선 */}
          <path d={p} stroke="#0A0A0A" strokeWidth={0.8 * scale} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />

          {/* ── 시작/종료 라인 ── */}
          <StartFinishLine trackId={track.id} svgPath={p} pathOffset={offset} pathOffsetReversed={isRev} scale={scale} />

          {/* ── 드라이버 점들 ── */}
          {racers.map((racer) => (
            <DriverDot 
              key={racer.id} 
              racer={racer} 
              trackId={track.id} 
              svgPath={p} 
              isUser={racer.isUser} 
              pathOffset={offset} 
              pathOffsetReversed={isRev} 
              rotationAngle={rotAngle}
              scale={scale}
            />
          ))}
        </g>

        {/* ── 코너 번호 (counter-rotated) ── */}
        {corners.length > 0 && (
          <CornerLabels
            trackId={track.id}
            svgPath={p}
            lengthKm={track.lengthKm}
            corners={corners}
            pathOffset={offset}
            pathOffsetReversed={isRev}
            rotationAngle={rotAngle}
            cx={bounds.cx}
            cy={bounds.cy}
            scale={scale}
          />
        )}
      </svg>

      {/* HTML Sector Legend Overlay */}
      <div 
        className="absolute bottom-4 left-4 flex flex-col gap-1.5 p-3 rounded-lg border backdrop-blur-md"
        style={{
          background: 'rgba(11, 12, 23, 0.75)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          zIndex: 10,
        }}
      >
        {[
          { label: 'SECTOR 1', color: S1 },
          { label: 'SECTOR 2', color: S2 },
          { label: 'SECTOR 3', color: S3 },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div style={{ width: '16px', height: '6px', borderRadius: '2px', background: item.color }} />
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.78)', letterSpacing: '0.05em' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CornerLabels({
  trackId, svgPath, lengthKm, corners, pathOffset, pathOffsetReversed,
  rotationAngle, cx, cy, scale
}: {
  trackId: string
  svgPath: string
  lengthKm: number
  corners: CornerData[]
  pathOffset: number
  pathOffsetReversed?: boolean
  rotationAngle: number
  cx: number
  cy: number
  scale: number
}) {
  const [positions, setPositions] = useState<Array<{ x: number; y: number; label: string }>>([])

  useEffect(() => {
    // 같은 number가 두 개 이상이면 sub-corner (예: Hungaroring 1/1A)
    const numCount = corners.reduce<Record<number, number>>((acc, c) => {
      acc[c.number] = (acc[c.number] ?? 0) + 1
      return acc
    }, {})
    const hasSub = Object.values(numCount).some((v) => v > 1)

    const pts = corners.map((c) => {
      const pCorner = c.length / (lengthKm * 10000)
      const progress = pathOffsetReversed
        ? (1 - pCorner + pathOffset + 1) % 1
        : (pCorner + pathOffset) % 1
      const pt = getPointAtProgress(trackId, svgPath, Math.min(progress, 0.999))
      // sub-corner 있는 트랙: "1A" 형태 / 그 외: 숫자만
      const label = hasSub && c.letter ? `${c.number}${c.letter}` : `${c.number}`
      return { x: pt.x, y: pt.y, label }
    })
    setPositions(pts)
  }, [trackId, svgPath, lengthKm, corners, pathOffset, pathOffsetReversed])

  const rad = (rotationAngle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  return (
    <g>
      {positions.map((pt, i) => {
        // Rotate point around track center (cx, cy)
        const rx = cx + (pt.x - cx) * cos - (pt.y - cy) * sin
        const ry = cy + (pt.x - cx) * sin + (pt.y - cy) * cos

        const isTwoDigit = pt.label.length >= 2
        const r = (isTwoDigit ? 6 : 5) * scale
        return (
          <g key={i} transform={`translate(${rx},${ry})`}>
            <circle r={r} fill="rgba(8,9,20,0.82)" stroke="rgba(255,255,255,0.38)" strokeWidth={0.9 * scale} />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={(isTwoDigit ? 3.8 : 4.5) * scale}
              fill="rgba(255,255,255,0.85)"
              fontWeight="700"
              fontFamily="'Arial', sans-serif"
              letterSpacing="0"
            >
              {pt.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function StartFinishLine({
  trackId, svgPath, pathOffset, pathOffsetReversed, scale,
}: {
  trackId: string
  svgPath: string
  pathOffset: number
  pathOffsetReversed?: boolean
  scale: number
}) {
  const [line, setLine] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null)

  useEffect(() => {
    const p0 = getPointAtProgress(trackId, svgPath, pathOffset)
    const p1 = getPointAtProgress(trackId, svgPath, (pathOffset + (pathOffsetReversed ? -0.004 : 0.004) + 1) % 1)
    const dx = p1.x - p0.x, dy = p1.y - p0.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const px = -dy / len, py = dx / len
    const sz = 10 * scale
    setLine({ sx: p0.x + px * sz, sy: p0.y + py * sz, ex: p0.x - px * sz, ey: p0.y - py * sz })
  }, [trackId, svgPath, pathOffset, scale])

  if (!line) return null

  return (
    <g>
      <line x1={line.sx} y1={line.sy} x2={line.ex} y2={line.ey}
        stroke="#FFFFFF" strokeWidth={3 * scale} strokeLinecap="butt" />
      <line x1={line.sx} y1={line.sy} x2={line.ex} y2={line.ey}
        stroke="#000000" strokeWidth={1 * scale} strokeLinecap="butt" strokeDasharray="3 3" />
    </g>
  )
}
