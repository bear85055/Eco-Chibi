import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { usePlayer } from '../../context/PlayerContext'
import { layNhatKyDiem } from '../../services/teacherService'

const fmtDate = (ts) => {
  if (!ts) return ''
  const d = ts instanceof Date ? ts : new Date(ts)
  return isNaN(d.getTime())
    ? ''
    : new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(d)
}

const TYPE_CONFIG = {
  thuong_nong: { label: '⭐ Thưởng nóng', chip: 'chip--green' },
  game: { label: '🎮 Chơi game', chip: 'chip--sun' },
  doi_qua: { label: '🛍️ Đổi quà', chip: 'chip--grey' },
  hoan_xu: { label: '↩️ Hoàn Xu', chip: 'chip--sun' },
  quiz: { label: '👣 Nhiệm vụ ngày', chip: 'chip--sun' },
}

export default function PointHistory() {
  const { user } = usePlayer()
  const toast = useToast()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await layNhatKyDiem({
        lop: user.vai_tro === 'teacher' ? user.lop : 'all',
      })
      setLogs(res)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [user.vai_tro, user.lop, toast])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="history-page">
      <header className="t-header">
        <div className="t-header__title">
          <h1>📜 Nhật Ký Biến Động Điểm Xanh</h1>
          <p>
            {user.vai_tro === 'teacher'
              ? `Lịch sử cộng và trừ điểm của học sinh lớp ${user.lop}.`
              : 'Lịch sử cộng và trừ điểm của toàn bộ học sinh trong trường.'}
          </p>
        </div>
      </header>

      <div className="t-card">
        {loading ? (
          <div className="t-empty">
            <div className="spinner" />
            <p>Đang tải nhật ký điểm...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="t-empty">
            <div className="icon">📜</div>
            <p>Chưa có ghi nhận biến động điểm nào.</p>
          </div>
        ) : (
          <table className="t-table" id="point-logs-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Học sinh</th>
                <th>Lớp</th>
                <th>Loại giao dịch</th>
                <th>Biến động XP</th>
                <th>Biến động Xu</th>
                <th>Lý do / Nội dung</th>
                <th>Người duyệt / Tạo</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const conf = TYPE_CONFIG[l.loai] || { label: l.loai, chip: 'chip--grey' }
                return (
                  <tr key={l.id}>
                    <td style={{ fontSize: '0.85rem', color: 'var(--ink-600)' }}>{fmtDate(l.thoi_gian)}</td>
                    <td>
                      <b>{l.student?.ho_ten}</b>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-400)' }}>{l.student?.ma_dang_nhap}</div>
                    </td>
                    <td>
                      <span className="tag tag--grey">{l.student?.lop}</span>
                    </td>
                    <td>
                      <span className={`chip ${conf.chip}`}>{conf.label}</span>
                    </td>
                    <td>
                      {l.xp > 0 ? (
                        <b style={{ color: 'var(--green-700)' }}>+{l.xp}</b>
                      ) : (
                        <span style={{ color: 'var(--ink-400)' }}>0</span>
                      )}
                    </td>
                    <td>
                      {l.xu > 0 ? (
                        <b style={{ color: 'var(--green-700)' }}>+{l.xu}</b>
                      ) : l.xu < 0 ? (
                        <b style={{ color: 'var(--coral-500)' }}>{l.xu}</b>
                      ) : (
                        <span style={{ color: 'var(--ink-400)' }}>0</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <span style={{ fontSize: '0.9rem' }}>{l.ly_do || '—'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--ink-600)' }}>{l.tenNguoiTao}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
