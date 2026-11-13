import { useEffect, useRef, useState } from 'react'
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

const TOTAL_STOPS = 10

const TRASH_POOL = [
  { icon: '🥤', ten: 'Ly nhựa dùng 1 lần', khen: 'Bớt 1 chiếc ly nhựa trên vỉa hè rồi!' },
  { icon: '🍌', ten: 'Vỏ chuối rơi', khen: 'Nhặt vỏ chuối giúp không ai bị trượt ngã!' },
  { icon: '🥫', ten: 'Vỏ lon nước ngọt', khen: 'Lon nhôm này đem tái chế được đó!' },
  { icon: '🛍️', ten: 'Túi nilon bay', khen: 'Không để túi nilon làm tắc cống thoát nước!' },
  { icon: '📦', ten: 'Hộp sữa giấy', khen: 'Đường đến trường sạch bong kin kít!' },
  { icon: '📰', ten: 'Giấy vụn rơi', khen: 'Giữ gìn vỉa hè xanh - sạch - đẹp!' },
  { icon: '🍎', ten: 'Lõi táo thừa', khen: 'Bỏ rác hữu cơ đúng nơi quy định!' },
  { icon: '🍂', ten: 'Cành lá khô', khen: 'Con đường rợp bóng cây và sạch sẽ!' },
  { icon: '🧴', ten: 'Chai nhựa rỗng', khen: 'Chai nhựa đã vào thùng gọn gàng!' },
  { icon: '🥡', ten: 'Hộp xốp bỏ quên', khen: 'Tuyệt vời! Sắp tới cổng trường rồi!' },
]

const SCENERY_PROPS = [
  { at: 2, emoji: '🏡', tag: 'Nhà của em' },
  { at: 16, emoji: '🌳', tag: '' },
  { at: 30, emoji: '🏪', tag: 'Tiệm tạp hóa' },
  { at: 45, emoji: '🌲', tag: '' },
  { at: 60, emoji: '🚏', tag: 'Trạm xe buýt' },
  { at: 76, emoji: '🌺', tag: 'Công viên' },
  { at: 96, emoji: '🏫', tag: 'Trường Học Xanh' },
]

function buildStops() {
  const shuffled = [...TRASH_POOL].sort(() => Math.random() - 0.5)
  return Array.from({ length: TOTAL_STOPS }, (_, idx) => ({
    index: idx,
    distance: Math.round(((idx + 1) / (TOTAL_STOPS + 1)) * 90) + 4,
    item: shuffled[idx % shuffled.length],
  }))
}

export default function DailyQuiz() {
  const navigate = useNavigate()
  const { user, setUser } = usePlayer()

  const [phase, setPhase] = useState('intro') // intro | playing | submitting | result
  const [stepState, setStepState] = useState('walking') // walking | found_trash | holding_trash | cleaned | arriving
  const [stops, setStops] = useState(() => buildStops())
  const [currentIdx, setCurrentIdx] = useState(0)
  const [distance, setDistance] = useState(0) // 0 -> 100%
  const [cleanedCount, setCleanedCount] = useState(0)
  const [bubble, setBubble] = useState('Cùng đi bộ đến trường nào! 🎒')
  const [floatFx, setFloatFx] = useState(null)
  const [result, setResult] = useState(null)
  const [startError, setStartError] = useState('')

  const sessionRef = useRef(null)
  const startedAtRef = useRef(0)
  const cleanedRef = useRef(0)

  const startGame = async () => {
    setStartError('')
    try {
      const s = await batDauGame('trash_sorting')
      sessionRef.current = s.id
      startedAtRef.current = Date.now()
      cleanedRef.current = 0
      const newStops = buildStops()
      setStops(newStops)
      setCurrentIdx(0)
      setDistance(0)
      setCleanedCount(0)
      setResult(null)
      setBubble('Khởi hành từ nhà đến trường thôi! 👣')
      setStepState('walking')
      setPhase('playing')
    } catch (e) {
      setStartError(e.message)
    }
  }

  const finishGame = async (finalScore) => {
    setPhase('submitting')
    setBubble('Đã tới cổng trường rồi! Chào thầy cô ạ! 🏫')
    try {
      // Đảm bảo thời gian hành trình tối thiểu 10.5s để hợp lệ bộ lọc server
      const elapsed = Date.now() - startedAtRef.current
      if (elapsed < 10_500) {
        await new Promise((r) => setTimeout(r, 10_500 - elapsed))
      }
      const res = await nopKetQuaGame(sessionRef.current, finalScore)
      setUser(res.user)
      setResult({ ...res, score: finalScore })
      if (res.earned > 0) sfx.win()
    } catch (e) {
      setResult({ error: e.message, earned: 0, score: finalScore })
    }
    setPhase('result')
  }

  // Hiệu ứng nhân vật tự bước đi đến điểm có rác tiếp theo
  useEffect(() => {
    if (phase !== 'playing' || stepState !== 'walking') return

    const targetStop = stops[currentIdx]
    const targetDist = targetStop ? targetStop.distance : 100

    const timer = setInterval(() => {
      setDistance((prev) => {
        const next = prev + 1.8
        if (next >= targetDist) {
          clearInterval(timer)
          if (targetStop) {
            setStepState('found_trash')
            setBubble(`Ơ kìa! Có ${targetStop.item.ten} rơi trên đường!`)
          } else {
            setStepState('arriving')
            finishGame(cleanedRef.current)
          }
          return targetDist
        }
        return next
      })
    }, 65)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepState, currentIdx, stops])

  const handlePickUpTrash = () => {
    if (stepState !== 'found_trash') return
    sfx.tap()
    const cur = stops[currentIdx]
    setStepState('holding_trash')
    setBubble(`Đã nhặt ${cur.item.ten}! Bỏ vào thùng rác bên cạnh nhé! 🗑️`)
  }

  const handlePutInBin = () => {
    if (stepState !== 'holding_trash') return
    sfx.correct()
    const cur = stops[currentIdx]
    const nextScore = cleanedRef.current + 1
    cleanedRef.current = nextScore
    setCleanedCount(nextScore)
    setStepState('cleaned')
    setBubble(`🌟 ${cur.item.khen}`)
    setFloatFx({ id: Date.now(), text: '+1 Điểm Xanh ⭐' })

    setTimeout(() => {
      setFloatFx(null)
      if (currentIdx + 1 < stops.length) {
        setCurrentIdx((i) => i + 1)
        setStepState('walking')
        setBubble('Đường sạch rồi, mình đi tiếp tới trường thôi! 👣')
      } else {
        setCurrentIdx(stops.length)
        setStepState('walking')
        setBubble('Cổng trường ngay phía trước rồi! 🏫')
      }
    }, 850)
  }

  const handleSkipTrash = () => {
    if (stepState !== 'found_trash' && stepState !== 'holding_trash') return
    sfx.tap()
    if (currentIdx + 1 < stops.length) {
      setCurrentIdx((i) => i + 1)
      setStepState('walking')
      setBubble('Đi tiếp về phía trường nào! 👣')
    } else {
      setCurrentIdx(stops.length)
      setStepState('walking')
    }
  }

  const activeStop = stops[currentIdx]

  return (
    <main className="ts-screen gs-screen">
      <button className="ts-close" onClick={() => navigate('/')} aria-label="Về khu vườn" id="game-exit">
        ✕
      </button>

      {/* ============ MÀN HÌNH GIỚI THIỆU ============ */}
      {phase === 'intro' && (
        <section className="ts-box">
          <div className="gs-intro-road" aria-hidden="true">
            <div className="gs-intro-Node">
              <span className="gs-intro-Node__icon">🏡</span>
              <span className="gs-intro-Node__label">Nhà em</span>
            </div>
            <div className="gs-intro-walker">
              <span style={{ fontSize: '2.5rem' }}>🎒</span>
              <span style={{ fontSize: '1.8rem' }}>🗑️</span>
            </div>
            <div className="gs-intro-Node">
              <span className="gs-intro-Node__icon">🏫</span>
              <span className="gs-intro-Node__label">Trường học</span>
            </div>
          </div>

          <h1 className="ts-title">
            Bước Chân <span className="gs-accent">Xanh</span>
          </h1>
          <p className="ts-sub">
            Trên đường đi bộ từ <b>Nhà đến Trường</b>, em hãy nhặt những món rác rơi trên vỉa hè và bỏ gọn vào thùng rác ven đường nhé!
          </p>

          <ul className="se-rules">
            <li className="se-rule is-good">
              <span>🖐️</span>
              <div>
                <b>Bước 1 — Nhặt rác trên đường</b>
                <small>Chạm vào món rác khi nhân vật dừng lại</small>
              </div>
            </li>
            <li className="se-rule is-good">
              <span>🗑️</span>
              <div>
                <b>Bước 2 — Bỏ vào thùng rác</b>
                <small>Chạm vào thùng rác bên vệ đường để nhận điểm</small>
              </div>
            </li>
          </ul>

          <p className="ts-cap">
            🎁 Tối đa <b>+{MAX_REWARD_PER_ROUND} XP</b> & <b>+{MAX_REWARD_PER_ROUND} Xu</b> mỗi chuyến đi học
          </p>
          {startError && <p className="ts-warn">{startError}</p>}
          <button className="btn btn--primary btn--lg btn--block" onClick={startGame} id="game-start">
            Bắt đầu đi học! 🎒
          </button>
        </section>
      )}

      {/* ============ MÀN HÌNH ĐANG CHƠI ============ */}
      {phase === 'playing' && (
        <>
          <div className="gs-journey">
            <div className="gs-journey__top">
              <span>🏡 Nhà</span>
              <span>
                🧹 Đã bỏ thùng: <b>{cleanedCount}</b>/{TOTAL_STOPS}
              </span>
              <span>🏫 Trường ({Math.round(distance)}%)</span>
            </div>
            <div className="gs-journey__bar">
              <div className="gs-journey__fill" style={{ width: `${distance}%` }} />
              <span className="gs-journey__pin" style={{ left: `${Math.min(96, Math.max(4, distance))}%` }}>
                🚶
              </span>
            </div>
          </div>

          <div className="gs-stage">
            <span className="gs-sun" aria-hidden="true">
              ☀️
            </span>
            <span className="gs-cloud gs-cloud--1" aria-hidden="true">
              ☁️
            </span>
            <span className="gs-cloud gs-cloud--2" aria-hidden="true">
              ☁️
            </span>

            {/* Cảnh vật nhà cửa, cây xanh, cổng trường trôi theo bước chân */}
            <div className="gs-scenery" aria-hidden="true">
              {SCENERY_PROPS.map((p, i) => {
                const screenX = 20 + (p.at - distance) * 2.2
                if (screenX < -25 || screenX > 125) return null
                return (
                  <div key={i} className="gs-prop" style={{ left: `${screenX}%` }}>
                    <span className="gs-prop__emoji">{p.emoji}</span>
                    {p.tag && <span className="gs-prop__tag">{p.tag}</span>}
                  </div>
                )
              })}
            </div>

            {/* Vạch kẻ đường */}
            <div
              className="gs-road-lines"
              style={{ backgroundPositionX: `-${Math.round(distance * 18)}px` }}
              aria-hidden="true"
            />

            {/* Nhân vật học sinh & Chibi đồng hành */}
            <div className={`gs-hero ${stepState === 'walking' ? 'is-walking' : ''}`}>
              <div className="gs-hero__bubble">{bubble}</div>
              <div className="gs-hero__body">
                <ChibiAvatar xp={user.tong_diem_tich_luy} size={62} />
                <span className="gs-hero__kid" role="img" aria-label="Học sinh đi bộ">
                  🚶‍♂️🎒
                </span>
                {stepState === 'holding_trash' && activeStop && (
                  <span className="gs-hero__held" title={activeStop.item.ten}>
                    {activeStop.item.icon}
                  </span>
                )}
              </div>
            </div>

            {/* Món rác xuất hiện trên đường */}
            {stepState === 'found_trash' && activeStop && (
              <button
                type="button"
                id="btn-trash-on-road"
                className="gs-trash-spot"
                onClick={handlePickUpTrash}
                aria-label={`Nhặt ${activeStop.item.ten}`}
              >
                <span className="gs-trash-spot__hint">👇 Chạm để nhặt rác!</span>
                <span className="gs-trash-spot__icon">{activeStop.item.icon}</span>
                <span className="gs-trash-spot__name">{activeStop.item.ten}</span>
              </button>
            )}

            {/* Thùng rác bên vệ đường */}
            {(stepState === 'found_trash' || stepState === 'holding_trash' || stepState === 'cleaned') && (
              <button
                type="button"
                id="btn-roadside-bin"
                className={`gs-bin-spot ${stepState === 'holding_trash' ? 'is-ready' : ''}`}
                onClick={handlePutInBin}
                disabled={stepState !== 'holding_trash'}
                aria-label="Bỏ rác vào thùng"
              >
                {stepState === 'holding_trash' && (
                  <span className="gs-bin-spot__hint">👇 Bỏ vào thùng!</span>
                )}
                <span className="gs-bin-spot__box">
                  {stepState === 'cleaned' ? '✨🗑️' : '🗑️'}
                </span>
                <span className="gs-bin-spot__label">Thùng Rác Xanh</span>
              </button>
            )}

            {floatFx && (
              <div key={floatFx.id} className="gs-floating-score">
                {floatFx.text}
              </div>
            )}
          </div>

          {/* Bảng nút bấm thao tác nhanh bên dưới */}
          <div className="gs-controls">
            <div className="gs-controls__status">
              {stepState === 'walking' && '👣 Em đang bước đi trên vỉa hè đến trường...'}
              {stepState === 'found_trash' && activeStop && `👀 Phát hiện: ${activeStop.item.icon} ${activeStop.item.ten} trên đường!`}
              {stepState === 'holding_trash' && activeStop && `🖐️ Đang cầm ${activeStop.item.icon} ${activeStop.item.ten} — hãy bỏ vào thùng rác!`}
              {stepState === 'cleaned' && '🌸 Tuyệt vời! Đường phố sạch đẹp hơn rồi!'}
            </div>

            <div className="gs-controls__btns">
              {stepState === 'found_trash' && (
                <>
                  <button
                    type="button"
                    id="btn-action-pickup"
                    className="btn btn--primary"
                    onClick={handlePickUpTrash}
                  >
                    🖐️ Nhặt rác lên
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={handleSkipTrash}
                  >
                    Đi qua →
                  </button>
                </>
              )}

              {stepState === 'holding_trash' && (
                <button
                  type="button"
                  id="btn-action-putbin"
                  className="btn btn--primary btn--lg"
                  onClick={handlePutInBin}
                >
                  🗑️ Bỏ vào Thùng Rác (+1 Điểm)
                </button>
              )}

              {(stepState === 'walking' || stepState === 'cleaned') && (
                <button type="button" className="btn btn--ghost" disabled>
                  🚶 Đang bước tới trường... ({currentIdx + 1}/{TOTAL_STOPS})
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ============ ĐANG NỘP KẾT QUẢ ============ */}
      {phase === 'submitting' && (
        <section className="ts-box">
          <div style={{ fontSize: '3.2rem', marginBottom: '8px' }}>🏫</div>
          <div className="spinner" />
          <p className="ts-sub">Đã tới cổng trường! Đang tổng kết Bước Chân Xanh...</p>
        </section>
      )}

      {/* ============ MÀN HÌNH KẾT QUẢ ============ */}
      {phase === 'result' && result && (
        <section className="ts-box ts-result">
          {result.earned > 0 && <Confetti />}
          {result.levelUp ? (
            <div className="levelup">
              <p className="levelup__label">✨ Chibi đã tiến hóa! ✨</p>
              <ChibiAvatar xp={user.tong_diem_tich_luy} size={150} celebrate />
              <p className="levelup__name">{getLevel(user.tong_diem_tich_luy).ten}</p>
            </div>
          ) : (
            <ChibiAvatar xp={user.tong_diem_tich_luy} size={130} />
          )}

          <h2 className="ts-title">
            {result.score >= 8
              ? 'Tới Trường Thật Tuyệt! 🏫'
              : result.score >= 4
                ? 'Hành Trình Xanh Đẹp! 🌱'
                : 'Đã Tới Trường Học! 🎒'}
          </h2>
          <p className="ts-sub">
            Em đã nhặt và bỏ vào thùng <b>{result.score}</b>/{TOTAL_STOPS} món rác trên đường đi học
          </p>

          {result.error ? (
            <p className="ts-warn">{result.error}</p>
          ) : (
            <>
              <div className="ts-reward">
                <div className="ts-reward__item">
                  <span>⭐ +{result.earned}</span>
                  <small>Điểm XP</small>
                </div>
                <div className="ts-reward__item ts-reward__item--coin">
                  <span>🍃 +{result.earned}</span>
                  <small>Xu Xanh</small>
                </div>
              </div>
              {result.dailyCapped && (
                <p className="ts-hint">Hôm nay em đã đạt tối đa 30 điểm/ngày rồi! 🌙</p>
              )}
            </>
          )}

          <div className="ts-actions">
            <button className="btn btn--ghost" onClick={() => navigate('/')} id="game-home">
              🏡 Về khu vườn
            </button>
            <button className="btn btn--primary" onClick={startGame} id="game-replay">
              🔄 Đi học lại
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
