'use client'

import { useEffect, useRef, useState } from 'react'
import Canvas from '@/components/canvas'
import io, { Socket } from 'socket.io-client'

export default function Home() {
  const [cellColors, setCellColors] = useState<string[][]>([])
  const [connected, setConnected] = useState<boolean>(false)
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
      setCooldownSeconds(10)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-100">
      {connected ? (
        <p className="text-2xl text-green-500">Connected</p>
      ) : (
        <p className="text-2xl text-red-500">Disconnected</p>
      )}

      {cooldownSeconds != null && cooldownSeconds > 0 && (
        <p className="mt-2 text-lg text-orange-600">
          Attendez {cooldownSeconds}s avant de poser une autre couleur.
        </p>
      )}

      <Canvas
        cellColors={cellColors}
        onApplyColor={applyColor}
        cooldownSeconds={cooldownSeconds}
        onError={(msg: string) => console.log(msg)}
      />
    </main>
  )
}
