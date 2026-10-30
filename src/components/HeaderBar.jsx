import { Link } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { getLevel } from '../utils/levels'

export default function HeaderBar() {
  const { user } = usePlayer()
  const lv = getLevel(user.tong_diem_tich_luy)
  return (
    <header className="header-bar">
      <Link to="/" className="header-bar__me" id="header-profile">
        <img src={lv.img} alt="" className="header-bar__avatar" />
        <div>
          <div className="header-bar__name">{user.ten_hien_thi}</div>
          <div className="header-bar__sub">Lớp {user.lop} · Cấp {lv.cap}</div>
        </div>
      </Link>
      <div className="coin-pill" id="coin-balance" title="Xu Xanh">
        <span className="coin-pill__icon" aria-hidden="true">🍃</span>
        <span key={user.diem_hien_co} className="coin-pill__value">{user.diem_hien_co}</span>
        <span className="sr-only">Xu Xanh</span>
      </div>
    </header>
  )
}
