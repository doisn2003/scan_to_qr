import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/googleDrive';
import { getSupabaseAdmin } from '@/lib/supabase';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      console.error('Người dùng từ chối cấp quyền Google:', errorParam);
      return NextResponse.redirect(new URL('/?error=access_denied', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/?error=no_code', request.url));
    }

    // 1. Trao đổi Auth Code lấy Tokens
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // 2. Giải mã id_token để lấy thông tin User Profile trực tiếp từ JWT
    // Cách này nhanh hơn, không tốn thêm request gọi API và không phụ thuộc thư viện 'googleapis'
    const idToken = tokens.id_token;
    if (!idToken) {
      throw new Error('Không nhận được ID Token từ Google!');
    }

    let userInfo: any;
    try {
      const payloadBase64 = idToken.split('.')[1];
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      userInfo = JSON.parse(payloadJson);
    } catch (err) {
      throw new Error('Không thể giải mã cấu trúc ID Token!');
    }

    const googleId = userInfo.sub; // Trường 'sub' là ID duy nhất của Google User
    const email = userInfo.email;
    const name = userInfo.name || email.split('@')[0];
    const picture = userInfo.picture || '';

    if (!googleId || !email) {
      throw new Error('Không thể lấy thông tin email hoặc ID người dùng từ Google!');
    }

    // 3. Xử lý lưu trữ Refresh Token
    const rawRefreshToken = tokens.refresh_token;
    
    let encryptedRefreshToken = '';
    if (rawRefreshToken) {
      encryptedRefreshToken = encrypt(rawRefreshToken);
    }

    // 4. Lưu thông tin vào Database Supabase
    const supabaseAdmin = getSupabaseAdmin();
    
    // Kiểm tra xem user đã tồn tại trong DB chưa
    const { data: existingUser, error: selectError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 là mã "không tìm thấy record"
      console.error('Lỗi truy vấn DB:', selectError);
    }

    let userId = '';

    if (existingUser) {
      userId = existingUser.id;
      // Cập nhật thông tin và Refresh Token mới (nếu có)
      const updateData: any = {
        email: email,
        name: name,
        avatar_url: picture,
        updated_at: new Date().toISOString(),
      };

      if (encryptedRefreshToken) {
        updateData.google_refresh_token = encryptedRefreshToken;
      }

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('google_id', googleId);

      if (updateError) {
        console.error('Lỗi khi cập nhật thông tin user trong DB:', updateError);
      }
    } else {
      // Tạo user mới (cần phải có refresh token ở lần đầu tiên đăng nhập)
      const insertData = {
        google_id: googleId,
        email: email,
        name: name,
        avatar_url: picture,
        google_refresh_token: encryptedRefreshToken || '',
        created_at: new Date().toISOString(),
      };

      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert([insertData])
        .select()
        .single();

      if (insertError) {
        console.error('Lỗi khi thêm user vào DB:', insertError);
        throw insertError;
      }
      userId = newUser.id;
    }

    // 5. Khởi tạo session cookie
    const sessionData = {
      id: userId,
      google_id: googleId,
      email: email,
      name: name,
      avatar_url: picture,
    };

    // Mã hóa session để bảo mật
    const encryptedSession = encrypt(JSON.stringify(sessionData));

    // Tạo response chuyển hướng đến Dashboard
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));

    // Lưu session vào HTTP-only cookie, an toàn, thời hạn 30 ngày
    redirectResponse.cookies.set('scan_to_qr_session', encryptedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 ngày
      path: '/',
    });

    return redirectResponse;
  } catch (error) {
    console.error('Lỗi trong Callback Google OAuth:', error);
    return NextResponse.redirect(new URL('/?error=server_error', request.url));
  }
}
