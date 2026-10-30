import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { usePlayer } from '../../context/PlayerContext'
import { layKhoQuaAdmin, luuMonQua } from '../../services/teacherService'
import Modal from '../../components/Modal'

const PRESET_IMAGES = [
  { label: 'Bút chì', url: '/assets/rewards/pencil.jpg' },
  { label: 'Sổ tay', url: '/assets/rewards/notebook.jpg' },
  { label: 'Bình nước', url: '/assets/rewards/bottle.jpg' },
  { label: 'Túi vải', url: '/assets/rewards/bag.jpg' },
]

export default function ManageStock() {
  const { user } = usePlayer()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState(null)
  const [busy, setBusy] = useState(false)

  const canManage = user?.vai_tro === 'admin' || user?.vai_tro === 'teacher'

  const load = useCallback(async () => {
    try {
      const res = await layKhoQuaAdmin()
      setItems(res)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const openNew = () => {
    setEditItem({
      id: null,
      ten_qua: '',
      gia_xu: 100,
      so_luong_ton: 10,
      dang_hoat_dong: true,
      mo_ta: '',
      hinh_anh: '/assets/rewards/pencil.jpg',
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await luuMonQua({
        ...editItem,
        gia_xu: parseInt(editItem.gia_xu, 10),
        so_luong_ton: parseInt(editItem.so_luong_ton, 10),
      })
      toast('Đã lưu thông tin món quà thành công!', 'success')
      setEditItem(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stock-page">
      <header className="t-header">
        <div className="t-header__title">
          <h1>📦 Quản Lý Kho Quà Tặng Xanh</h1>
          <p>
            Thêm mới, điều chỉnh số lượng tồn kho và giá Xu Xanh của quà tặng nhà trường.
          </p>
        </div>

        {canManage && (
          <button id="btn-add-reward" className="btn btn--primary" onClick={openNew}>
            + Thêm món quà mới
          </button>
        )}
      </header>

      <div className="t-card">
        {loading ? (
          <div className="t-empty">
            <div className="spinner" />
            <p>Đang tải danh sách kho quà...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="t-empty" style={{ padding: '48px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Kho quà hiện đang trống</h3>
            <p style={{ color: 'var(--ink-400)', fontSize: '0.92rem', marginBottom: '16px' }}>
              Thầy cô hãy bấm nút <b>"+ Thêm món quà mới"</b> để thêm các phần quà xanh cho học sinh nhé!
            </p>
            {canManage && (
              <button className="btn btn--primary" onClick={openNew}>
                + Thêm món quà đầu tiên
              </button>
            )}
          </div>
        ) : (
          <table className="t-table" id="stock-table">
            <thead>
              <tr>
                <th>Hình ảnh</th>
                <th>Tên món quà</th>
                <th>Giá đổi (Xu Xanh)</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
                {canManage && <th style={{ textAlign: 'right' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const isOutOfStock = r.so_luong_ton <= 0
                return (
                  <tr key={r.id} id={`stock-row-${r.id}`}>
                    <td style={{ width: '60px' }}>
                      <img
                        src={r.hinh_anh}
                        alt=""
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          objectFit: 'cover',
                          background: 'var(--mint-50)',
                        }}
                      />
                    </td>
                    <td>
                      <b>{r.ten_qua}</b>
                      <div style={{ fontSize: '0.8rem', color: 'var(--ink-400)', maxWidth: '340px' }}>
                        {r.mo_ta}
                      </div>
                    </td>
                    <td>
                      <span className="price-chip" style={{ position: 'static' }}>
                        🍃 {r.gia_xu}
                      </span>
                    </td>
                    <td>
                      {isOutOfStock ? (
                        <span className="chip chip--grey">Hết hàng (0)</span>
                      ) : r.so_luong_ton <= 3 ? (
                        <span className="chip chip--sun">Sắp hết ({r.so_luong_ton})</span>
                      ) : (
                        <b style={{ color: 'var(--green-700)' }}>{r.so_luong_ton} cái</b>
                      )}
                    </td>
                    <td>
                      {r.dang_hoat_dong ? (
                        <span className="chip chip--green">Đang mở đổi</span>
                      ) : (
                        <span className="chip chip--grey">Tạm ẩn</span>
                      )}
                    </td>
                    {canManage && (
                      <td style={{ textAlign: 'right' }}>
                        <button
                          id={`edit-reward-${r.id}`}
                          className="btn btn--sm btn--ghost"
                          onClick={() => setEditItem({ ...r })}
                        >
                          ✏️ Chỉnh sửa
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Chỉnh Sửa / Thêm Quà */}
      <Modal open={!!editItem} onClose={() => !busy && setEditItem(null)}>
        {editItem && (
          <form className="modal__content" onSubmit={handleSave} style={{ textAlign: 'left', alignItems: 'stretch' }}>
            <h2 style={{ textAlign: 'center' }}>{editItem.id ? 'Chỉnh sửa món quà' : 'Thêm món quà mới'}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <div>
                <span className="field__label">Chọn hình ảnh mẫu:</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '6px' }}>
                  {PRESET_IMAGES.map((img) => {
                    const isSelected = editItem.hinh_anh === img.url
                    return (
                      <button
                        key={img.url}
                        type="button"
                        style={{
                          border: isSelected ? '2px solid #059669' : '1px solid #d1fae5',
                          borderRadius: '12px',
                          padding: '6px',
                          background: isSelected ? '#ecfdf5' : '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        onClick={() => setEditItem({ ...editItem, hinh_anh: img.url })}
                      >
                        <img
                          src={img.url}
                          alt=""
                          style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065f46' }}>{img.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <label>
                <span className="field__label">Tên món quà:</span>
                <input
                  id="reward-name-input"
                  className="field__input"
                  style={{ textAlign: 'left', fontSize: '1rem', padding: '10px 14px' }}
                  value={editItem.ten_qua}
                  onChange={(e) => setEditItem({ ...editItem, ten_qua: e.target.value })}
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label>
                  <span className="field__label">Giá Xu Xanh:</span>
                  <input
                    id="reward-price-input"
                    type="number"
                    min="1"
                    className="field__input"
                    style={{ textAlign: 'center', fontSize: '1.1rem', padding: '10px' }}
                    value={editItem.gia_xu}
                    onChange={(e) => setEditItem({ ...editItem, gia_xu: e.target.value })}
                    required
                  />
                </label>

                <label>
                  <span className="field__label">Số lượng tồn kho:</span>
                  <input
                    id="reward-stock-input"
                    type="number"
                    min="0"
                    className="field__input"
                    style={{ textAlign: 'center', fontSize: '1.1rem', padding: '10px' }}
                    value={editItem.so_luong_ton}
                    onChange={(e) => setEditItem({ ...editItem, so_luong_ton: e.target.value })}
                    required
                  />
                </label>
              </div>

              <label>
                <span className="field__label">Mô tả ý nghĩa môi trường:</span>
                <input
                  id="reward-desc-input"
                  className="field__input"
                  style={{ textAlign: 'left', fontSize: '0.95rem', padding: '8px 12px' }}
                  value={editItem.mo_ta}
                  onChange={(e) => setEditItem({ ...editItem, mo_ta: e.target.value })}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: '4px 0' }}>
                <input
                  type="checkbox"
                  style={{ width: '18px', height: '18px' }}
                  checked={editItem.dang_hoat_dong}
                  onChange={(e) => setEditItem({ ...editItem, dang_hoat_dong: e.target.checked })}
                />
                <span style={{ fontWeight: 700 }}>Đang mở cho học sinh đổi trên ứng dụng</span>
              </label>
            </div>

            <div className="modal__actions" style={{ marginTop: '16px' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setEditItem(null)} disabled={busy}>
                Hủy bỏ
              </button>
              <button id="save-reward-btn" type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? 'Đang lưu...' : 'Lưu món quà'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
