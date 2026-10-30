import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlayer } from '../../context/PlayerContext'
import { useToast } from '../../context/ToastContext'
import { doiQua, layDanhSachQua } from '../../services/shopService'
import GiftCard from '../../components/GiftCard'
import Modal from '../../components/Modal'
import Confetti from '../../components/Confetti'
import { sfx } from '../../utils/sfx'

export default function Shop() {
  const { user, setUser } = usePlayer()
  const toast = useToast()
  const [rewards, setRewards] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [success, setSuccess] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => layDanhSachQua().then(setRewards), [])
  useEffect(() => {
    load()
  }, [load])

  const redeem = async () => {
    setBusy(true)
    try {
      const res = await doiQua(confirm.id)
      setUser(res.user)
      setSuccess(res.redemption)
      sfx.win()
      load()
    } catch (e) {
      toast(e.message, 'error')
      load()
    } finally {
      setConfirm(null)
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <header className="page-head">
        <h1>🛍️ Cửa hàng Xanh</h1>
        <p>Dùng Xu Xanh đổi quà học tập thân thiện môi trường</p>
      </header>

      <div className="wallet card">
        <div>
          <div className="wallet__label">Em đang có</div>
          <div className="wallet__value">🍃 {user.diem_hien_co} <small>Xu Xanh</small></div>
        </div>
        <p className="wallet__note">Đổi quà không làm giảm XP và thứ hạng của em đâu nhé!</p>
      </div>

      {!rewards ? (
        <div className="screen-center"><div className="spinner" /></div>
      ) : rewards.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-600)' }}>
          <div style={{ fontSize: '2.8rem', marginBottom: '8px' }}>🎁</div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--green-700)', fontWeight: 800 }}>Kho quà đang được chuẩn bị!</h3>
          <p style={{ fontSize: '0.92rem', marginTop: '6px', color: 'var(--ink-500)', lineHeight: '1.5' }}>
            Thầy cô đang chuẩn bị các phần quà xanh siêu hấp dẫn cho các em.<br />
            Em hãy tiếp tục làm nhiệm vụ và chơi game để tích lũy thật nhiều Xu Xanh nhé! 🍃
          </p>
        </div>
      ) : (
        <div className="gift-grid">
          {rewards.map((r) => (
            <GiftCard key={r.id} reward={r} xu={user.diem_hien_co} onRedeem={setConfirm} />
          ))}
        </div>
      )}

      <Modal open={!!confirm} onClose={() => !busy && setConfirm(null)} labelledBy="confirm-title">
        {confirm && (
          <div className="modal__content">
            <img className="modal__img" src={confirm.hinh_anh} alt="" />
            <h2 id="confirm-title">Đổi “{confirm.ten_qua}”?</h2>
            <p className="modal__text">
              Em sẽ dùng <b>🍃 {confirm.gia_xu} Xu</b>. Sau khi đổi còn <b>{user.diem_hien_co - confirm.gia_xu} Xu</b>.
            </p>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setConfirm(null)} disabled={busy} id="cancel-redeem">
                Để sau
              </button>
              <button className="btn btn--primary" onClick={redeem} disabled={busy} id="confirm-redeem">
                {busy ? 'Đang đổi…' : 'Đổi luôn!'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!success} onClose={() => setSuccess(null)} labelledBy="success-title">
        {success && (
          <div className="modal__content">
            <Confetti />
            <img className="modal__img" src={success.reward.hinh_anh} alt="" />
            <h2 id="success-title">Đổi quà thành công! 🎉</h2>
            <p className="modal__text">Đưa mã này cho thầy cô để nhận <b>{success.reward.ten_qua}</b> nhé:</p>
            <div className="ticket-code" id="redeem-code">{success.ma_nhan_qua}</div>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setSuccess(null)}>Đổi tiếp</button>
              <Link className="btn btn--primary" to="/hop-qua" id="goto-giftbox">Xem Hộp quà</Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
