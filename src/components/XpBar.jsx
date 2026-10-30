import { getNextLevel, getProgress } from '../utils/levels'

export default function XpBar({ xp }) {
  const next = getNextLevel(xp)
  const pct = getProgress(xp) * 100
  return (
    <div className="xpbar">
      <div className="xpbar__track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="xpbar__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="xpbar__label">
        <span>⭐ {xp} XP</span>
        <span>{next ? `Còn ${next.min - xp} XP lên cấp ${next.cap}` : 'Cấp cao nhất! 🎉'}</span>
      </div>
    </div>
  )
}
