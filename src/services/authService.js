import { supabase } from './supabaseClient'
import * as mock from './mock/mockBackend'

export function sanitizeUsername(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 28)
}

export function encodeTenVaTruong(hoTen, truong) {
  const cleanHoTen = (hoTen || '').trim()
  const parts = cleanHoTen.split(/\s+/)
  const tenRutGon = parts.length < 2 ? cleanHoTen : `${parts.slice(1).join(' ')} ${parts[0][0]}.`
  const cleanTruong = (truong || '').trim()
  if (!cleanTruong) return tenRutGon.slice(0, 64)
  return `${tenRutGon} • ${cleanTruong}`.slice(0, 64)
}

export function parseTenVaTruong(u) {
  if (!u) return { ten_hien_thi: '', truong: '' }
  const raw = u.ten_hien_thi || u.ho_ten || ''
  if (u.truong) {
    return {
      ten_hien_thi: raw.includes(' • ') ? raw.split(' • ')[0].trim() : raw,
      truong: u.truong,
    }
  }
  if (raw.includes(' • ')) {
    const [ten, ...rest] = raw.split(' • ')
    return { ten_hien_thi: ten.trim(), truong: rest.join(' • ').trim() }
  }
  return { ten_hien_thi: raw, truong: '' }
}

export function formatUser(u) {
  if (!u) return null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  const isToday = u.ngay_cap_nhat_cuoi === today
  const diemKiem = isToday ? (u.diem_kiem_hom_nay || 0) : 0
  const conLai = Math.max(0, 30 - diemKiem)

  const parsed = parseTenVaTruong(u)
  const ho_ten = u.vai_tro === 'admin' ? 'Admin' : u.ho_ten
  const ten_hien_thi = u.vai_tro === 'admin' ? 'Admin' : parsed.ten_hien_thi

  return {
    id: u.id,
    ma_dang_nhap: u.ma_dang_nhap,
    ho_ten,
    ten_hien_thi,
    lop: u.lop,
    truong: parsed.truong || '',
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

  const cleanMa = sanitizeUsername(ma)
  const cleanPin = (pin || '').trim()

  if (!cleanMa) {
    throw new Error('Vui lòng nhập tên đăng nhập.')
  }

  if (cleanMa === 'admin') {
    if (cleanPin !== ADMIN_SECRET) {
      throw new Error('Tài khoản hoặc mật khẩu Admin chưa chính xác.')
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
  const primaryPassword = `eco-${cleanPin}`

  let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: primaryPassword,
  })

  // Tương thích ngược nếu mật khẩu >= 6 ký tự từng lưu không có tiền tố eco-
  if (authError && cleanPin.length >= 6) {
    const retryRes = await supabase.auth.signInWithPassword({
      email,
      password: cleanPin,
    })
    if (!retryRes.error && retryRes.data?.user) {
      authData = retryRes.data
      authError = null
    }
  }

  if (authError) {
    if (authError.message?.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Tên đăng nhập hoặc mật khẩu chưa chính xác.')
    }
    throw new Error(authError.message || 'Đăng nhập không thành công.')
  }

  savePinCache(authData.user.id, cleanPin)

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

export async function dangKyHocSinh({ ho_ten, lop, truong = '', ten_dang_nhap = '', pin }) {
  if (!supabase) {
    return mock.dangKyHocSinh({ ho_ten, lop, truong, ten_dang_nhap, pin })
  }

  const cleanHoTen = (ho_ten || '').trim()
  const cleanLop = (lop || '').trim().toUpperCase().replace(/\s/g, '')
  const cleanTruong = (truong || '').trim()
  const cleanPin = (pin || '').trim()

  if (!cleanHoTen) throw new Error('Vui lòng nhập họ và tên của em.')
  if (!cleanLop) throw new Error('Vui lòng nhập lớp của em.')
  if (!cleanTruong) throw new Error('Vui lòng nhập tên trường của em.')
  if (cleanPin.length < 4) throw new Error('Mật khẩu cần có ít nhất 4 ký tự.')

  const randomSuffix = Math.floor(10 + Math.random() * 90)
  const cleanUsername = ten_dang_nhap
    ? sanitizeUsername(ten_dang_nhap)
    : sanitizeUsername(`hs${cleanLop}${randomSuffix}`)

  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error('Tên đăng nhập cần có ít nhất 3 ký tự (chữ không dấu hoặc số).')
  }
  if (cleanUsername === 'admin' || cleanUsername === 'administrator') {
    throw new Error('Tên đăng nhập này dành riêng cho quản trị viên, em hãy chọn tên khác nhé!')
  }

  const email = `${cleanUsername}@ecochibi.local`
  const password = `eco-${cleanPin}`
  const encodedTenHienThi = encodeTenVaTruong(cleanHoTen, cleanTruong)

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        ma_dang_nhap: cleanUsername,
        pin: cleanPin,
        ho_ten: cleanHoTen,
        ten_hien_thi: encodedTenHienThi,
        lop: cleanLop,
        truong: cleanTruong,
      },
    },
  })

  if (authError) {
    const msg = authError.message?.toLowerCase() || ''
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
      throw new Error('Tên đăng nhập này đã có bạn sử dụng rồi, em hãy chọn tên đăng nhập khác nhé!')
    }
    throw new Error(authError.message || 'Không thể tạo tài khoản mới.')
  }

  // Kiểm tra xem trigger handle_new_auth_user đã tự động tạo dòng trong public.users chưa
  let { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (!profile) {
    let { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          ma_dang_nhap: cleanUsername,
          pin: cleanPin,
          ho_ten: cleanHoTen,
          ten_hien_thi: encodedTenHienThi,
          lop: cleanLop,
          vai_tro: 'student',
          diem_hien_co: 50,
          tong_diem_tich_luy: 0,
        },
      ])
      .select()
      .single()

    if (insertError) {
      const retry = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            ma_dang_nhap: cleanUsername,
            ho_ten: cleanHoTen,
            ten_hien_thi: encodedTenHienThi,
            lop: cleanLop,
            vai_tro: 'student',
            diem_hien_co: 50,
            tong_diem_tich_luy: 0,
          },
        ])
        .select()
        .single()
      inserted = retry.data
      insertError = retry.error
    }

    if (insertError) {
      const errMsg = insertError.message?.toLowerCase() || ''
      if (errMsg.includes('duplicate') || errMsg.includes('unique')) {
        throw new Error('Tên đăng nhập này đã có bạn sử dụng rồi, em hãy chọn tên đăng nhập khác nhé!')
      }
      throw new Error(insertError.message || 'Không thể lưu hồ sơ học sinh.')
    }
    profile = inserted
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
