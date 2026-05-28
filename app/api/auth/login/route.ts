import { NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/googleDrive';

export async function GET() {
  try {
    const oauth2Client = getOAuth2Client();

    // Các phạm vi quyền (scopes) cần yêu cầu:
    // 1. profile và email để định danh người dùng.
    // 2. drive.file để chỉ thao tác trên các file do app này tạo ra.
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive.file',
    ];

    // Tạo URL đăng nhập
    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Yêu cầu trả về Refresh Token
      prompt: 'consent',      // Buộc hiển thị màn hình đồng ý để chắc chắn nhận được Refresh Token
      scope: scopes,
    });

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error('Lỗi khi tạo URL OAuth Google:', error);
    return NextResponse.json(
      { error: 'Không thể khởi tạo luồng đăng nhập Google' },
      { status: 500 }
    );
  }
}
