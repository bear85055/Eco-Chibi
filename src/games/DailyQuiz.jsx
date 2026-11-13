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
import './DailyQuiz.css'

const GAME_SECONDS = 35
const PLAYER_Y_PCT = 76 // Vị trí Y cố định của nhân vật (%)
const LANE_CENTERS = [16.66, 50, 83.33] // % trong lòng đường (.gs-road)

const TRASH_TYPES = [
  { icon: '🍌', ten: 'Vỏ chuối' },
  { icon: '🥤', ten: 'Ly nhựa' },
  { icon: '🥫', ten: 'Vỏ lon' },
  { icon: '🛍️', ten: 'Túi nilon' },
  { icon: '📦', ten: 'Hộp sữa' },
  { icon: '📰', ten: 'Giấy vụn' },
  { icon: '🍎', ten: 'Lõi táo' },
  { icon: '🧴', ten: 'Chai nhựa' },
]

const TREE_ICONS = ['🌳', '🌲', '🌺', '🌻', '🏡', '🏪', '🚏']
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

function createInitialState() {
  return {
    lane: 1, // 0: Trái, 1: Giữa, 2: Phải
    holding: [], // Danh sách icon rác đang cầm trên tay
    score: 0, // Tổng số rác đã bỏ vào thùng rác
    pickedTotal: 0,
    slipped: 0,
    elapsed: 0,
    roadOffset: 0,
    spawnTimer: 400,
    binTimer: 2200,
    treeTimer: 0,
    nextId: 1,
    objects: [], // { id, kind: 'trash' | 'bin' | 'puddle', lane, y, icon, ten, hit }
    trees: [
      { id: -1, side: 'left', y: 18, icon: '🏡' },
      { id: -2, side: 'right', y: 38, icon: '🌳' },
      { id: -3, side: 'left', y: 62, icon: '🌲' },
      { id: -4, side: 'right', y: 82, icon: '🌺' },
    ],
    floaters: [],
    particles: [],
  }
}

export default function DailyQuiz() {
  const navigate = useNavigate()
  const { user, setUser } = usePlayer()

  const [phase, setPhase] = useState('intro') // intro | playing | submitting | result
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS)
  const [result, setResult] = useState(null)
  const [startError, setStartError] = useState('')
  const [, force] = useReducer((x) => x + 1, 0)

  const gameRef = useRef(createInitialState())
  const sessionRef = useRef(null)
  const touchStartXRef = useRef(null)

  const start = async () => {
    setStartError('')
    try {
      const s = await batDauGame('trash_sorting')
      sessionRef.current = s.id
      gameRef.current = createInitialState()
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
    // Nếu về tới cổng trường mà trên tay vẫn cầm rác, cho bỏ nốt vào thùng rác cổng trường!
    const finalScore = st.score + st.holding.length
    const stats = {
      score: finalScore,
      pickedTotal: st.pickedTotal,
      slipped: st.slipped,
    }
    try {
      const res = await nopKetQuaGame(sessionRef.current, finalScore)
      setUser(res.user)
      setResult({ ...res, ...stats })
      if (res.earned > 0) sfx.win()
    } catch (e) {
      setResult({ error: e.message, earned: 0, ...stats })
    }
    setPhase('result')
  }

  // Đếm ngược thời gian đi học
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'playing' && timeLeft <= 0) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase])

  // Điều khiển bằng bàn phím (← / → / A / D / Space)
  useEffect(() => {
    if (phase !== 'playing') return
    const onKeyDown = (e) => {
      const st = gameRef.current
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        if (st.lane > 0) {
          st.lane--
          sfx.tap()
          force()
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        if (st.lane < 2) {
          st.lane++
          sfx.tap()
          force()
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        dumpToNearbyBin()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const spawnBurst = (st, xPct, yPct, now, good = true) => {
    const icons = good ? ['✨', '⭐', '🍃', '🌟'] : ['💦', '💨']
    const count = good ? 7 : 4
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3
      const dist = 28 + Math.random() * 32
      st.particles.push({
        id: now + Math.random(),
        xPct,
        yPct,
        vx: Math.cos(angle) * dist,
        vy: Math.sin(angle) * dist - 20,
        icon: icons[i % icons.length],
        at: now,
        ttl: 550,
      })
    }
  }

  // Ném rác đang cầm vào thùng rác gần nhất trên đường
  const dumpToNearbyBin = (targetBin = null) => {
    const st = gameRef.current
    if (st.holding.length === 0) return false
    const now = performance.now()
    const bin =
      targetBin ||
      st.objects.find((o) => o.kind === 'bin' && !o.hit && o.y >= 15 && o.y <= 92)
    if (!bin) return false

    const count = st.holding.length
    st.holding = []
    st.score += count
    bin.hit = true
    const xPct = 14 + (LANE_CENTERS[bin.lane] * 0.72)
    spawnBurst(st, xPct, bin.y, now, true)
    st.floaters.push({
      id: now + Math.random(),
      xPct,
      yPct: bin.y - 6,
      text: count >= 2 ? `Bỏ thùng +${count} 🔥` : 'Bỏ thùng +1 🗑️',
      ok: true,
      at: now,
    })
    sfx.correct()
    force()
    return true
  }

  // Vòng lặp 60fps: cuộn đường, sinh rác & thùng rác, kiểm tra va chạm
  useEffect(() => {
    if (phase !== 'playing') return
    let raf
    let last = performance.now()

    const loop = (now) => {
      const dt = Math.min(64, now - last)
      last = now
      const st = gameRef.current
      st.elapsed += dt
      const progress = Math.min(1, st.elapsed / (GAME_SECONDS * 1000))
      const speedPctPerSec = 28 + 12 * progress // tốc độ cuộn (% chiều cao màn hình / giây)

      st.roadOffset = (st.roadOffset + (speedPctPerSec * dt) / 1000 * 5) % 76

      // Sinh cảnh vật cây cối 2 bên vỉa hè
      st.treeTimer += dt
      if (st.treeTimer >= 950) {
        st.treeTimer = 0
        st.trees.push({
          id: st.nextId++,
          side: Math.random() < 0.5 ? 'left' : 'right',
          y: -8,
          icon: pick(TREE_ICONS),
        })
      }
      for (const tr of st.trees) {
        tr.y += (speedPctPerSec * dt) / 1000
      }
      st.trees = st.trees.filter((tr) => tr.y < 108)

      // Sinh rác hoặc vũng nước trên 3 làn đường
      st.spawnTimer += dt
      if (st.spawnTimer >= 1150 - 250 * progress && timeLeft > 2) {
        st.spawnTimer = 0
        const lane = Math.floor(Math.random() * 3)
        const busyLane = st.objects.some((o) => o.lane === lane && o.y < 18)
        if (!busyLane) {
          if (Math.random() < 0.22 && st.elapsed > 4000) {
            st.objects.push({
              id: st.nextId++,
              kind: 'puddle',
              lane,
              y: -8,
              icon: '💦',
              ten: 'Vũng nước',
              hit: false,
            })
          } else {
            const item = pick(TRASH_TYPES)
            st.objects.push({
              id: st.nextId++,
              kind: 'trash',
              lane,
              y: -8,
              icon: item.icon,
              ten: item.ten,
              hit: false,
            })
          }
        }
      }

      // Sinh Thùng Rác Xanh bên đường định kỳ để học sinh ghé bỏ rác vào
      st.binTimer += dt
      if (st.binTimer >= 3100) {
        st.binTimer = 0
        const candidateLanes = [0, 1, 2].filter(
          (l) => !st.objects.some((o) => o.lane === l && o.y < 22),
        )
        if (candidateLanes.length > 0) {
          const lane = pick(candidateLanes)
          st.objects.push({
            id: st.nextId++,
            kind: 'bin',
            lane,
            y: -10,
            icon: '🗑️',
            ten: 'Thùng Rác',
            hit: false,
          })
        }
      }

      // Cập nhật vị trí vật phẩm & kiểm tra khi nhân vật bước qua
      for (const obj of st.objects) {
        obj.y += (speedPctPerSec * dt) / 1000

        if (!obj.hit && obj.lane === st.lane && Math.abs(obj.y - PLAYER_Y_PCT) < 7.5) {
          const xPct = 14 + (LANE_CENTERS[obj.lane] * 0.72)
          if (obj.kind === 'trash') {
            obj.hit = true
            st.holding.push(obj.icon)
            st.pickedTotal++
            st.floaters.push({
              id: now + Math.random(),
              xPct,
              yPct: PLAYER_Y_PCT - 8,
              text: `Nhặt ${obj.icon}`,
              ok: true,
              at: now,
            })
            sfx.tap()
          } else if (obj.kind === 'bin') {
            if (st.holding.length > 0) {
              dumpToNearbyBin(obj)
            } else {
              obj.hit = true
              st.floaters.push({
                id: now + Math.random(),
                xPct,
                yPct: PLAYER_Y_PCT - 8,
                text: 'Nhặt rác trước nhé! 🖐️',
                ok: true,
                at: now,
              })
            }
          } else if (obj.kind === 'puddle') {
            obj.hit = true
            st.slipped++
            spawnBurst(st, xPct, PLAYER_Y_PCT, now, false)
            if (st.holding.length > 0) {
              st.holding.pop()
              st.floaters.push({
                id: now + Math.random(),
                xPct,
                yPct: PLAYER_Y_PCT - 8,
                text: 'Trượt chân! Rơi 1 rác 💦',
                ok: false,
                at: now,
              })
            } else {
              st.floaters.push({
                id: now + Math.random(),
                xPct,
                yPct: PLAYER_Y_PCT - 8,
                text: 'Cẩn thận vũng nước! 💦',
                ok: false,
                at: now,
              })
            }
            sfx.wrong()
          }
        }
      }

      st.objects = st.objects.filter((o) => (!o.hit || o.kind === 'bin') && o.y < 108)
      st.floaters = st.floaters.filter((f) => now - f.at < 850)
      st.particles = st.particles.filter((p) => now - p.at < p.ttl)

      force()
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const setLane = (targetLane) => {
    const st = gameRef.current
    if (st.lane !== targetLane) {
      st.lane = targetLane
      sfx.tap()
      force()
    }
  }

  const exit = () => {
    if (phase === 'playing' && !window.confirm('Thoát bây giờ thì chuyến đi này sẽ không được tính điểm. Em chắc chứ?')) return
    navigate('/')
  }

  // ---------- Màn hình giới thiệu ----------
  if (phase === 'intro') {
    return (
      <main className="ts-screen ts-intro">
        <button className="ts-close" onClick={exit} aria-label="Về khu vườn" id="game-exit">
          ✕
        </button>
        <h1 className="ts-title">
          Bước Chân <span>Xanh</span>
        </h1>
        <p className="ts-sub">
          Đi bộ từ <b>Nhà 🏡 đến Trường 🏫</b>, chuyển làn nhặt rác trên đường và ghé vào <b>Thùng Rác 🗑️</b> để bỏ rác vào thùng nhé!
        </p>

        <ul className="se-rules">
          <li className="se-rule is-good">
            <span>🖐️</span>
            <div>
              <b>Bước qua Rác để nhặt lên tay</b>
              <small>Chạm vào làn đường (Trái / Giữa / Phải) để di chuyển nhặt rác</small>
            </div>
          </li>
          <li className="se-rule is-good">
            <span>🗑️</span>
            <div>
              <b>Ghé vào Thùng Rác Xanh ven đường</b>
              <small>Bước vào làn có Thùng Rác (hoặc chạm vào Thùng Rác) để bỏ hết rác trên tay vào thùng và ghi điểm!</small>
            </div>
          </li>
          <li className="se-rule is-bad">
            <span>💦</span>
            <div>
              <b>Né các vũng nước trên đường</b>
              <small>Dẫm vào vũng nước sẽ bị trượt chân làm rơi mất rác đang cầm</small>
            </div>
          </li>
        </ul>

        <div className="ts-rules">
          <span>⏱ {GAME_SECONDS} giây tới trường</span>
          <span>⭐ Tối đa {MAX_REWARD_PER_ROUND} điểm/lượt</span>
          <span>☀️ Hôm nay còn {user.con_lai_hom_nay} điểm</span>
        </div>

        {startError && <p className="ts-warn">{startError}</p>}
        <button className="btn btn--primary btn--lg ts-start" onClick={start} id="game-start">
          ▶ Bắt đầu đi học! 🎒
        </button>
      </main>
    )
  }

  // ---------- Màn hình kết quả ----------
  if (phase === 'submitting' || phase === 'result') {
    const r = result
    return (
      <main className="ts-screen ts-result">
        {r && r.earned > 0 && <Confetti count={60} />}
        {phase === 'submitting' || !r ? (
          <div className="screen-center">
            <div className="spinner" />
            <p>Đã tới cổng trường! Đang tổng kết điểm…</p>
          </div>
        ) : (
          <>
            {r.levelUp ? (
              <div className="levelup">
                <p className="levelup__label">✨ Chibi đã tiến hóa! ✨</p>
                <ChibiAvatar xp={user.tong_diem_tich_luy} size={150} celebrate />
                <p className="levelup__name">{getLevel(user.tong_diem_tich_luy).ten}</p>
              </div>
            ) : (
              <ChibiAvatar xp={user.tong_diem_tich_luy} size={130} />
            )}

            <h1 className="ts-title">
              {r.score >= 8
                ? 'Đường Đến Trường Sạch Bóng! 🏫'
                : r.score >= 4
                  ? 'Hành Trình Xanh Tuyệt Vời! 🌱'
                  : 'Đã Tới Trường Học! 🎒'}
            </h1>
            <p className="ts-sub">
              Em đã nhặt và bỏ vào thùng <b>{r.score}</b> món rác trên đường đi học!
            </p>

            {r.error ? (
              <p className="ts-warn">{r.error}</p>
            ) : (
              <div className="ts-reward">
                <div className="ts-reward__chip">⭐ +{r.earned} XP</div>
                <div className="ts-reward__chip ts-reward__chip--coin">🍃 +{r.earned} Xu</div>
              </div>
            )}

            {r.dailyCapped && (
              <p className="ts-hint">Hôm nay em đã đạt giới hạn 30 điểm/ngày rồi! 🌙</p>
            )}

            <div className="ts-actions">
              <button className="btn btn--ghost" onClick={() => navigate('/')} id="game-home">
                🏡 Về khu vườn
              </button>
              <button className="btn btn--primary" onClick={start} id="game-replay">
                🔄 Đi học lại
              </button>
            </div>
          </>
        )}
      </main>
    )
  }

  // ---------- Màn hình đang chơi (60fps Real-Time Street Runner) ----------
  const st = gameRef.current
  // eslint-disable-next-line react-hooks/purity
  const now = performance.now()
  const walkPct = Math.min(100, Math.round(((GAME_SECONDS - timeLeft) / GAME_SECONDS) * 100))
  const hasNearbyBin = st.objects.some((o) => o.kind === 'bin' && !o.hit && o.y >= 15 && o.y <= 92)

  return (
    <main className="ts-screen gs-play">
      <div
        className="gs-arena"
        onPointerDown={(e) => {
          touchStartXRef.current = e.clientX
        }}
        onPointerUp={(e) => {
          if (touchStartXRef.current == null) return
          const dx = e.clientX - touchStartXRef.current
          touchStartXRef.current = null
          if (Math.abs(dx) > 28) {
            if (dx < 0 && st.lane > 0) setLane(st.lane - 1)
            else if (dx > 0 && st.lane < 2) setLane(st.lane + 1)
          }
        }}
      >
        {/* Thanh HUD chuẩn giống Thùng Rác Thông Thái & Biệt Đội Tiết Kiệm */}
        <header className="ts-hud">
          <button className="ts-close ts-close--inline" onClick={exit} aria-label="Tạm dừng">
            ✕
          </button>
          <div className={`ts-timer ${timeLeft <= 7 ? 'is-low' : ''}`} aria-label={`Đã đi ${walkPct}% quãng đường`}>
            <span>🏡</span>
            <span style={{ fontSize: '0.9rem' }}>➔ 🏫 {walkPct}%</span>
            <div className="ts-timer__bar" style={{ width: `${walkPct}%` }} />
          </div>
          <div className="ts-score" aria-label={`Đã bỏ thùng ${st.score} rác`}>
            🗑️ {st.score}
          </div>
        </header>

        {/* Vỉa hè trái & phải cuộn theo bước chân */}
        <div
          className="gs-curb gs-curb--left"
          style={{ backgroundPositionY: `${st.roadOffset}px` }}
          aria-hidden="true"
        />
        <div
          className="gs-curb gs-curb--right"
          style={{ backgroundPositionY: `${st.roadOffset}px` }}
          aria-hidden="true"
        />

        {/* Cây xanh & cảnh vật hai bên vỉa hè */}
        {st.trees.map((tr) => (
          <div
            key={tr.id}
            className="gs-tree"
            style={{
              left: tr.side === 'left' ? '7%' : '93%',
              top: `${tr.y}%`,
            }}
            aria-hidden="true"
          >
            {tr.icon}
          </div>
        ))}

        {/* Lòng đường 3 làn */}
        <div className="gs-road">
          <div
            className="gs-lane-divider gs-lane-divider--1"
            style={{ transform: `translate(-50%, ${st.roadOffset}px)` }}
          />
          <div
            className="gs-lane-divider gs-lane-divider--2"
            style={{ transform: `translate(-50%, ${st.roadOffset}px)` }}
          />

          {/* 3 vùng chạm trực tiếp trên mặt đường */}
          {[0, 1, 2].map((laneIdx) => (
            <div
              key={laneIdx}
              className="gs-lane-touch"
              style={{ left: `${laneIdx * 33.333}%` }}
              onClick={() => setLane(laneIdx)}
            />
          ))}

          {/* Cổng trường xuất hiện ở những giây cuối */}
          {timeLeft <= 3 && (
            <div
              className="gs-school-gate"
              style={{ top: `${Math.min(62, (3 - timeLeft) * 22 + 18)}%` }}
            >
              <span className="gs-school-gate__icon">🏫</span>
              <span className="gs-school-gate__text">TRƯỜNG HỌC XANH</span>
            </div>
          )}

          {/* Các món rác, thùng rác, vũng nước trên 3 làn đường */}
          {st.objects.map((obj) => {
            if (obj.hit && obj.kind !== 'bin') return null
            const leftPct = LANE_CENTERS[obj.lane]
            if (obj.kind === 'trash') {
              return (
                <div
                  key={obj.id}
                  className="gs-obj gs-obj--trash"
                  style={{ left: `${leftPct}%`, top: `${obj.y}%` }}
                >
                  <span className="gs-obj__icon">{obj.icon}</span>
                  <span className="gs-obj__tag">{obj.ten}</span>
                </div>
              )
            }
            if (obj.kind === 'bin') {
              return (
                <button
                  key={obj.id}
                  type="button"
                  className={`gs-obj gs-obj--bin ${st.holding.length > 0 && !obj.hit ? 'is-glowing' : ''}`}
                  style={{ left: `${leftPct}%`, top: `${obj.y}%` }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setLane(obj.lane)
                    dumpToNearbyBin(obj)
                  }}
                >
                  <span className="gs-obj__icon">{obj.hit ? '✨🗑️' : '🗑️'}</span>
                  <span className="gs-obj__tag">
                    {st.holding.length > 0 && !obj.hit ? 'Bỏ vào đây!' : 'Thùng Rác'}
                  </span>
                </button>
              )
            }
            return (
              <div
                key={obj.id}
                className="gs-obj gs-obj--puddle"
                style={{ left: `${leftPct}%`, top: `${obj.y}%` }}
              >
                <span className="gs-obj__icon">💦</span>
              </div>
            )
          })}

          {/* Nhân vật Chibi đeo cặp sách đi bộ trên làn đường */}
          <div
            className="gs-player"
            style={{ left: `${LANE_CENTERS[st.lane]}%` }}
          >
            <div className={`gs-player__bag-pill ${st.holding.length > 0 ? 'is-full' : ''}`}>
              {st.holding.length > 0 ? (
                <>
                  <span>🖐️ Cầm {st.holding.length}:</span>
                  <span>{st.holding.slice(-4).join('')}</span>
                </>
              ) : (
                <span>👣 Đang đi học</span>
              )}
            </div>
            <div className="gs-player__avatar">
              <ChibiAvatar xp={user.tong_diem_tich_luy} size={74} />
              <span className="gs-player__backpack" title="Cặp sách đi học">
                🎒
              </span>
            </div>
          </div>
        </div>

        {/* Hiệu ứng hạt VFX & chữ nổi cộng điểm */}
        {st.particles.map((p) => {
          const t = Math.min(1, (now - p.at) / p.ttl)
          return (
            <span
              key={p.id}
              className="vfx-particle"
              style={{
                left: `calc(${p.xPct}% + ${p.vx * t}px)`,
                top: `calc(${p.yPct}% + ${p.vy * t + 36 * t * t}px)`,
                opacity: 1 - t,
                fontSize: '1.3rem',
              }}
            >
              {p.icon}
            </span>
          )
        })}

        {st.floaters.map((f) => (
          <span
            key={f.id}
            className={`ts-floater ${f.ok ? 'is-ok' : 'is-bad'}`}
            style={{ left: `${f.xPct}%`, top: `${f.yPct}%` }}
          >
            {f.text}
          </span>
        ))}

        {/* Thanh điều khiển nhanh ở dưới cùng */}
        <div className="gs-bottom-bar">
          <button
            type="button"
            className={`gs-steer-btn ${st.lane === 0 ? 'is-active' : ''}`}
            onClick={() => setLane(Math.max(0, st.lane - 1))}
          >
            ◀ Qua Trái
          </button>
          <button
            type="button"
            className="gs-dump-btn"
            disabled={st.holding.length === 0 || !hasNearbyBin}
            onClick={() => dumpToNearbyBin()}
          >
            🗑️ {st.holding.length > 0 ? `Bỏ ${st.holding.length} rác` : 'Chưa cầm rác'}
          </button>
          <button
            type="button"
            className={`gs-steer-btn ${st.lane === 2 ? 'is-active' : ''}`}
            onClick={() => setLane(Math.min(2, st.lane + 1))}
          >
            Qua Phải ▶
          </button>
        </div>
      </div>
    </main>
  )
}
