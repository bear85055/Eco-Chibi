import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { usePlayer } from '../../context/PlayerContext'
import { huyDoiQua, layDanhSachDuyetQua, xacNhanPhatQua } from '../../services/teacherService'
import Modal from '../../components/Modal'
import { sfx } from '../../utils/sfx'

const fmtDate = (ts) => {
  if (!ts) return ''
  const d = ts instanceof Date ? ts : new Date(ts)
  return isNaN(d.getTime())
    ? ''
    : new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(d)
}

export default function VerifyGift() {
  const { user } = usePlayer()
  const toast = useToast()
  const [data, setData] = useState({ items: [], soLuongCho: 0 })
  const [loading, setLoading] = useState(true)
  const [tuKhoa, setTuKhoa] = useState('')
  const [trangThai, setTrangThai] = useState('all') // all | pending | completed | cancelled
  const [cancelModalItem, setCancelModalItem] = useState(null)
  const [cancelReason, setCancelReason] = useState('Hết quà thực tế trong kho trường')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await layDanhSachDuyetQua({
        lop: user.vai_tro === 'teacher' ? user.lop : 'all',
        tuKhoa,
        trangThai,
      })
      setData(res)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [user.vai_tro, user.lop, tuKhoa, trangThai, toast])

  useEffect(() => {
    load()
  }, [load])

  const handleConfirm = async (item) => {
    setBusyId(item.id)
    try {
      await xacNhanPhatQua(item.id)
      sfx.correct()
      toast(`Đã phát "${item.reward.ten_qua}" cho em ${item.student.ho_ten}!`, 'success')
      load()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleCancel = async () => {
    if (!cancelModalItem) return
    setBusyId(cancelModalItem.id)
    try {
      await huyDoiQua(cancelModalItem.id, cancelReason)
      toast(`Đã hủy đơn và hoàn lại ${cancelModalItem.gia_xu_luc_doi} Xu cho em ${cancelModalItem.student.ho_ten}.`, 'info')
      setCancelModalItem(null)
      load()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="verify-page">
      <header className="t-header">
        <div className="t-header__title">
          <h1>🎁 Duyệt & Phát Quà Xanh</h1>
          <p>
            {user.vai_tro === 'teacher'
              ? `Học sinh lớp ${user.lop} mang mã nhận quà lên gặp cô để đối chiếu và nhận quà.`
              : 'Ban phụ trách duyệt phát quà cho học sinh toàn trường.'}
          </p>
        </div>

        <div className="t-header__stats">
          <div className="stat-badge" id="pending-counter">
            <span className="stat-num">{data.soLuongCho}</span>
            <span className="stat-text">Đang chờ nhận</span>
          </div>
        </div>
      </header>

      <div className="t-toolbar">
        <div className="t-search">
          <span className="t-search__icon">🔍</span>
          <input
            id="search-gift-code"
            type="text"
            placeholder="Tìm theo Mã nhận quà (GX-xxxx) hoặc tên học sinh..."
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
          />
        </div>

        <select
          id="filter-gift-status"
          className="t-select"
          value={trangThai}
          onChange={(e) => setTrangThai(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">⏳ Chờ phát quà</option>
          <option value="completed">✅ Đã phát quà</option>
          <option value="cancelled">↩️ Đã hủy & hoàn Xu</option>
        </select>
      </div>

      <div className="t-card">
        {loading ? (
          <div className="t-empty">
            <div className="spinner" />
            <p>Đang tải danh sách đổi quà...</p>
          </div>
        ) : data.items.length === 0 ? (
          <div className="t-empty">
            <div className="icon">📭</div>
            <p>Không có đơn đổi quà nào phù hợp.</p>
          </div>
        ) : (
          <table className="t-table" id="redemptions-table">
            <thead>
              <tr>
                <th>Mã nhận quà</th>
                <th>Học sinh</th>
                <th>Lớp</th>
                <th>Món quà</th>
                <th>Thời gian đổi</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => {
                const isPending = r.trang_thai === 'pending'
                const isCompleted = r.trang_thai === 'completed'
                const isCancelled = r.trang_thai === 'cancelled'

                return (
                  <tr key={r.id} id={`row-${r.ma_nhan_qua}`}>
                    <td>
                      <b style={{ color: 'var(--green-700)', letterSpacing: '1px' }}>{r.ma_nhan_qua}</b>
                    </td>
                    <td>
                      <b>{r.student?.ho_ten}</b>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-400)' }}>{r.student?.ma_dang_nhap}</div>
                    </td>
                    <td>
                      <span className="tag tag--grey">{r.student?.lop}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={r.reward?.hinh_anh}
                          alt=""
                          style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                        <span>{r.reward?.ten_qua}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--ink-600)' }}>{fmtDate(r.ngay_doi)}</td>
                    <td>
                      {isPending && <span className="chip chip--sun">⏳ Chờ phát</span>}
                      {isCompleted && (
                        <span className="chip chip--green" title={`Duyệt bởi: ${r.tenNguoiDuyet || 'Giáo viên'}`}>
                          ✅ Đã nhận
                        </span>
                      )}
                      {isCancelled && <span className="chip chip--grey">↩️ Đã hủy</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isPending && (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            id={`btn-confirm-${r.ma_nhan_qua}`}
                            className="btn btn--sm btn--primary"
                            disabled={busyId === r.id}
                            onClick={() => handleConfirm(r)}
                          >
                            {busyId === r.id ? '...' : '✅ Đã phát'}
                          </button>
                          <button
                            id={`btn-cancel-${r.ma_nhan_qua}`}
                            className="btn btn--sm btn--ghost"
                            style={{ color: 'var(--coral-500)' }}
                            disabled={busyId === r.id}
                            onClick={() => setCancelModalItem(r)}
                          >
                            Hủy
                          </button>
                        </div>
                      )}
                      {!isPending && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--ink-400)' }}>
                          {isCompleted ? `Nhận lúc ${fmtDate(r.ngay_nhan)}` : 'Đã hoàn Xu'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Hủy & Hoàn Xu */}
      <Modal open={!!cancelModalItem} onClose={() => setCancelModalItem(null)}>
        {cancelModalItem && (
          <div className="modal__content">
            <h2>Hủy đơn đổi quà?</h2>
            <p className="modal__text">
              Hệ thống sẽ <b>hoàn lại {cancelModalItem.gia_xu_luc_doi} Xu Xanh</b> vào ví của em{' '}
              <b>{cancelModalItem.student?.ho_ten}</b> và cộng lại tồn kho cho trường.
            </p>
            <div style={{ width: '100%', textAlign: 'left', marginTop: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-600)' }}>Lý do hủy:</label>
              <input
                type="text"
                className="field__input"
                style={{ fontSize: '0.95rem', padding: '8px 12px', marginTop: '4px' }}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="modal__actions" style={{ marginTop: '16px' }}>
              <button className="btn btn--ghost" onClick={() => setCancelModalItem(null)}>
                Đóng
              </button>
              <button
                id="btn-confirm-cancel-gift"
                className="btn btn--primary"
                style={{ background: 'var(--coral-500)', '--btn-shadow': 'hsl(8 75% 45%)' }}
                onClick={handleCancel}
              >
                Xác nhận hoàn Xu
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
