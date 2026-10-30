import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlayer } from '../../context/PlayerContext'
import { DAILY_CAP } from '../../services/gameService'
import ChibiAvatar from '../../components/ChibiAvatar'
import XpBar from '../../components/XpBar'
import { LEVELS, getLevel } from '../../utils/levels'
import { sfx } from '../../utils/sfx'

const TIPS = [
  'Tắt đèn khi ra khỏi lớp nhé! 💡',
  'Mang bình nước riêng để bớt chai nhựa 🧴',
  'Vỏ chuối là rác hữu cơ đó! 🍌',
  'Pin cũ phải bỏ vào hộp thu gom riêng 🔋',
  'Khóa vòi nước khi đánh răng nha 🚰',
  'Em chăm chỉ quá, Chibi thương em! 💚',
]

const GAMES = [
  { id: 'trash', to: '/choi/thung-rac', icon: '🗑️', ten: 'Thùng Rác Thông Thái', mo_ta: 'Kéo rác vào đúng thùng', tone: 'green' },
  { id: 'energy', to: '/choi/tiet-kiem', icon: '💡', ten: 'Biệt Đội Tiết Kiệm', mo_ta: 'Chạm nhanh tắt đèn, khóa nước', tone: 'sun' },
  { id: 'quiz', to: '/choi/buoc-chan-xanh', icon: '👣', ten: 'Bước Chân Xanh', mo_ta: 'Nhiệm vụ & đố vui hằng ngày', tone: 'sky', daily: true },
]

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()))
  if (h < 11) return 'Chào buổi sáng'
  if (h < 14) return 'Chào buổi trưa'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export default function Home() {
  const { user, logout } = usePlayer()
  const xp = user.tong_diem_tich_luy
  const lv = getLevel(xp)
  const [tip, setTip] = useState(null)
  const [bounce, setBounce] = useState(0)
  const daDat = DAILY_CAP - (user.con_lai_hom_nay ?? 0)
  const nameParts = (user.ho_ten || '').trim().split(/\s+/)
  const ten = nameParts.length > 1 ? nameParts.slice(1).join(' ') : (user.ho_ten || user.ten_hien_thi || 'bạn nhỏ')
  const nv = user.nhiem_vu_hom_nay || {}
  const questDone = Number(Boolean(nv.tu_khai)) + Number(Boolean(nv.do_vui))

  useEffect(() => {
    if (!tip) return
    const t = setTimeout(() => setTip(null), 3500)
    return () => clearTimeout(t)
  }, [tip])

  const onChibiTap = () => {
    sfx.tap()
    setBounce((b) => b + 1)
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)])
  }

  return (
    <div className="stack">
      <section className="garden">
        <div className="garden__sky" aria-hidden="true">
          <span className="sun" />
          <span className="cloud cloud--1" />
          <span className="cloud cloud--2" />
        </div>
        <h1 className="garden__greet">
          {greeting()}, {ten}! 👋
        </h1>

        <div className="garden__stage">
          {tip && <div className="speech">{tip}</div>}
          <button className="garden__chibi" onClick={onChibiTap} key={bounce} id="chibi-tap" aria-label="Chạm vào Chibi để nghe mẹo sống xanh">
            <ChibiAvatar xp={xp} size={180} />
          </button>
        </div>
        <div className="garden__ground" aria-hidden="true" />

        <div className="garden__info">
          <span className="level-badge">Cấp {lv.cap}</span>
          <h2 className="garden__lvname">{lv.ten}</h2>
          <XpBar xp={xp} />
        </div>
      </section>

      <section className="card daily" aria-labelledby="daily-title">
        <div className="daily__icon" aria-hidden="true">☀️</div>
        <div className="daily__body">
          <h2 id="daily-title" className="daily__title">Điểm hôm nay</h2>
          <div className="mini-track">
            <div className="mini-track__fill" style={{ width: `${(daDat / DAILY_CAP) * 100}%` }} />
          </div>
          <p className="daily__text">
            {user.con_lai_hom_nay > 0 ? (
              <>Đã kiếm <b>{daDat}</b>/{DAILY_CAP} điểm · còn <b>{user.con_lai_hom_nay}</b> điểm nữa</>
            ) : (
              <>Tuyệt! Em đã đạt đủ <b>{DAILY_CAP}</b> điểm hôm nay 🎉 Mai chơi tiếp nhé!</>
            )}
          </p>
        </div>
      </section>

      <section aria-labelledby="games-title">
        <h2 id="games-title" className="section-title">🎮 Sảnh trò chơi</h2>
        <div className="game-list">
          {GAMES.map((g) =>
            g.soon ? (
              <div key={g.id} className={`game-card game-card--${g.tone} is-locked`} id={`game-${g.id}`} aria-disabled="true">
                <span className="game-card__icon">{g.icon}</span>
                <div className="game-card__text">
                  <h3>{g.ten}</h3>
                  <p>{g.mo_ta}</p>
                </div>
                <span className="tag tag--grey">Sắp ra mắt</span>
              </div>
            ) : (
              <Link key={g.id} to={g.to} className={`game-card game-card--${g.tone}`} id={`game-${g.id}`}>
                <span className="game-card__icon">{g.icon}</span>
                <div className="game-card__text">
                  <h3>{g.ten}</h3>
                  <p>{g.mo_ta}</p>
                </div>
                {g.daily && questDone === 2 ? (
                  <span className="tag chip--green">✓ Xong hôm nay</span>
                ) : g.daily ? (
                  <span className="tag chip--sun">{questDone}/2 hôm nay</span>
                ) : (
                  <span className="game-card__play" aria-hidden="true">▶</span>
                )}
              </Link>
            ),
          )}
        </div>
      </section>

      <section className="card" aria-labelledby="evo-title">
        <h2 id="evo-title" className="section-title">🌱 Hành trình tiến hóa</h2>
        <ol className="evo">
          {LEVELS.map((l) => {
            const state = l.cap < lv.cap ? 'done' : l.cap === lv.cap ? 'current' : 'locked'
            return (
              <li key={l.cap} className={`evo__step is-${state}`}>
                <div className="evo__img">
                  <img src={l.img} alt={state === 'locked' ? 'Chưa mở khóa' : l.ten} />
                  {state === 'locked' && <span className="evo__lock">?</span>}
                </div>
                <span className="evo__name">{state === 'locked' ? '???' : l.ten}</span>
                <span className="evo__xp">{l.min}+ XP</span>
              </li>
            )
          })}
        </ol>
      </section>

      <div className="home-footer">
        <p className="home-footer__slogan">Eco Chibi · Chung tay xây dựng trường học xanh 🌿</p>
        <div className="home-footer__links">
          <Link to="/giao-vien" className="link-btn" id="teacher-portal-link">🛡️ Quản trị viên</Link>
          <span aria-hidden="true">·</span>
          <button className="link-btn" onClick={logout} id="logout-btn">Đăng xuất</button>
        </div>
      </div>
    </div>
  )
}
