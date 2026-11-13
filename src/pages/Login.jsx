import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { dangKyHocSinh, sanitizeUsername } from '../services/authService'
import Modal from '../components/Modal'
import Confetti from '../components/Confetti'
import { sfx } from '../utils/sfx'

export default function Login() {
  const { user, login, logout, setUser } = usePlayer()
  const navigate = useNavigate()
  const location = useLocation()
  const fromPath = location.state?.from?.pathname

  const [tab, setTab] = useState('login') // login | register
  const [ma, setMa] = useState('')
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  // Form đăng ký tài khoản học sinh (Họ tên, Lớp, Trường, Tên đăng nhập, Mật khẩu)
  const [regName, setRegName] = useState('')
  const [regLop, setRegLop] = useState('')
  const [regTruong, setRegTruong] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPin, setRegPin] = useState('')
  const [showRegPwd, setShowRegPwd] = useState(false)
  const [regSuccess, setRegSuccess] = useState(null)
  const [copied, setCopied] = useState(false)

  const fail = (msg) => {
    setErr(msg)
    sfx.wrong()
  }

  const submit = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    if (!ma.trim()) {
      return fail('Vui lòng nhập Tên đăng nhập nhé!')
    }
    if (!pin.trim()) {
      return fail('Vui lòng nhập Mật khẩu nhé!')
    }
    setBusy(true)
    setErr('')
    try {
      const u = await login(ma, pin)
      if (u.vai_tro === 'teacher' || u.vai_tro === 'admin') {
        const dest = fromPath?.startsWith('/giao-vien') ? fromPath : '/giao-vien'
        navigate(dest, { replace: true })
      } else {
        const dest = fromPath && !fromPath.startsWith('/giao-vien') && fromPath !== '/dang-nhap' ? fromPath : '/'
        navigate(dest, { replace: true })
      }
    } catch (error) {
      fail(error.message)
    } finally {
      setBusy(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regName.trim()) return fail('Vui lòng nhập họ và tên của em nhé!')
    if (!regLop.trim()) return fail('Vui lòng nhập lớp của em nhé!')
    if (!regTruong.trim()) return fail('Vui lòng nhập tên trường của em nhé!')
    const cleanUser = sanitizeUsername(regUsername)
    if (!cleanUser || cleanUser.length < 3) {
      return fail('Tên đăng nhập cần từ 3 ký tự trở lên (chữ cái không dấu hoặc số) nha!')
    }
    if (regPin.trim().length < 4 || regPin.trim().length > 16) {
      return fail('Mật khẩu cần từ 4 đến 16 ký tự nha!')
    }
    setBusy(true)
    setErr('')
    try {
      const u = await dangKyHocSinh({
        ho_ten: regName.trim(),
        lop: regLop.trim().toUpperCase().replace(/\s/g, ''),
        truong: regTruong.trim(),
        ten_dang_nhap: cleanUser,
        pin: regPin.trim(),
      })
      sfx.win()
      setRegSuccess({
        ...u,
        truong: u.truong || regTruong.trim(),
        pin: regPin.trim(),
      })
    } catch (error) {
      fail(error.message)
    } finally {
      setBusy(false)
    }
  }

  if (user && !regSuccess && !busy) {
    if (user.vai_tro === 'teacher' || user.vai_tro === 'admin') {
      return <Navigate to="/giao-vien" replace />
    }
    return <Navigate to="/" replace />
  }

  return (
    <main className="login">
      <section className="login__card">
        <div className="login__mascot">
          <img src="/assets/chibi/lv2.jpg" alt="Chibi Cây Non chào em" />
        </div>
        <h1 className="logo">
          Eco <span>Chibi</span>
        </h1>
        <p className="login__tagline">Cùng Chibi sống xanh mỗi ngày! 🌱</p>

        {/* Thanh chuyển đổi: Đăng nhập | Đăng ký */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '6px',
            background: 'hsl(140 40% 94%)',
            padding: '4px',
            borderRadius: '16px',
            marginBottom: '16px',
          }}
        >
          <button
            type="button"
            id="tab-login"
            className={`btn btn--sm ${tab === 'login' ? 'btn--primary' : 'btn--ghost'}`}
            style={{ padding: '8px 10px', fontSize: '0.88rem', boxShadow: 'none' }}
            onClick={() => {
              setTab('login')
              setErr('')
            }}
          >
            🔑 Đăng nhập
          </button>
          <button
            type="button"
            id="tab-register"
            className={`btn btn--sm ${tab === 'register' ? 'btn--primary' : 'btn--ghost'}`}
            style={{ padding: '8px 10px', fontSize: '0.88rem', boxShadow: 'none' }}
            onClick={() => {
              setTab('register')
              setErr('')
            }}
          >
            ✨ Đăng ký
          </button>
        </div>

        {tab === 'register' ? (
          <form onSubmit={handleRegister} style={{ textAlign: 'left' }}>
            <label className="field">
              <span className="field__label">Họ và tên:</span>
              <input
                id="reg-name"
                className="field__input"
                value={regName}
                onChange={(e) => {
                  setRegName(e.target.value)
                  setErr('')
                }}
                required
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px' }}>
              <label className="field">
                <span className="field__label">Lớp:</span>
                <input
                  id="reg-class"
                  className="field__input"
                  style={{
                    textAlign: 'center',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                  }}
                  value={regLop}
                  onChange={(e) => {
                    setRegLop(e.target.value.toUpperCase().replace(/\s/g, ''))
                    setErr('')
                  }}
                  maxLength={10}
                  required
                />
              </label>

              <label className="field">
                <span className="field__label">Trường:</span>
                <input
                  id="reg-school"
                  className="field__input"
                  value={regTruong}
                  onChange={(e) => {
                    setRegTruong(e.target.value)
                    setErr('')
                  }}
                  maxLength={45}
                  required
                />
              </label>
            </div>

            <label className="field">
              <span className="field__label">Tên đăng nhập:</span>
              <input
                id="reg-username"
                className="field__input"
                style={{ fontWeight: '700' }}
                value={regUsername}
                onChange={(e) => {
                  setRegUsername(sanitizeUsername(e.target.value))
                  setErr('')
                }}
                autoComplete="username"
                maxLength={28}
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Mật khẩu:</span>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-pin"
                  type={showRegPwd ? 'text' : 'password'}
                  className="field__input"
                  style={{ paddingRight: '44px' }}
                  value={regPin}
                  onChange={(e) => {
                    setRegPin(e.target.value)
                    setErr('')
                  }}
                  autoComplete="new-password"
                  maxLength={16}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPwd((s) => !s)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    color: 'var(--ink-400)',
                  }}
                  title={showRegPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showRegPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </label>

            <p className="login__error" role="alert">
              {err}
            </p>

            <button id="btn-submit-register" type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? 'Đang tạo...' : 'Tạo tài khoản & Nhận 50 Xu 🍃'}
            </button>
          </form>
        ) : (
          <form onSubmit={submit} style={{ textAlign: 'left' }}>
            <label className="field" htmlFor="login-id-input">
              <span className="field__label">Tên đăng nhập:</span>
              <input
                id="login-id-input"
                className="field__input"
                value={ma}
                onChange={(e) => {
                  setMa(sanitizeUsername(e.target.value))
                  setErr('')
                }}
                autoComplete="username"
                maxLength={28}
                required
              />
            </label>

            <label className="field" htmlFor="login-student-pwd">
              <span className="field__label">Mật khẩu:</span>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-student-pwd"
                  type={showPwd ? 'text' : 'password'}
                  className="field__input"
                  style={{ paddingRight: '44px' }}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value)
                    setErr('')
                  }}
                  autoComplete="current-password"
                  maxLength={24}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    color: 'var(--ink-400)',
                  }}
                  title={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </label>

            <p className="login__error" role="alert">
              {err}
            </p>

            <button
              id="btn-login-student"
              type="submit"
              className="btn btn--primary btn--block"
              style={{ marginTop: '8px', padding: '12px', fontSize: '1.05rem' }}
              disabled={busy}
            >
              {busy ? 'Đang đăng nhập...' : 'Đăng nhập ➜'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.88rem', color: 'var(--ink-600)' }}>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                className="link-btn"
                style={{ color: 'var(--green-700)', fontWeight: 800, textDecoration: 'underline' }}
                onClick={() => {
                  setTab('register')
                  setErr('')
                }}
              >
                Đăng ký ngay ✨
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Modal hiển thị thông tin tài khoản khi đăng ký thành công */}
      {regSuccess && (
        <Modal open={true} onClose={() => {}}>
          <Confetti count={50} />
          <div style={{ textAlign: 'center', padding: '6px 2px' }}>
            <div style={{ fontSize: '3.2rem', lineHeight: '1', marginBottom: '8px' }}>🎉</div>
            <h2 style={{ fontSize: '1.4rem', color: '#047857', marginBottom: '4px', fontWeight: '800' }}>
              Đăng Ký Thành Công!
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#4b5563', marginBottom: '16px' }}>
              Chào mừng bạn nhỏ <b>{regSuccess.ho_ten}</b> gia nhập Biệt Đội Xanh!
            </p>

            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                border: '2px dashed #10b981',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                textAlign: 'left',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  borderBottom: '1px solid #d1fae5',
                  paddingBottom: '10px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#047857', fontWeight: '800', letterSpacing: '0.5px' }}>
                    TÊN ĐĂNG NHẬP CỦA EM
                  </span>
                  <div
                    id="new-student-id"
                    style={{ fontSize: '1.65rem', fontWeight: '900', color: '#065f46', letterSpacing: '0.5px', marginTop: '2px' }}
                  >
                    {regSuccess.ma_dang_nhap}
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-copy-id"
                  className="btn btn--sm btn--ghost"
                  style={{
                    fontSize: '0.85rem',
                    padding: '8px 14px',
                    background: '#fff',
                    border: '1.5px solid #10b981',
                    borderRadius: '10px',
                    color: '#065f46',
                    fontWeight: '700',
                  }}
                  onClick={() => {
                    navigator.clipboard?.writeText(regSuccess.ma_dang_nhap)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2500)
                  }}
                >
                  {copied ? '✓ Đã chép' : '📋 Chép tên'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.92rem' }}>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Mật khẩu: </span>
                  <b style={{ color: '#111827' }}>{regSuccess.pin}</b>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Lớp: </span>
                  <b style={{ color: '#111827' }}>{regSuccess.lop}</b>
                </div>
                {regSuccess.truong && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Trường: </span>
                    <b style={{ color: '#111827' }}>{regSuccess.truong}</b>
                  </div>
                )}
                <div style={{ gridColumn: 'span 2', marginTop: '2px' }}>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Quà tặng tân thủ: </span>
                  <span style={{ color: '#059669', fontWeight: '700' }}>🎁 +50 Xu Xanh</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                color: '#92400e',
                borderRadius: '12px',
                padding: '10px 12px',
                fontSize: '0.84rem',
                marginBottom: '16px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                lineHeight: '1.45',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>📝</span>
              <span>
                Em hãy <b>ghi nhớ Tên đăng nhập ({regSuccess.ma_dang_nhap})</b> và <b>Mật khẩu</b> để đăng nhập những lần sau nhé!
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                id="btn-go-home"
                className="btn btn--primary btn--block btn--lg"
                style={{ fontSize: '1.05rem', padding: '12px', fontWeight: '800' }}
                onClick={() => {
                  setUser(regSuccess)
                  navigate('/', { replace: true })
                }}
              >
                Vào Khu Vườn Chibi Ngay! 🚀
              </button>
              <button
                type="button"
                id="btn-switch-login-with-code"
                className="link-btn"
                style={{ fontSize: '0.86rem', color: '#6b7280', padding: '4px' }}
                onClick={async () => {
                  const savedMa = regSuccess.ma_dang_nhap
                  const savedPin = regSuccess.pin
                  await logout()
                  setMa(savedMa)
                  setPin(savedPin)
                  setTab('login')
                  setRegSuccess(null)
                }}
              >
                Hoặc quay lại trang đăng nhập →
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  )
}
