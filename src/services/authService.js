import { supabase } from './supabaseClient'
import * as mock from './mock/mockBackend'

export function formatUser(u) {
  if (!u) return null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  const isToday = u.ngay_cap_nhat_cuoi === today
  const diemKiem = isToday ? (u.diem_kiem_hom_nay || 0) : 0
  const conLai = Math.max(0, 30 - diemKiem)

  const ho_ten = u.vai_tro === 'admin' ? 'Admin' : u.ho_ten
  const ten_hien_thi = u.vai_tro === 'admin' ? 'Admin' : u.ten_hien_thi

  return {
    id: u.id,
    ma_dang_nhap: u.ma_dang_nhap,
    ho_ten,
    ten_hien_thi,
    lop: u.lop,
    vai_tro: u.vai_tro,
    diem_hien_co: u.diem_hien_co,
    tong_diem_tich_luy: u.tong_diem_tich_luy,
    diem_kiem_hom_nay: diemKiem,
    con_lai_hom_nay: conLai,
    nhiem_vu_hom_nay: {
      tu_khai: isToday ? u.nv_tu_khai : null,
      do_vui: isToday ? u.nv_do_vui : null,
    },
  }
}

const ADMIN_SECRET = import.meta.env?.VITE_ADMIN_PASSWORD || 'EcoChibi@2026'
const PIN_MAP_KEY = 'ecochibi_pin_map'

export function savePinCache(userId, pin) {
  if (!userId || !pin) return
  try {
    const raw = localStorage.getItem(PIN_MAP_KEY)
    const map = raw ? JSON.parse(raw) : {}
    map[userId] = String(pin)
    localStorage.setItem(PIN_MAP_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function getPinCache(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(PIN_MAP_KEY)
    const map = raw ? JSON.parse(raw) : {}
    return map[userId] || null
  } catch {
    return null
  }
}

async function ensureAdminProfileInDb(authUser) {
  if (!supabase || !authUser) return null
  try {
    const prefix = (authUser.email || '').split('@')[0] || 'admin.portal'
    await supabase.rpc('tao_tai_khoan_demo', {
      p_ma: prefix,
      p_pin: ADMIN_SECRET,
      p_ho_ten: 'Admin',
      p_lop: 'Toàn trường',
      p_vai_tro: 'admin',
      p_xu: 0,
      p_xp: 0,
    })
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    return profile
  } catch {
    return null
  }
}

export async function dangNhap(ma, pin) {
  if (!supabase) {
    return mock.dangNhap(ma, pin)
  }

  const cleanMa = ma.trim().toLowerCase()
  const cleanPin = pin.trim()

  if (cleanMa === 'admin') {
    if (cleanPin !== ADMIN_SECRET) {
      throw new Error('Mã đăng nhập hoặc mật khẩu Admin chưa chính xác.')
    }

    const adminEmail = 'admin.portal@ecochibi.local'
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: ADMIN_SECRET,
    })

    if (authError) {
      const signUpRes = await supabase.auth.signUp({
        email: adminEmail,
        password: ADMIN_SECRET,
      })
      if (!signUpRes.error && signUpRes.data?.user) {
        authData = signUpRes.data
        authError = null
      }
    }

    if (authError || !authData?.user) {
      throw new Error(authError?.message || 'Đăng nhập Admin không thành công.')
    }

    let { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (!profile) {
      profile = await ensureAdminProfileInDb(authData.user)
    }

    return formatUser(
      profile || {
        id: authData.user.id,
        ma_dang_nhap: 'ADMIN',
        ho_ten: 'Admin',
        ten_hien_thi: 'Admin',
        lop: 'Toàn trường',
        vai_tro: 'admin',
        diem_hien_co: 0,
        tong_diem_tich_luy: 0,
      },
    )
  }

  const email = `${cleanMa}@ecochibi.local`
  const password = cleanPin.length >= 6 ? cleanPin : `eco-${cleanPin}`

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    if (authError.message?.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Mã đăng nhập hoặc mật khẩu/PIN chưa chính xác.')
    }
    throw new Error(authError.message || 'Đăng nhập không thành công.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Không tìm thấy thông tin tài khoản trên hệ thống.')
  }

  return formatUser(profile)
}

export async function dangKyHocSinh({ ho_ten, lop, pin }) {
  if (!supabase) {
    return mock.dangKyHocSinh({ ho_ten, lop, pin })
  }

  // Trên Supabase: sinh mã ngẫu nhiên và đăng ký Auth
  const cleanPin = pin.trim()
  const cleanLop = (lop || '').trim().toUpperCase().replace(/\s/g, '')
  const randomSuffix = Math.floor(10 + Math.random() * 90)
  const ma = `HS${cleanLop}${randomSuffix}`
  const email = `${ma.toLowerCase()}@ecochibi.local`
  const password = `eco-${cleanPin}`

  const parts = ho_ten.trim().split(/\s+/)
  const tenHienThi = parts.length < 2 ? ho_ten.trim() : `${parts.slice(1).join(' ')} ${parts[0][0]}.`

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        ma_dang_nhap: ma,
        pin: cleanPin,
        ho_ten: ho_ten.trim(),
        ten_hien_thi: tenHienThi,
        lop: cleanLop,
      },
    },
  })

  if (authError) {
    throw new Error(authError.message || 'Không thể tạo tài khoản mới.')
  }

  let { data: profile, error: insertError } = await supabase
    .from('users')
    .upsert(
      [
        {
          id: authData.user.id,
          ma_dang_nhap: ma,
          pin: cleanPin,
          ho_ten: ho_ten.trim(),
          ten_hien_thi: tenHienThi,
          lop: cleanLop,
          vai_tro: 'student',
          diem_hien_co: 50,
          tong_diem_tich_luy: 0,
        },
      ],
      { onConflict: 'id' },
    )
    .select()
    .single()

  // Fallback nếu bảng users trên Supabase chưa chạy lệnh thêm cột pin
  if (insertError) {
    const retry = await supabase
      .from('users')
      .upsert(
        [
          {
            id: authData.user.id,
            ma_dang_nhap: ma,
            ho_ten: ho_ten.trim(),
            ten_hien_thi: tenHienThi,
            lop: cleanLop,
            vai_tro: 'student',
            diem_hien_co: 50,
            tong_diem_tich_luy: 0,
          },
        ],
        { onConflict: 'id' },
      )
      .select()
      .single()
    profile = retry.data
    insertError = retry.error
  }

  if (insertError) {
    throw new Error(insertError.message || 'Không thể lưu hồ sơ học sinh.')
  }

  savePinCache(authData.user.id, cleanPin)
  return formatUser(profile)
}

export async function dangXuat() {
  if (!supabase) {
    return mock.dangXuat()
  }
  await supabase.auth.signOut()
}

export async function layThongTinToi() {
  if (!supabase) {
    return mock.layThongTinToi()
  }

  const { data: { user: authUser }, error } = await supabase.auth.getUser()
  if (error || !authUser) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (profile) return formatUser(profile)

  if (authUser.email === 'admin.portal@ecochibi.local' || authUser.email === 'admin@ecochibi.local') {
    const syncedProfile = await ensureAdminProfileInDb(authUser)
    if (syncedProfile) return formatUser(syncedProfile)

    return formatUser({
      id: authUser.id,
      ma_dang_nhap: 'ADMIN',
      ho_ten: 'Admin',
      ten_hien_thi: 'Admin',
      lop: 'Toàn trường',
      vai_tro: 'admin',
      diem_hien_co: 0,
      tong_diem_tich_luy: 0,
    })
  }

  return null
}

export function onAuthChange(callback) {
  if (!supabase) return () => {}
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return () => subscription.unsubscribe()
}

export const resetDemoData = mock.resetDemoData
