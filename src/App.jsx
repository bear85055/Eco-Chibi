import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { PlayerProvider, usePlayer } from './context/PlayerContext'
import { ToastProvider } from './context/ToastContext'
import HeaderBar from './components/HeaderBar'
import BottomNav from './components/BottomNav'
import TeacherLayout from './layouts/TeacherLayout'
import Login from './pages/Login'
import Home from './pages/student/Home'
import Leaderboard from './pages/student/Leaderboard'
import Shop from './pages/student/Shop'
import MyGiftBox from './pages/student/MyGiftBox'
import TrashSorting from './games/TrashSorting'
import SaveEnergy from './games/SaveEnergy'
import DailyQuiz from './games/DailyQuiz'

import VerifyGift from './pages/teacher/VerifyGift'
import ManageStock from './pages/teacher/ManageStock'
import StudentList from './pages/teacher/StudentList'
import PointHistory from './pages/teacher/PointHistory'

const LEAVES = ['🍃', '🌿', '🍀', '🍃', '🌱']

function BackgroundDecor() {
  return (
    <div className="bg-decor" aria-hidden="true">
      <span className="blob blob--1" />
      <span className="blob blob--2" />
      <span className="blob blob--3" />
      {LEAVES.map((l, i) => (
        <span
          key={i}
          className="leaf"
          style={{
            left: `${10 + i * 20}%`,
            animationDuration: `${16 + i * 4}s`,
            animationDelay: `${-i * 5}s`,
          }}
        >
          {l}
        </span>
      ))}
    </div>
  )
}

function RequireAuth() {
  const { user, loading } = usePlayer()
  if (loading) {
    return (
      <div className="screen-center" style={{ minHeight: '100dvh' }}>
        <div className="spinner" />
      </div>
    )
  }
  if (!user) return <Navigate to="/dang-nhap" replace />
  return <Outlet />
}

function RequireStaff() {
  const { user, loading } = usePlayer()
  if (loading) {
    return (
      <div className="screen-center" style={{ minHeight: '100dvh' }}>
        <div className="spinner" />
      </div>
    )
  }
  if (!user) return <Navigate to="/dang-nhap" replace />
  if (user.vai_tro !== 'teacher' && user.vai_tro !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

function StudentLayout() {
  return (
    <div className="app-shell">
      <HeaderBar />
      <main className="page">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <PlayerProvider>
        <BackgroundDecor />
        <Routes>
          <Route path="/dang-nhap" element={<Login />} />

          {/* Phân hệ Học sinh */}
          <Route element={<RequireAuth />}>
            <Route element={<StudentLayout />}>
              <Route index element={<Home />} />
              <Route path="xep-hang" element={<Leaderboard />} />
              <Route path="cua-hang" element={<Shop />} />
              <Route path="hop-qua" element={<MyGiftBox />} />
            </Route>
            <Route path="choi/thung-rac" element={<TrashSorting />} />
            <Route path="choi/tiet-kiem" element={<SaveEnergy />} />
            <Route path="choi/buoc-chan-xanh" element={<DailyQuiz />} />
          </Route>

          {/* Phân hệ Quản trị */}
          <Route path="/giao-vien" element={<RequireStaff />}>
            <Route element={<TeacherLayout />}>
              <Route index element={<VerifyGift />} />
              <Route path="duyet-qua" element={<VerifyGift />} />
              <Route path="hoc-sinh" element={<StudentList />} />
              <Route path="kho-qua" element={<ManageStock />} />
              <Route path="nhat-ky" element={<PointHistory />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PlayerProvider>
    </ToastProvider>
  )
}
