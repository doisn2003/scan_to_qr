-- Tạo bảng quản lý người dùng
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    google_refresh_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tạo bảng quản lý lịch sử tạo QR Code
CREATE TABLE IF NOT EXISTS public.history_qr (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_id TEXT NOT NULL,
    web_view_link TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tạo Index để tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id);
CREATE INDEX IF NOT EXISTS idx_history_qr_user_id ON public.history_qr(user_id);

-- Cấu hình Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_qr ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách (Policies) truy cập
-- Vì chúng ta sử dụng Service Role để đọc ghi dữ liệu an toàn từ Backend Next.js, 
-- các chính sách này sẽ bảo vệ dữ liệu nếu người dùng truy cập trực tiếp từ client.
CREATE POLICY "Allow system full access to users" ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY "Allow system full access to history_qr" ON public.history_qr FOR ALL TO service_role USING (true);
