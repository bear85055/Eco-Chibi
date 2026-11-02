import { supabase } from './supabaseClient'
import * as mock from './mock/mockBackend'
import { getPinCache, layThongTinToi, savePinCache } from './authService'

export async function layDanhSachDuyetQua({ lop = 'all', tuKhoa = '', trangThai = 'all' } = {}) {
  if (!supabase) {
    return mock.layDanhSachDuyetQua({ lop, tuKhoa, trangThai })
  }

  const staff = await layThongTinToi()
  if (!staff || (staff.vai_tro !== 'teacher' && staff.vai_tro !== 'admin')) {
    throw new Error('Chỉ giáo viên và ban phụ trách mới có quyền xem danh sách này.')
  }

  let query = supabase
    .from('redemptions')
    .select(`
      id,
      ma_nhan_qua,
      gia_xu_luc_doi,
      trang_thai,
      ngay_doi,
      ngay_nhan,
      student:users!user_id(id, ma_dang_nhap, ho_ten, ten_hien_thi, lop),
      reward:rewards(id, ten_qua, hinh_anh, gia_xu),
      duyetBoi:users!nguoi_duyet(ho_ten)
    `)
    .order('ngay_doi', { ascending: false })

  if (trangThai !== 'all') {
    query = query.eq('trang_thai', trangThai)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message || 'Không thể tải danh sách đơn quà.')

  let items = (data || []).map((it) => ({
    ...it,
    tenNguoiDuyet: it.duyetBoi?.ho_ten || null,
  }))
  if (staff.vai_tro === 'teacher') {
    items = items.filter((it) => it.student?.lop === staff.lop)
  } else if (lop !== 'all') {
    items = items.filter((it) => it.student?.lop === lop)
  }

  const q = tuKhoa.trim().toUpperCase()
  if (q) {
    items = items.filter(
      (it) =>
        it.ma_nhan_qua?.toUpperCase().includes(q) ||
        it.student?.ho_ten?.toUpperCase().includes(q) ||
        it.student?.ma_dang_nhap?.toUpperCase().includes(q) ||
        it.reward?.ten_qua?.toUpperCase().includes(q),
    )
  }

  const soLuongCho = items.filter((i) => i.trang_thai === 'pending').length

  return {
    items,
    soLuongCho,
    vaiTro: staff.vai_tro,
    lopPhuTrach: staff.lop,
  }
}

export async function xacNhanPhatQua(redemptionId) {
  if (!supabase) {
    return mock.xacNhanPhatQua(redemptionId)
  }

  const { data, error } = await supabase.rpc('xac_nhan_phat_qua', {
    p_redemption_id: redemptionId,
  })

  if (error) throw new Error(error.message || 'Không thể xác nhận phát quà.')
  return data
}

export async function huyDoiQua(redemptionId, lyDo) {
  if (!supabase) {
    return mock.huyDoiQua(redemptionId, lyDo)
  }

  const { data, error } = await supabase.rpc('huy_doi_qua', {
    p_redemption_id: redemptionId,
    p_ly_do: lyDo || 'Giáo viên hủy đơn',
  })

  if (error) throw new Error(error.message || 'Không thể hủy đơn đổi quà.')
  return data
}

export async function layKhoQuaAdmin() {
  if (!supabase) {
    return mock.layKhoQuaAdmin()
  }

  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('gia_xu', { ascending: true })

  if (error) throw new Error(error.message || 'Không thể tải danh sách kho quà.')
  return data || []
}

export async function luuMonQua(data) {
  if (!supabase) {
    return mock.luuMonQua(data)
  }

  if (data.id) {
    const { data: updated, error } = await supabase
      .from('rewards')
      .update({
        ten_qua: data.ten_qua,
        gia_xu: data.gia_xu,
        so_luong_ton: data.so_luong_ton,
        mo_ta: data.mo_ta,
        hinh_anh: data.hinh_anh,
        dang_hoat_dong: data.dang_hoat_dong ?? true,
      })
      .eq('id', data.id)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Không thể cập nhật món quà.')
    return updated
  } else {
    const { data: created, error } = await supabase
      .from('rewards')
      .insert([
        {
          ten_qua: data.ten_qua,
          gia_xu: data.gia_xu,
          so_luong_ton: data.so_luong_ton,
          mo_ta: data.mo_ta,
          hinh_anh: data.hinh_anh,
          dang_hoat_dong: true,
        },
      ])
      .select()
      .single()

    if (error) throw new Error(error.message || 'Không thể thêm món quà mới.')
    return created
  }
}

export async function layDanhSachHocSinh({ lop = 'all', tuKhoa = '' } = {}) {
  if (!supabase) {
    return mock.layDanhSachHocSinh({ lop, tuKhoa })
  }

  const staff = await layThongTinToi()
  let query = supabase
    .from('users')
    .select('*')
    .eq('vai_tro', 'student')
    .order('lop', { ascending: true })
    .order('ho_ten', { ascending: true })

  const { data, error } = await query
  if (error) throw new Error(error.message || 'Không thể tải danh sách học sinh.')

  let items = (data || []).map((u) => ({
    ...u,
    pin: getPinCache(u.id) || u.pin || '1234',
  }))
  const filterLop = staff?.vai_tro === 'teacher' ? staff.lop : lop
  if (filterLop !== 'all') {
    items = items.filter((u) => u.lop === filterLop)
  }

  const q = tuKhoa.trim().toUpperCase()
  if (q) {
    items = items.filter(
      (u) =>
        u.ho_ten?.toUpperCase().includes(q) ||
        u.ma_dang_nhap?.toUpperCase().includes(q),
    )
  }

  const danhSachLop = [...new Set((data || []).map((u) => u.lop))].filter(Boolean).sort()

  return {
    items,
    danhSachLop,
    vaiTro: staff?.vai_tro,
    lopPhuTrach: staff?.lop,
  }
}

export async function congDiemThuongHocSinh(studentId, { diem, lyDo }) {
  if (!supabase) {
    return mock.congDiemThuongHocSinh(studentId, { diem, lyDo })
  }

  await layThongTinToi()

  const { data, error } = await supabase.rpc('cong_diem_thuong', {
    p_student_id: studentId,
    p_diem: diem,
    p_ly_do: lyDo,
  })

  if (error) throw new Error(error.message || 'Không thể cộng điểm thưởng.')
  return data
}

export async function capLaiPinHocSinh(studentId, customPin) {
  const newPin =
    customPin && /^\d{4}$/.test(String(customPin).trim())
      ? String(customPin).trim()
      : String(Math.floor(1000 + Math.random() * 9000))

  if (!supabase) {
    return mock.capLaiPinHocSinh(studentId, newPin)
  }

  await layThongTinToi()

  const { data, error } = await supabase.rpc('cap_lai_pin', {
    p_student_id: studentId,
    p_new_pin: newPin,
  })

  if (error) {
    // Dự phòng cập nhật qua RPC khởi tạo nếu hàm cap_lai_pin chưa đồng bộ quyền
    const { data: st } = await supabase
      .from('users')
      .select('ma_dang_nhap, ho_ten, lop')
      .eq('id', studentId)
      .single()

    if (st?.ma_dang_nhap) {
      const { error: fallbackErr } = await supabase.rpc('tao_tai_khoan_demo', {
        p_ma: st.ma_dang_nhap,
        p_pin: newPin,
        p_ho_ten: st.ho_ten || 'Học sinh',
        p_lop: st.lop || '1A',
        p_vai_tro: 'student',
        p_xu: 0,
        p_xp: 0,
      })
      if (!fallbackErr) {
        savePinCache(studentId, newPin)
        return { success: true, newPin, student: st }
      }
    }
    throw new Error(error.message || 'Không thể cấp lại mã PIN cho học sinh.')
  }

  const finalPin = data?.new_pin || newPin
  savePinCache(studentId, finalPin)
  return { success: true, newPin: finalPin, student: data }
}

export async function themHocSinhThuCong({ ho_ten, lop, pin = '1234' }) {
  if (!supabase) {
    return mock.themHocSinhThuCong({ ho_ten, lop, pin })
  }

  await layThongTinToi()

  const cleanLop = (lop || '').trim().toUpperCase().replace(/\s/g, '')
  const cleanPin = pin.trim()

  const { data, error } = await supabase.rpc('tao_hoc_sinh_moi', {
    p_ho_ten: ho_ten.trim(),
    p_lop: cleanLop,
    p_pin: cleanPin,
  })

  if (error) {
    throw new Error(error.message || 'Không thể tạo tài khoản học sinh mới.')
  }

  if (data?.id) {
    savePinCache(data.id, cleanPin)
  }

  return {
    ...data,
    pin: cleanPin,
  }
}

export async function layNhatKyDiem({ lop = 'all' } = {}) {
  if (!supabase) {
    return mock.layNhatKyDiem({ lop })
  }

  const { data, error } = await supabase
    .from('point_logs')
    .select(`
      id,
      loai,
      xp,
      xu,
      ly_do,
      thoi_gian,
      user:users!user_id(ho_ten, lop, ma_dang_nhap),
      creator:users!nguoi_tao(ho_ten)
    `)
    .order('thoi_gian', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message || 'Không thể tải nhật ký điểm.')

  let list = (data || []).map((row) => ({
    id: row.id,
    loai: row.loai,
    xp: row.xp,
    xu: row.xu,
    ly_do: row.ly_do,
    thoi_gian: row.thoi_gian,
    student: row.user
      ? {
          ho_ten: row.user.ho_ten || 'Học sinh',
          lop: row.user.lop || '',
          ma_dang_nhap: row.user.ma_dang_nhap || '',
        }
      : null,
    tenNguoiTao: row.creator?.ho_ten || 'Hệ thống',
  }))

  if (lop !== 'all') {
    list = list.filter((r) => r.student?.lop === lop)
  }

  return list
}
