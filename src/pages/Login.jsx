import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { dangKyHocSinh } from '../services/authService'
import Modal from '../components/Modal'
import Confetti from '../components/Confetti'
import { sfx } from '../utils/sfx'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']

export default function Login() {
  const { user, login, setUser } = usePlayer()
  const navigate = useNavigate()
  const location = useLocation()
  const fromPath = location.state?.from?.pathname

  const [tab, setTab] = useState('student') // student | teacher | register
  const [ma, setMa] = useState('')
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)
  const [showPwd, setShowPwd] = useState(false)

  // Form đăng ký nhanh
  const [regName, setRegName] = useState('')
  const [regLop, setRegLop] = useState('')
  const [regPin, setRegPin] = useState('1234')
  const [regSuccess, setRegSuccess] = useState(null)
  const [copied, setCopied] = useState(false)

  const fail = (msg) => {
    setErr(msg)
    setPin('')
    setShake((s) => s + 1)
    sfx.wrong()
  }

  const submit = async (p) => {
    if (!ma.trim()) return fail(tab === 'teacher' ? 'Vui lòng nhập tài khoản Admin nhé!' : 'Em nhập Mã học sinh trước nhé!')
    if (tab === 'student' && p.length !== 4) return fail('Mã PIN gồm đúng 4 chữ số nha!')
    if (tab === 'teacher' && !p.trim()) return fail('Vui lòng nhập mật khẩu Admin nhé!')
    setBusy(true)
    try {
      const u = await login(ma, p)
      if (u.vai_tro === 'teacher' || u.vai_tro === 'admin') {
        const dest = fromPath?.startsWith('/giao-vien') ? fromPath : '/giao-vien'
        navigate(dest, { replace: true })
      } else {
        const dest = fromPath && !fromPath.startsWith('/giao-vien') && fromPath !== '/dang-nhap' ? fromPath : '/'
        navigate(dest, { replace: true })
      }
    } catch (e) {
      fail(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regName.trim()) return fail('Vui lòng nhập họ và tên của em nhé!')
    if (!regLop.trim()) return fail('Vui lòng nhập lớp học của em (VD: 3A, 4C...) nhé!')
    if (regPin.length !== 4) return fail('Mã PIN gồm đúng 4 chữ số nha!')
    setBusy(true)
    setErr('')
    try {
      const u = await dangKyHocSinh({
        ho_ten: regName.trim(),
        lop: regLop.trim().toUpperCase().replace(/\s/g, ''),
        pin: regPin,
      })
      sfx.win()
      setRegSuccess({ ...u, pin: regPin })
    } catch (e) {
      fail(e.message)
    } finally {
      setBusy(false)
    }
  }

  const press = (k) => {
    if (busy) return
    setErr('')
    if (k === 'del') return setPin((p) => p.slice(0, -1))
    if (k === 'ok') return submit(pin)
    if (pin.length >= 4) return
    sfx.tap()
    const np = pin + k
    setPin(np)
    if (np.length === 4) submit(np)
  }

  const pressRef = useRef(press)
  useEffect(() => {
    pressRef.current = press
  })

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || tab === 'register' || tab === 'teacher') return
      if (/^\d$/.test(e.key)) pressRef.current(e.key)
      else if (e.key === 'Backspace') pressRef.current('del')
      else if (e.key === 'Enter') pressRef.current('ok')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab])

  if (user && !regSuccess) {
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

        {/* Tab chuyển đổi vai trò */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '4px',
            background: 'hsl(140 40% 94%)',
            padding: '4px',
            borderRadius: '16px',
            marginBottom: '16px',
          }}
        >
          <button
            type="button"
            className={`btn btn--sm ${tab === 'student' ? 'btn--primary' : 'btn--ghost'}`}
            style={{ padding: '6px 8px', fontSize: '0.82rem', boxShadow: 'none' }}
            onClick={() => {
              setTab('student')
              setMa('')
              setPin('')
              setErr('')
            }}
          >
            🎒 Học sinh
          </button>
          <button
            type="button"
            id="tab-teacher"
            className={`btn btn--sm ${tab === 'teacher' ? 'btn--primary' : 'btn--ghost'}`}
            style={{ padding: '6px 8px', fontSize: '0.82rem', boxShadow: 'none' }}
            onClick={() => {
              setTab('teacher')
              setMa('ADMIN')
              setPin('')
              setErr('')
            }}
          >
            🛡️ Admin
          </button>
          <button
            type="button"
            id="tab-register"
            className={`btn btn--sm ${tab === 'register' ? 'btn--primary' : 'btn--ghost'}`}
            style={{ padding: '6px 8px', fontSize: '0.82rem', boxShadow: 'none' }}
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
              <span className="field__label">Họ và tên của em:</span>
              <input
                id="reg-name"
                className="field__input"
                style={{ textAlign: 'left', fontSize: '1.05rem', padding: '10px 14px' }}
                placeholder="VD: Nguyễn Tuấn Khang"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label className="field">
                <span className="field__label">Lớp học của em:</span>
                <input
                  id="reg-class"
                  className="field__input"
                  style={{
                    fontSize: '1.05rem',
                    padding: '10px',
                    textAlign: 'center',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                  }}
                  placeholder="VD: 3A, 4C..."
                  value={regLop}
                  onChange={(e) => setRegLop(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  maxLength={6}
                  required
                />
              </label>

              <label className="field">
                <span className="field__label">Tạo mã PIN 4 số:</span>
                <input
                  id="reg-pin"
                  type="password"
                  maxLength={4}
                  className="field__input"
                  style={{ textAlign: 'center', fontSize: '1.2rem', padding: '10px' }}
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </label>
            </div>

            <p className="login__error" role="alert">
              {err}
            </p>

            <button id="btn-submit-register" type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? 'Đang tạo...' : 'Tạo tài khoản & Nhận 50 Xu 🍃'}
            </button>
          </form>
        ) : tab === 'teacher' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(pin)
            }}
            style={{ textAlign: 'left' }}
          >
            <label className="field" htmlFor="login-teacher-id">
              <span className="field__label">Tài khoản Admin:</span>
              <input
                id="login-teacher-id"
                className="field__input"
                style={{ textAlign: 'left', fontSize: '1.05rem', padding: '10px 14px' }}
                value={ma}
                onChange={(e) => {
                  setMa(e.target.value.toUpperCase().replace(/\s/g, ''))
                  setErr('')
                }}
                placeholder="ADMIN"
                autoComplete="username"
                maxLength={24}
                required
              />
            </label>

            <label className="field" htmlFor="login-teacher-pwd">
              <span className="field__label">Mật khẩu bảo mật:</span>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-teacher-pwd"
                  type={showPwd ? 'text' : 'password'}
                  className="field__input"
                  style={{ textAlign: 'left', fontSize: '1.05rem', padding: '10px 44px 10px 14px' }}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value)
                    setErr('')
                  }}
                  placeholder="Nhập mật khẩu..."
                  autoComplete="current-password"
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
              id="btn-login-teacher"
              type="submit"
              className="btn btn--primary btn--block"
              style={{ marginTop: '8px', padding: '12px', fontSize: '1.05rem' }}
              disabled={busy}
            >
              {busy ? 'Đang xác thực...' : 'Đăng nhập Cổng Quản trị ➜'}
            </button>
          </form>
        ) : (
          <>
            <label className="field" htmlFor="login-id-input">
              <span className="field__label">Mã học sinh</span>
              <input
                id="login-id-input"
                className="field__input"
                value={ma}
                onChange={(e) => {
                  setMa(e.target.value.toUpperCase().replace(/\s/g, ''))
                  setErr('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                placeholder="VD: HS3A01"
                autoComplete="username"
                maxLength={12}
              />
            </label>

            <div className="field__label">Mã PIN (4 chữ số)</div>
            <div className="pin-dots" key={shake} data-shake={shake > 0} aria-label={`Đã nhập ${pin.length} trên 4 số`}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`pin-dot ${i < pin.length ? 'is-filled' : ''}`} />
              ))}
            </div>

            <p className="login__error" role="alert">
              {err}
            </p>

            <div className="keypad">
              {KEYS.map((k) => (
                <button
                  key={k}
                  id={`key-${k}`}
                  className={`keypad__key ${k === 'ok' ? 'keypad__key--ok' : ''} ${k === 'del' ? 'keypad__key--del' : ''}`}
                  onClick={() => press(k)}
                  disabled={busy}
                  aria-label={k === 'del' ? 'Xóa' : k === 'ok' ? 'Vào chơi' : k}
                >
                  {k === 'del' ? '⌫' : k === 'ok' ? (busy ? '…' : '➜') : k}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Modal hiển thị Mã học sinh khi đăng ký thành công */}
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
                    MÃ ĐĂNG NHẬP CỦA EM
                  </span>
                  <div
                    id="new-student-id"
                    style={{ fontSize: '1.9rem', fontWeight: '900', color: '#065f46', letterSpacing: '1.5px', marginTop: '2px' }}
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
                  {copied ? '✓ Đã chép' : '📋 Chép mã'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.92rem' }}>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Mã PIN: </span>
                  <b style={{ color: '#111827' }}>{regSuccess.pin}</b>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Lớp: </span>
                  <b style={{ color: '#111827' }}>{regSuccess.lop}</b>
                </div>
                <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
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
                Em hãy <b>chụp lại màn hình</b> hoặc <b>ghi Mã học sinh ({regSuccess.ma_dang_nhap})</b> vào vở để đăng nhập những lần sau nhé!
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
                onClick={() => {
                  setMa(regSuccess.ma_dang_nhap)
                  setTab('student')
                  setRegSuccess(null)
                  setPin('')
                }}
              >
                Hoặc tự đăng nhập bằng mã này →
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  )
}
