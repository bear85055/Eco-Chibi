/**
 * Dịch vụ lưu trữ dữ liệu cục bộ (localStorage) khi chạy ở chế độ độc lập.
 */
import { getLevel } from '../../utils/levels'
import { HABITS, QUIZZES, dayIndex } from './questBank'

const DB_KEY = 'ecochibi_db_v3'
const SESSION_KEY = 'ecochibi_session'

export const DAILY_CAP = 30
export const MAX_REWARD_PER_ROUND = 10
export const QUEST_REWARD = { tu_khai: 2, do_vui: 5 }

/** Luật kiểm tra từng mini-game (server tự áp dụng, client không quyết định điểm) */
const GAME_RULES = {
  trash_sorting: { maxCount: 60, minMs: 10_000, maxMs: 5 * 60_000 },
  save_energy: { maxCount: 80, minMs: 10_000, maxMs: 5 * 60_000 },
}

export class ApiError extends Error {}

// ---------- Dữ liệu mẫu ----------
const STUDENTS = [
  ['Nguyễn Minh Anh', '3A', 85, 120],
  ['Trần Gia Bảo', '3A', 640, 210],
  ['Lê Khánh Linh', '3A', 512, 90],
  ['Phạm Đức Huy', '3A', 298, 40],
  ['Võ Ngọc Hân', '3B', 455, 160],
  ['Đặng Quốc Khang', '3B', 720, 300],
  ['Bùi Thảo Vy', '3B', 150, 75],
  ['Hoàng Nhật Nam', '3B', 388, 120],
  ['Đỗ Phương Thảo', '4A', 590, 240],
  ['Ngô Tuấn Kiệt', '4A', 233, 60],
  ['Dương Bảo Ngọc', '4A', 677, 180],
  ['Lý Hải Đăng', '4A', 410, 95],
  ['Mai Anh Thư', '4B', 305, 130],
  ['Trương Minh Khôi', '4B', 561, 205],
  ['Phan Thu Trang', '4B', 128, 30],
  ['Huỳnh Gia Huy', '4B', 476, 150],
  ['Vũ Khánh An', '5A', 802, 350],
  ['Hồ Thanh Tâm', '5A', 349, 110],
  ['Tạ Bảo Châu', '5A', 618, 260],
  ['Châu Minh Quân', '5A', 265, 85],
  ['Lâm Tường Vi', '5B', 533, 190],
  ['Kiều Đức Anh', '5B', 190, 55],
  ['Quách Ngọc Mai', '5B', 444, 140],
  ['Tô Hoàng Phúc', '5B', 372, 100],
]

const TEACHERS = [
  {
    id: 'admin-truong',
    ma_dang_nhap: 'ADMIN',
    pin: 'admin',
    ho_ten: 'Admin',
    ten_hien_thi: 'Admin',
    lop: 'Toàn trường',
    vai_tro: 'admin',
  },
]

const REWARDS = [
  {
    id: 'reward-pencil',
    ten_qua: 'Bút chì mầm cây',
    hinh_anh: '/assets/rewards/pencil.jpg',
    gia_xu: 40,
    so_luong_ton: 25,
    mo_ta: 'Viết hết bút có thể cắm xuống đất để trồng thành cây xanh.',
  },
  {
    id: 'reward-notebook',
    ten_qua: 'Sổ tay giấy tái chế',
    hinh_anh: '/assets/rewards/notebook.jpg',
    gia_xu: 80,
    so_luong_ton: 15,
    mo_ta: 'Sổ tay bìa kraft thân thiện với môi trường.',
  },
  {
    id: 'reward-bag',
    ten_qua: 'Túi vải Canvas Sống Xanh',
    hinh_anh: '/assets/rewards/bag.jpg',
    gia_xu: 150,
    so_luong_ton: 10,
    mo_ta: 'Túi vải bền đẹp thay thế túi nilon khi đi học, đi chợ.',
  },
  {
    id: 'reward-bottle',
    ten_qua: 'Bình nước cá nhân Eco',
    hinh_anh: '/assets/rewards/bottle.jpg',
    gia_xu: 220,
    so_luong_ton: 8,
    mo_ta: 'Bình nước gọn nhẹ giúp hạn chế rác thải chai nhựa dùng một lần.',
  },
]

// ---------- Tiện ích ----------
const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms))
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))

export function todayVN() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

function tenRutGon(hoTen) {
  const parts = hoTen.trim().split(/\s+/)
  if (parts.length < 2) return hoTen
  return `${parts.slice(1).join(' ')} ${parts[0][0]}.`
}

function seed() {
  const now = Date.now()
  const counters = {}
  const studentUsers = STUDENTS.map(([ho_ten, lop, xp, xu], i) => {
    counters[lop] = (counters[lop] || 0) + 1
    // Học sinh mẫu đầu tiên mang mã HS001 (đồng thời hỗ trợ HS3A01)
    const ma_dang_nhap = i === 0 ? 'HS001' : `HS${lop}${String(counters[lop]).padStart(2, '0')}`
    return {
      id: i === 0 ? 'student-hs001' : uid(),
      ma_dang_nhap,
      pin: '1234',
      ho_ten,
      ten_hien_thi: tenRutGon(ho_ten),
      lop,
      vai_tro: 'student',
      diem_hien_co: xu,
      tong_diem_tich_luy: xp,
      diem_kiem_hom_nay: 0,
      ngay_cap_nhat_cuoi: todayVN(),
      thoi_diem_dat_diem: now - (i + 1) * 3_600_000,
    }
  })

  const teacherUsers = TEACHERS.map((t) => ({
    ...t,
    diem_hien_co: 0,
    tong_diem_tich_luy: 0,
    diem_kiem_hom_nay: 0,
    ngay_cap_nhat_cuoi: todayVN(),
    thoi_diem_dat_diem: now,
  }))

  const users = [...studentUsers, ...teacherUsers]
  const redemptions = []
  const point_logs = []


  return {
    users,
    rewards: REWARDS.map((r) => ({ ...r, dang_hoat_dong: true })),
    redemptions,
    point_logs,
    game_sessions: [],
  }
}

function load() {
  let db
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) db = JSON.parse(raw)
  } catch {
    /* fallback */
  }
  if (!db) {
    db = seed()
    save(db)
    return db
  }
  // Đảm bảo tài khoản ADMIN luôn mang tên Admin
  let modified = false
  const admin = db.users.find((u) => u.vai_tro === 'admin' || u.ma_dang_nhap === 'ADMIN')
  if (admin && (admin.ho_ten !== 'Admin' || admin.ten_hien_thi !== 'Admin')) {
    admin.ho_ten = 'Admin'
    admin.ten_hien_thi = 'Admin'
    modified = true
  }
  if (!Array.isArray(db.rewards) || db.rewards.length === 0) {
    db.rewards = REWARDS.map((r) => ({ ...r, dang_hoat_dong: true }))
    modified = true
  }
  if (modified) save(db)
  return db
}

function sinhMaHocSinh(db, cleanLop) {
  let maxNum = 0
  const prefix = `HS${cleanLop}`
  for (const u of db.users) {
    if (u.vai_tro === 'student' && u.lop === cleanLop) {
      if (u.ma_dang_nhap.startsWith(prefix)) {
        const num = parseInt(u.ma_dang_nhap.slice(prefix.length), 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      } else if (u.ma_dang_nhap === 'HS001' && cleanLop === '3A') {
        maxNum = Math.max(maxNum, 1)
      }
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(2, '0')}`
}

function save(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function requireUser(db) {
  const id = localStorage.getItem(SESSION_KEY)
  const user = db.users.find((u) => u.id === id)
  if (!user) throw new ApiError('Phiên đăng nhập đã hết, bạn vui lòng đăng nhập lại nhé!')
  return user
}

function requireStaff(db) {
  const user = requireUser(db)
  if (user.vai_tro !== 'teacher' && user.vai_tro !== 'admin') {
    throw new ApiError('Chỉ thầy cô hoặc ban phụ trách mới có quyền truy cập trang này.')
  }
  return user
}

function resetDaily(user) {
  const today = todayVN()
  if (user.ngay_cap_nhat_cuoi !== today) {
    user.diem_kiem_hom_nay = 0
    user.ngay_cap_nhat_cuoi = today
  }
  if (user.nv_ngay !== today) {
    user.nv_ngay = today
    user.nv_tu_khai = null
    user.nv_do_vui = null
  }
}

function publicUser(u) {
  // eslint-disable-next-line no-unused-vars
  const { pin, nv_ngay, nv_tu_khai, nv_do_vui, ...rest } = u
  const isToday = nv_ngay === todayVN()
  const ho_ten = u.vai_tro === 'admin' ? 'Admin' : u.ho_ten
  const ten_hien_thi = u.vai_tro === 'admin' ? 'Admin' : u.ten_hien_thi
  return {
    ...rest,
    ho_ten,
    ten_hien_thi,
    con_lai_hom_nay: Math.max(0, DAILY_CAP - (u.diem_kiem_hom_nay || 0)),
    nhiem_vu_hom_nay: {
      tu_khai: isToday && nv_tu_khai != null,
      do_vui: isToday && nv_do_vui != null,
    },
  }
}

/** Cộng XP + Xu có áp giới hạn ngày, ghi point_logs. Trả về số điểm thực nhận. */
function grantDaily(db, user, amount, logEntry) {
  const conLai = Math.max(0, DAILY_CAP - user.diem_kiem_hom_nay)
  const earned = Math.min(amount, conLai)
  if (earned > 0) {
    user.tong_diem_tich_luy += earned
    user.diem_hien_co += earned
    user.diem_kiem_hom_nay += earned
    user.thoi_diem_dat_diem = Date.now()
    log(db, { user_id: user.id, xp: earned, xu: earned, ...logEntry })
  }
  return earned
}

function log(db, entry) {
  db.point_logs.unshift({
    id: uid(),
    thoi_gian: Date.now(),
    nguoi_tao: null,
    ly_do: null,
    tham_chieu_id: null,
    ...entry,
  })
}

// ---------- Auth ----------
export async function dangNhap(maDangNhap, pin) {
  await delay(120)
  const db = load()
  const cleanMa = (maDangNhap || '').trim().toUpperCase()
  const cleanPin = (pin || '').trim()

  let user = db.users.find((u) => u.ma_dang_nhap === cleanMa)
  // Hỗ trợ linh hoạt cho học sinh mẫu HS001 / HS3A01
  if (!user && cleanMa === 'HS3A01') {
    user = db.users.find((u) => u.ma_dang_nhap === 'HS001')
  }
  if (!user && cleanMa === 'HS001') {
    user = db.users.find((u) => u.ma_dang_nhap === 'HS3A01' || u.id === 'student-hs001')
  }
  // Hỗ trợ đăng nhập Admin
  if (!user && (cleanMa === 'ADMIN' || cleanMa === 'ADMINISTRATOR')) {
    user = db.users.find((u) => u.vai_tro === 'admin')
  }

  let isMatch = false
  if (user) {
    if (user.vai_tro === 'admin') {
      const pLower = cleanPin.toLowerCase()
      // Admin hỗ trợ admin, 1234, 123456, EcoChibi@2026 hoặc user.pin
      isMatch =
        pLower === 'admin' ||
        cleanPin === '1234' ||
        cleanPin === '123456' ||
        cleanPin === 'EcoChibi@2026' ||
        user.pin === cleanPin
    } else {
      // Học sinh hỗ trợ mã PIN đúng hoặc mã PIN mặc định 1234
      isMatch = user.pin === cleanPin || cleanPin === '1234'
    }
  }

  if (!user || !isMatch) {
    throw new ApiError('Mã đăng nhập hoặc mật khẩu/PIN chưa chính xác.')
  }
  localStorage.setItem(SESSION_KEY, user.id)
  resetDaily(user)
  save(db)
  return publicUser(user)
}

/** Đăng ký tài khoản học sinh mới */
export async function dangKyHocSinh({ ho_ten, lop, pin = '1234' }) {
  await delay(300)
  if (!ho_ten?.trim()) throw new ApiError('Vui lòng nhập họ và tên của em.')
  if (!lop?.trim()) throw new ApiError('Vui lòng chọn hoặc nhập lớp.')
  if (!/^\d{4}$/.test(pin)) throw new ApiError('Mã PIN phải gồm đúng 4 chữ số.')

  const db = load()
  const cleanLop = lop.trim().toUpperCase()
  const ma_dang_nhap = sinhMaHocSinh(db, cleanLop)

  const newUser = {
    id: uid(),
    ma_dang_nhap,
    pin,
    ho_ten: ho_ten.trim(),
    ten_hien_thi: tenRutGon(ho_ten),
    lop: cleanLop,
    vai_tro: 'student',
    diem_hien_co: 50, // quà tân thủ 50 Xu
    tong_diem_tich_luy: 0, // khởi tạo cấp 1 (Hạt mầm)
    diem_kiem_hom_nay: 0,
    ngay_cap_nhat_cuoi: todayVN(),
    thoi_diem_dat_diem: Date.now(),
  }

  db.users.push(newUser)
  log(db, {
    user_id: newUser.id,
    loai: 'thuong_nong',
    xp: 0,
    xu: 50,
    ly_do: 'Quà chào mừng thành viên mới 🌱',
  })
  localStorage.setItem(SESSION_KEY, newUser.id)
  save(db)
  return publicUser(newUser)
}

export async function dangXuat() {
  localStorage.removeItem(SESSION_KEY)
}

export async function layThongTinToi() {
  await delay(100)
  const db = load()
  const user = requireUser(db)
  resetDaily(user)
  save(db)
  return publicUser(user)
}

// ---------- Game Services ----------
export async function batDauGame(game) {
  await delay(150)
  if (!GAME_RULES[game]) throw new ApiError('Trò chơi không tồn tại.')
  const db = load()
  const user = requireUser(db)
  const session = { id: uid(), user_id: user.id, game, bat_dau: Date.now(), ket_thuc: null, so_cau_dung: null }
  db.game_sessions.push(session)
  if (db.game_sessions.length > 200) db.game_sessions = db.game_sessions.slice(-200)
  save(db)
  return { id: session.id }
}

export async function nopKetQuaGame(sessionId, soCauDung) {
  await delay(400)
  const db = load()
  const user = requireUser(db)
  resetDaily(user)

  const s = db.game_sessions.find((x) => x.id === sessionId && x.user_id === user.id)
  if (!s) throw new ApiError('Không tìm thấy lượt chơi.')
  if (s.ket_thuc) throw new ApiError('Lượt chơi này đã được tính điểm rồi.')

  const rule = GAME_RULES[s.game] || GAME_RULES.trash_sorting
  const duration = Date.now() - s.bat_dau
  const n = Number.isInteger(soCauDung) && soCauDung >= 0 ? soCauDung : -1
  s.ket_thuc = Date.now()
  s.so_cau_dung = n

  if (n < 0 || n > rule.maxCount || duration < rule.minMs || duration > rule.maxMs) {
    save(db)
    throw new ApiError('Kết quả lượt chơi không hợp lệ nên không được tính điểm.')
  }

  const base = Math.min(n, MAX_REWARD_PER_ROUND)
  const levelBefore = getLevel(user.tong_diem_tich_luy).cap
  const earned = grantDaily(db, user, base, { loai: 'game', tham_chieu_id: s.id })
  save(db)

  return {
    earned,
    base,
    roundCapped: n > MAX_REWARD_PER_ROUND,
    dailyCapped: earned < base,
    levelUp: getLevel(user.tong_diem_tich_luy).cap > levelBefore,
    user: publicUser(user),
  }
}

// ---------- Bước Chân Xanh (Nhiệm vụ hằng ngày) ----------
function questOfDay() {
  const d = dayIndex(todayVN())
  return { habit: HABITS[d % HABITS.length], quiz: QUIZZES[d % QUIZZES.length] }
}

/** Lấy nhiệm vụ hôm nay. Chỉ trả đáp án của câu đố nếu học sinh ĐÃ trả lời. */
export async function layNhiemVuHomNay() {
  await delay(150)
  const db = load()
  const user = requireUser(db)
  resetDaily(user)
  save(db)
  const { habit, quiz } = questOfDay()
  const daTraLoi = user.nv_do_vui
  return {
    ngay: todayVN(),
    tu_khai: {
      id: habit.id,
      icon: habit.icon,
      cau_hoi: habit.cau_hoi,
      diem: QUEST_REWARD.tu_khai,
      da_lam: user.nv_tu_khai != null,
      tra_loi: user.nv_tu_khai,
      khen: user.nv_tu_khai != null ? habit.khen : null,
    },
    do_vui: {
      id: quiz.id,
      cau_hoi: quiz.cau_hoi,
      lua_chon: quiz.lua_chon,
      diem: QUEST_REWARD.do_vui,
      da_lam: daTraLoi != null,
      chon: daTraLoi?.chon ?? null,
      dap_an: daTraLoi ? quiz.dap_an : null,
      giai_thich: daTraLoi ? quiz.giai_thich : null,
    },
    user: publicUser(user),
  }
}

/**
 * Nộp nhiệm vụ: loai = 'tu_khai' (traLoi: boolean) | 'do_vui' (traLoi: chỉ số lựa chọn).
 * Câu tự khai báo được thưởng dù trả lời Có hay Chưa — để khuyến khích trung thực.
 */
export async function nopNhiemVu(loai, traLoi) {
  await delay(350)
  const db = load()
  const user = requireUser(db)
  resetDaily(user)
  const { habit, quiz } = questOfDay()
  const levelBefore = getLevel(user.tong_diem_tich_luy).cap

  if (loai === 'tu_khai') {
    if (user.nv_tu_khai != null) throw new ApiError('Hôm nay em đã trả lời câu này rồi, mai quay lại nhé!')
    if (typeof traLoi !== 'boolean') throw new ApiError('Câu trả lời không hợp lệ.')
    user.nv_tu_khai = traLoi
    const earned = grantDaily(db, user, QUEST_REWARD.tu_khai, {
      loai: 'quiz',
      ly_do: `Tự khai báo: ${habit.cau_hoi} → ${traLoi ? 'Có' : 'Chưa'}`,
    })
    save(db)
    return {
      earned,
      dailyCapped: earned < QUEST_REWARD.tu_khai,
      khen: habit.khen,
      levelUp: getLevel(user.tong_diem_tich_luy).cap > levelBefore,
      user: publicUser(user),
    }
  }

  if (loai === 'do_vui') {
    if (user.nv_do_vui != null) throw new ApiError('Hôm nay em đã giải câu đố rồi, mai có câu mới nhé!')
    if (!Number.isInteger(traLoi) || traLoi < 0 || traLoi >= quiz.lua_chon.length) {
      throw new ApiError('Câu trả lời không hợp lệ.')
    }
    const dung = traLoi === quiz.dap_an
    user.nv_do_vui = { chon: traLoi, dung }
    const earned = dung
      ? grantDaily(db, user, QUEST_REWARD.do_vui, { loai: 'quiz', ly_do: `Đố vui đúng: ${quiz.cau_hoi}` })
      : 0
    save(db)
    return {
      dung,
      earned,
      dailyCapped: dung && earned < QUEST_REWARD.do_vui,
      dap_an: quiz.dap_an,
      giai_thich: quiz.giai_thich,
      levelUp: getLevel(user.tong_diem_tich_luy).cap > levelBefore,
      user: publicUser(user),
    }
  }

  throw new ApiError('Loại nhiệm vụ không hợp lệ.')
}

// ---------- Bảng xếp hạng ----------
export async function layBangXepHang() {
  await delay(180)
  const db = load()
  const me = requireUser(db)
  const ranked = db.users
    .filter((u) => u.vai_tro === 'student')
    .sort((a, b) => b.tong_diem_tich_luy - a.tong_diem_tich_luy || a.thoi_diem_dat_diem - b.thoi_diem_dat_diem)
    .map((u, i) => ({ id: u.id, hang: i + 1, ten_hien_thi: u.ten_hien_thi, lop: u.lop, xp: u.tong_diem_tich_luy }))
  return { top: ranked.slice(0, 20), toi: ranked.find((r) => r.id === me.id) || null, tong: ranked.length }
}

// ---------- Cửa hàng & Hộp quà ----------
export async function layDanhSachQua() {
  await delay(150)
  const db = load()
  requireUser(db)
  return db.rewards.filter((r) => r.dang_hoat_dong)
}

function sinhMaNhanQua(db) {
  let code
  do {
    code = `GX-${Math.floor(1000 + Math.random() * 9000)}`
  } while (db.redemptions.some((r) => r.ma_nhan_qua === code))
  return code
}

export async function doiQua(rewardId) {
  await delay(400)
  const db = load()
  const user = requireUser(db)
  const reward = db.rewards.find((r) => r.id === rewardId)

  if (!reward || !reward.dang_hoat_dong) throw new ApiError('Món quà này đang tạm ẩn.')
  if (reward.so_luong_ton <= 0) throw new ApiError('Ôi, món quà này vừa hết mất rồi!')
  if (user.diem_hien_co < reward.gia_xu) throw new ApiError(`Em còn thiếu ${reward.gia_xu - user.diem_hien_co} Xu Xanh nữa.`)

  reward.so_luong_ton -= 1
  user.diem_hien_co -= reward.gia_xu

  const redemption = {
    id: uid(),
    ma_nhan_qua: sinhMaNhanQua(db),
    user_id: user.id,
    reward_id: reward.id,
    gia_xu_luc_doi: reward.gia_xu,
    trang_thai: 'pending',
    ngay_doi: Date.now(),
    ngay_nhan: null,
    nguoi_duyet: null,
  }
  db.redemptions.push(redemption)
  log(db, { user_id: user.id, loai: 'doi_qua', xp: 0, xu: -reward.gia_xu, tham_chieu_id: redemption.id, ly_do: `Đổi quà: ${reward.ten_qua}` })
  save(db)

  return { redemption: { ...redemption, reward }, user: publicUser(user) }
}

export async function layHopQua() {
  await delay(150)
  const db = load()
  const user = requireUser(db)
  return db.redemptions
    .filter((r) => r.user_id === user.id)
    .sort((a, b) => b.ngay_doi - a.ngay_doi)
    .map((r) => ({ ...r, reward: db.rewards.find((x) => x.id === r.reward_id) }))
}

// ===================================================================
// PHÂN HỆ QUẢN TRỊ
// ===================================================================

/** Lấy danh sách đổi quà để duyệt (lọc theo lớp và từ khóa mã/tên) */
export async function layDanhSachDuyetQua({ lop = 'all', tuKhoa = '', trangThai = 'all' } = {}) {
  await delay(200)
  const db = load()
  const staff = requireStaff(db)
  const isTeacher = staff.vai_tro === 'teacher'
  const filterLop = isTeacher ? staff.lop : lop

  const q = tuKhoa.trim().toUpperCase()

  const list = db.redemptions
    .map((r) => {
      const student = db.users.find((u) => u.id === r.user_id)
      const reward = db.rewards.find((x) => x.id === r.reward_id)
      const duyetBoi = r.nguoi_duyet ? db.users.find((u) => u.id === r.nguoi_duyet) : null
      return {
        ...r,
        student: student ? publicUser(student) : null,
        reward,
        tenNguoiDuyet: duyetBoi ? duyetBoi.ho_ten : null,
      }
    })
    .filter((r) => {
      if (!r.student) return false
      if (filterLop !== 'all' && r.student.lop !== filterLop) return false
      if (trangThai !== 'all' && r.trang_thai !== trangThai) return false
      if (q) {
        const matchCode = r.ma_nhan_qua.includes(q)
        const matchName = r.student.ho_ten.toUpperCase().includes(q)
        const matchMaHS = r.student.ma_dang_nhap.includes(q)
        if (!matchCode && !matchName && !matchMaHS) return false
      }
      return true
    })
    .sort((a, b) => {
      // Pending lên trước, sau đó sắp xếp theo thời gian mới nhất
      if (a.trang_thai === 'pending' && b.trang_thai !== 'pending') return -1
      if (a.trang_thai !== 'pending' && b.trang_thai === 'pending') return 1
      return b.ngay_doi - a.ngay_doi
    })

  return {
    items: list,
    soLuongCho: db.redemptions.filter((r) => {
      const student = db.users.find((u) => u.id === r.user_id)
      if (!student) return false
      if (isTeacher && student.lop !== staff.lop) return false
      return r.trang_thai === 'pending'
    }).length,
  }
}

/** Giáo viên xác nhận đã phát quà cho học sinh */
export async function xacNhanPhatQua(redemptionId) {
  await delay(250)
  const db = load()
  const staff = requireStaff(db)
  const item = db.redemptions.find((r) => r.id === redemptionId || r.ma_nhan_qua === redemptionId.trim().toUpperCase())

  if (!item) throw new ApiError('Không tìm thấy mã đổi quà này.')
  if (item.trang_thai === 'completed') throw new ApiError('Món quà này đã được phát rồi.')
  if (item.trang_thai === 'cancelled') throw new ApiError('Đơn đổi quà này đã bị hủy trước đó.')

  const student = db.users.find((u) => u.id === item.user_id)
  if (staff.vai_tro === 'teacher' && student && student.lop !== staff.lop) {
    throw new ApiError(`Bạn chỉ có quyền duyệt quà cho học sinh lớp ${staff.lop}.`)
  }

  item.trang_thai = 'completed'
  item.ngay_nhan = Date.now()
  item.nguoi_duyet = staff.id

  save(db)
  return { success: true, item }
}

/** Hủy đổi quà & hoàn Xu Xanh về ví học sinh, hoàn lại số lượng tồn kho */
export async function huyDoiQua(redemptionId, lyDo = 'Hết quà thực tế hoặc hủy theo yêu cầu') {
  await delay(300)
  const db = load()
  const staff = requireStaff(db)
  const item = db.redemptions.find((r) => r.id === redemptionId)

  if (!item) throw new ApiError('Không tìm thấy đơn đổi quà.')
  if (item.trang_thai !== 'pending') throw new ApiError('Chỉ có thể hủy đơn quà đang ở trạng thái Chờ nhận.')

  const student = db.users.find((u) => u.id === item.user_id)
  const reward = db.rewards.find((x) => x.id === item.reward_id)

  if (staff.vai_tro === 'teacher' && student && student.lop !== staff.lop) {
    throw new ApiError(`Bạn chỉ có quyền xử lý học sinh lớp ${staff.lop}.`)
  }

  // Hoàn Xu cho học sinh
  if (student) {
    student.diem_hien_co += item.gia_xu_luc_doi
    log(db, {
      user_id: student.id,
      loai: 'hoan_xu',
      xp: 0,
      xu: item.gia_xu_luc_doi,
      ly_do: `Hoàn Xu quà: ${reward?.ten_qua || 'Quà'} (${lyDo})`,
      nguoi_tao: staff.id,
      tham_chieu_id: item.id,
    })
  }

  // Hoàn tồn kho
  if (reward) {
    reward.so_luong_ton += 1
  }

  item.trang_thai = 'cancelled'
  item.ngay_nhan = Date.now()
  item.nguoi_duyet = staff.id

  save(db)
  return { success: true, item }
}

/** Lấy toàn bộ kho quà (Dành cho Giáo viên / Admin) */
export async function layKhoQuaAdmin() {
  await delay(150)
  const db = load()
  requireStaff(db)
  return db.rewards
}

/** Lưu cập nhật hoặc thêm món quà mới */
export async function luuMonQua(data) {
  await delay(250)
  const db = load()
  const staff = requireStaff(db)
  if (staff.vai_tro !== 'admin' && staff.vai_tro !== 'teacher') {
    throw new ApiError('Chỉ Giáo viên và Ban phụ trách mới có quyền chỉnh sửa kho quà.')
  }

  if (!data.ten_qua?.trim()) throw new ApiError('Vui lòng nhập tên món quà.')
  if (!Number.isInteger(data.gia_xu) || data.gia_xu <= 0) throw new ApiError('Giá xu phải lớn hơn 0.')
  if (!Number.isInteger(data.so_luong_ton) || data.so_luong_ton < 0) throw new ApiError('Số lượng tồn kho không hợp lệ.')

  let item
  if (data.id) {
    item = db.rewards.find((r) => r.id === data.id)
    if (!item) throw new ApiError('Không tìm thấy món quà.')
    Object.assign(item, {
      ten_qua: data.ten_qua.trim(),
      gia_xu: data.gia_xu,
      so_luong_ton: data.so_luong_ton,
      dang_hoat_dong: Boolean(data.dang_hoat_dong),
      mo_ta: data.mo_ta || '',
      hinh_anh: data.hinh_anh || item.hinh_anh,
    })
  } else {
    item = {
      id: uid(),
      ten_qua: data.ten_qua.trim(),
      gia_xu: data.gia_xu,
      so_luong_ton: data.so_luong_ton,
      dang_hoat_dong: true,
      mo_ta: data.mo_ta || '',
      hinh_anh: data.hinh_anh || '/assets/rewards/pencil.jpg',
    }
    db.rewards.push(item)
  }

  save(db)
  return item
}

/** Lấy danh sách học sinh theo lớp và tìm kiếm */
export async function layDanhSachHocSinh({ lop = 'all', tuKhoa = '' } = {}) {
  await delay(180)
  const db = load()
  const staff = requireStaff(db)
  const isTeacher = staff.vai_tro === 'teacher'
  const filterLop = isTeacher ? staff.lop : lop
  const q = tuKhoa.trim().toUpperCase()

  const list = db.users
    .filter((u) => u.vai_tro === 'student')
    .filter((u) => {
      if (filterLop !== 'all' && u.lop !== filterLop) return false
      if (q && !u.ho_ten.toUpperCase().includes(q) && !u.ma_dang_nhap.includes(q)) return false
      return true
    })
    .map((u) => ({
      ...publicUser(u),
      pin: u.pin, // Giáo viên xem được để cấp lại
    }))
    .sort((a, b) => a.lop.localeCompare(b.lop) || a.ho_ten.localeCompare(b.ho_ten, 'vi'))

  // Thống kê các lớp hiện có
  const danhSachLop = [...new Set(db.users.filter((u) => u.vai_tro === 'student').map((u) => u.lop))].sort()

  return { items: list, danhSachLop, vaiTro: staff.vai_tro, lopPhuTrach: staff.lop }
}

/** Thưởng nóng điểm xanh cho học sinh làm việc tốt ngoài đời thực */
export async function congDiemThuongHocSinh(studentId, { diem, lyDo }) {
  await delay(250)
  const db = load()
  const staff = requireStaff(db)
  const student = db.users.find((u) => u.id === studentId && u.vai_tro === 'student')

  if (!student) throw new ApiError('Không tìm thấy học sinh.')
  if (staff.vai_tro === 'teacher' && student.lop !== staff.lop) {
    throw new ApiError(`Bạn chỉ có quyền cộng điểm cho học sinh lớp ${staff.lop}.`)
  }

  const n = parseInt(diem, 10)
  if (isNaN(n) || n <= 0 || n > 50) throw new ApiError('Điểm thưởng phải từ 1 đến 50 điểm.')
  if (!lyDo?.trim()) throw new ApiError('Vui lòng ghi rõ lý do thưởng điểm (ví dụ: Nhặt rác sân trường).')

  student.diem_hien_co += n
  student.tong_diem_tich_luy += n
  student.thoi_diem_dat_diem = Date.now()

  log(db, {
    user_id: student.id,
    loai: 'thuong_nong',
    xp: n,
    xu: n,
    ly_do: lyDo.trim(),
    nguoi_tao: staff.id,
  })

  save(db)
  return { success: true, student: publicUser(student) }
}

/** Cấp lại PIN 4 số ngẫu nhiên cho học sinh */
export async function capLaiPinHocSinh(studentId) {
  await delay(200)
  const db = load()
  const staff = requireStaff(db)
  const student = db.users.find((u) => u.id === studentId && u.vai_tro === 'student')

  if (!student) throw new ApiError('Không tìm thấy học sinh.')
  if (staff.vai_tro === 'teacher' && student.lop !== staff.lop) {
    throw new ApiError(`Bạn chỉ có quyền thao tác học sinh lớp ${staff.lop}.`)
  }

  const newPin = String(Math.floor(1000 + Math.random() * 9000))
  student.pin = newPin
  save(db)
  return { success: true, newPin, student: publicUser(student) }
}

/** Thêm học sinh thủ công từ trang Quản trị */
export async function themHocSinhThuCong({ ho_ten, lop, pin = '1234' }) {
  await delay(250)
  const staff = requireStaff(load())
  if (!ho_ten?.trim()) throw new ApiError('Vui lòng nhập họ và tên học sinh.')
  if (!lop?.trim()) throw new ApiError('Vui lòng nhập lớp học.')
  if (!/^\d{4}$/.test(pin)) throw new ApiError('Mã PIN phải gồm đúng 4 chữ số.')

  const cleanLop = lop.trim().toUpperCase().replace(/\s/g, '')
  if (staff.vai_tro === 'teacher' && cleanLop !== staff.lop) {
    throw new ApiError(`Giáo viên chỉ có thể thêm học sinh vào lớp ${staff.lop}.`)
  }

  const db = load()
  const ma_dang_nhap = sinhMaHocSinh(db, cleanLop)

  const newUser = {
    id: uid(),
    ma_dang_nhap,
    pin,
    ho_ten: ho_ten.trim(),
    ten_hien_thi: tenRutGon(ho_ten),
    lop: cleanLop,
    vai_tro: 'student',
    diem_hien_co: 50,
    tong_diem_tich_luy: 50,
    diem_kiem_hom_nay: 0,
    ngay_cap_nhat_cuoi: todayVN(),
    thoi_diem_dat_diem: Date.now(),
  }

  db.users.push(newUser)
  save(db)
  return {
    ...publicUser(newUser),
    pin: newUser.pin,
  }
}

/** Lấy nhật ký điểm point_logs */
export async function layNhatKyDiem({ lop = 'all', limit = 50 } = {}) {
  await delay(180)
  const db = load()
  const staff = requireStaff(db)
  const isTeacher = staff.vai_tro === 'teacher'
  const filterLop = isTeacher ? staff.lop : lop

  const list = db.point_logs
    .map((l) => {
      const student = db.users.find((u) => u.id === l.user_id)
      const creator = l.nguoi_tao ? db.users.find((u) => u.id === l.nguoi_tao) : null
      return {
        ...l,
        student: student ? publicUser(student) : null,
        tenNguoiTao: creator ? creator.ho_ten : 'Hệ thống',
      }
    })
    .filter((l) => {
      if (!l.student) return false
      if (filterLop !== 'all' && l.student.lop !== filterLop) return false
      return true
    })
    .slice(0, limit)

  return list
}

/** Đặt lại dữ liệu demo */
export function resetDemoData() {
  localStorage.removeItem(DB_KEY)
  localStorage.removeItem(SESSION_KEY)
}
