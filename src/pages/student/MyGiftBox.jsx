import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { layHopQua } from '../../services/shopService'

const STATUS = {
  pending: { label: 'Chờ nhận quà', cls: 'chip--sun', icon: '⏳' },
  completed: { label: 'Đã nhận quà', cls: 'chip--green', icon: '✅' },
  cancelled: { label: 'Đã hủy – đã hoàn Xu', cls: 'chip--grey', icon: '↩️' },
}

const fmt = (ts) => {
  if (!ts) return ''
  const d = ts instanceof Date ? ts : new Date(ts)
  return isNaN(d.getTime())
    ? ''
    : new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(d)
}

export default function MyGiftBox() {
  const [items, setItems] = useState(null)

  useEffect(() => {
    layHopQua().then(setItems)
  }, [])

  if (!items) return <div className="screen-center"><div className="spinner" /></div>

  const pending = items.filter((i) => i.trang_thai === 'pending').length

  return (
    <div className="stack">
      <header className="page-head">
        <h1>🎁 Hộp quà của em</h1>
        <p>{pending > 0 ? `Em có ${pending} món quà đang chờ nhận — đưa mã cho thầy cô nhé!` : 'Các món quà em đã đổi sẽ nằm ở đây'}</p>
      </header>

      {items.length === 0 ? (
        <div className="empty card">
          <div className="empty__icon">📭</div>
          <p>Hộp quà còn trống. Chơi game để kiếm Xu Xanh rồi đổi quà nhé!</p>
          <Link to="/cua-hang" className="btn btn--primary">Đến Cửa hàng</Link>
        </div>
      ) : (
        <ul className="giftbox-list">
          {items.map((r) => {
            const s = STATUS[r.trang_thai]
            return (
              <li key={r.id} className={`gift-ticket is-${r.trang_thai}`} id={`ticket-${r.ma_nhan_qua}`}>
                <img className="gift-ticket__img" src={r.reward?.hinh_anh} alt="" />
                <div className="gift-ticket__info">
                  <h3>{r.reward?.ten_qua}</h3>
                  <span className={`chip ${s.cls}`}>{s.icon} {s.label}</span>
                  <span className="gift-ticket__date">
                    Đổi lúc {fmt(r.ngay_doi)}
                    {r.ngay_nhan && <><br />Nhận lúc {fmt(r.ngay_nhan)}</>}
                  </span>
                </div>
                <div className="gift-ticket__code">
                  <span>Mã nhận quà</span>
                  <b>{r.ma_nhan_qua}</b>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
