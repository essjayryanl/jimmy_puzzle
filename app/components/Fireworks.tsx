'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  alpha: number; color: string; size: number
}

export default function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Capture in local non-null variables so TypeScript is happy inside nested functions
    const c = ctx
    const cv = canvas

    cv.width = window.innerWidth
    cv.height = window.innerHeight

    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#f06595', '#74c0fc']
    const particles: Particle[] = []

    function burst(x: number, y: number) {
      for (let i = 0; i < 70; i++) {
        const angle = (Math.PI * 2 * i) / 70 + Math.random() * 0.5
        const speed = 2 + Math.random() * 7
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          alpha: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 3 + Math.random() * 5,
        })
      }
    }

    const spots = [[0.15, 0.25], [0.5, 0.15], [0.85, 0.25], [0.25, 0.55], [0.75, 0.45], [0.5, 0.65]]
    spots.forEach(([rx, ry], i) => {
      setTimeout(() => burst(rx * cv.width, ry * cv.height), i * 250)
    })

    let animId: number
    function animate() {
      c.clearRect(0, 0, cv.width, cv.height)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.18
        p.vx *= 0.99
        p.alpha -= 0.013
        if (p.alpha <= 0) { particles.splice(i, 1); continue }
        c.globalAlpha = p.alpha
        c.fillStyle = p.color
        c.beginPath()
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        c.fill()
      }
      c.globalAlpha = 1
      if (particles.length > 0) animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animId)
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-30" />
}
