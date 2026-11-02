import { createClient } from '@supabase/supabase-js'

/**
 * Khởi tạo kết nối Supabase.
 * Tự động kích hoạt khi có VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY trong file .env.
 * Nếu chưa cấu hình, ứng dụng sử dụng bộ nhớ trình duyệt (localStorage).
 */

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
const supabaseAnonKey =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key')
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

export function getSupabase() {
  return supabase
}
