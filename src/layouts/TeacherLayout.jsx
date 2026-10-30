import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import './TeacherLayout.css'

const NAV_LINKS = [
  { to: '/giao-vien', end: true, icon: '🎁', label: 'Duyệt quà' },
  { to: '/giao-vien/hoc-sinh', icon: '👥', label: 'Học sinh & Thưởng' },
  { to: '/giao-vien/kho-qua', icon: '📦', label: 'Kho quà' },
  { to: '/giao-vien/nhat-ky', icon: '📜', label: 'Nhật ký điểm' },
]

export default function TeacherLayout() {
  const { user, logout } = usePlayer()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/dang-nhap')
  }

  return (
    <div className="teacher-shell">
      <header className="teacher-header">
        <div className="teacher-header__brand">
          <Link to="/giao-vien" className="teacher-header__logo">
            <span className="teacher-header__logo-icon">🌱</span>
            <div className="teacher-header__logo-text">
              <span className="title">Eco Chibi</span>
              <span className="sub">Cổng Quản Trị Hệ Thống</span>
            </div>
          </Link>
        </div>

        <div className="teacher-header__profile">
          <div className="teacher-header__user-info">
            <span className="name">{user.ho_ten}</span>
            <span className="role-pill">
              🛡️ Quản Trị Viên (Admin)
            </span>
          </div>

          <div className="teacher-header__actions">
            <Link to="/" className="btn btn--sm btn--ghost" id="view-student-portal" title="Xem giao diện học sinh">
              🎒 Giao diện HS
            </Link>
            <button onClick={handleLogout} className="btn btn--sm btn--ghost" id="teacher-logout" title="Đăng xuất">
              🚪 Thoát
            </button>
          </div>
        </div>
      </header>

      <nav className="teacher-nav" aria-label="Menu quản lý">
        <div className="teacher-nav__inner">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `teacher-nav__item ${isActive ? 'is-active' : ''}`}
            >
              <span className="icon">{link.icon}</span>
              <span className="label">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="teacher-main">
        <Outlet />
      </main>
    </div>
  )
}
