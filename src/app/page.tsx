'use client'

import { useEffect, useRef, useState } from 'react'
import Canvas from '@/components/canvas'
import io, { Socket } from 'socket.io-client'

export default function Home() {
  const [cellColors, setCellColors] = useState<string[][]>([])
  const [connected, setConnected] = useState<boolean>(false)
  const [placementCount, setPlacementCount] = useState<number>(0)
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io('http://localhost:3001')
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      console.log('Socket.IO connected ✅', socket.id)
    })
    socket.on('disconnect', () => {
      setConnected(false)
      console.log('Socket.IO disconnected')
    })
    socket.on('grid_update', (grid: string[][]) => setCellColors(grid))
    socket.on('placement_count', (count: number | string) =>
      setPlacementCount(
        typeof count === 'number' ? count : parseInt(String(count)) || 0,
      ),
    )
    socket.on('cooldown', ({ seconds }) => {
      const s = typeof seconds === 'number' && seconds > 0 ? seconds : 10
      setCooldownSeconds(s)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (cooldownSeconds == null) return
    const id = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev == null) return null
        if (prev <= 1) {
          clearInterval(id)
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [cooldownSeconds])

  const applyColor = (x: number, y: number, color: string) => {
    if (socketRef.current) {
      socketRef.current.emit('apply_color', { x, y, color })
      setCooldownSeconds(5)
    }
  }

  return (
    <main className="flex h-dvh items-center justify-center gap-4 bg-neutral-800 p-4">
      <div className="h-full flex-1 bg-white/20 p-4">
        <h1
          className={`text-2xl font-semibold ${connected ? 'text-green-500' : 'text-red-500'}`}
        >
          {connected ? 'Connected' : 'Disconnected'}
        </h1>

        <p className="mt-2 text-lg">
          Couleurs posées depuis le début : {placementCount}
        </p>

        {cooldownSeconds != null && cooldownSeconds > 0 && (
          <p className="mt-2 text-lg">
            Wait {cooldownSeconds}s before placing another color.
          </p>
        )}
      </div>

      <Canvas
        cellColors={cellColors}
        onApplyColor={applyColor}
        cooldownSeconds={cooldownSeconds}
        onError={(msg: string) => console.log(msg)}
        className="bg-neutral-700"
      />
    </main>
  )
}
