import { useEffect, useState } from 'react'
import { usePlayer } from '../../context/PlayerContext'
import { layBangXepHang } from '../../services/gameService'
import { getLevel } from '../../utils/levels'

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function Leaderboard() {
  const { user } = usePlayer()
  const [data, setData] = useState(null)

  useEffect(() => {
    layBangXepHang().then(setData)
  }, [user.tong_diem_tich_luy])

  if (!data) return <div className="screen-center"><div className="spinner" /></div>

  const [p1, p2, p3] = data.top
  const rest = data.top.slice(3)

  return (
    <div className="stack leaderboard">
      <header className="page-head">
        <h1>🏆 Bảng xếp hạng</h1>
        <p>Top 20 bạn nhỏ sống xanh nhất trường</p>
      </header>

      {data.top.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-500)' }}>
          <div style={{ fontSize: '2.8rem', marginBottom: '8px' }}>🌱</div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--green-700)', fontWeight: 800 }}>Chưa có bảng xếp hạng</h3>
          <p style={{ fontSize: '0.92rem', marginTop: '6px' }}>
            Hãy là bạn nhỏ đầu tiên chăm sóc cây và chơi mini-game để ghi danh lên bảng vàng nhé! 🌟
          </p>
        </div>
      ) : (
        <>
          <section className="podium" aria-label="Top 3">
            {[p2, p1, p3].filter(Boolean).map((p) => (
              <div key={p.id} className={`podium__col podium__col--${p.hang} ${p.id === user.id ? 'is-me' : ''}`}>
                <div className="podium__avatar">
                  <img src={getLevel(p.xp).img} alt="" />
                  <span className="podium__medal">{MEDAL[p.hang]}</span>
                </div>
                <div className="podium__name">{p.ten_hien_thi}</div>
                <div className="podium__class">Lớp {p.lop}</div>
                <div className="podium__block">
                  <span className="podium__rank">{p.hang}</span>
                  <span className="podium__xp">{p.xp} XP</span>
                </div>
              </div>
            ))}
          </section>

          {rest.length > 0 && (
            <ol className="rank-list card" start={4}>
              {rest.map((r) => (
                <li key={r.id} className={`rank-row ${r.id === user.id ? 'is-me' : ''}`}>
                  <span className="rank-row__pos">{r.hang}</span>
                  <img className="rank-row__avatar" src={getLevel(r.xp).img} alt="" />
                  <div className="rank-row__who">
                    <span className="rank-row__name">{r.ten_hien_thi}{r.id === user.id && ' (Em)'}</span>
                    <span className="rank-row__class">Lớp {r.lop}</span>
                  </div>
                  <span className="rank-row__xp">{r.xp} XP</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {data.toi && (
        <div className="my-rank" id="my-rank-bar">
          <span className="my-rank__pos">#{data.toi.hang || '—'}</span>
          <img className="rank-row__avatar" src={getLevel(data.toi.xp).img} alt="" />
          <div className="rank-row__who">
            <span className="rank-row__name">Hạng của em</span>
            <span className="rank-row__class">
              {typeof data.toi.hang === 'number' && data.toi.hang <= 20
                ? 'Em đang ở Top 20, giỏi quá!'
                : typeof data.toi.hang === 'number'
                  ? `Còn ${data.toi.hang - 20} bậc nữa để vào Top 20`
                  : 'Chơi game tích lũy XP để lọt vào Top 20 nhé!'}
            </span>
          </div>
          <span className="rank-row__xp">{data.toi.xp} XP</span>
        </div>
      )}
    </div>
  )
}
