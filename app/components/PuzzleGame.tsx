'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Fireworks from './Fireworks'

export type Difficulty = 'easy' | 'medium' | 'hard'
const GRID: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 }
const BOARD_SIZE = 420

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function playTada() {
  try {
    new Audio('/tada.wav').play()
  } catch (_) {}
}

function pieceStyle(pieceId: number, cols: number, size: number): React.CSSProperties {
  const row = Math.floor(pieceId / cols)
  const col = pieceId % cols
  return {
    width: size,
    height: size,
    backgroundImage: 'url(/jimmy.jpg)',
    backgroundSize: `${size * cols}px ${size * cols}px`,
    backgroundPosition: `-${col * size}px -${row * size}px`,
    backgroundRepeat: 'no-repeat',
    flexShrink: 0,
  }
}

interface DragState {
  pieceId: number
  fromSlot: number | null
  mouseX: number; mouseY: number
  offsetX: number; offsetY: number
}

interface Props {
  difficulty: Difficulty
  onBack: () => void
}

export default function PuzzleGame({ difficulty, onBack }: Props) {
  const cols = GRID[difficulty]
  const pieceSize = BOARD_SIZE / cols
  const total = cols * cols

  const [slotMap, setSlotMap] = useState<Record<number, number>>({})
  const [tray, setTray] = useState<number[]>(() =>
    shuffle(Array.from({ length: total }, (_, i) => i))
  )
  const [drag, setDrag] = useState<DragState | null>(null)
  const [won, setWon] = useState(false)
  const [flash, setFlash] = useState<Set<number>>(new Set())

  const boardRef = useRef<HTMLDivElement>(null)
  // Refs to avoid stale closures in window event handlers
  const slotRef = useRef(slotMap)
  const trayRef = useRef(tray)
  slotRef.current = slotMap
  trayRef.current = tray

  // Win check
  useEffect(() => {
    const entries = Object.entries(slotMap)
    if (entries.length === total && entries.every(([s, p]) => parseInt(s) === p)) {
      setTimeout(() => { setWon(true); playTada() }, 350)
    }
  }, [slotMap, total])

  const startDrag = useCallback((e: React.MouseEvent, pieceId: number, fromSlot: number | null) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDrag({ pieceId, fromSlot, mouseX: e.clientX, mouseY: e.clientY, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top })
  }, [])

  useEffect(() => {
    if (!drag) return

    const onMove = (e: MouseEvent) => setDrag(d => d ? { ...d, mouseX: e.clientX, mouseY: e.clientY } : null)

    const onUp = (e: MouseEvent) => {
      if (!drag || !boardRef.current) { setDrag(null); return }

      const rect = boardRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const sm = slotRef.current
      const tr = trayRef.current

      if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
        const targetSlot = Math.floor(y / pieceSize) * cols + Math.floor(x / pieceSize)
        const displaced = sm[targetSlot]

        const newSlotMap = { ...sm }
        if (drag.fromSlot !== null) delete newSlotMap[drag.fromSlot]
        newSlotMap[targetSlot] = drag.pieceId

        let newTray = tr.filter(id => id !== drag.pieceId)
        if (displaced !== undefined) newTray = [...newTray, displaced]

        setSlotMap(newSlotMap)
        setTray(newTray)

        // Flash green if piece landed in its correct slot
        if (targetSlot === drag.pieceId) {
          setFlash(s => new Set([...s, targetSlot]))
          setTimeout(() => setFlash(s => { const n = new Set(s); n.delete(targetSlot); return n }), 600)
        }
      } else if (drag.fromSlot !== null) {
        // Dropped outside board — return piece to tray
        const newSlotMap = { ...sm }
        delete newSlotMap[drag.fromSlot]
        setSlotMap(newSlotMap)
        setTray([...tr, drag.pieceId])
      }

      setDrag(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [drag, cols, pieceSize])

  const reset = () => {
    setSlotMap({})
    setTray(shuffle(Array.from({ length: total }, (_, i) => i)))
    setDrag(null)
    setWon(false)
    setFlash(new Set())
  }

  const trayWidth = 2 * (pieceSize + 8) + 24

  return (
    <div
      className="bone-bg min-h-screen flex flex-col items-center justify-center p-6"
      style={{ userSelect: 'none' }}
    >
      {won && <Fireworks />}

      {/* Win overlay */}
      {won && (
        <div className="fixed inset-0 flex items-center justify-center z-40" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-xs w-full">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black mb-2">You did it!</h2>
            <p className="text-zinc-500 mb-8 text-sm">Jimmy is back in one piece!</p>
            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 py-3 rounded-2xl font-bold text-white transition-all hover:scale-105" style={{ background: '#171717' }}>
                Play again
              </button>
              <button onClick={onBack} className="flex-1 py-3 rounded-2xl font-bold border-2 border-zinc-200 hover:bg-zinc-50 transition-colors">
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-4 w-full max-w-3xl">
        <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors px-3 py-1 rounded-full bg-white/70 shadow-sm">
          ← Back
        </button>
        <span className="flex-1 text-center font-black text-lg capitalize">
          {difficulty} · {cols}×{cols}
        </span>
        <button onClick={reset} className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors px-3 py-1 rounded-full bg-white/70 shadow-sm">
          New game
        </button>
      </div>

      <div className="text-sm text-zinc-500 mb-4">
        {Object.keys(slotMap).length} / {total} pieces placed
      </div>

      {/* Game area */}
      <div className="flex gap-6 items-start">
        {/* Board */}
        <div
          ref={boardRef}
          className="relative rounded-xl overflow-hidden shadow-lg border-2 border-white bg-white/80"
          style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
        >
          {Array.from({ length: total }, (_, i) => {
            const row = Math.floor(i / cols)
            const col = i % cols
            const placed = slotMap[i]
            const draggingThis = drag?.pieceId === placed && drag?.fromSlot === i
            const isFlashing = flash.has(i)

            return (
              <div
                key={i}
                className={`absolute transition-all ${isFlashing ? 'ring-2 ring-inset ring-green-400' : ''}`}
                style={{
                  left: col * pieceSize, top: row * pieceSize,
                  width: pieceSize, height: pieceSize,
                  background: placed === undefined ? '#f1f5f9' : 'transparent',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                {placed !== undefined && !draggingThis && (
                  <div
                    className="cursor-grab active:cursor-grabbing"
                    style={pieceStyle(placed, cols, pieceSize)}
                    onMouseDown={(e) => startDrag(e, placed, i)}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Tray */}
        <div
          className="rounded-xl border-2 border-white bg-white/80 shadow-lg p-3 overflow-y-auto"
          style={{ width: trayWidth, maxHeight: BOARD_SIZE + 20 }}
        >
          <p className="text-xs text-zinc-400 text-center mb-2 font-medium">Pieces</p>
          <div className="flex flex-wrap gap-2">
            {tray
              .filter(id => drag?.pieceId !== id)
              .map(id => (
                <div
                  key={id}
                  className="cursor-grab active:cursor-grabbing rounded-md shadow-sm hover:shadow-md transition-shadow border border-white/80"
                  style={pieceStyle(id, cols, pieceSize)}
                  onMouseDown={(e) => startDrag(e, id, null)}
                />
              ))}
          </div>
        </div>
      </div>

      {/* Floating drag ghost */}
      {drag && (
        <div
          className="fixed pointer-events-none z-50 rounded-md shadow-2xl"
          style={{
            left: drag.mouseX - drag.offsetX,
            top: drag.mouseY - drag.offsetY,
            opacity: 0.85,
            transform: 'scale(1.05)',
            ...pieceStyle(drag.pieceId, cols, pieceSize),
          }}
        />
      )}
    </div>
  )
}
