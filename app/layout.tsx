import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'ScanToQR - Biến tệp tin thành mã QR trong chớp mắt',
  description: 'Ứng dụng nội bộ chuyển đổi file PDF, PNG, JPG thành mã QR lưu trữ trực tiếp trên Google Drive cá nhân.',
  keywords: ['qrcode', 'google drive', 'pdf to qr', 'image to qr', 'share file'],
  authors: [{ name: 'ScanToQR Team' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${plusJakartaSans.variable} h-full scroll-smooth`}>
      <body className="min-h-full bg-slate-50 text-slate-900 font-sans antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
