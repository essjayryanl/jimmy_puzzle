'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Fireworks from './Fireworks'

export type Difficulty = 'easy' | 'medium' | 'hard'
const GRID: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 }
const MAX_BOARD = 420

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
    touchAction: 'none',
    cursor: 'grab',
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
  const total = cols * cols

  const [boardSize, setBoardSize] = useState(MAX_BOARD)
  useEffect(() => {
    const calc = () => {
      const maxW = Math.min(window.innerWidth - 32, MAX_BOARD)
      setBoardSize(Math.floor(maxW / cols) * cols)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [cols])

  const pieceSize = boardSize / cols

  const [slotMap, setSlotMap] = useState<Record<number, number>>({})
  const [tray, setTray] = useState<number[]>(() =>
    shuffle(Array.from({ length: total }, (_, i) => i))
  )
  // drag is kept in BOTH a ref (for always-current reads in event handlers)
  // and state (to trigger re-renders for the ghost piece visual)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [won, setWon] = useState(false)
  const [flash, setFlash] = useState<Set<number>>(new Set())

  const boardRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const slotRef = useRef(slotMap)
  const trayRef = useRef(tray)
  const boardSizeRef = useRef(boardSize)
  const pieceSizeRef = useRef(pieceSize)
  slotRef.current = slotMap
  trayRef.current = tray
  boardSizeRef.current = boardSize
  pieceSizeRef.current = pieceSize

  useEffect(() => {
    const entries = Object.entries(slotMap)
    if (entries.length === total && entries.every(([s, p]) => parseInt(s) === p)) {
      setTimeout(() => { setWon(true); playTada() }, 350)
    }
  }, [slotMap, total])

  // Window-level pointer listeners — always attached so there's no timing gap
  // between touchstart and the first touchmove on Android.
  // { passive: false } lets preventDefault() actually stop scroll on Android.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      e.preventDefault()
      const updated = { ...dragRef.current, mouseX: e.clientX, mouseY: e.clientY }
      dragRef.current = updated
      setDrag({ ...updated })
    }

    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return

      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const bs = boardSizeRef.current
        const ps = pieceSizeRef.current
        const sm = slotRef.current
        const tr = trayRef.current

        if (x >= 0 && x < bs && y >= 0 && y < bs) {
          const targetSlot = Math.floor(y / ps) * cols + Math.floor(x / ps)
          const displaced = sm[targetSlot]
          const newSlotMap = { ...sm }
          if (d.fromSlot !== null) delete newSlotMap[d.fromSlot]
          newSlotMap[targetSlot] = d.pieceId
          let newTray = tr.filter(id => id !== d.pieceId)
          if (displaced !== undefined) newTray = [...newTray, displaced]
          setSlotMap(newSlotMap)
          setTray(newTray)
          if (targetSlot === d.pieceId) {
            setFlash(s => new Set([...s, targetSlot]))
            setTimeout(() => setFlash(s => { const n = new Set(s); n.delete(targetSlot); return n }), 600)
          }
        } else if (d.fromSlot !== null) {
          const newSlotMap = { ...sm }
          delete newSlotMap[d.fromSlot]
          setSlotMap(newSlotMap)
          setTray([...trayRef.current, d.pieceId])
        }
      }

      dragRef.current = null
      setDrag(null)
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [cols])

  const startDrag = useCallback((e: React.PointerEvent, pieceId: number, fromSlot: number | null) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const state: DragState = {
      pieceId, fromSlot,
      mouseX: e.clientX, mouseY: e.clientY,
      offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
    }
    dragRef.current = state
    setDrag(state)
  }, [])

  const reset = () => {
    setSlotMap({})
    setTray(shuffle(Array.from({ length: total }, (_, i) => i)))
    dragRef.current = null
    setDrag(null)
    setWon(false)
    setFlash(new Set())
  }

  return (
    <div
      className="bone-bg min-h-screen flex flex-col items-center justify-center p-4"
      style={{ userSelect: 'none', touchAction: 'none' }}
    >
      {won && <Fireworks />}

      {won && (
        <div className="fixed inset-0 flex items-center justify-center z-40" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-xs w-full mx-4 text-zinc-900">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black mb-2">You did it!</h2>
            <p className="text-zinc-500 mb-8 text-sm">Jimmy is back in one piece!</p>
            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 py-3 rounded-2xl font-bold text-white transition-all hover:scale-105" style={{ background: '#171717' }}>
                Play again
              </button>
              <button onClick={onBack} className="flex-1 py-3 rounded-2xl font-bold border-2 border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-900">
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-4 w-full" style={{ maxWidth: boardSize }}>
        <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors px-3 py-1 rounded-full bg-white/70 shadow-sm">
          ← Back
        </button>
        <span className="flex-1 text-center font-black text-lg capitalize text-zinc-900">
          {difficulty} · {cols}×{cols}
        </span>
        <button onClick={reset} className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors px-3 py-1 rounded-full bg-white/70 shadow-sm">
          New game
        </button>
      </div>

      <div className="text-sm text-zinc-600 mb-3 font-medium">
        {Object.keys(slotMap).length} / {total} pieces placed
      </div>

      <div
        ref={boardRef}
        className="relative rounded-xl overflow-hidden shadow-lg border-2 border-white bg-white/80 mb-4"
        style={{ width: boardSize, height: boardSize }}
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
                  style={pieceStyle(placed, cols, pieceSize)}
                  onPointerDown={(e) => startDrag(e, placed, i)}
                />
              )}
            </div>
          )
        })}
      </div>

      <div
        className="rounded-xl border-2 border-white bg-white/80 shadow-lg p-3"
        style={{ width: boardSize }}
      >
        <p className="text-xs text-zinc-500 text-center mb-2 font-medium">Pieces</p>
        <div className="flex flex-wrap gap-2">
          {tray
            .filter(id => drag?.pieceId !== id)
            .map(id => (
              <div
                key={id}
                className="rounded-md shadow-sm border border-white/80"
                style={pieceStyle(id, cols, pieceSize)}
                onPointerDown={(e) => startDrag(e, id, null)}
              />
            ))}
        </div>
      </div>

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
