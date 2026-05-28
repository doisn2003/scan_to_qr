import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('scan_to_qr_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Giải mã session
    const decryptedData = decrypt(sessionCookie.value);
    const userProfile = JSON.parse(decryptedData);

    return NextResponse.json({
      authenticated: true,
      user: userProfile,
    });
  } catch (error) {
    console.error('Lỗi kiểm tra session me:', error);
    // Nếu giải mã lỗi hoặc cookie giả mạo, coi như không đăng nhập
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
