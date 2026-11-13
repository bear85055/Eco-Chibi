import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { usePlayer } from '../../context/PlayerContext'
import {
  capLaiPinHocSinh,
  capNhatThongTinHocSinh,
  congDiemThuongHocSinh,
  layDanhSachHocSinh,
  themHocSinhThuCong,
  xoaHocSinh,
} from '../../services/teacherService'
import { sanitizeUsername } from '../../services/authService'
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
  const [customPinInput, setCustomPinInput] = useState('')

  // Modal Sửa Thông Tin Học Sinh (Họ tên, Lớp, Trường)
  const [editStudent, setEditStudent] = useState(null)
  const [editName, setEditName] = useState('')
  const [editLop, setEditLop] = useState('')
  const [editTruong, setEditTruong] = useState('')

  // Modal Thêm Học Sinh Thủ Công
  const [addStudentModal, setAddStudentModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addLop, setAddLop] = useState(user.vai_tro === 'teacher' ? user.lop : '3A')
  const [addTruong, setAddTruong] = useState('')
  const [addUsername, setAddUsername] = useState('')
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
    setCustomPinInput(student.pin || '1234')
  }

  const confirmResetPin = async () => {
    if (!customPinInput || customPinInput.trim().length < 4) {
      return toast('Mật khẩu mới cần có ít nhất 4 ký tự!', 'error')
    }
    setBusy(true)
    try {
      const res = await capLaiPinHocSinh(pinStudent.id, customPinInput.trim())
      setNewPinResult(res.newPin)
      setPinStudent((prev) => (prev ? { ...prev, pin: res.newPin } : prev))
      setData((prev) => ({
        ...prev,
        items: prev.items.map((it) => (it.id === pinStudent.id ? { ...it, pin: res.newPin } : it)),
      }))
      sfx.win()
      toast(`Đã đổi mật khẩu mới (${res.newPin}) cho em ${pinStudent.ho_ten}!`, 'success')
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleOpenEdit = (student) => {
    setEditStudent(student)
    setEditName(student.ho_ten || '')
    setEditLop(student.lop || '')
    setEditTruong(student.truong || '')
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editStudent) return
    if (!editName.trim()) return toast('Vui lòng nhập họ và tên học sinh', 'error')
    if (!editLop.trim()) return toast('Vui lòng nhập lớp', 'error')
    if (!editTruong.trim()) return toast('Vui lòng nhập trường học', 'error')
    setBusy(true)
    try {
      await capNhatThongTinHocSinh(editStudent.id, {
        ho_ten: editName.trim(),
        lop: editLop.trim().toUpperCase().replace(/\s/g, ''),
        truong: editTruong.trim(),
      })
      sfx.win()
      toast(`Đã cập nhật thông tin học sinh ${editName.trim()}!`, 'success')
      setEditStudent(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteOne = async (student) => {
    if (!window.confirm(`Xóa tài khoản học sinh "${student.ho_ten}" (${student.ma_dang_nhap})?`)) return
    setBusy(true)
    try {
      await xoaHocSinh(student.id)
      toast(`Đã xóa học sinh ${student.ho_ten}.`, 'info')
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
    if (!addTruong.trim()) return toast('Vui lòng nhập trường học', 'error')
    const cleanUser = sanitizeUsername(addUsername)
    if (!cleanUser || cleanUser.length < 3) {
      return toast('Tên đăng nhập cần từ 3 ký tự trở lên (chữ không dấu hoặc số)', 'error')
    }
    if (addPin.trim().length < 4) return toast('Mật khẩu phải có ít nhất 4 ký tự', 'error')
    setBusy(true)
    try {
      const newStu = await themHocSinhThuCong({
        ho_ten: addName.trim(),
        lop: addLop.trim().toUpperCase().replace(/\s/g, ''),
        truong: addTruong.trim(),
        ten_dang_nhap: cleanUser,
        pin: addPin.trim(),
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
          <p>Ghi nhận việc tốt bảo vệ môi trường ngoài đời thực và quản lý tài khoản, mật khẩu học sinh.</p>
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
              setAddTruong('')
              setAddUsername('')
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
            placeholder="Tìm theo họ tên, trường hoặc tên đăng nhập..."
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
                <th>Tên đăng nhập</th>
                <th>Lớp</th>
                <th>Trường</th>
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
                      {st.truong ? (
                        <span style={{ fontSize: '0.88rem', color: 'var(--ink-700)', fontWeight: 700 }}>
                          🏫 {st.truong}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost"
                          style={{ fontSize: '0.76rem', padding: '4px 8px', color: 'var(--green-700)' }}
                          onClick={() => handleOpenEdit(st)}
                        >
                          ✏️ Nhập trường
                        </button>
                      )}
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
                          id={`btn-edit-${st.ma_dang_nhap}`}
                          className="btn btn--sm btn--ghost"
                          title="Sửa thông tin học sinh (Họ tên, Lớp, Trường)"
                          onClick={() => handleOpenEdit(st)}
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          id={`btn-pin-${st.ma_dang_nhap}`}
                          className="btn btn--sm btn--ghost"
                          title="Đổi / Cấp lại mật khẩu"
                          onClick={() => handleResetPin(st)}
                        >
                          🔑 MK: {st.pin || '1234'}
                        </button>
                        <button
                          id={`btn-del-${st.ma_dang_nhap}`}
                          className="btn btn--sm btn--ghost"
                          style={{ color: 'var(--coral-500)', padding: '6px 8px' }}
                          title="Xóa học sinh này"
                          onClick={() => handleDeleteOne(st)}
                        >
                          🗑️
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

      {/* Modal Cấp Lại Mật Khẩu */}
      <Modal open={!!pinStudent} onClose={() => setPinStudent(null)}>
        {pinStudent && (
          <div className="modal__content">
            <h2>🔑 Quản Lý Mật Khẩu</h2>
            <p className="modal__text">
              Học sinh: <b>{pinStudent.ho_ten}</b> (Tên ĐN: <b>{pinStudent.ma_dang_nhap}</b> - Lớp {pinStudent.lop})
            </p>

            <div style={{ margin: '14px 0', padding: '14px', background: 'var(--mint-50)', borderRadius: '16px', width: '100%' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-600)', fontWeight: 700 }}>
                {newPinResult ? '✅ Mật khẩu mới đã được lưu thành công:' : 'Mật khẩu hiện tại của em:'}
              </div>
              <div
                id="pin-display"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.1rem',
                  fontWeight: 800,
                  color: 'var(--green-700)',
                  letterSpacing: '2px',
                  marginTop: '4px',
                }}
              >
                {newPinResult || pinStudent.pin || '1234'}
              </div>
            </div>

            {!newPinResult && (
              <div className="field" style={{ width: '100%', textAlign: 'left', marginBottom: '12px' }}>
                <span className="field__label">Nhập mật khẩu mới (tối thiểu 4 ký tự):</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    id="custom-pin-input"
                    type="text"
                    maxLength={24}
                    className="field__input"
                    value={customPinInput}
                    onChange={(e) => setCustomPinInput(e.target.value)}
                    style={{ fontWeight: 800, letterSpacing: '1px', textAlign: 'center', fontSize: '1.05rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setCustomPinInput(String(Math.floor(1000 + Math.random() * 9000)))}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    🎲 Ngẫu nhiên
                  </button>
                </div>
              </div>
            )}

            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setPinStudent(null)}>
                {newPinResult ? 'Đóng' : 'Hủy'}
              </button>
              {!newPinResult && (
                <button
                  id="btn-generate-pin"
                  className="btn btn--primary"
                  onClick={confirmResetPin}
                  disabled={busy || customPinInput.trim().length < 4}
                >
                  {busy ? 'Đang lưu...' : `Đổi mật khẩu mới`}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Sửa Thông Tin Học Sinh */}
      <Modal open={!!editStudent} onClose={() => !busy && setEditStudent(null)}>
        {editStudent && (
          <form className="modal__content" onSubmit={handleSaveEdit} style={{ width: '100%', maxWidth: '410px', textAlign: 'left', alignItems: 'stretch' }}>
            <h2 style={{ textAlign: 'center' }}>✏️ Cập Nhật Học Sinh</h2>
            <p className="modal__text" style={{ textAlign: 'center', marginBottom: '14px' }}>
              Tên đăng nhập: <b>{editStudent.ma_dang_nhap}</b>
            </p>

            <label className="field">
              <span className="field__label">Họ và tên học sinh:</span>
              <input
                className="field__input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px', marginTop: '10px' }}>
              <label className="field">
                <span className="field__label">Lớp:</span>
                <input
                  className="field__input"
                  style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase' }}
                  value={editLop}
                  disabled={user.vai_tro === 'teacher'}
                  onChange={(e) => setEditLop(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  maxLength={10}
                  required
                />
              </label>

              <label className="field">
                <span className="field__label">Trường:</span>
                <input
                  className="field__input"
                  value={editTruong}
                  onChange={(e) => setEditTruong(e.target.value)}
                  maxLength={45}
                  required
                />
              </label>
            </div>

            <div className="modal__actions" style={{ marginTop: '18px' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setEditStudent(null)} disabled={busy}>
                Hủy
              </button>
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? 'Đang lưu...' : 'Lưu cập nhật'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Thêm Học Sinh Thủ Công */}
      <Modal open={addStudentModal} onClose={() => setAddStudentModal(false)}>
        <div className="modal__content" style={{ width: '100%', maxWidth: '420px', textAlign: 'left' }}>
          <h2>➕ Thêm Học Sinh Mới</h2>
          <p className="modal__text" style={{ marginBottom: '14px' }}>
            Tạo tài khoản học sinh với đầy đủ thông tin trường, lớp và tên đăng nhập.
          </p>

          {!addResult ? (
            <form onSubmit={handleAddStudent} style={{ width: '100%' }}>
              <label className="field">
                <span className="field__label">Họ và tên học sinh:</span>
                <input
                  id="add-student-name"
                  className="field__input"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px', marginTop: '10px' }}>
                <label className="field">
                  <span className="field__label">Lớp:</span>
                  <input
                    id="add-student-class"
                    className="field__input"
                    style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase' }}
                    value={addLop}
                    disabled={user.vai_tro === 'teacher'}
                    onChange={(e) => setAddLop(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    maxLength={10}
                    required
                  />
                </label>

                <label className="field">
                  <span className="field__label">Trường:</span>
                  <input
                    id="add-student-school"
                    className="field__input"
                    value={addTruong}
                    onChange={(e) => setAddTruong(e.target.value)}
                    maxLength={45}
                    required
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '10px', marginTop: '10px' }}>
                <label className="field">
                  <span className="field__label">Tên đăng nhập:</span>
                  <input
                    id="add-student-username"
                    className="field__input"
                    style={{ fontWeight: 700 }}
                    value={addUsername}
                    onChange={(e) => setAddUsername(sanitizeUsername(e.target.value))}
                    maxLength={28}
                    required
                  />
                </label>

                <label className="field">
                  <span className="field__label">Mật khẩu:</span>
                  <input
                    id="add-student-pin"
                    type="text"
                    maxLength={24}
                    className="field__input"
                    style={{ textAlign: 'center' }}
                    value={addPin}
                    onChange={(e) => setAddPin(e.target.value)}
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
                      TÊN ĐĂNG NHẬP MỚI TẠO
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#065f46', letterSpacing: '0.5px' }}>
                      {addResult.ma_dang_nhap}
                    </div>
                  </div>
                  <button
                    type="button"
                    id="btn-copy-new-student"
                    className="btn btn--sm btn--ghost"
                    style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#fff', border: '1px solid #a7f3d0' }}
                    onClick={() => {
                      const textToCopy = `Tài khoản Eco Chibi:\nTên đăng nhập: ${addResult.ma_dang_nhap}\nMật khẩu: ${addResult.pin}\nHọc sinh: ${addResult.ho_ten}\nLớp: ${addResult.lop}${addResult.truong ? ` - Trường: ${addResult.truong}` : ''}`
                      navigator.clipboard?.writeText(textToCopy)
                      setCopied(true)
                      toast('Đã chép thông tin tài khoản học sinh!', 'success')
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    {copied ? '✓ Đã chép' : '📋 Chép thẻ'}
                  </button>
                </div>

                <div style={{ fontSize: '0.88rem', color: '#374151', lineHeight: '1.6' }}>
                  <div>Họ tên: <b>{addResult.ho_ten}</b></div>
                  <div>Lớp: <b>{addResult.lop}</b>{addResult.truong ? <> · Trường: <b>{addResult.truong}</b></> : null}</div>
                  <div>Mật khẩu: <b>{addResult.pin}</b></div>
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
                    setAddUsername('')
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
