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
  try { new Audio('/tada.wav').play() } catch (_) {}
}

function pieceStyle(pieceId: number, cols: number, size: number): React.CSSProperties {
  const row = Math.floor(pieceId / cols)
  const col = pieceId % cols
  return {
    width: size, height: size,
    backgroundImage: 'url(/jimmy.jpg)',
    backgroundSize: `${size * cols}px ${size * cols}px`,
    backgroundPosition: `-${col * size}px -${row * size}px`,
    backgroundRepeat: 'no-repeat',
    flexShrink: 0,
    cursor: 'grab',
  }
}

interface DragState {
  pieceId: number; fromSlot: number | null
  mouseX: number; mouseY: number
  offsetX: number; offsetY: number
}

interface Props { difficulty: Difficulty; onBack: () => void }

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
  const [drag, setDrag] = useState<DragState | null>(null)
  const [won, setWon] = useState(false)
  const [flash, setFlash] = useState<Set<number>>(new Set())

  const boardRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const slotRef = useRef(slotMap); slotRef.current = slotMap
  const trayRef = useRef(tray); trayRef.current = tray
  const boardSizeRef = useRef(boardSize); boardSizeRef.current = boardSize
  const pieceSizeRef = useRef(pieceSize); pieceSizeRef.current = pieceSize
  const colsRef = useRef(cols); colsRef.current = cols

  useEffect(() => {
    const entries = Object.entries(slotMap)
    if (entries.length === total && entries.every(([s, p]) => parseInt(s) === p)) {
      setTimeout(() => { setWon(true); playTada() }, 350)
    }
  }, [slotMap, total])

  const beginDrag = useCallback((pieceId: number, fromSlot: number | null, clientX: number, clientY: number, targetEl: Element) => {
    const rect = targetEl.getBoundingClientRect()
    const state: DragState = {
      pieceId, fromSlot,
      mouseX: clientX, mouseY: clientY,
      offsetX: clientX - rect.left, offsetY: clientY - rect.top,
    }
    dragRef.current = state
    setDrag(state)
  }, [])

  const endDrag = useCallback((clientX: number, clientY: number) => {
    const d = dragRef.current
    if (!d) return
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const bs = boardSizeRef.current
      const ps = pieceSizeRef.current
      const c = colsRef.current
      const sm = slotRef.current
      const tr = trayRef.current
      if (x >= 0 && x < bs && y >= 0 && y < bs) {
        const targetSlot = Math.floor(y / ps) * c + Math.floor(x / ps)
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
  }, [])

  // Attach ALL input events natively — bypasses React's synthetic event system
  // which can attach touch handlers as passive, making preventDefault() ineffective.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // touchstart on container: find piece by data-* attribute and start drag
    const onTouchStart = (e: TouchEvent) => {
      const target = (e.target as HTMLElement).closest('[data-piece-id]') as HTMLElement | null
      if (!target) return
      e.preventDefault()
      const t = e.touches[0]
      const pieceId = parseInt(target.dataset.pieceId!)
      const fromSlot = target.dataset.fromSlot !== undefined ? parseInt(target.dataset.fromSlot) : null
      beginDrag(pieceId, fromSlot, t.clientX, t.clientY, target)
    }

    const onMouseDown = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-piece-id]') as HTMLElement | null
      if (!target) return
      const pieceId = parseInt(target.dataset.pieceId!)
      const fromSlot = target.dataset.fromSlot !== undefined ? parseInt(target.dataset.fromSlot) : null
      beginDrag(pieceId, fromSlot, e.clientX, e.clientY, target)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current) return
      e.preventDefault()
      const t = e.touches[0]
      const updated = { ...dragRef.current, mouseX: t.clientX, mouseY: t.clientY }
      dragRef.current = updated
      setDrag({ ...updated })
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const updated = { ...dragRef.current, mouseX: e.clientX, mouseY: e.clientY }
      dragRef.current = updated
      setDrag({ ...updated })
    }

    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0]
      endDrag(t.clientX, t.clientY)
    }

    const onMouseUp = (e: MouseEvent) => endDrag(e.clientX, e.clientY)

    // Non-passive on container so preventDefault blocks scroll
    container.addEventListener('touchstart', onTouchStart, { passive: false })
    container.addEventListener('mousedown', onMouseDown)
    // Move/end on window so we catch events outside the container
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [beginDrag, endDrag])

  const reset = () => {
    setSlotMap({})
    setTray(shuffle(Array.from({ length: total }, (_, i) => i)))
    dragRef.current = null; setDrag(null); setWon(false); setFlash(new Set())
  }

  return (
    <div
      ref={containerRef}
      className="bone-bg min-h-screen flex flex-col items-center justify-center p-4"
      style={{ userSelect: 'none' }}
    >
      {won && <Fireworks />}

      {won && (
        <div className="fixed inset-0 flex items-center justify-center z-40" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-xs w-full mx-4 text-zinc-900">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black mb-2">You did it!</h2>
            <p className="text-zinc-500 mb-8 text-sm">Jimmy is back in one piece!</p>
            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 py-3 rounded-2xl font-bold text-white" style={{ background: '#171717' }}>Play again</button>
              <button onClick={onBack} className="flex-1 py-3 rounded-2xl font-bold border-2 border-zinc-200 text-zinc-900">Menu</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-4 w-full" style={{ maxWidth: boardSize }}>
        <button onClick={onBack} className="text-sm text-zinc-500 px-3 py-1 rounded-full bg-white/70 shadow-sm">← Back</button>
        <span className="flex-1 text-center font-black text-lg capitalize text-zinc-900">{difficulty} · {cols}×{cols}</span>
        <button onClick={reset} className="text-sm text-zinc-500 px-3 py-1 rounded-full bg-white/70 shadow-sm">New game</button>
      </div>

      <div className="text-sm text-zinc-600 mb-3 font-medium">
        {Object.keys(slotMap).length} / {total} pieces placed
      </div>

      <div ref={boardRef} className="relative rounded-xl overflow-hidden shadow-lg border-2 border-white bg-white/80 mb-4"
        style={{ width: boardSize, height: boardSize }}>
        {Array.from({ length: total }, (_, i) => {
          const row = Math.floor(i / cols)
          const col = i % cols
          const placed = slotMap[i]
          const draggingThis = drag?.pieceId === placed && drag?.fromSlot === i
          const isFlashing = flash.has(i)
          return (
            <div key={i}
              className={`absolute ${isFlashing ? 'ring-2 ring-inset ring-green-400' : ''}`}
              style={{ left: col * pieceSize, top: row * pieceSize, width: pieceSize, height: pieceSize, background: placed === undefined ? '#f1f5f9' : 'transparent', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              {placed !== undefined && !draggingThis && (
                <div
                  data-piece-id={placed}
                  data-from-slot={i}
                  style={pieceStyle(placed, cols, pieceSize)}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border-2 border-white bg-white/80 shadow-lg p-3" style={{ width: boardSize }}>
        <p className="text-xs text-zinc-500 text-center mb-2 font-medium">Pieces</p>
        <div className="flex flex-wrap gap-2">
          {tray.filter(id => drag?.pieceId !== id).map(id => (
            <div key={id}
              data-piece-id={id}
              className="rounded-md shadow-sm border border-white/80"
              style={pieceStyle(id, cols, pieceSize)}
            />
          ))}
        </div>
      </div>

      {drag && (
        <div className="fixed pointer-events-none z-50 rounded-md shadow-2xl"
          style={{ left: drag.mouseX - drag.offsetX, top: drag.mouseY - drag.offsetY, opacity: 0.85, transform: 'scale(1.05)', ...pieceStyle(drag.pieceId, cols, pieceSize) }}
        />
      )}
    </div>
  )
}
