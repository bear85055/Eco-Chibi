import { getLevel } from '../utils/levels'

/** Nhân vật Chibi theo XP — tự đổi hình khi tiến hóa */
export default function ChibiAvatar({ xp, size = 200, celebrate = false }) {
  const lv = getLevel(xp)
  return (
    <div
      className={`chibi chibi--lv${lv.cap} ${celebrate ? 'chibi--celebrate' : ''}`}
      style={{ '--size': `${size}px` }}
    >
      <div className="chibi__halo" />
      <div className="chibi__frame">
        <img src={lv.img} alt={`Chibi cấp ${lv.cap}: ${lv.ten}`} className="chibi__img" draggable="false" />
      </div>
      <div className="chibi__shadow" />
      {lv.cap >= 4 && (
        <div className="chibi__sparkles" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} style={{ '--i': i }}>✦</span>
          ))}
        </div>
      )}
    </div>
  )
}
