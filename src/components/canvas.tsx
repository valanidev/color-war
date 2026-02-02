/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useRef, useState } from 'react'
import { ColorTooltip } from './color-tooltip'

type CanvasProps = {
  cellColors: string[][]
  onApplyColor: (x: number, y: number, color: string) => void
  cooldownSeconds: number | null
  onError: (msg: string) => void
  className?: string
}

export default function ColorWarCanvas({
  cellColors = [],
  onApplyColor,
  cooldownSeconds,
  onError,
  className,
}: CanvasProps) {
  const COLOR_PALETTE = [
    '#ffffff',
    '#9ca3af',
    '#111827',
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#14b8a6',
    '#06b6d4',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#a855f7',
    '#d946ef',
    '#ec4899',
    '#84cc16',
  ]

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [canvasSize, setCanvasSize] = useState(0)

  const [zoom, setZoom] = useState(1)
  const [camera, setCamera] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)

  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    cellX: number
    cellY: number
  } | null>(null)

  useEffect(() => {
    const updateSize = () => {
      const rootFontSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      )
      setCanvasSize(window.innerHeight - 2 * rootFontSize)
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const rows = cellColors.length
  const cols = cellColors[0]?.length || 0
  const BASE_CELL_SIZE = cols ? canvasSize / cols : 10
  const cellSize = BASE_CELL_SIZE * zoom

  const MIN_ZOOM = 1
  const MAX_ZOOM = 6

  /* ---------------- DRAW ---------------- */
  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasSize, canvasSize)
    const startX = Math.floor(camera.x)
    const startY = Math.floor(camera.y)
    const visibleX = Math.min(
      Math.ceil(canvasSize / cellSize) + 1,
      cols - startX,
    )
    const visibleY = Math.min(
      Math.ceil(canvasSize / cellSize) + 1,
      rows - startY,
    )

    for (let y = 0; y < visibleY; y++) {
      for (let x = 0; x < visibleX; x++) {
        const gx = startX + x
        const gy = startY + y

        if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue

        const px = (gx - camera.x) * cellSize
        const py = (gy - camera.y) * cellSize

        // DRAW CELL COLOR
        const color = cellColors[gy][gx]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(px, py, cellSize, cellSize)
        }

        // DRAW GRID LINE
        if (zoom > 4) {
          ctx.strokeStyle = '#e5e7ebdd'
        } else if (zoom > 2) {
          ctx.strokeStyle = '#e5e7eb66'
        } else {
          ctx.strokeStyle = '#e5e7eb33'
        }
        ctx.strokeRect(px, py, cellSize, cellSize)
      }
    }
  }

  useEffect(draw, [zoom, camera, cellColors])

  /* ---------------- APPLY COLOR ---------------- */
  const applyColor = (x: number, y: number, color: string) => {
    onApplyColor(x, y, color)
  }

  /* ---------------- CLICK LEFT ---------------- */
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top

    const cellX = Math.floor(localX / cellSize + camera.x)
    const cellY = Math.floor(localY / cellSize + camera.y)

    if (cellX < 0 || cellY < 0 || cellX >= cols || cellY >= rows) return

    // Bloquer l'ouverture du tooltip si un cooldown est actif
    if (cooldownSeconds && cooldownSeconds > 0) {
      onError(`Patientez ${cooldownSeconds}s avant de poser une autre couleur.`)
      return
    }

    const tooltipX = rect.left + (cellX - camera.x + 0.5) * cellSize
    const tooltipY = rect.top + (cellY - camera.y + 1) * cellSize + 6

    setTooltip({ x: tooltipX, y: tooltipY, cellX, cellY })
  }

  /* ---------------- ZOOM ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (cols === 0) return

      const delta = e.deltaY < 0 ? 1 : -1
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta))
      if (newZoom === zoom) return

      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const worldX = camera.x + mx / cellSize
      const worldY = camera.y + my / cellSize

      const newCellSize = BASE_CELL_SIZE * newZoom
      let newCameraX = worldX - mx / newCellSize
      let newCameraY = worldY - my / newCellSize

      const visibleCellsX = canvasSize / newCellSize
      const visibleCellsY = canvasSize / newCellSize

      const maxX = Math.max(0, cols - visibleCellsX)
      const maxY = Math.max(0, rows - visibleCellsY)

      newCameraX = Math.max(0, Math.min(maxX, newCameraX))
      newCameraY = Math.max(0, Math.min(maxY, newCameraY))

      setZoom(newZoom)
      setCamera({ x: newCameraX, y: newCameraY })
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [zoom, camera, cols, rows, cellSize])

  /* ---------------- PAN ---------------- */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) isPanning.current = true
  }
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning.current) return
    if (cols === 0) return

    setCamera((prev) => {
      const nx = prev.x - e.movementX / cellSize
      const ny = prev.y - e.movementY / cellSize

      const maxX = Math.max(0, cols - canvasSize / cellSize)
      const maxY = Math.max(0, rows - canvasSize / cellSize)

      return {
        x: Math.max(0, Math.min(maxX, nx)),
        y: Math.max(0, Math.min(maxY, ny)),
      }
    })
  }
  const handleMouseUp = () => (isPanning.current = false)

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className="cursor-crosshair border border-neutral-400 bg-white"
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {tooltip && (
        <ColorTooltip
          x={tooltip.x}
          y={tooltip.y}
          colors={COLOR_PALETTE}
          onSelect={(color) => applyColor(tooltip.cellX, tooltip.cellY, color)}
          onClose={() => setTooltip(null)}
        />
      )}
    </div>
  )
}
