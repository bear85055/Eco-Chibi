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

export async function dangNhap(ma, pin) {
  if (!supabase) {
    return mock.dangNhap(ma, pin)
  }

  const cleanMa = ma.trim().toLowerCase()
  const cleanPin = pin.trim()
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

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    throw new Error(authError.message || 'Không thể tạo tài khoản mới.')
  }

  const parts = ho_ten.trim().split(/\s+/)
  const tenHienThi = parts.length < 2 ? ho_ten : `${parts.slice(1).join(' ')} ${parts[0][0]}.`

  const { data: profile, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        id: authData.user.id,
        ma_dang_nhap: ma,
        ho_ten: ho_ten.trim(),
        ten_hien_thi: tenHienThi,
        lop: cleanLop,
        vai_tro: 'student',
        diem_hien_co: 50, // Quà tân thủ
        tong_diem_tich_luy: 0,
      },
    ])
    .select()
    .single()

  if (insertError) {
    throw new Error(insertError.message || 'Không thể lưu hồ sơ học sinh.')
  }

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

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return profile ? formatUser(profile) : null
}

export const resetDemoData = mock.resetDemoData
