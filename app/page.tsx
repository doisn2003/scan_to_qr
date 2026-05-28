import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/encryption';
import { FileUp, ShieldCheck, Zap, Library } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const resolvedParams = await searchParams;
  
  // 1. Kiểm tra session đăng nhập ở Server-side
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('scan_to_qr_session');

  if (sessionCookie && sessionCookie.value) {
    try {
      const decryptedData = decrypt(sessionCookie.value);
      const userProfile = JSON.parse(decryptedData);
      if (userProfile && userProfile.id) {
        // Nếu đã đăng nhập, tự động chuyển hướng vào Dashboard
        redirect('/dashboard');
      }
    } catch (err) {
      // Cookie không hợp lệ hoặc lỗi giải mã -> Bỏ qua và cho người dùng đăng nhập lại
    }
  }

  const errorType = resolvedParams.error;

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-between p-6 overflow-hidden">
      {/* Background Decorator Blur Spheres - Màu sắc rực rỡ hơn trên nền sáng */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/15 blur-[120px] pointer-events-none" />

      {/* Header - Thiết kế lại Responsive chống tràn trên Mobile */}
      <header className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4 py-4 z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-650 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <span className="text-white font-extrabold text-xl">Q</span>
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Tạo Mã <span className="text-indigo-600">QR</span>
          </span>
        </div>
        <div className="text-xs text-slate-655 flex items-center justify-center gap-1.5 glass-panel px-4 py-2 rounded-2xl md:rounded-full shadow-sm max-w-full flex-wrap text-center leading-relaxed font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Trường mầm non Vĩ Thượng - Xã Tiên Yên - Tỉnh Tuyên Quang</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full py-12 z-10">
        {/* Badge */}
        <div className="mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border-indigo-200 text-indigo-700 bg-indigo-50/50 text-xs font-semibold uppercase tracking-wider shadow-sm">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            Giải pháp chia sẻ file tức thì
          </div>
        </div>

        {/* Title */}
        <h1 className="text-center font-extrabold text-5xl md:text-7xl tracking-tight leading-[1.1] mb-6 text-slate-900">
          Biến tệp tin thành <br />
          <span className="gradient-text">Mã QR</span> trong chớp mắt
        </h1>

        {/* Subtitle */}
        <p className="text-center text-slate-600 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed font-medium">
          Kéo thả hoặc tải lên file có định dạng PDF, PNG, JPG để tạo mã QR.
        </p>

        {/* Login Card */}
        <div className="w-full max-w-md glass-card rounded-3xl p-8 md:p-10 shadow-xl border border-slate-200/50 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 opacity-70" />
          
          {errorType && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm text-center font-semibold">
              {errorType === 'access_denied' && 'Bạn đã từ chối cấp quyền Google Drive. Vui lòng thử lại!'}
              {errorType === 'server_error' && 'Đã xảy ra lỗi hệ thống trong quá trình xác thực.'}
              {errorType === 'no_code' && 'Yêu cầu xác thực không hợp lệ.'}
            </div>
          )}

          <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Đăng nhập tài khoản</h3>
          <p className="text-slate-500 text-sm text-center mb-8 font-medium">
            Vui lòng đăng nhập một lần duy nhất để kết nối tài khoản Google Drive của bạn.
          </p>

          <a
            href="/api/auth/login"
            className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold flex items-center justify-center gap-3.5 shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Tiếp tục với Google
          </a>

          {/* Privacy Note */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-650 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-650 leading-relaxed font-medium">
              <strong className="text-slate-800">Bảo mật 100%</strong>: Ứng dụng chỉ quản lý các file do chính nó tạo ra, hoàn toàn không xem được tài liệu khác của bạn.
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-20">
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 shadow-sm border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <FileUp className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-lg mb-1">Kéo thả & Upload</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Tải trực tiếp file PDF, PNG, JPG lên một thư mục chuyên dụng trên Drive cá nhân.</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 shadow-sm border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-lg mb-1">Tạo QR Siêu Tốc</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Hệ thống tự động bật chia sẻ công khai và tạo ảnh mã QR SVG/PNG chất lượng cao để in ấn.</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 shadow-sm border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-650 flex items-center justify-center border border-blue-100">
              <Library className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-lg mb-1">Thư viện Cá nhân</h4>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Lưu giữ lịch sử các mã QR đã tạo, dễ dàng xem lại, chia sẻ, tải xuống hoặc xóa file khỏi Drive.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl border-t border-slate-200 py-6 text-center text-sm text-slate-500 z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-medium">© 2026 ScanToQR. Liên hệ: huyhoang.dsk@gmail.com</p>
        <p className="text-xs font-medium">Bảo mật thông tin • Tối ưu hóa hiệu năng</p>
      </footer>
    </main> 
  );
}
