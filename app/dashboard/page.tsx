import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/encryption';
import DashboardClient from '@/components/DashboardClient';

export default async function DashboardPage() {
  // 1. Kiểm tra session bảo mật ở Server-side
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('scan_to_qr_session');

  if (!sessionCookie || !sessionCookie.value) {
    // Nếu chưa đăng nhập, bắt buộc quay về trang chủ
    redirect('/');
  }

  let userProfile: any = null;
  try {
    const decryptedData = decrypt(sessionCookie.value);
    userProfile = JSON.parse(decryptedData);
  } catch (err) {
    // Session hỏng hoặc giả mạo -> Xóa cookie và chuyển hướng về trang chủ
    console.error('Session giải mã thất bại trên Dashboard Server Component:', err);
    redirect('/');
  }

  if (!userProfile || !userProfile.id) {
    redirect('/');
  }

  return <DashboardClient user={userProfile} />;
}
