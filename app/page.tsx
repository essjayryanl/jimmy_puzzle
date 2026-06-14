'use client'

import { useState } from 'react'
import PuzzleGame, { type Difficulty } from './components/PuzzleGame'

const DIFFICULTIES: { key: Difficulty; label: string; grid: string; pieces: string }[] = [
  { key: 'easy', label: 'Easy', grid: '3×3', pieces: '9 pieces' },
  { key: 'medium', label: 'Medium', grid: '4×4', pieces: '16 pieces' },
  { key: 'hard', label: 'Hard', grid: '5×5', pieces: '25 pieces' },
]

export default function Home() {
  const [playing, setPlaying] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')

  if (playing) {
    return <PuzzleGame difficulty={difficulty} onBack={() => setPlaying(false)} />
  }

  return (
    <div className="bone-bg min-h-screen flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center mx-4">
        <div className="text-5xl mb-2">🐶</div>
        <h1 className="text-3xl font-black mb-6">{"Jimmy's Puzzle"}</h1>

        {/* Jimmy preview */}
        <div className="w-44 h-44 mx-auto mb-8 rounded-2xl overflow-hidden shadow-md border-4 border-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/jimmy.jpg" alt="Jimmy" className="w-full h-full object-cover" />
        </div>

        <p className="text-sm font-bold text-zinc-600 mb-3">Choose difficulty</p>
        <div className="flex gap-3 justify-center mb-8">
          {DIFFICULTIES.map(({ key, label, grid, pieces }) => (
            <button
              key={key}
              onClick={() => setDifficulty(key)}
              className="flex-1 py-3 px-2 rounded-2xl font-bold text-sm transition-all"
              style={
                difficulty === key
                  ? { background: '#171717', color: 'white', transform: 'scale(1.05)' }
                  : { background: '#f4f4f5', color: '#52525b' }
              }
            >
              {label}
              <span className="block text-xs mt-0.5 opacity-70">{grid}</span>
              <span className="block text-xs opacity-50">{pieces}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setPlaying(true)}
          className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all hover:scale-105 active:scale-100"
          style={{ background: '#171717' }}
        >
          Start puzzle →
        </button>
      </div>
    </div>
  )
}
