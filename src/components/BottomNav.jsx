import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/', icon: '🏡', label: 'Khu vườn', id: 'nav-home', end: true },
  { to: '/xep-hang', icon: '🏆', label: 'Xếp hạng', id: 'nav-leaderboard' },
  { to: '/cua-hang', icon: '🛍️', label: 'Cửa hàng', id: 'nav-shop' },
  { to: '/hop-qua', icon: '🎁', label: 'Hộp quà', id: 'nav-giftbox' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Điều hướng chính">
      {ITEMS.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} id={it.id} className="bottom-nav__item">
          <span className="bottom-nav__icon" aria-hidden="true">{it.icon}</span>
          <span className="bottom-nav__label">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
