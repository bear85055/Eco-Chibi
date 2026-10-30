import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { useToast } from '../context/ToastContext'
import { layNhiemVuHomNay, nopNhiemVu } from '../services/gameService'
import { getLevel } from '../utils/levels'
import { sfx } from '../utils/sfx'
import ChibiAvatar from '../components/ChibiAvatar'
import Confetti from '../components/Confetti'
import './TrashSorting.css'
import './DailyQuiz.css'

/** Thời gian còn lại tới 0h (giờ Việt Nam) — lúc có nhiệm vụ mới */
function untilMidnightVN() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const h = Number(parts.find((p) => p.type === 'hour').value)
  const m = Number(parts.find((p) => p.type === 'minute').value)
  const left = 24 * 60 - (h * 60 + m)
  return { h: Math.floor(left / 60), m: left % 60 }
}

function Reward({ earned, capped }) {
  if (earned > 0) {
    return (
      <div className="ts-reward dq-reward">
        <span className="ts-reward__chip">⭐ +{earned} XP</span>
        <span className="ts-reward__chip ts-reward__chip--coin">🍃 +{earned} Xu</span>
      </div>
    )
  }
  if (capped) return <p className="ts-hint">Hôm nay em đã đạt giới hạn điểm rồi, nhưng vẫn rất giỏi! 🌙</p>
  return null
}

const getTodayVN = () =>
  new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date())

export default function DailyQuiz() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user, setUser } = usePlayer()
  const [quest, setQuest] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [habitRes, setHabitRes] = useState(null) // kết quả vừa nộp (để hiện điểm)
  const [quizRes, setQuizRes] = useState(null)
  const [levelUp, setLevelUp] = useState(false)
  const [wait] = useState(untilMidnightVN)
  const [ngay] = useState(getTodayVN)

  useEffect(() => {
    layNhiemVuHomNay()
      .then((q) => {
        setQuest(q)
        setUser(q.user)
      })
      .catch((e) => setError(e.message))
  }, [setUser])

  const answerHabit = async (yes) => {
    if (busy) return
    setBusy(true)
    sfx.tap()
    try {
      const res = await nopNhiemVu('tu_khai', yes)
      setHabitRes({ ...res, yes })
      setQuest((q) => ({ ...q, tu_khai: { ...q.tu_khai, da_lam: true, tra_loi: yes, khen: res.khen } }))
      setUser(res.user)
      if (res.levelUp) setLevelUp(true)
      sfx.correct()
    } catch (e) {
      toast(e.message, 'error')
    }
    setBusy(false)
  }

  const answerQuiz = async (idx) => {
    if (busy) return
    setBusy(true)
    sfx.tap()
    try {
      const res = await nopNhiemVu('do_vui', idx)
      setQuizRes(res)
      setQuest((q) => ({
        ...q,
        do_vui: { ...q.do_vui, da_lam: true, chon: idx, dap_an: res.dap_an, giai_thich: res.giai_thich },
      }))
      setUser(res.user)
      if (res.levelUp) setLevelUp(true)
      if (res.dung) sfx.win()
      else sfx.wrong()
    } catch (e) {
      toast(e.message, 'error')
    }
    setBusy(false)
  }

  if (error) {
    return (
      <main className="ts-screen dq-screen">
        <button className="ts-close" onClick={() => navigate('/')} aria-label="Về khu vườn" id="quest-exit">✕</button>
        <p className="ts-warn" style={{ marginTop: 80 }}>{error}</p>
      </main>
    )
  }

  if (!quest) {
    return (
      <main className="ts-screen dq-screen">
        <div className="screen-center" style={{ minHeight: '100dvh' }}>
          <div className="spinner" />
        </div>
      </main>
    )
  }

  const { tu_khai: habit, do_vui: quiz } = quest
  const doneCount = Number(habit.da_lam) + Number(quiz.da_lam)
  const allDone = doneCount === 2

  return (
    <main className="ts-screen dq-screen">
      {(quizRes?.dung || (allDone && (habitRes || quizRes))) && <Confetti count={50} key={doneCount} />}
      <button className="ts-close" onClick={() => navigate('/')} aria-label="Về khu vườn" id="quest-exit">✕</button>

      <header className="dq-head">
        <p className="dq-date">📅 {ngay}</p>
        <h1 className="ts-title">Bước Chân <span className="dq-accent">Xanh</span></h1>
        <div className="dq-path" aria-label={`Đã hoàn thành ${doneCount} trên 2 nhiệm vụ`}>
          {[0, 1].map((i) => (
            <span key={i} className={`dq-step ${i < doneCount ? 'is-done' : i === doneCount ? 'is-current' : ''}`}>
              👣
            </span>
          ))}
          <span className={`dq-step dq-step--goal ${allDone ? 'is-done' : ''}`}>🏆</span>
        </div>
      </header>

      {/* -------- Nhiệm vụ 1: Tự khai báo -------- */}
      <section className={`dq-card ${habit.da_lam ? 'is-done' : 'is-active'}`} aria-labelledby="habit-q">
        <div className="dq-card__top">
          <span className="dq-badge">Nhiệm vụ 1 · Thói quen xanh</span>
          <span className="chip chip--sun">+{habit.diem} điểm</span>
        </div>
        <div className="dq-habit">
          <span className="dq-habit__icon" aria-hidden="true">{habit.icon}</span>
          <h2 id="habit-q" className="dq-q">{habit.cau_hoi}</h2>
        </div>

        {!habit.da_lam ? (
          <div className="dq-yesno">
            <button className="btn btn--primary" disabled={busy} onClick={() => answerHabit(true)} id="habit-yes">✅ Có ạ!</button>
            <button className="btn btn--ghost" disabled={busy} onClick={() => answerHabit(false)} id="habit-no">🙈 Hôm nay chưa</button>
          </div>
        ) : (
          <div className="dq-feedback is-ok">
            {habit.tra_loi ? (
              <p>🌟 Tuyệt vời! {habit.khen}</p>
            ) : (
              <p>💚 Cảm ơn em đã trả lời trung thực! Ngày mai mình cùng thử nhé. {habit.khen}</p>
            )}
            {habitRes && <Reward earned={habitRes.earned} capped={habitRes.dailyCapped} />}
          </div>
        )}
        <p className="dq-honest">🤝 Câu này dựa trên sự trung thực — trả lời “Chưa” vẫn được điểm nhé!</p>
      </section>

      {/* -------- Nhiệm vụ 2: Đố vui -------- */}
      <section className={`dq-card ${quiz.da_lam ? 'is-done' : 'is-active'}`} aria-labelledby="quiz-q">
        <div className="dq-card__top">
          <span className="dq-badge dq-badge--sky">Nhiệm vụ 2 · Đố vui</span>
          <span className="chip chip--sun">+{quiz.diem} điểm nếu đúng</span>
        </div>
        <h2 id="quiz-q" className="dq-q">🤔 {quiz.cau_hoi}</h2>

        <ol className="dq-options">
          {quiz.lua_chon.map((opt, i) => {
            let state = ''
            if (quiz.da_lam) {
              if (i === quiz.dap_an) state = 'is-correct'
              else if (i === quiz.chon) state = 'is-wrong'
              else state = 'is-dim'
            }
            return (
              <li key={i}>
                <button
                  className={`dq-option ${state}`}
                  disabled={quiz.da_lam || busy}
                  onClick={() => answerQuiz(i)}
                  id={`quiz-opt-${i}`}
                  style={{ '--i': i }}
                >
                  <span className="dq-option__key">{String.fromCharCode(65 + i)}</span>
                  <span className="dq-option__text">{opt}</span>
                  {state === 'is-correct' && <span className="dq-option__mark">✓</span>}
                  {state === 'is-wrong' && <span className="dq-option__mark">✗</span>}
                </button>
              </li>
            )
          })}
        </ol>

        {quiz.da_lam && (
          <div className={`dq-feedback ${quiz.chon === quiz.dap_an ? 'is-ok' : 'is-bad'}`}>
            <p>
              <b>{quiz.chon === quiz.dap_an ? '🎉 Chính xác!' : '😅 Chưa đúng rồi!'}</b> {quiz.giai_thich}
            </p>
            {quizRes && <Reward earned={quizRes.earned} capped={quizRes.dailyCapped} />}
          </div>
        )}
      </section>

      {/* -------- Hoàn thành -------- */}
      {allDone && (
        <section className="dq-done" aria-live="polite">
          {levelUp ? (
            <div className="levelup">
              <p className="levelup__label">✨ Chibi đã tiến hóa! ✨</p>
              <ChibiAvatar xp={user.tong_diem_tich_luy} size={150} celebrate />
              <p className="levelup__name">{getLevel(user.tong_diem_tich_luy).ten}</p>
            </div>
          ) : (
            <ChibiAvatar xp={user.tong_diem_tich_luy} size={120} />
          )}
          <h2 className="dq-done__title">Hoàn thành Bước Chân Xanh hôm nay!</h2>
          <p className="dq-done__wait">
            ⏳ Nhiệm vụ mới sau <b>{wait.h} giờ {wait.m} phút</b>
          </p>
          <div className="ts-actions">
            <button className="btn btn--ghost" onClick={() => navigate('/')} id="quest-home">🏡 Về khu vườn</button>
            <button className="btn btn--primary" onClick={() => navigate('/choi/thung-rac')} id="quest-play">🎮 Chơi game</button>
          </div>
        </section>
      )}
    </main>
  )
}
