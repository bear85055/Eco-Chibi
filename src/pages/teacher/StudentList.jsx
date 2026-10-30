import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { usePlayer } from '../../context/PlayerContext'
import {
  capLaiPinHocSinh,
  congDiemThuongHocSinh,
  layDanhSachHocSinh,
  themHocSinhThuCong,
} from '../../services/teacherService'
import { getLevel } from '../../utils/levels'
import Modal from '../../components/Modal'
import { sfx } from '../../utils/sfx'

const REASON_PRESETS = [
  'Nhặt rác sân trường giờ ra chơi',
  'Mang bình nước cá nhân không dùng chai nhựa',
  'Chủ động tắt đèn quạt phòng học khi ra về',
  'Chăm sóc tốt chậu cây xanh của lớp',
  'Tuyên truyền bạn bè phân loại rác đúng thùng',
]

export default function StudentList() {
  const { user } = usePlayer()
  const toast = useToast()
  const [data, setData] = useState({ items: [], danhSachLop: [] })
  const [loading, setLoading] = useState(true)
  const [lop, setLop] = useState('all')
  const [tuKhoa, setTuKhoa] = useState('')

  // Modal Thưởng Điểm
  const [rewardStudent, setRewardStudent] = useState(null)
  const [points, setPoints] = useState(10)
  const [reason, setReason] = useState(REASON_PRESETS[0])
  const [customReason, setCustomReason] = useState('')

  // Modal Cấp Lại PIN
  const [pinStudent, setPinStudent] = useState(null)
  const [newPinResult, setNewPinResult] = useState(null)

  // Modal Thêm Học Sinh Thủ Công
  const [addStudentModal, setAddStudentModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addLop, setAddLop] = useState(user.vai_tro === 'teacher' ? user.lop : '3A')
  const [addPin, setAddPin] = useState('1234')
  const [addResult, setAddResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await layDanhSachHocSinh({ lop, tuKhoa })
      setData(res)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [lop, tuKhoa, toast])

  useEffect(() => {
    load()
  }, [load])

  const handleReward = async (e) => {
    e.preventDefault()
    if (!rewardStudent) return
    const finalReason = reason === 'Khác' ? customReason.trim() : reason
    if (!finalReason) return toast('Vui lòng nhập lý do thưởng điểm', 'error')
    setBusy(true)
    try {
      await congDiemThuongHocSinh(rewardStudent.id, { diem: points, lyDo: finalReason })
      sfx.win()
      toast(`Đã thưởng nóng +${points} điểm xanh cho em ${rewardStudent.ho_ten}!`, 'success')
      setRewardStudent(null)
      setCustomReason('')
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleResetPin = async (student) => {
    setPinStudent(student)
    setNewPinResult(null)
  }

  const confirmResetPin = async () => {
    setBusy(true)
    try {
      const res = await capLaiPinHocSinh(pinStudent.id)
      setNewPinResult(res.newPin)
      toast(`Đã đổi mã PIN mới cho em ${pinStudent.ho_ten}!`, 'success')
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    if (!addName.trim()) return toast('Vui lòng nhập họ và tên học sinh', 'error')
    if (!addLop.trim()) return toast('Vui lòng nhập lớp', 'error')
    if (addPin.length !== 4) return toast('Mã PIN phải gồm đúng 4 chữ số', 'error')
    setBusy(true)
    try {
      const newStu = await themHocSinhThuCong({
        ho_ten: addName.trim(),
        lop: addLop.trim().toUpperCase().replace(/\s/g, ''),
        pin: addPin,
      })
      sfx.win()
      toast(`Đã thêm thành công học sinh ${newStu.ho_ten}!`, 'success')
      setAddResult(newStu)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="students-page">
      <header className="t-header">
        <div className="t-header__title">
          <h1>👥 Quản Lý Học Sinh & Thưởng Nóng</h1>
          <p>Ghi nhận việc tốt bảo vệ môi trường ngoài đời thực và cấp lại mã PIN khi học sinh quên.</p>
        </div>

        <div className="t-header__stats" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            id="btn-open-add-student"
            type="button"
            className="btn btn--primary btn--sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
            onClick={() => {
              setAddResult(null)
              setAddName('')
              setAddLop(user.vai_tro === 'teacher' ? user.lop : '3A')
              setAddPin('1234')
              setCopied(false)
              setAddStudentModal(true)
            }}
          >
            <span>➕</span> Thêm Học Sinh
          </button>
          <div className="stat-badge">
            <span className="stat-num">{data.items.length}</span>
            <span className="stat-text">Học sinh</span>
          </div>
        </div>
      </header>

      <div className="t-toolbar">
        <div className="t-search">
          <span className="t-search__icon">🔍</span>
          <input
            id="search-student"
            type="text"
            placeholder="Tìm theo tên học sinh hoặc Mã HS..."
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
          />
        </div>

        {user.vai_tro === 'admin' ? (
          <select
            id="filter-student-class"
            className="t-select"
            value={lop}
            onChange={(e) => setLop(e.target.value)}
          >
            <option value="all">Tất cả các lớp</option>
            {data.danhSachLop.map((l) => (
              <option key={l} value={l}>
                Lớp {l}
              </option>
            ))}
          </select>
        ) : (
          <span className="tag tag--grey" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            Lớp chủ nhiệm: {user.lop}
          </span>
        )}
      </div>

      <div className="t-card">
        {loading ? (
          <div className="t-empty">
            <div className="spinner" />
            <p>Đang tải danh sách học sinh...</p>
          </div>
        ) : data.items.length === 0 ? (
          <div className="t-empty">
            <div className="icon">🌱</div>
            <p>Không tìm thấy học sinh nào.</p>
          </div>
        ) : (
          <table className="t-table" id="students-table">
            <thead>
              <tr>
                <th>Học sinh</th>
                <th>Mã HS</th>
                <th>Lớp</th>
                <th>Cấp Chibi</th>
                <th>XP Tích Lũy</th>
                <th>Xu Xanh</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((st) => {
                const lv = getLevel(st.tong_diem_tich_luy)
                return (
                  <tr key={st.id} id={`student-row-${st.ma_dang_nhap}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={lv.img}
                          alt=""
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <b>{st.ho_ten}</b>
                      </div>
                    </td>
                    <td>
                      <code style={{ color: 'var(--green-700)', fontWeight: 800 }}>{st.ma_dang_nhap}</code>
                    </td>
                    <td>
                      <span className="tag tag--grey">{st.lop}</span>
                    </td>
                    <td>
                      <span className="chip chip--green">
                        Lv.{lv.cap} - {lv.ten}
                      </span>
                    </td>
                    <td>
                      <b style={{ color: 'var(--green-700)' }}>⭐ {st.tong_diem_tich_luy}</b>
                    </td>
                    <td>
                      <b style={{ color: 'hsl(32 80% 38%)' }}>🍃 {st.diem_hien_co}</b>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          id={`btn-reward-${st.ma_dang_nhap}`}
                          className="btn btn--sm btn--primary"
                          onClick={() => setRewardStudent(st)}
                        >
                          ⭐ Thưởng nóng
                        </button>
                        <button
                          id={`btn-pin-${st.ma_dang_nhap}`}
                          className="btn btn--sm btn--ghost"
                          title="Cấp lại mã PIN"
                          onClick={() => handleResetPin(st)}
                        >
                          🔑 PIN: {st.pin}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Thưởng Nóng Điểm Xanh */}
      <Modal open={!!rewardStudent} onClose={() => !busy && setRewardStudent(null)}>
        {rewardStudent && (
          <form className="modal__content" onSubmit={handleReward} style={{ textAlign: 'left', alignItems: 'stretch' }}>
            <h2 style={{ textAlign: 'center' }}>⭐ Thưởng Nóng Điểm Xanh</h2>
            <p className="modal__text" style={{ textAlign: 'center' }}>
              Thưởng điểm trực tiếp cho em <b>{rewardStudent.ho_ten}</b> ({rewardStudent.ma_dang_nhap} - Lớp {rewardStudent.lop})
            </p>

            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label>
                <span className="field__label">Số điểm thưởng (Cộng đồng thời XP & Xu):</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {[5, 10, 15, 20].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      className={`btn btn--sm ${points === pt ? 'btn--primary' : 'btn--ghost'}`}
                      style={{ flex: 1 }}
                      onClick={() => setPoints(pt)}
                    >
                      +{pt}
                    </button>
                  ))}
                </div>
              </label>

              <label>
                <span className="field__label">Lý do thưởng điểm:</span>
                <select
                  className="field__input"
                  style={{ fontSize: '0.92rem', padding: '10px' }}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {REASON_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="Khác">Lý do khác (tự nhập)...</option>
                </select>
              </label>

              {reason === 'Khác' && (
                <input
                  type="text"
                  className="field__input"
                  style={{ fontSize: '0.92rem', padding: '10px' }}
                  placeholder="Nhập lý do cụ thể..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="modal__actions" style={{ marginTop: '16px' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setRewardStudent(null)} disabled={busy}>
                Đóng
              </button>
              <button id="btn-submit-reward" type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? 'Đang cộng...' : `Cộng +${points} Điểm`}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Cấp Lại PIN */}
      <Modal open={!!pinStudent} onClose={() => setPinStudent(null)}>
        {pinStudent && (
          <div className="modal__content">
            <h2>🔑 Quản Lý Mã PIN</h2>
            <p className="modal__text">
              Học sinh: <b>{pinStudent.ho_ten}</b> ({pinStudent.ma_dang_nhap} - Lớp {pinStudent.lop})
            </p>

            <div style={{ margin: '14px 0', padding: '14px', background: 'var(--mint-50)', borderRadius: '16px', width: '100%' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-600)', fontWeight: 700 }}>
                {newPinResult ? 'Mã PIN mới đã được cấp thành công:' : 'Mã PIN hiện tại của em:'}
              </div>
              <div
                id="pin-display"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  color: 'var(--green-700)',
                  letterSpacing: '4px',
                  marginTop: '4px',
                }}
              >
                {newPinResult || pinStudent.pin}
              </div>
            </div>

            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setPinStudent(null)}>
                Xong
              </button>
              {!newPinResult && (
                <button id="btn-generate-pin" className="btn btn--primary" onClick={confirmResetPin} disabled={busy}>
                  {busy ? 'Đang cấp...' : 'Tạo PIN mới ngẫu nhiên'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Thêm Học Sinh Thủ Công */}
      <Modal open={addStudentModal} onClose={() => setAddStudentModal(false)}>
        <div className="modal__content" style={{ width: '100%', maxWidth: '420px', textAlign: 'left' }}>
          <h2>➕ Thêm Học Sinh Mới</h2>
          <p className="modal__text" style={{ marginBottom: '14px' }}>
            Tạo tài khoản học sinh nhanh mà không cần danh sách toàn trường.
          </p>

          {!addResult ? (
            <form onSubmit={handleAddStudent} style={{ width: '100%' }}>
              <label className="field">
                <span className="field__label">Họ và tên học sinh:</span>
                <input
                  id="add-student-name"
                  className="field__input"
                  style={{ textAlign: 'left', padding: '10px 12px', fontSize: '1rem' }}
                  placeholder="VD: Lê Hoàng Long"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <label className="field">
                  <span className="field__label">Lớp:</span>
                  <input
                    id="add-student-class"
                    className="field__input"
                    style={{ textAlign: 'center', fontWeight: 'bold', padding: '10px', fontSize: '1rem', textTransform: 'uppercase' }}
                    placeholder="VD: 3A"
                    value={addLop}
                    disabled={user.vai_tro === 'teacher'}
                    onChange={(e) => setAddLop(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    maxLength={6}
                    required
                  />
                </label>

                <label className="field">
                  <span className="field__label">Mã PIN (4 số):</span>
                  <input
                    id="add-student-pin"
                    type="text"
                    maxLength={4}
                    className="field__input"
                    style={{ textAlign: 'center', padding: '10px', fontSize: '1.1rem', letterSpacing: '2px' }}
                    value={addPin}
                    onChange={(e) => setAddPin(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </label>
              </div>

              <div className="modal__actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn--ghost" onClick={() => setAddStudentModal(false)}>
                  Hủy
                </button>
                <button id="btn-submit-add-student" type="submit" className="btn btn--primary" disabled={busy}>
                  {busy ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
                  border: '2px dashed #10b981',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '16px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #d1fae5', paddingBottom: '6px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#047857', fontWeight: '800' }}>
                      MÃ HỌC SINH MỚI TẠO
                    </span>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#065f46', letterSpacing: '1px' }}>
                      {addResult.ma_dang_nhap}
                    </div>
                  </div>
                  <button
                    type="button"
                    id="btn-copy-new-student"
                    className="btn btn--sm btn--ghost"
                    style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#fff', border: '1px solid #a7f3d0' }}
                    onClick={() => {
                      const textToCopy = `Tài khoản Eco Chibi:\nMã HS: ${addResult.ma_dang_nhap}\nPIN: ${addResult.pin}\nLớp: ${addResult.lop}\nHọc sinh: ${addResult.ho_ten}`
                      navigator.clipboard?.writeText(textToCopy)
                      setCopied(true)
                      toast('Đã chép thông tin thẻ học sinh!', 'success')
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    {copied ? '✓ Đã chép' : '📋 Chép thẻ'}
                  </button>
                </div>

                <div style={{ fontSize: '0.88rem', color: '#374151', lineHeight: '1.6' }}>
                  <div>Họ tên: <b>{addResult.ho_ten}</b></div>
                  <div>Lớp: <b>{addResult.lop}</b> · PIN: <b>{addResult.pin}</b></div>
                </div>
              </div>

              <div className="modal__actions">
                <button
                  type="button"
                  id="btn-add-more"
                  className="btn btn--ghost"
                  onClick={() => {
                    setAddResult(null)
                    setAddName('')
                  }}
                >
                  ➕ Thêm tiếp em khác
                </button>
                <button
                  type="button"
                  id="btn-done-add-student"
                  className="btn btn--primary"
                  onClick={() => setAddStudentModal(false)}
                >
                  Xong
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
