import { useState } from 'react'

const COLORS = ['#4ade80', '#facc15', '#38bdf8', '#f472b6', '#a78bfa', '#fb923c']

function makePieces(count) {
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    dur: 1.8 + Math.random() * 1.4,
    color: COLORS[i % COLORS.length],
    rot: Math.random() * 360,
    size: 7 + Math.random() * 7,
  }))
}

export default function Confetti({ count = 44 }) {
  const [pieces] = useState(() => makePieces(count))
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size * 0.5,
            '--rot': `${p.rot}deg`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  )
}
