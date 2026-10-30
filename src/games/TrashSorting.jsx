import { useEffect, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { batDauGame, nopKetQuaGame, MAX_REWARD_PER_ROUND } from '../services/gameService'
import { BINS, TRASH_ITEMS } from './trashData'
import { getLevel } from '../utils/levels'
import { sfx } from '../utils/sfx'
import ChibiAvatar from '../components/ChibiAvatar'
import Confetti from '../components/Confetti'
import './TrashSorting.css'

const GAME_SECONDS = 45
const ITEM_SIZE = 72
const ADVANCED_AT = 6
const MAX_ON_SCREEN = 3

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const newGameState = () => ({
  items: [],
  nextId: 1,
  score: 0,
  wrong: 0,
  missed: 0,
  streak: 0,
  advanced: false,
  elapsed: 0,
  spawnAcc: 1200,
  hoverBin: null,
  reactions: {},
  floaters: [],
  particles: [],
  rings: [],
  banner: null,
})

function spawn(st, width, ramp) {
  const hazards = TRASH_ITEMS.filter((t) => t.loai === 'hazard')
  const normal = TRASH_ITEMS.filter((t) => t.loai !== 'hazard')
  const data = st.advanced && Math.random() < 0.3 ? pick(hazards) : pick(normal)
  const margin = ITEM_SIZE / 2 + 8
  st.items.push({
    id: st.nextId++,
    data,
    x: margin + Math.random() * Math.max(1, width - 2 * margin),
    y: -ITEM_SIZE / 2,
    speed: 46 + 42 * ramp + Math.random() * 14,
    rot: (Math.random() - 0.5) * 30,
    spin: (Math.random() - 0.5) * 40,
    dragging: false,
    leaving: null,
  })
}

export default function TrashSorting() {
  const navigate = useNavigate()
  const { user, setUser } = usePlayer()
  const [phase, setPhase] = useState('intro') // intro | playing | submitting | result
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS)
  const [result, setResult] = useState(null)
  const [startError, setStartError] = useState('')
  const [, force] = useReducer((x) => x + 1, 0)

  const arenaRef = useRef(null)
  const binsRowRef = useRef(null)
  const binRefs = useRef({})
  const gameRef = useRef(newGameState())
  const sessionRef = useRef(null)
  const xpBeforeRef = useRef(user.tong_diem_tich_luy)

  const start = async () => {
    setStartError('')
    try {
      const s = await batDauGame('trash_sorting')
      sessionRef.current = s.id
      xpBeforeRef.current = user.tong_diem_tich_luy
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

  // Vòng lặp game: rác rơi, sinh rác mới, dọn hiệu ứng
  useEffect(() => {
    if (phase !== 'playing') return
    let raf
    let last = performance.now()
    const loop = (now) => {
      const dt = Math.min(64, now - last)
      last = now
      const st = gameRef.current
      const arena = arenaRef.current
      const row = binsRowRef.current
      if (arena && row) {
        const floorY = row.offsetTop
        st.elapsed += dt
        const ramp = Math.min(1, st.elapsed / (GAME_SECONDS * 1000))
        st.spawnAcc += dt
        const active = st.items.filter((i) => !i.leaving).length
        if (st.spawnAcc >= 1500 - 600 * ramp && active < MAX_ON_SCREEN) {
          st.spawnAcc = 0
          spawn(st, arena.clientWidth, ramp)
        }
        for (const it of st.items) {
          if (it.dragging || it.leaving) continue
          it.y += (it.speed * dt) / 1000
          it.rot += (it.spin * dt) / 1000
          if (it.y > floorY) {
            it.leaving = 'miss'
            it.leaveAt = now
            st.missed++
            st.streak = 0
          }
        }
        st.items = st.items.filter((it) => !it.leaving || now - it.leaveAt < 420)
        st.floaters = st.floaters.filter((f) => now - f.at < 900)
        st.particles = st.particles.filter((p) => now - p.at < p.ttl)
        st.rings = st.rings.filter((r) => now - r.at < 600)
      }
      force()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  // ---------- Kéo thả (Pointer Events: dùng được cả chuột lẫn cảm ứng) ----------
  const arenaPoint = (e) => {
    const r = arenaRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const binAt = (cx, cy) => {
    const st = gameRef.current
    for (const b of BINS) {
      if (b.advanced && !st.advanced) continue
      const el = binRefs.current[b.id]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (cx >= r.left - 10 && cx <= r.right + 10 && cy >= r.top - 36 && cy <= r.bottom + 10) return b.id
    }
    return null
  }

  const onDown = (e, it) => {
    if (it.leaving) return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const p = arenaPoint(e)
    it.dragging = true
    it.offX = p.x - it.x
    it.offY = p.y - it.y
    sfx.tap()
  }

  const onMove = (e, it) => {
    if (!it.dragging) return
    const p = arenaPoint(e)
    it.x = p.x - it.offX
    it.y = p.y - it.offY
    gameRef.current.hoverBin = binAt(e.clientX, e.clientY)
  }

  const onUp = (e, it) => {
    if (!it.dragging) return
    it.dragging = false
    const st = gameRef.current
    st.hoverBin = null
    const bin = binAt(e.clientX, e.clientY)
    if (bin) drop(it, bin)
  }

  const drop = (it, binId) => {
    const st = gameRef.current
    const now = performance.now()
    const arenaR = arenaRef.current.getBoundingClientRect()
    const r = binRefs.current[binId].getBoundingClientRect()
    const bx = r.left + r.width / 2 - arenaR.left
    const by = r.top - arenaR.top

    if (it.data.loai === binId) {
      st.score++
      st.streak++
      it.leaving = 'eaten'
      it.leaveAt = now
      it.x = bx
      it.y = by + 24
      st.reactions[binId] = { type: 'happy', at: now }
      st.rings.push({ id: now + Math.random(), x: bx, y: by, type: 'happy', at: now })
      const burstIcons = ['✨', '⭐', '🍃', '🌟', '🌱']
      for (let p = 0; p < 8; p++) {
        const angle = (Math.PI * 2 * p) / 8 + (Math.random() - 0.5) * 0.4
        const dist = 36 + Math.random() * 40
        st.particles.push({
          id: now + Math.random(),
          x: bx,
          y: by,
          vx: Math.cos(angle) * dist,
          vy: Math.sin(angle) * dist - 30,
          icon: burstIcons[p % burstIcons.length],
          at: now,
          ttl: 650,
        })
      }
      st.floaters.push({ id: now + Math.random(), x: bx, y: by - 8, text: st.streak >= 3 ? `+1 🔥${st.streak}` : 'Nham nham! +1', ok: true, at: now })
      sfx.correct()
      if (!st.advanced && st.score >= ADVANCED_AT) {
        st.advanced = true
        st.banner = { text: '🌟 Màn nâng cao! Hộp Rác nguy hại xuất hiện', type: 'info', at: now }
      }
    } else {
      st.wrong++
      st.streak = 0
      it.leaving = 'rejected'
      it.leaveAt = now
      st.reactions[binId] = { type: 'sad', at: now }
      st.rings.push({ id: now + Math.random(), x: bx, y: by, type: 'sad', at: now })
      const wrongIcons = ['💨', '❌', '💨']
      for (let p = 0; p < 5; p++) {
        st.particles.push({
          id: now + Math.random(),
          x: bx + (Math.random() - 0.5) * 20,
          y: by,
          vx: (Math.random() - 0.5) * 60,
          vy: -20 - Math.random() * 30,
          icon: wrongIcons[p % wrongIcons.length],
          at: now,
          ttl: 550,
        })
      }
      const right = BINS.find((b) => b.id === it.data.loai)
      st.banner = { text: `${it.data.icon} ${it.data.ten} → thùng ${right.ten}. ${it.data.goiY}`, type: 'wrong', at: now }
      st.floaters.push({ id: now + Math.random(), x: bx, y: by - 8, text: 'Oẹ oẹ!', ok: false, at: now })
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
      <main className="ts-screen ts-intro">
        <button className="ts-close" onClick={exit} aria-label="Về khu vườn" id="game-exit">✕</button>
        <h1 className="ts-title">Thùng Rác <span>Thông Thái</span></h1>
        <p className="ts-sub">Kéo rác đang rơi vào đúng thùng trước khi chạm đất!</p>
        <ul className="ts-howto">
          {BINS.filter((b) => !b.advanced).map((b) => (
            <li key={b.id} className={`ts-howto__bin ts-howto__bin--${b.id}`}>
              <span className="ts-howto__icon">{b.icon}</span>
              <b>{b.ten}</b>
              <small>{b.mo_ta}</small>
            </li>
          ))}
        </ul>
        <p className="ts-note">
          🌟 Phân loại đúng {ADVANCED_AT} món sẽ mở <b>Hộp Rác nguy hại</b> (pin, bóng đèn…)
        </p>
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
            <p>Chibi đang đếm điểm…</p>
          </div>
        ) : (
          <>
            <div className="ts-result__stars" aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <span key={i} className={r.score >= i * 4 - 2 ? 'is-on' : ''} style={{ '--i': i }}>★</span>
              ))}
            </div>
            <h1 className="ts-title">
              {r.score >= 10 ? 'Xuất sắc!' : r.score >= 5 ? 'Giỏi lắm!' : 'Cố lên nào!'}
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
              <div><dt>Đúng</dt><dd className="ok">{r.score}</dd></div>
              <div><dt>Sai</dt><dd className="bad">{r.wrong}</dd></div>
              <div><dt>Rơi mất</dt><dd>{r.missed}</dd></div>
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
  const banner = st.banner && now - st.banner.at < (st.banner.type === 'wrong' ? 3400 : 2600) ? st.banner : null
  const visibleBins = BINS.filter((b) => !b.advanced || st.advanced)

  return (
    <main className="ts-screen ts-play">
      <div className="ts-arena" ref={arenaRef}>
        <div className="ts-hud">
          <button className="ts-close ts-close--inline" onClick={exit} aria-label="Thoát" id="game-exit-playing">✕</button>
          <div className={`ts-timer ${timeLeft <= 10 ? 'is-low' : ''}`} id="game-timer">
            <span>⏱</span> {Math.max(0, timeLeft)}s
            <div className="ts-timer__bar" style={{ width: `${(Math.max(0, timeLeft) / GAME_SECONDS) * 100}%` }} />
          </div>
          <div className="ts-score" id="game-score">⭐ {st.score}</div>
        </div>

        {banner && <div key={banner.at} className={`ts-banner ts-banner--${banner.type}`}>{banner.text}</div>}

        {st.items.map((it) => (
          <div
            key={it.id}
            className={`ts-item ${it.dragging ? 'is-dragging' : ''} ${it.leaving ? `is-${it.leaving}` : ''}`}
            style={{
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              transform: `translate(${it.x - ITEM_SIZE / 2}px, ${it.y - ITEM_SIZE / 2}px)`,
            }}
            onPointerDown={(e) => onDown(e, it)}
            onPointerMove={(e) => onMove(e, it)}
            onPointerUp={(e) => onUp(e, it)}
            onPointerCancel={() => {
              it.dragging = false
              st.hoverBin = null
            }}
          >
            <div className="ts-item__inner" style={{ '--rot': `${it.dragging ? 0 : it.rot}deg` }}>
              <span className="ts-item__icon">{it.data.icon}</span>
              <span className="ts-item__label">{it.data.ten}</span>
            </div>
          </div>
        ))}

        {st.floaters.map((f) => (
          <span key={f.id} className={`ts-floater ${f.ok ? 'is-ok' : 'is-bad'}`} style={{ left: `${f.x}px`, top: `${f.y}px` }}>
            {f.text}
          </span>
        ))}

        {st.rings.map((r) => (
          <div key={r.id} className={`vfx-ring vfx-ring--${r.type}`} style={{ left: `${r.x}px`, top: `${r.y}px` }} />
        ))}

        {st.particles.map((p) => {
          const progress = Math.min(1, (now - p.at) / p.ttl)
          const curX = p.x + p.vx * progress
          const curY = p.y + p.vy * progress + 28 * progress * progress
          const scale = 1 - 0.25 * progress
          const opacity = 1 - progress
          return (
            <span
              key={p.id}
              className="vfx-particle"
              style={{
                left: `${curX}px`,
                top: `${curY}px`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity,
                fontSize: '1.35rem',
              }}
            >
              {p.icon}
            </span>
          )
        })}

        <div className="ts-ground" aria-hidden="true" />

        <div className="ts-bins" ref={binsRowRef} style={{ '--cols': visibleBins.length }}>
          {visibleBins.map((b) => {
            const re = st.reactions[b.id]
            const reaction = re && now - re.at < 650 ? re.type : null
            return (
              <div
                key={`${b.id}-${re?.at || 0}`}
                ref={(el) => (binRefs.current[b.id] = el)}
                className={`bin bin--${b.id} ${st.hoverBin === b.id ? 'is-hover' : ''} ${reaction ? `is-${reaction}` : ''} ${b.advanced ? 'bin--new' : ''}`}
                id={`bin-${b.id}`}
              >
                <div className="bin__lid" />
                <div className="bin__body">
                  <div className="bin__face">
                    <span className="bin__eye" />
                    <span className="bin__eye" />
                    <span className="bin__mouth" />
                  </div>
                  <span className="bin__icon">{b.icon}</span>
                </div>
                <div className="bin__label">{b.ten}</div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
