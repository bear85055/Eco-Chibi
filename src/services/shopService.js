import { supabase } from './supabaseClient'
import * as mock from './mock/mockBackend'
import { layThongTinToi } from './authService'

export async function layDanhSachQua() {
  if (!supabase) {
    return mock.layDanhSachQua()
  }

  const { data, error } = await supabase
    .from('rewards')
    .select('id, ten_qua, hinh_anh, gia_xu, so_luong_ton, dang_hoat_dong, mo_ta')
    .eq('dang_hoat_dong', true)
    .order('gia_xu', { ascending: true })

  if (error) throw new Error(error.message || 'Không thể tải danh sách quà tặng.')
  return data || []
}

export async function doiQua(rewardId) {
  if (!supabase) {
    return mock.doiQua(rewardId)
  }

  const { data, error } = await supabase.rpc('doi_qua', { p_reward_id: rewardId })
  if (error) throw new Error(error.message || 'Không thể thực hiện đổi quà.')

  const [user, rewardRes] = await Promise.all([
    layThongTinToi(),
    supabase
      .from('rewards')
      .select('id, ten_qua, hinh_anh, gia_xu, mo_ta')
      .eq('id', rewardId)
      .single(),
  ])

  return {
    redemption: {
      id: data.redemption_id,
      ma_nhan_qua: data.ma_nhan_qua,
      gia_xu_luc_doi: data.gia_xu,
      trang_thai: 'pending',
      reward: rewardRes.data || { id: rewardId, ten_qua: 'Quà tặng xanh', hinh_anh: '/assets/rewards/pencil.jpg' },
    },
    user,
  }
}

export async function layHopQua() {
  if (!supabase) {
    return mock.layHopQua()
  }

  const { data, error } = await supabase
    .from('redemptions')
    .select(`
      id,
      ma_nhan_qua,
      gia_xu_luc_doi,
      trang_thai,
      ngay_doi,
      ngay_nhan,
      reward:rewards(id, ten_qua, hinh_anh, gia_xu, mo_ta)
    `)
    .order('ngay_doi', { ascending: false })

  if (error) throw new Error(error.message || 'Không thể tải hộp quà của em.')
  return data || []
}
