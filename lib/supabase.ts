import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL hoặc Anon Key chưa được định nghĩa trong file .env!');
}

// Client thông thường sử dụng anon key (Dùng được ở cả Client và Server)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client Admin sử dụng Service Role Key (Chỉ được dùng ở backend/server-side để bảo mật bypass RLS)
export const getSupabaseAdmin = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY chưa được định nghĩa trong file .env! Không thể khởi tạo Admin Client.');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
