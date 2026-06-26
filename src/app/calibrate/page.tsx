'use client'
import { useState, useEffect, useRef } from 'react'
import { TRACKS } from '@/data/tracks'
import { CORNERS } from '@/data/corners'
import { getPointAtProgress } from '@/engine/svgPath'

interface TrackCalib {
  pathOffset: number
  pathOffsetReversed: boolean
  sector1Progress: number
  sector2Progress: number
  rotationAngle: number
}

const S1 = '#E91B8C' // Pink
const S2 = '#FFD100' // Yellow
const S3 = '#00A3E0' // Blue

export default function CalibratePage() {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(TRACKS[0].id)
  const [calibMode, setCalibMode] = useState<'start' | 'sector1' | 'sector2'>('start')
  
  // Store calibration data for all tracks in state
  const [calibratedTracks, setCalibratedTracks] = useState<Record<string, TrackCalib>>(() => {
    return Object.fromEntries(
      TRACKS.map((t) => [
        t.id, 
        { 
          pathOffset: t.pathOffset ?? 0, 
          pathOffsetReversed: !!t.pathOffsetReversed,
          sector1Progress: t.sector1Progress ?? 0.333,
          sector2Progress: t.sector2Progress ?? 0.666,
          rotationAngle: t.rotationAngle ?? 0,
        }
      ])
    )
  })

  const currentTrack = TRACKS.find((t) => t.id === selectedTrackId)!
  const { pathOffset, pathOffsetReversed, sector1Progress, sector2Progress, rotationAngle } = calibratedTracks[selectedTrackId] || { 
    pathOffset: 0, 
    pathOffsetReversed: false,
    sector1Progress: 0.333,
    sector2Progress: 0.666,
    rotationAngle: 0
  }

  const [samples, setSamples] = useState<Array<{ x: number; y: number; progress: number }>>([])
  const [hoveredPt, setHoveredPt] = useState<{ x: number; y: number; progress: number } | null>(null)
  
  const svgRef = useRef<SVGSVGElement>(null)

  // Update track calibration state
  const updateCalib = (updates: Partial<TrackCalib>) => {
    setCalibratedTracks((prev) => ({
      ...prev,
      [selectedTrackId]: {
        ...prev[selectedTrackId],
        ...updates,
      },
    }))
  }

  // Pre-generate 1000 sample points along the track path when selected track changes
  useEffect(() => {
    const newSamples = []
    for (let i = 0; i <= 1000; i++) {
      const progress = i / 1000
      const pt = getPointAtProgress(currentTrack.id, currentTrack.svgPath, progress)
      newSamples.push({ x: pt.x, y: pt.y, progress })
    }
    setSamples(newSamples)
    setHoveredPt(null)
  }, [selectedTrackId, currentTrack])

  // Get unrotated track center based on samples
  const getUnrotatedCenter = () => {
    if (samples.length === 0) return { cx: 250, cy: 250 }
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (const pt of samples) {
      if (pt.x < minX) minX = pt.x
      if (pt.x > maxX) maxX = pt.x
      if (pt.y < minY) minY = pt.y
      if (pt.y > maxY) maxY = pt.y
    }
    return {
      cx: minX + (maxX - minX) / 2,
      cy: minY + (maxY - minY) / 2
    }
  }

  const { cx, cy } = getUnrotatedCenter()

  // Calculate coordinates of the bounding box rotated by rotationAngle
  const getRotatedBounds = () => {
    if (samples.length === 0) return { minX: 0, minY: 0, w: 500, h: 500 }
    const rad = (rotationAngle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    for (const pt of samples) {
      const dx = pt.x - cx
      const dy = pt.y - cy
      const rx = cx + dx * cos - dy * sin
      const ry = cy + dx * sin + dy * cos
      if (rx < minX) minX = rx
      if (rx > maxX) maxX = rx
      if (ry < minY) minY = ry
      if (ry > maxY) maxY = ry
    }

    const pad = 24 // Padding around the rotated track
    return {
      minX: minX - pad,
      minY: minY - pad,
      w: maxX - minX + 2 * pad,
      h: maxY - minY + 2 * pad
    }
  }

  const { minX: rotMinX, minY: rotMinY, w: rotW, h: rotH } = getRotatedBounds()
  const scale = Math.max(rotW, rotH) / 500

  // Handle clicking on the SVG to set offset or sectors
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg || samples.length === 0) return

    // Convert screen coordinates to SVG viewBox coordinates
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse() || svg.getCTM()?.inverse() as any)
    
    // Rotate the clicked point back to the unrotated space to match samples
    const rad = (-rotationAngle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const clickX = svgPoint.x
    const clickY = svgPoint.y
    const unrotX = cx + (clickX - cx) * cos - (clickY - cy) * sin
    const unrotY = cy + (clickX - cx) * sin + (clickY - cy) * cos

    // Find closest sample point in unrotated space
    let minDistance = Infinity
    let closestProgress = 0

    for (const sample of samples) {
      const dx = sample.x - unrotX
      const dy = sample.y - unrotY
      const dist = dx * dx + dy * dy
      if (dist < minDistance) {
        minDistance = dist
        closestProgress = sample.progress
      }
    }

    if (calibMode === 'start') {
      updateCalib({ pathOffset: parseFloat(closestProgress.toFixed(4)) })
    } else {
      // Calculate relative progress from start line
      const relProgress = pathOffsetReversed
        ? (pathOffset - closestProgress + 1) % 1
        : (closestProgress - pathOffset + 1) % 1
      
      const roundedProgress = parseFloat(relProgress.toFixed(4))
      if (calibMode === 'sector1') {
        updateCalib({ sector1Progress: roundedProgress })
      } else if (calibMode === 'sector2') {
        updateCalib({ sector2Progress: roundedProgress })
      }
    }
  }

  // Handle mouse move to show snap/progress preview
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg || samples.length === 0) return

    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse() || svg.getCTM()?.inverse() as any)

    // Rotate mouse coordinates back to unrotated space to match samples
    const rad = (-rotationAngle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const mouseX = svgPoint.x
    const mouseY = svgPoint.y
    const unrotX = cx + (mouseX - cx) * cos - (mouseY - cy) * sin
    const unrotY = cy + (mouseX - cx) * sin + (mouseY - cy) * cos

    let minDistance = Infinity
    let closestSample = null

    for (const sample of samples) {
      const dx = sample.x - unrotX
      const dy = sample.y - unrotY
      const dist = dx * dx + dy * dy
      if (dist < minDistance) {
        minDistance = dist
        closestSample = sample
      }
    }

    // Only snap if mouse is reasonably close to the track line
    if (closestSample && minDistance < 1200) {
      // Convert snapped point to rotated space for display
      const radRot = (rotationAngle * Math.PI) / 180
      const cosRot = Math.cos(radRot)
      const sinRot = Math.sin(radRot)
      const rx = cx + (closestSample.x - cx) * cosRot - (closestSample.y - cy) * sinRot
      const ry = cy + (closestSample.x - cx) * sinRot + (closestSample.y - cy) * cosRot
      
      setHoveredPt({ x: rx, y: ry, progress: closestSample.progress })
    } else {
      setHoveredPt(null)
    }
  }

  const handleSvgMouseLeave = () => {
    setHoveredPt(null)
  }

  // Reset current track to default values in tracks.ts
  const handleResetCurrent = () => {
    const defaultTrack = TRACKS.find((t) => t.id === selectedTrackId)!
    updateCalib({
      pathOffset: defaultTrack.pathOffset ?? 0,
      pathOffsetReversed: !!defaultTrack.pathOffsetReversed,
      sector1Progress: defaultTrack.sector1Progress ?? 0.333,
      sector2Progress: defaultTrack.sector2Progress ?? 0.666,
      rotationAngle: defaultTrack.rotationAngle ?? 0,
    })
  }

  // Generate output JSON
  const outputJson = Object.fromEntries(
    Object.entries(calibratedTracks).map(([id, calib]) => [
      id,
      {
        pathOffset: calib.pathOffset,
        pathOffsetReversed: calib.pathOffsetReversed,
        sector1Progress: calib.sector1Progress,
        sector2Progress: calib.sector2Progress,
        rotationAngle: calib.rotationAngle,
      },
    ])
  )

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(outputJson, null, 2))
    alert('Calibration JSON copied to clipboard!')
  }

  // Helper to calculate SVG dash properties for sectors
  const getSectorDashProps = (startProgress: number, length: number) => {
    const A = ((startProgress % 100) + 100) % 100
    const B = (((startProgress + length) % 100) + 100) % 100

    if (A < B) {
      return {
        strokeDasharray: `${length} 100`,
        strokeDashoffset: -A
      }
    } else {
      const firstDashLength = B
      const firstGapLength = A - B
      const secondDashLength = 100 - A
      return {
        strokeDasharray: `${firstDashLength} ${firstGapLength} ${secondDashLength} 100`,
        strokeDashoffset: 0
      }
    }
  }

  const s1Start = pathOffsetReversed ? (pathOffset - sector1Progress) * 100 : pathOffset * 100
  const s2Start = pathOffsetReversed ? (pathOffset - sector2Progress) * 100 : (pathOffset + sector1Progress) * 100
  const s3Start = pathOffsetReversed ? (pathOffset - 1.0) * 100 : (pathOffset + sector2Progress) * 100

  const s1Props = getSectorDashProps(s1Start, sector1Progress * 100)
  const s2Props = getSectorDashProps(s2Start, (sector2Progress - sector1Progress) * 100)
  const s3Props = getSectorDashProps(s3Start, (1.0 - sector2Progress) * 100)

  return (
    <main className="flex flex-col w-screen h-screen overflow-hidden bg-[#0A0B10] text-gray-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-white text-2xl font-black tracking-widest uppercase flex items-center gap-2">
            🏁 Track Path Calibrator
          </h1>
          <p className="text-[12px] text-gray-400 uppercase font-semibold tracking-wider mt-1">
            Manual click-to-calibrate (Start line & Sectors), rotation, and corner verification
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleResetCurrent}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs rounded-lg uppercase tracking-wider transition-colors border border-gray-700"
          >
            Reset Current
          </button>
          <button
            onClick={copyToClipboard}
            className="px-6 py-2 bg-[#E10600] hover:bg-[#FF1800] text-white font-bold text-xs rounded-lg uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(225,6,0,0.3)]"
          >
            Copy JSON Output
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* Left Sidebar: Controls & Track Checklist */}
        <div className="w-[380px] flex flex-col gap-6 min-h-0">
          
          {/* Active Calibration Controls Card */}
          <div className="bg-[#12131E] border border-gray-800 rounded-xl p-5 flex flex-col gap-3.5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-gray-800 pb-1.5">
              Calibration Controls
            </h2>
            
            {/* Track Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Select Track</label>
              <select
                value={selectedTrackId}
                onChange={(e) => setSelectedTrackId(e.target.value)}
                className="w-full bg-[#1A1C2C] border border-gray-700 rounded-lg p-2 text-xs font-semibold text-white focus:outline-none focus:border-[#E10600]"
              >
                {TRACKS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.flag} {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Click Mode Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Click Target Mode</label>
              <div className="flex bg-[#1A1C2C] p-1 rounded-lg border border-gray-800 gap-1">
                <button
                  type="button"
                  onClick={() => setCalibMode('start')}
                  className={`flex-1 py-1 text-[9px] font-black rounded uppercase transition-all ${
                    calibMode === 'start'
                      ? 'bg-[#E10600] text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Start Line
                </button>
                <button
                  type="button"
                  onClick={() => setCalibMode('sector1')}
                  className={`flex-1 py-1 text-[9px] font-black rounded uppercase transition-all ${
                    calibMode === 'sector1'
                      ? 'bg-[#E91B8C] text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sector 1
                </button>
                <button
                  type="button"
                  onClick={() => setCalibMode('sector2')}
                  className={`flex-1 py-1 text-[9px] font-black rounded uppercase transition-all ${
                    calibMode === 'sector2'
                      ? 'bg-[#FFD100] text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sector 2
                </button>
              </div>
            </div>

            {/* Rotation Slider */}
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase">rotationAngle (0° - 360°)</label>
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={rotationAngle}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(360, parseInt(e.target.value) || 0))
                    updateCalib({ rotationAngle: val })
                  }}
                  className="w-12 bg-[#1A1C2C] border border-gray-700 rounded p-0.5 text-right text-xs font-mono font-bold text-white focus:outline-none"
                />
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={rotationAngle}
                onChange={(e) => updateCalib({ rotationAngle: parseInt(e.target.value) || 0 })}
                className="w-full accent-[#E10600] h-1 cursor-pointer"
              />
            </div>

            {/* Path Offset Slider */}
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase">pathOffset</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={pathOffset}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0))
                    updateCalib({ pathOffset: parseFloat(val.toFixed(4)) })
                  }}
                  className="w-14 bg-[#1A1C2C] border border-gray-700 rounded p-0.5 text-right text-xs font-mono font-bold text-white focus:outline-none"
                />
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={pathOffset}
                onChange={(e) => updateCalib({ pathOffset: parseFloat(parseFloat(e.target.value).toFixed(4)) })}
                className="w-full accent-[#E10600] h-1 cursor-pointer"
              />
            </div>

            {/* Sector 1 Progress Slider */}
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-[#E91B8C] uppercase">Sector 1 Split</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={sector1Progress}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0))
                    updateCalib({ sector1Progress: parseFloat(val.toFixed(4)) })
                  }}
                  className="w-14 bg-[#1A1C2C] border border-gray-700 rounded p-0.5 text-right text-xs font-mono font-bold text-white focus:outline-none"
                />
              </div>
              <input
                type="range"
                min="0.01"
                max={sector2Progress - 0.01}
                step="0.001"
                value={sector1Progress}
                onChange={(e) => updateCalib({ sector1Progress: parseFloat(parseFloat(e.target.value).toFixed(4)) })}
                className="w-full accent-[#E91B8C] h-1 cursor-pointer"
              />
            </div>

            {/* Sector 2 Progress Slider */}
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-[#FFD100] uppercase">Sector 2 Split</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={sector2Progress}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0))
                    updateCalib({ sector2Progress: parseFloat(val.toFixed(4)) })
                  }}
                  className="w-14 bg-[#1A1C2C] border border-gray-700 rounded p-0.5 text-right text-xs font-mono font-bold text-white focus:outline-none"
                />
              </div>
              <input
                type="range"
                min={sector1Progress + 0.01}
                max="0.99"
                step="0.001"
                value={sector2Progress}
                onChange={(e) => updateCalib({ sector2Progress: parseFloat(parseFloat(e.target.value).toFixed(4)) })}
                className="w-full accent-[#FFD100] h-1 cursor-pointer"
              />
            </div>

            {/* Reversed Toggle */}
            <div className="flex items-center justify-between bg-[#1A1C2C] p-2 rounded-lg border border-gray-800">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white uppercase">Reversed Direction</span>
              </div>
              <input
                type="checkbox"
                checked={pathOffsetReversed}
                onChange={(e) => updateCalib({ pathOffsetReversed: e.target.checked })}
                className="w-4 h-4 accent-[#E10600] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Checklist of Tracks */}
          <div className="flex-1 bg-[#12131E] border border-gray-800 rounded-xl p-5 flex flex-col min-h-0">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-gray-800 pb-2 mb-3">
              Track List ({TRACKS.length})
            </h2>
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1">
              {TRACKS.map((t) => {
                const isActive = t.id === selectedTrackId
                const calib = calibratedTracks[t.id] || { pathOffset: 0, pathOffsetReversed: false, sector1Progress: 0.333, sector2Progress: 0.666, rotationAngle: 0 }
                const isModified = calib.pathOffset !== t.pathOffset || calib.pathOffsetReversed !== t.pathOffsetReversed || calib.sector1Progress !== t.sector1Progress || calib.sector2Progress !== t.sector2Progress || calib.rotationAngle !== t.rotationAngle
                
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTrackId(t.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-left transition-colors border ${
                      isActive
                        ? 'bg-[#1E2036] border-gray-700 text-white font-bold'
                        : 'bg-transparent border-transparent hover:bg-[#1A1B29]/40 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-sm shrink-0">{t.flag}</span>
                      <span className="text-xs truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isModified && (
                        <span className="px-1 py-0.5 rounded text-[8px] font-black uppercase bg-[#E10600]/20 text-[#FF3E30] border border-[#E10600]/30">
                          Mod
                        </span>
                      )}
                      <span className="text-[9px] font-mono font-bold bg-black/35 px-1.5 py-0.5 rounded text-gray-300 border border-gray-800/80">
                        {calib.rotationAngle}° | {calib.pathOffset.toFixed(2)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Main Map Area */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          
          {/* Interactive Map Wrapper */}
          <div className="flex-1 bg-[#12131E] border border-gray-800 rounded-xl relative flex items-center justify-center overflow-hidden p-6">
            <svg
              ref={svgRef}
              viewBox={`${rotMinX} ${rotMinY} ${rotW} ${rotH}`}
              onClick={handleSvgClick}
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={handleSvgMouseLeave}
              className="w-full h-full max-w-full max-h-full cursor-crosshair overflow-visible select-none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Group wrapper applying rotation around the track center */}
              <g transform={`rotate(${rotationAngle}, ${cx}, ${cy})`}>
                
                {/* Back track outline */}
                <path
                  d={currentTrack.svgPath}
                  stroke="#0C0C0C"
                  strokeWidth={22 * scale}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Dynamic Sector Colors */}
                <path
                  d={currentTrack.svgPath}
                  pathLength="100"
                  stroke={S1}
                  strokeWidth={18 * scale}
                  fill="none"
                  strokeLinecap="butt"
                  strokeLinejoin="round"
                  {...s1Props}
                />
                <path
                  d={currentTrack.svgPath}
                  pathLength="100"
                  stroke={S2}
                  strokeWidth={18 * scale}
                  fill="none"
                  strokeLinecap="butt"
                  strokeLinejoin="round"
                  {...s2Props}
                />
                <path
                  d={currentTrack.svgPath}
                  pathLength="100"
                  stroke={S3}
                  strokeWidth={18 * scale}
                  fill="none"
                  strokeLinecap="butt"
                  strokeLinejoin="round"
                  {...s3Props}
                />

                {/* Central track line */}
                <path
                  d={currentTrack.svgPath}
                  stroke="#0A0A0A"
                  strokeWidth={2 * scale}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.6"
                />

                {/* Checkered Start/Finish Line */}
                <StartFinishLine
                  trackId={currentTrack.id}
                  svgPath={currentTrack.svgPath}
                  pathOffset={pathOffset}
                  pathOffsetReversed={pathOffsetReversed}
                  scale={scale}
                />

                {/* Sector 1 Boundary Line */}
                <SectorSplitLine
                  trackId={currentTrack.id}
                  svgPath={currentTrack.svgPath}
                  splitProgress={sector1Progress}
                  pathOffset={pathOffset}
                  pathOffsetReversed={pathOffsetReversed}
                  color={S1}
                  scale={scale}
                />

                {/* Sector 2 Boundary Line */}
                <SectorSplitLine
                  trackId={currentTrack.id}
                  svgPath={currentTrack.svgPath}
                  splitProgress={sector2Progress}
                  pathOffset={pathOffset}
                  pathOffsetReversed={pathOffsetReversed}
                  color={S2}
                  scale={scale}
                />
              </g>

              {/* Absolute Path Start (0.0) Indicator (counter-rotated) */}
              <PathStartIndicator trackId={currentTrack.id} svgPath={currentTrack.svgPath} rotationAngle={rotationAngle} scale={scale} />

              {/* Corner labels (counter-rotated) */}
              <CornerLabels
                trackId={currentTrack.id}
                svgPath={currentTrack.svgPath}
                lengthKm={currentTrack.lengthKm}
                corners={CORNERS[currentTrack.id] || []}
                pathOffset={pathOffset}
                pathOffsetReversed={pathOffsetReversed}
                rotationAngle={rotationAngle}
                scale={scale}
              />

              {/* Snapped hovered point (needs to be drawn in rotated coordinates) */}
              {hoveredPt && (
                <g>
                  <circle
                    cx={hoveredPt.x}
                    cy={hoveredPt.y}
                    r={12 * scale}
                    fill="none"
                    stroke="#00E676"
                    strokeWidth={1.5 * scale}
                    className="animate-ping"
                  />
                  <circle
                    cx={hoveredPt.x}
                    cy={hoveredPt.y}
                    r={7 * scale}
                    fill="#00E676"
                    stroke="#FFFFFF"
                    strokeWidth={1.5 * scale}
                  />
                </g>
              )}
            </svg>

            {/* Hover Coordinates Overlay */}
            {hoveredPt && (
              <div className="absolute top-4 left-4 bg-black/85 border border-gray-800 rounded-lg p-2.5 font-mono text-[10px] text-gray-300 shadow-xl backdrop-blur-md">
                <div className="font-bold text-[#00E676] mb-0.5">SNAPPED TO PATH</div>
                <div>X: {hoveredPt.x.toFixed(1)}</div>
                <div>Y: {hoveredPt.y.toFixed(1)}</div>
                <div className="mt-1 font-bold text-white">Absolute Progress: {hoveredPt.progress.toFixed(4)}</div>
                <div className="text-gray-400">
                  Relative: {
                    (pathOffsetReversed
                      ? (pathOffset - hoveredPt.progress + 1) % 1
                      : (hoveredPt.progress - pathOffset + 1) % 1
                    ).toFixed(4)
                  }
                </div>
              </div>
            )}

            {/* Quick calibration status */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-1 bg-black/75 border border-gray-800/80 rounded-lg p-3 backdrop-blur-md max-w-[280px]">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Calibrator</div>
              <div className="text-sm font-black text-white truncate">{currentTrack.name}</div>
              <div className="text-[10px] font-mono text-gray-300 mt-1 flex flex-col gap-0.5">
                <div className="flex justify-between gap-4">
                  <span>Start Offset:</span>
                  <strong className="text-[#E10600]">{pathOffset.toFixed(4)}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Sector 1 Line:</span>
                  <strong className="text-[#E91B8C]">{sector1Progress.toFixed(4)}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Sector 2 Line:</span>
                  <strong className="text-[#FFD100]">{sector2Progress.toFixed(4)}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Rotation Angle:</span>
                  <strong className="text-[#00A3E0]">{rotationAngle}°</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Direction:</span>
                  <strong className={pathOffsetReversed ? 'text-red-400' : 'text-green-400'}>{pathOffsetReversed ? 'REVERSED' : 'NORMAL'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Instructions / Help Info */}
          <div className="bg-[#12131E] border border-gray-800 rounded-xl p-4 flex flex-col gap-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">💡 How to calibrate sectors & rotation:</h3>
            <ol className="text-xs text-gray-400 list-decimal pl-4 flex flex-col gap-0.5 mt-0.5 leading-relaxed">
              <li>Use the <strong>rotationAngle slider</strong> to rotate the track so it fits landscape container best. Code zooms it automatically!</li>
              <li>Calibrate the **Start Line** (set Click Target Mode to <strong>Start Line</strong> and click on the track).</li>
              <li>Select **Sector 1** or **Sector 2** mode, then hover and click where that timing sector split line should end on the map.</li>
              <li>Copy the JSON and update [tracks.ts](file:///Users/hunhokang/Downloads/f1-study-timer/src/data/tracks.ts).</li>
            </ol>
          </div>
        </div>

      </div>
    </main>
  )
}

function PathStartIndicator({ trackId, svgPath, rotationAngle, scale }: { trackId: string; svgPath: string; rotationAngle: number; scale: number }) {
  const pt = getPointAtProgress(trackId, svgPath, 0)
  
  // Calculate unrotated center to do the same translation rotation math
  const defaultTrack = TRACKS.find((t) => t.id === trackId)!
  // Quick estimation of center to position counter-rotated text correctly
  const cx = 250, cy = 250 // fall back center
  const rad = (rotationAngle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rx = cx + (pt.x - cx) * cos - (pt.y - cy) * sin
  const ry = cy + (pt.x - cx) * sin + (pt.y - cy) * cos

  return (
    <g transform={`translate(${rx}, ${ry}) rotate(${-rotationAngle})`}>
      <circle cx={0} cy={0} r={6 * scale} fill="#00A3E0" stroke="#FFFFFF" strokeWidth={1.2 * scale} />
      <rect x={8 * scale} y={-8 * scale} width={72 * scale} height={15 * scale} rx={3 * scale} fill="#00A3E0" opacity="0.85" />
      <text x={12 * scale} y={2 * scale} fill="#FFFFFF" fontSize={7 * scale} fontWeight="bold" fontFamily="sans-serif">
        Path Origin (0.0)
      </text>
    </g>
  )
}

function StartFinishLine({
  trackId,
  svgPath,
  pathOffset,
  pathOffsetReversed,
  scale,
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
    const dx = p1.x - p0.x
    const dy = p1.y - p0.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const px = -dy / len
    const py = dx / len
    const sz = 22 * scale
    setLine({
      sx: p0.x + px * sz,
      sy: p0.y + py * sz,
      ex: p0.x - px * sz,
      ey: p0.y - py * sz,
    })
  }, [trackId, svgPath, pathOffset, pathOffsetReversed, scale])

  if (!line) return null

  return (
    <g>
      {/* Glowing boundary */}
      <line
        x1={line.sx}
        y1={line.sy}
        x2={line.ex}
        y2={line.ey}
        stroke="#FFFFFF"
        strokeWidth={7 * scale}
        strokeLinecap="butt"
      />
      {/* Checkered pattern line */}
      <line
        x1={line.sx}
        y1={line.sy}
        x2={line.ex}
        y2={line.ey}
        stroke="#000000"
        strokeWidth={3.5 * scale}
        strokeLinecap="butt"
        strokeDasharray={`${4 * scale} ${4 * scale}`}
      />
    </g>
  )
}

function SectorSplitLine({
  trackId,
  svgPath,
  splitProgress,
  pathOffset,
  pathOffsetReversed,
  color,
  scale,
}: {
  trackId: string
  svgPath: string
  splitProgress: number
  pathOffset: number
  pathOffsetReversed?: boolean
  color: string
  scale: number
}) {
  const [line, setLine] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null)

  useEffect(() => {
    // Calculate the absolute progress on the SVG path for this split progress
    const absProgress = pathOffsetReversed
      ? (pathOffset - splitProgress + 1) % 1
      : (pathOffset + splitProgress) % 1

    const p0 = getPointAtProgress(trackId, svgPath, absProgress)
    const p1 = getPointAtProgress(trackId, svgPath, (absProgress + (pathOffsetReversed ? -0.004 : 0.004) + 1) % 1)
    const dx = p1.x - p0.x
    const dy = p1.y - p0.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const px = -dy / len
    const py = dx / len
    const sz = 20 * scale
    setLine({
      sx: p0.x + px * sz,
      sy: p0.y + py * sz,
      ex: p0.x - px * sz,
      ey: p0.y - py * sz,
    })
  }, [trackId, svgPath, splitProgress, pathOffset, pathOffsetReversed, scale])

  if (!line) return null

  return (
    <g>
      {/* Glow boundary */}
      <line
        x1={line.sx}
        y1={line.sy}
        x2={line.ex}
        y2={line.ey}
        stroke={color}
        strokeWidth={5 * scale}
        strokeLinecap="butt"
      />
      {/* Black dotted inner line */}
      <line
        x1={line.sx}
        y1={line.sy}
        x2={line.ex}
        y2={line.ey}
        stroke="#000000"
        strokeWidth={1.8 * scale}
        strokeLinecap="butt"
        strokeDasharray={`${2 * scale} ${2 * scale}`}
      />
    </g>
  )
}

function CornerLabels({
  trackId,
  svgPath,
  lengthKm,
  corners,
  pathOffset,
  pathOffsetReversed,
  rotationAngle,
  scale,
}: {
  trackId: string
  svgPath: string
  lengthKm: number
  corners: any[]
  pathOffset: number
  pathOffsetReversed?: boolean
  rotationAngle: number
  scale: number
}) {
  const [positions, setPositions] = useState<Array<{ x: number; y: number; label: string }>>([])

  useEffect(() => {
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
      const label = hasSub && c.letter ? `${c.number}${c.letter}` : `${c.number}`
      return { x: pt.x, y: pt.y, label }
    })
    setPositions(pts)
  }, [trackId, svgPath, lengthKm, corners, pathOffset, pathOffsetReversed])

  // Estimating center for rotation math (center of 500x500 space is 250, 250)
  const cx = 250, cy = 250
  const rad = (rotationAngle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  return (
    <g>
      {positions.map((pt, i) => {
        // Calculate the rotated coordinate of the corner so we can translate and counter-rotate it
        const rx = cx + (pt.x - cx) * cos - (pt.y - cy) * sin
        const ry = cy + (pt.x - cx) * sin + (pt.y - cy) * cos

        const isTwoDigit = pt.label.length >= 2
        const r = (isTwoDigit ? 8.5 : 7.5) * scale
        return (
          <g key={i} transform={`translate(${rx}, ${ry}) rotate(${-rotationAngle})`}>
            <circle r={r} fill="#E10600" stroke="#FFFFFF" strokeWidth={1.2 * scale} />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={(isTwoDigit ? 5.8 : 7.2) * scale}
              fill="#FFFFFF"
              fontWeight="900"
              fontFamily="sans-serif"
            >
              {pt.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
