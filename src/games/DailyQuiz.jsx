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
const PLAYER_Y_PCT = 76
const LANE_CENTERS = [16.66, 50, 83.33]

const TRASH_TYPES = [
  { key: 'banana', icon: '🍌', ten: 'Vỏ chuối' },
  { key: 'cup', icon: '🥤', ten: 'Ly trà sữa' },
  { key: 'can', icon: '🥫', ten: 'Lon nước' },
  { key: 'bottle', icon: '🧴', ten: 'Chai nhựa' },
  { key: 'bag', icon: '🛍️', ten: 'Túi nilon' },
  { key: 'milk', icon: '📦', ten: 'Hộp sữa' },
]

const PROP_KINDS = ['tree', 'flower', 'lamp', 'tree', 'bench']
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

/** Minh họa Vector SVG sắc nét cho từng loại rác */
function TrashSvg({ kind }) {
  switch (kind) {
    case 'banana':
      return (
        <svg viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">
          <path d="M30 12 C28 28, 12 38, 10 48 C18 52, 30 42, 34 28 Z" fill="#facc15" stroke="#a16207" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M34 12 C38 28, 52 36, 54 48 C46 52, 34 42, 32 28 Z" fill="#fde047" stroke="#a16207" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M32 14 C32 30, 26 46, 32 54 C38 46, 36 30, 32 14 Z" fill="#fef08a" stroke="#a16207" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="29" y="7" width="6" height="7" rx="2" fill="#713f12" />
        </svg>
      )
    case 'cup':
      return (
        <svg viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">
          <path d="M36 6 L42 6 L35 26 L30 26 Z" fill="#f43f5e" />
          <path d="M18 22 C18 12, 46 12, 46 22 Z" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2.5" />
          <polygon points="18,22 46,22 42,54 22,54" fill="#bae6fd" stroke="#0284c7" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="16" y="20" width="32" height="5" rx="2.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
          <circle cx="26" cy="48" r="2.8" fill="#451a03" />
          <circle cx="33" cy="49" r="2.8" fill="#451a03" />
          <circle cx="38" cy="47" r="2.8" fill="#451a03" />
        </svg>
      )
    case 'can':
      return (
        <svg viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">
          <rect x="18" y="12" width="28" height="42" rx="6" fill="#ef4444" stroke="#991b1b" strokeWidth="2.5" />
          <path d="M18 26 Q32 34 46 24 L46 36 Q32 46 18 38 Z" fill="#ffffff" />
          <ellipse cx="32" cy="12" rx="13" ry="4" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
          <ellipse cx="32" cy="54" rx="13" ry="3.5" fill="#94a3b8" />
        </svg>
      )
    case 'bottle':
      return (
        <svg viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">
          <rect x="26" y="6" width="12" height="6" rx="2" fill="#2563eb" stroke="#1e40af" strokeWidth="2" />
          <path d="M26 12 L38 12 L44 22 L44 52 C44 55, 20 55, 20 52 L20 22 Z" fill="#7dd3fc" stroke="#0284c7" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="20" y="30" width="24" height="10" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
          <path d="M25 22 L25 48" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        </svg>
      )
    case 'bag':
      return (
        <svg viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">
          <path d="M20 12 C20 6, 27 6, 27 14 L27 22 L37 22 L37 14 C37 6, 44 6, 44 12 L48 24 C52 38, 48 52, 32 52 C16 52, 12 38, 16 24 Z" fill="#f472b6" stroke="#be185d" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M24 32 Q32 38 40 32" fill="none" stroke="#fbcfe8" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">
          <polygon points="18,22 32,12 46,22" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="18" y="22" width="28" height="32" rx="3" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="2.5" />
          <rect x="18" y="32" width="28" height="12" fill="#3b82f6" />
          <path d="M38 8 L44 6 L38 18" fill="none" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
  }
}

/** Minh họa Vector SVG Vũng nước & Cọc tiêu giao thông */
function PuddleSvg() {
  return (
    <svg viewBox="0 0 90 56" width="82" height="52" aria-hidden="true">
      <path
        d="M12 34 C6 24, 24 16, 42 18 C60 14, 82 22, 80 34 C84 44, 62 50, 44 48 C24 52, 8 44, 12 34 Z"
        fill="#0284c7"
        stroke="#7dd3fc"
        strokeWidth="2.5"
      />
      <ellipse cx="38" cy="32" rx="20" ry="7" fill="#38bdf8" opacity="0.7" />
      <ellipse cx="28" cy="29" rx="8" ry="2.5" fill="#e0f2fe" opacity="0.85" />
      {/* Cọc tiêu cảnh báo cam-trắng */}
      <polygon points="62,38 78,38 73,12 67,12" fill="#f97316" stroke="#c2410c" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="65,26 75,26 74,20 66,20" fill="#ffffff" />
      <rect x="59" y="37" width="22" height="4" rx="2" fill="#ea580c" />
    </svg>
  )
}

/** Minh họa Vector SVG Cây xanh, Hoa, Đèn đường, Ghế đá trên vỉa hè */
function SidewalkPropSvg({ kind }) {
  if (kind === 'lamp') {
    return (
      <svg viewBox="0 0 48 64" width="42" height="56" aria-hidden="true">
        <ellipse cx="24" cy="56" rx="10" ry="4" fill="rgba(0,0,0,0.2)" />
        <rect x="21" y="18" width="6" height="38" rx="3" fill="#475569" />
        <circle cx="24" cy="14" r="10" fill="#fef08a" stroke="#eab308" strokeWidth="3" />
        <circle cx="24" cy="14" r="5" fill="#ffffff" />
      </svg>
    )
  }
  if (kind === 'flower') {
    return (
      <svg viewBox="0 0 56 48" width="46" height="40" aria-hidden="true">
        <ellipse cx="28" cy="36" rx="20" ry="9" fill="#16a34a" />
        <circle cx="18" cy="28" r="10" fill="#22c55e" />
        <circle cx="38" cy="28" r="10" fill="#22c55e" />
        <circle cx="28" cy="24" r="12" fill="#4ade80" />
        <circle cx="20" cy="26" r="4" fill="#f43f5e" />
        <circle cx="30" cy="20" r="4" fill="#facc15" />
        <circle cx="36" cy="28" r="4" fill="#ec4899" />
      </svg>
    )
  }
  if (kind === 'bench') {
    return (
      <svg viewBox="0 0 56 48" width="44" height="38" aria-hidden="true">
        <rect x="8" y="16" width="40" height="10" rx="3" fill="#d97706" stroke="#78350f" strokeWidth="2" />
        <rect x="6" y="28" width="44" height="7" rx="3" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
        <rect x="12" y="35" width="5" height="8" fill="#475569" />
        <rect x="39" y="35" width="5" height="8" fill="#475569" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 64 72" width="52" height="58" aria-hidden="true">
      <ellipse cx="32" cy="64" rx="16" ry="5" fill="rgba(0,0,0,0.22)" />
      <rect x="27" y="42" width="10" height="22" rx="3" fill="#92400e" stroke="#451a03" strokeWidth="2" />
      <circle cx="20" cy="34" r="14" fill="#16a34a" />
      <circle cx="44" cy="34" r="14" fill="#15803d" />
      <circle cx="32" cy="22" r="17" fill="#22c55e" />
      <circle cx="26" cy="18" r="6" fill="#4ade80" opacity="0.8" />
    </svg>
  )
}

/** Minh họa Vector SVG Cổng Trường Học Xanh */
function SchoolGateSvg() {
  return (
    <svg viewBox="0 0 320 120" width="100%" height="105" aria-hidden="true">
      {/* Cột cổng hai bên */}
      <rect x="18" y="38" width="28" height="78" rx="4" fill="#fde047" stroke="#b45309" strokeWidth="3" />
      <rect x="274" y="38" width="28" height="78" rx="4" fill="#fde047" stroke="#b45309" strokeWidth="3" />
      {/* Mái ngói đỏ cổng trường */}
      <polygon points="6,42 160,8 314,42" fill="#ef4444" stroke="#991b1b" strokeWidth="3.5" strokeLinejoin="round" />
      {/* Bảng tên trường */}
      <rect x="44" y="32" width="232" height="32" rx="8" fill="#ffffff" stroke="#15803d" strokeWidth="3.5" />
      <text x="160" y="53" textAnchor="middle" fill="#065f46" fontWeight="900" fontSize="15" fontFamily="sans-serif">
        🏫 TRƯỜNG HỌC XANH
      </text>
      {/* Đồng hồ tròn trên đỉnh cổng */}
      <circle cx="160" cy="21" r="10" fill="#fef9c3" stroke="#b45309" strokeWidth="2.5" />
      <path d="M160 15 L160 21 L164 21" stroke="#713f12" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function createInitialState() {
  return {
    lane: 1, // 0: Trái, 1: Giữa, 2: Phải
    holding: [], // Danh sách rác đang cầm trên tay
    score: 0,
    pickedTotal: 0,
    slipped: 0,
    elapsed: 0,
    roadOffset: 0,
    spawnTimer: 400,
    binTimer: 2200,
    treeTimer: 0,
    nextId: 1,
    objects: [],
    trees: [
      { id: -1, side: 'left', y: 16, kind: 'tree' },
      { id: -2, side: 'right', y: 36, kind: 'lamp' },
      { id: -3, side: 'left', y: 58, kind: 'flower' },
      { id: -4, side: 'right', y: 80, kind: 'tree' },
    ],
    floaters: [],
    particles: [],
    rings: [],
  }
}

export default function DailyQuiz() {
  const navigate = useNavigate()
  const { user, setUser } = usePlayer()

  const [phase, setPhase] = useState('intro')
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

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'playing' && timeLeft <= 0) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase])

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
    const count = good ? 8 : 4
    st.rings.push({ id: now + Math.random(), xPct, yPct, type: good ? 'happy' : 'sad', at: now })
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3
      const dist = 30 + Math.random() * 34
      st.particles.push({
        id: now + Math.random(),
        xPct,
        yPct,
        vx: Math.cos(angle) * dist,
        vy: Math.sin(angle) * dist - 22,
        icon: icons[i % icons.length],
        at: now,
        ttl: 580,
      })
    }
  }

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
    const xPct = 16 + (LANE_CENTERS[bin.lane] * 0.68)
    spawnBurst(st, xPct, bin.y, now, true)
    st.floaters.push({
      id: now + Math.random(),
      xPct,
      yPct: bin.y - 6,
      text: count >= 2 ? `Nham nham! +${count} 🔥` : 'Nham nham! +1 ⭐',
      ok: true,
      at: now,
    })
    sfx.correct()
    force()
    return true
  }

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
      const speedPctPerSec = 28 + 12 * progress

      st.roadOffset = (st.roadOffset + ((speedPctPerSec * dt) / 1000) * 5.2) % 76

      // Sinh cảnh vật vỉa hè
      st.treeTimer += dt
      if (st.treeTimer >= 900) {
        st.treeTimer = 0
        st.trees.push({
          id: st.nextId++,
          side: Math.random() < 0.5 ? 'left' : 'right',
          y: -10,
          kind: pick(PROP_KINDS),
        })
      }
      for (const tr of st.trees) {
        tr.y += (speedPctPerSec * dt) / 1000
      }
      st.trees = st.trees.filter((tr) => tr.y < 110)

      // Sinh rác hoặc vũng nước
      st.spawnTimer += dt
      if (st.spawnTimer >= 1150 - 250 * progress && timeLeft > 2) {
        st.spawnTimer = 0
        const lane = Math.floor(Math.random() * 3)
        const busyLane = st.objects.some((o) => o.lane === lane && o.y < 20)
        if (!busyLane) {
          if (Math.random() < 0.22 && st.elapsed > 4000) {
            st.objects.push({
              id: st.nextId++,
              kind: 'puddle',
              lane,
              y: -10,
              ten: 'Vũng nước',
              hit: false,
            })
          } else {
            const item = pick(TRASH_TYPES)
            st.objects.push({
              id: st.nextId++,
              kind: 'trash',
              trashKey: item.key,
              lane,
              y: -10,
              icon: item.icon,
              ten: item.ten,
              hit: false,
            })
          }
        }
      }

      // Sinh Thùng Rác Chibi định kỳ
      st.binTimer += dt
      if (st.binTimer >= 3100) {
        st.binTimer = 0
        const candidateLanes = [0, 1, 2].filter(
          (l) => !st.objects.some((o) => o.lane === l && o.y < 24),
        )
        if (candidateLanes.length > 0) {
          const lane = pick(candidateLanes)
          st.objects.push({
            id: st.nextId++,
            kind: 'bin',
            lane,
            y: -12,
            ten: 'Thùng Rác',
            hit: false,
          })
        }
      }

      for (const obj of st.objects) {
        obj.y += (speedPctPerSec * dt) / 1000

        if (!obj.hit && obj.lane === st.lane && Math.abs(obj.y - PLAYER_Y_PCT) < 7.8) {
          const xPct = 16 + (LANE_CENTERS[obj.lane] * 0.68)
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

      st.objects = st.objects.filter((o) => (!o.hit || o.kind === 'bin') && o.y < 110)
      st.floaters = st.floaters.filter((f) => now - f.at < 850)
      st.particles = st.particles.filter((p) => now - p.at < p.ttl)
      st.rings = st.rings.filter((r) => now - r.at < 550)

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

  // ---------- Màn giới thiệu ----------
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
          Đi bộ từ <b>Nhà 🏡 đến Trường 🏫</b>, chuyển làn nhặt rác trên đường và ghé vào <b>Thùng Rác Chibi 🗑️</b> để bỏ rác vào thùng nhé!
        </p>

        <ul className="se-rules">
          <li className="se-rule is-good">
            <span>🖐️</span>
            <div>
              <b>Bước qua Rác để nhặt lên tay</b>
              <small>Chạm vào làn đường (Trái / Giữa / Phải) hoặc vuốt ngang để nhặt rác</small>
            </div>
          </li>
          <li className="se-rule is-good">
            <span>🗑️</span>
            <div>
              <b>Ghé vào Thùng Rác Chibi ven đường</b>
              <small>Thùng rác sẽ há miệng đón chờ khi em cầm rác chạy tới</small>
            </div>
          </li>
          <li className="se-rule is-bad">
            <span>🚧</span>
            <div>
              <b>Né các vũng nước cảnh báo</b>
              <small>Dẫm vào vũng nước sẽ bị trượt chân làm rơi mất 1 món rác đang cầm</small>
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

  // ---------- Màn kết quả ----------
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

  // ---------- Màn đang chơi ----------
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

        {/* Vỉa hè gạch & Bó vỉa hai bên */}
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

        {/* Cảnh vật SVG hai bên vỉa hè */}
        {st.trees.map((tr) => (
          <div
            key={tr.id}
            className="gs-tree"
            style={{
              left: tr.side === 'left' ? '7.5%' : '92.5%',
              top: `${tr.y}%`,
            }}
            aria-hidden="true"
          >
            <SidewalkPropSvg kind={tr.kind} />
          </div>
        ))}

        {/* Lòng đường nhựa 3 làn */}
        <div className="gs-road">
          <div
            className="gs-lane-divider gs-lane-divider--1"
            style={{ transform: `translate(-50%, ${st.roadOffset}px)` }}
          />
          <div
            className="gs-lane-divider gs-lane-divider--2"
            style={{ transform: `translate(-50%, ${st.roadOffset}px)` }}
          />

          {[0, 1, 2].map((laneIdx) => (
            <div
              key={laneIdx}
              className="gs-lane-touch"
              style={{ left: `${laneIdx * 33.333}%` }}
              onClick={() => setLane(laneIdx)}
            />
          ))}

          {/* Vạch sang đường & Cổng Trường Học Xanh ở cuối chặng */}
          {timeLeft <= 4 && (
            <>
              <div
                className="gs-crosswalk"
                style={{ top: `${Math.min(72, (4 - timeLeft) * 18 + 20)}%` }}
              />
              <div
                className="gs-school-gate"
                style={{ top: `${Math.min(58, (4 - timeLeft) * 18 + 6)}%` }}
              >
                <SchoolGateSvg />
              </div>
            </>
          )}

          {/* Các vật phẩm: Rác SVG, Thùng Rác Chibi 3D, Vũng nước cảnh báo */}
          {st.objects.map((obj) => {
            if (obj.hit && obj.kind !== 'bin') return null
            const leftPct = LANE_CENTERS[obj.lane]
            if (obj.kind === 'trash') {
              return (
                <div
                  key={obj.id}
                  className="gs-obj"
                  style={{ left: `${leftPct}%`, top: `${obj.y}%` }}
                >
                  <div className="gs-trash-card">
                    <div className="gs-trash-sticker">
                      <TrashSvg kind={obj.trashKey} />
                    </div>
                    <div className="gs-trash-shadow" />
                    <span className="gs-trash-label">{obj.ten}</span>
                  </div>
                </div>
              )
            }
            if (obj.kind === 'bin') {
              const ready = st.holding.length > 0 && !obj.hit
              return (
                <button
                  key={obj.id}
                  type="button"
                  className="gs-obj gs-chibi-bin-wrap"
                  style={{ left: `${leftPct}%`, top: `${obj.y}%` }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setLane(obj.lane)
                    dumpToNearbyBin(obj)
                  }}
                >
                  <div className={`gs-chibi-bin ${ready ? 'is-ready' : ''}`}>
                    <div className="gs-chibi-bin__lid" />
                    <div className="gs-chibi-bin__body">
                      <div className="gs-chibi-bin__face">
                        <span className="gs-chibi-bin__eye" />
                        <span className="gs-chibi-bin__eye" />
                        <span className="gs-chibi-bin__mouth" />
                      </div>
                      <span className="gs-chibi-bin__badge">{obj.hit ? '✨' : '♻️'}</span>
                    </div>
                  </div>
                  <span className="gs-chibi-bin__tag">
                    {ready ? '👇 Bỏ vào đây!' : obj.hit ? 'Đã dọn sạch!' : 'Thùng Rác'}
                  </span>
                </button>
              )
            }
            return (
              <div
                key={obj.id}
                className="gs-obj gs-puddle-wrap"
                style={{ left: `${leftPct}%`, top: `${obj.y}%` }}
              >
                <PuddleSvg />
              </div>
            )
          })}

          {/* Nhân vật Chibi học sinh đi bộ */}
          <div className="gs-player" style={{ left: `${LANE_CENTERS[st.lane]}%` }}>
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
            <div className="gs-player__body">
              <div className="gs-player__avatar">
                <ChibiAvatar xp={user.tong_diem_tich_luy} size={74} />
                <span className="gs-player__backpack" title="Cặp sách đi học">
                  🎒
                </span>
              </div>
              <div className="gs-player__ground-shadow" />
            </div>
          </div>
        </div>

        {/* Sóng xung kích & hạt hiệu ứng VFX */}
        {st.rings.map((r) => (
          <div
            key={r.id}
            className={`vfx-ring vfx-ring--${r.type}`}
            style={{ left: `${r.xPct}%`, top: `${r.yPct}%` }}
          />
        ))}

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
                fontSize: '1.35rem',
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
