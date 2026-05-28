import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Đã đăng xuất thành công' });
  
  // Xóa cookie bằng cách đặt thời hạn về 0
  response.cookies.set('scan_to_qr_session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}
