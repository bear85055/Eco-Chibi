import { supabase } from './supabaseClient'
import * as mock from './mock/mockBackend'
import { layThongTinToi } from './authService'
import { HABITS, QUIZZES, dayIndex } from './mock/questBank'

export const DAILY_CAP = mock.DAILY_CAP
export const MAX_REWARD_PER_ROUND = mock.MAX_REWARD_PER_ROUND
export const QUEST_REWARD = mock.QUEST_REWARD

export async function batDauGame(game) {
  if (!supabase) {
    return mock.batDauGame(game)
  }

  const { data, error } = await supabase.rpc('bat_dau_game', { p_game: game })
  if (error) throw new Error(error.message || 'Không thể bắt đầu lượt chơi.')
  return { id: data.id }
}

export async function nopKetQuaGame(sessionId, soCauDung) {
  if (!supabase) {
    return mock.nopKetQuaGame(sessionId, soCauDung)
  }

  const { data, error } = await supabase.rpc('nop_ket_qua_game', {
    p_session_id: sessionId,
    p_so_cau_dung: soCauDung,
  })

  if (error) throw new Error(error.message || 'Không thể nộp kết quả lượt chơi.')

  const user = await layThongTinToi()
  return {
    ...data,
    user,
  }
}

export async function layBangXepHang() {
  if (!supabase) {
    return mock.layBangXepHang()
  }

  const { data, error } = await supabase
    .from('v_leaderboard')
    .select('id, ten_hien_thi, lop, xp, hang')
    .order('hang', { ascending: true })
    .limit(20)

  if (error) throw new Error(error.message || 'Không thể tải bảng xếp hạng.')

  const me = await layThongTinToi()
  const myRankItem = me ? data.find((r) => r.id === me.id) : null

  return {
    top: (data || []).map((r) => ({
      id: r.id,
      hang: Number(r.hang),
      ten_hien_thi: r.ten_hien_thi,
      lop: r.lop,
      xp: r.xp,
      la_toi: me ? r.id === me.id : false,
    })),
    toi: me
      ? {
          id: me.id,
          hang: myRankItem ? Number(myRankItem.hang) : null,
          xp: me.tong_diem_tich_luy,
        }
      : null,
  }
}

function todayVN() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

function questOfDay() {
  const d = dayIndex(todayVN())
  return { habit: HABITS[d % HABITS.length], quiz: QUIZZES[d % QUIZZES.length] }
}

export async function layNhiemVuHomNay() {
  if (!supabase) {
    return mock.layNhiemVuHomNay()
  }

  const user = await layThongTinToi()
  const { habit, quiz } = questOfDay()
  const nv = user?.nhiem_vu_hom_nay || {}
  const daTraLoiQuiz = nv.do_vui != null

  return {
    ngay: todayVN(),
    tu_khai: {
      id: habit.id,
      icon: habit.icon,
      cau_hoi: habit.cau_hoi,
      diem: QUEST_REWARD.tu_khai,
      da_lam: nv.tu_khai != null,
      tra_loi: nv.tu_khai,
      khen: nv.tu_khai != null ? habit.khen : null,
    },
    do_vui: {
      id: quiz.id,
      cau_hoi: quiz.cau_hoi,
      lua_chon: quiz.lua_chon,
      diem: QUEST_REWARD.do_vui,
      da_lam: daTraLoiQuiz,
      chon: nv.do_vui?.chon ?? null,
      dap_an: daTraLoiQuiz ? quiz.dap_an : null,
      giai_thich: daTraLoiQuiz ? quiz.giai_thich : null,
    },
    user,
  }
}

export async function nopNhiemVu(loai, traLoi) {
  if (!supabase) {
    return mock.nopNhiemVu(loai, traLoi)
  }

  const { habit, quiz } = questOfDay()
  const p_tra_loi_bool = loai === 'tu_khai' ? Boolean(traLoi) : (loai === 'do_vui' ? Number(traLoi) === quiz.dap_an : null)
  const p_tra_loi_int = loai === 'do_vui' ? Number(traLoi) : null

  const { data, error } = await supabase.rpc('nop_nhiem_vu', {
    p_loai: loai,
    p_tra_loi_bool,
    p_tra_loi_int,
  })

  if (error) {
    return mock.nopNhiemVu(loai, traLoi)
  }

  const user = await layThongTinToi()

  return {
    ...data,
    khen: loai === 'tu_khai' ? habit.khen : undefined,
    dap_an: loai === 'do_vui' ? quiz.dap_an : undefined,
    giai_thich: loai === 'do_vui' ? quiz.giai_thich : undefined,
    user,
  }
}
