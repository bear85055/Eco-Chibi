import { useEffect, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { batDauGame, nopKetQuaGame, MAX_REWARD_PER_ROUND } from '../services/gameService'
import { getLevel } from '../utils/levels'
import { sfx } from '../utils/sfx'
import ChibiAvatar from '../components/ChibiAvatar'
import Confetti from '../components/Confetti'
import './TrashSorting.css'
import './SaveEnergy.css'

const GAME_SECONDS = 40
const KID_FROM_MS = 8_000 // sau 8 giây bắt đầu có phòng "đang có bạn dùng"
const MAX_ACTIVE = 4

const DEVICES = {
  light: { icon: '💡', ten: 'Đèn' },
  fan: { icon: '🌀', ten: 'Quạt' },
  tap: { icon: '🚰', ten: 'Vòi nước' },
  tv: { icon: '📺', ten: 'Tivi' },
  pc: { icon: '💻', ten: 'Máy tính' },
}

const ROOMS = [
  { ten: 'Lớp 3A', devices: ['light', 'fan'] },
  { ten: 'Thư viện', devices: ['light', 'pc'] },
  { ten: 'Vệ sinh', devices: ['tap', 'light'] },
  { ten: 'Phòng máy', devices: ['pc', 'light'] },
  { ten: 'Lớp 4B', devices: ['fan', 'light'] },
  { ten: 'Căng tin', devices: ['tap', 'fan'] },
  { ten: 'Phòng nhạc', devices: ['tv', 'light'] },
  { ten: 'Hội đồng', devices: ['tv', 'fan'] },
  { ten: 'Y tế', devices: ['tap', 'light'] },
]

const KIDS = ['🧒', '👧', '👦', '🧑‍🏫']
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const newGameState = () => ({
  cells: ROOMS.map(() => ({ mode: 'idle', device: null, since: 0, ttl: 0, kid: null, fx: null })),
  score: 0,
  wrong: 0,
  missed: 0,
  streak: 0,
  elapsed: 0,
  spawnAcc: 600,
  floaters: [],
  particles: [],
  banner: null,
})

function spawn(st, now, ramp) {
  const idle = st.cells.map((c, i) => (c.mode === 'idle' && (!c.fx || now - c.fx.at > 450) ? i : -1)).filter((i) => i >= 0)
  if (!idle.length) return
  const i = pick(idle)
  const c = st.cells[i]
  c.device = pick(ROOMS[i].devices)
  c.since = now
  if (st.elapsed > KID_FROM_MS && Math.random() < 0.3) {
    c.mode = 'inuse'
    c.kid = pick(KIDS)
    c.ttl = 2600 + Math.random() * 1200
  } else {
    c.mode = 'waste'
    c.kid = null
    c.ttl = 3400 - 1300 * ramp
  }
}

export default function SaveEnergy() {
  const navigate = useNavigate()
  const { user, setUser } = usePlayer()
  const [phase, setPhase] = useState('intro') // intro | playing | submitting | result
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS)
  const [result, setResult] = useState(null)
  const [startError, setStartError] = useState('')
  const [, force] = useReducer((x) => x + 1, 0)

  const gameRef = useRef(newGameState())
  const sessionRef = useRef(null)

  const start = async () => {
    setStartError('')
    try {
      const s = await batDauGame('save_energy')
      sessionRef.current = s.id
      gameRef.current = newGameState()
      setResult(null)
      setTimeLeft(GAME_SECONDS)
      setPhase('playing')
    } catch (e) {
      setStartError(e.message)
    }
  }

  const finish = async () => {
    setPhase('submitting')
    const st = gameRef.current
    const stats = { score: st.score, wrong: st.wrong, missed: st.missed }
    try {
      const res = await nopKetQuaGame(sessionRef.current, st.score)
      setUser(res.user)
      setResult({ ...res, ...stats })
      if (res.earned > 0) sfx.win()
    } catch (e) {
      setResult({ error: e.message, earned: 0, ...stats })
    }
    setPhase('result')
  }

  // Đồng hồ đếm ngược
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'playing' && timeLeft <= 0) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase])

  // Vòng lặp game: bật thiết bị ngẫu nhiên, hết giờ thì tính là lãng phí
  useEffect(() => {
    if (phase !== 'playing') return
    let raf
    let last = performance.now()
    const loop = (now) => {
      const dt = Math.min(64, now - last)
      last = now
      const st = gameRef.current
      st.elapsed += dt
      const ramp = Math.min(1, st.elapsed / (GAME_SECONDS * 1000))
      st.spawnAcc += dt
      const active = st.cells.filter((c) => c.mode !== 'idle').length
      if (st.spawnAcc >= 1150 - 500 * ramp && active < MAX_ACTIVE + Math.round(ramp)) {
        st.spawnAcc = 0
        spawn(st, now, ramp)
      }
      st.cells.forEach((c) => {
        if (c.mode === 'idle' || now - c.since < c.ttl) return
        if (c.mode === 'inuse') {
          // Bạn nhỏ đi ra ngoài nhưng quên tắt → thành lãng phí
          c.mode = 'waste'
          c.kid = null
          c.since = now
          c.ttl = 3000 - 1000 * ramp
          c.fx = { type: 'left', at: now }
        } else {
          c.mode = 'idle'
          c.fx = { type: 'lost', at: now }
          st.missed++
          st.streak = 0
        }
      })
      st.floaters = st.floaters.filter((f) => now - f.at < 900)
      st.particles = st.particles.filter((p) => now - p.at < p.ttl)
      force()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const onTap = (i) => {
    const st = gameRef.current
    const c = st.cells[i]
    const now = performance.now()
    if (c.mode === 'waste') {
      const devType = c.device || 'light'
      st.score++
      st.streak++
      c.mode = 'idle'
      c.fx = { type: 'off', at: now }

      const icons =
        devType === 'tap'
          ? ['💧', '💦', '🫧', '✨']
          : devType === 'fan'
            ? ['🌀', '🍃', '💨', '✨']
            : ['⚡', '💡', '✨', '⭐']

      for (let p = 0; p < 6; p++) {
        const angle = (Math.PI * 2 * p) / 6 + (Math.random() - 0.5) * 0.4
        const dist = 32 + Math.random() * 32
        st.particles.push({
          id: now + Math.random(),
          cell: i,
          vx: Math.cos(angle) * dist,
          vy: Math.sin(angle) * dist - 15,
          icon: icons[p % icons.length],
          at: now,
          ttl: 600,
        })
      }

      st.floaters.push({ id: now + Math.random(), cell: i, text: st.streak >= 3 ? `+1 🔥${st.streak}` : 'Tắt rồi! +1', ok: true, at: now })
      sfx.correct()
    } else if (c.mode === 'inuse') {
      st.wrong++
      st.streak = 0
      c.fx = { type: 'oops', at: now }
      const icons = ['⚠️', '❌', '🚫']
      for (let p = 0; p < 4; p++) {
        st.particles.push({
          id: now + Math.random(),
          cell: i,
          vx: (Math.random() - 0.5) * 45,
          vy: -20 - Math.random() * 25,
          icon: icons[p % icons.length],
          at: now,
          ttl: 500,
        })
      }
      st.floaters.push({ id: now + Math.random(), cell: i, text: 'Ơ kìa!', ok: false, at: now })
      st.banner = { text: `${c.kid} Bạn đang dùng ${DEVICES[c.device].ten.toLowerCase()} mà! Chỉ tắt khi phòng không có ai nhé.`, at: now }
      sfx.wrong()
    }
  }

  const exit = () => {
    if (phase === 'playing' && !window.confirm('Thoát bây giờ thì ván này sẽ không được tính điểm. Em chắc chứ?')) return
    navigate('/')
  }

  // ---------- Màn giới thiệu ----------
  if (phase === 'intro') {
    return (
      <main className="ts-screen ts-intro se-intro">
        <button className="ts-close" onClick={exit} aria-label="Về khu vườn" id="game-exit">✕</button>
        <h1 className="ts-title">Biệt Đội <span className="se-accent">Tiết Kiệm</span></h1>
        <p className="ts-sub">Chạm thật nhanh để tắt đèn, quạt, vòi nước đang bị bỏ quên!</p>

        <ul className="se-howto">
          <li className="se-howto__card is-good">
            <div className="se-howto__demo se-room is-waste is-demo">
              <span className="se-device se-device--light">💡</span>
            </div>
            <b>Phòng trống</b>
            <small>Thiết bị bật mà không ai dùng → <em>Chạm để tắt!</em></small>
          </li>
          <li className="se-howto__card is-bad">
            <div className="se-howto__demo se-room is-inuse is-demo">
              <span className="se-device se-device--fan">🌀</span>
              <span className="se-kid">👧</span>
            </div>
            <b>Có bạn đang dùng</b>
            <small>Để yên nhé, đừng tắt nhầm!</small>
          </li>
        </ul>

        <div className="ts-rules">
          <span>⏱ {GAME_SECONDS} giây</span>
          <span>⭐ Tối đa {MAX_REWARD_PER_ROUND} điểm/ván</span>
          <span>☀️ Hôm nay còn {user.con_lai_hom_nay} điểm</span>
        </div>
        {user.con_lai_hom_nay === 0 && (
          <p className="ts-warn">Hôm nay em đã đủ điểm rồi. Vẫn chơi được nhưng sẽ không cộng thêm điểm nhé!</p>
        )}
        {startError && <p className="ts-warn">{startError}</p>}
        <button className="btn btn--primary btn--lg ts-start" onClick={start} id="start-game">
          ▶ Bắt đầu chơi
        </button>
      </main>
    )
  }

  // ---------- Màn kết quả ----------
  if (phase === 'submitting' || phase === 'result') {
    const r = result
    const newXp = user.tong_diem_tich_luy
    return (
      <main className="ts-screen ts-result">
        {r && r.earned > 0 && <Confetti count={60} />}
        {phase === 'submitting' || !r ? (
          <div className="screen-center">
            <div className="spinner" />
            <p>Chibi đang đếm số điện tiết kiệm được…</p>
          </div>
        ) : (
          <>
            <div className="ts-result__stars" aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <span key={i} className={r.score >= i * 5 - 2 ? 'is-on' : ''} style={{ '--i': i }}>★</span>
              ))}
            </div>
            <h1 className="ts-title">
              {r.score >= 13 ? 'Siêu tiết kiệm!' : r.score >= 7 ? 'Giỏi lắm!' : 'Cố lên nào!'}
            </h1>

            {r.levelUp ? (
              <div className="levelup">
                <p className="levelup__label">✨ Chibi đã tiến hóa! ✨</p>
                <ChibiAvatar xp={newXp} size={170} celebrate />
                <p className="levelup__name">{getLevel(newXp).ten}</p>
              </div>
            ) : (
              <ChibiAvatar xp={newXp} size={140} />
            )}

            <dl className="ts-stats">
              <div><dt>Đã tắt</dt><dd className="ok">{r.score}</dd></div>
              <div><dt>Tắt nhầm</dt><dd className="bad">{r.wrong}</dd></div>
              <div><dt>Lãng phí</dt><dd>{r.missed}</dd></div>
            </dl>

            {r.error ? (
              <p className="ts-warn">{r.error}</p>
            ) : (
              <div className="ts-reward">
                <span className="ts-reward__chip">⭐ +{r.earned} XP</span>
                <span className="ts-reward__chip ts-reward__chip--coin">🍃 +{r.earned} Xu</span>
              </div>
            )}
            {r.roundCapped && !r.dailyCapped && <p className="ts-hint">Mỗi ván được tối đa {MAX_REWARD_PER_ROUND} điểm thôi nha.</p>}
            {r.dailyCapped && <p className="ts-hint">Hôm nay em đã đạt giới hạn điểm, mai chơi tiếp nhé! 🌙</p>}
            <p className="se-fact">💡 Tắt 1 bóng đèn không dùng trong 1 giờ giúp tiết kiệm điện đủ sạc điện thoại vài lần đó!</p>

            <div className="ts-actions">
              <button className="btn btn--ghost" onClick={() => navigate('/')} id="back-home">🏡 Về khu vườn</button>
              <button className="btn btn--primary" onClick={start} id="play-again">↻ Chơi lại</button>
            </div>
          </>
        )}
      </main>
    )
  }

  // ---------- Đang chơi ----------
  const st = gameRef.current
  const now = performance.now()
  const banner = st.banner && now - st.banner.at < 3000 ? st.banner : null

  return (
    <main className="ts-screen ts-play">
      <div className="se-arena">
        <div className="ts-hud">
          <button className="ts-close ts-close--inline" onClick={exit} aria-label="Thoát" id="game-exit-playing">✕</button>
          <div className={`ts-timer ${timeLeft <= 10 ? 'is-low' : ''}`} id="game-timer">
            <span>⏱</span> {Math.max(0, timeLeft)}s
            <div className="ts-timer__bar" style={{ width: `${(Math.max(0, timeLeft) / GAME_SECONDS) * 100}%` }} />
          </div>
          <div className="ts-score" id="game-score">⚡ {st.score}</div>
        </div>

        {banner && <div key={banner.at} className="ts-banner ts-banner--wrong">{banner.text}</div>}

        <div className="se-school">
          <div className="se-roof" aria-hidden="true"><span>🏫 Trường Xanh</span></div>
          <div className="se-grid">
            {st.cells.map((c, i) => {
              const fx = c.fx && now - c.fx.at < 600 ? c.fx.type : null
              const left = c.mode !== 'idle' ? Math.max(0, 1 - (now - c.since) / c.ttl) : 0
              const dev = c.device ? DEVICES[c.device] : DEVICES[ROOMS[i].devices[0]]
              return (
                <button
                  key={`${i}-${c.fx?.at || 0}`}
                  type="button"
                  id={`room-${i}`}
                  className={`se-room is-${c.mode} ${fx ? `fx-${fx}` : ''} ${c.mode === 'waste' && left < 0.35 ? 'is-urgent' : ''}`}
                  style={{ '--left': left }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    onTap(i)
                  }}
                  aria-label={`${ROOMS[i].ten}: ${c.mode === 'waste' ? `${dev.ten} đang bật, không có ai` : c.mode === 'inuse' ? 'có bạn đang dùng' : 'đã tắt'}`}
                >
                  {c.mode === 'waste' && <span className="se-ring" aria-hidden="true" />}
                  {fx === 'off' && <span className="se-ripple" aria-hidden="true" />}
                  <span className={`se-device se-device--${c.device || 'off'}`}>{dev.icon}</span>
                  {c.mode === 'inuse' && <span className="se-kid">{c.kid}</span>}
                  {c.mode === 'waste' && <span className="se-alert" aria-hidden="true">!</span>}
                  {fx === 'lost' && <span className="se-puff" aria-hidden="true">💸</span>}
                  {fx === 'left' && <span className="se-puff" aria-hidden="true">🚪</span>}
                  <span className="se-room__name">{ROOMS[i].ten}</span>
                  {st.floaters
                    .filter((f) => f.cell === i)
                    .map((f) => (
                      <span key={f.id} className={`ts-floater se-floater ${f.ok ? 'is-ok' : 'is-bad'}`}>{f.text}</span>
                    ))}
                  {st.particles
                    .filter((p) => p.cell === i)
                    .map((p) => {
                      const prog = Math.min(1, (now - p.at) / p.ttl)
                      const curX = p.vx * prog
                      const curY = p.vy * prog + 15 * prog * prog
                      const scale = 1 - 0.25 * prog
                      const opacity = 1 - prog
                      return (
                        <span
                          key={p.id}
                          className="se-particle"
                          style={{
                            left: '50%',
                            top: '50%',
                            transform: `translate(calc(-50% + ${curX}px), calc(-50% + ${curY}px)) scale(${scale})`,
                            opacity,
                            fontSize: '1.25rem',
                          }}
                        >
                          {p.icon}
                        </span>
                      )
                    })}
                </button>
              )
            })}
          </div>
        </div>

        <div className="se-legend">
          <span>💡 Phòng trống → <b>Chạm tắt</b></span>
          <span>🧒 Có bạn → <b>Để yên</b></span>
        </div>
      </div>
    </main>
  )
}
