import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getDriveClient } from '@/lib/googleDrive';

export async function POST(request: NextRequest) {
  try {
    // 1. Kiểm tra session đăng nhập
    const sessionCookie = request.cookies.get('scan_to_qr_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: 'Bạn chưa đăng nhập!' }, { status: 401 });
    }

    let userProfile: any;
    try {
      const decryptedData = decrypt(sessionCookie.value);
      userProfile = JSON.parse(decryptedData);
    } catch (err) {
      return NextResponse.json({ error: 'Session không hợp lệ!' }, { status: 401 });
    }

    const userId = userProfile.id;

    // 2. Lấy tham số body
    const { id, fileId } = await request.json();
    if (!id || !fileId) {
      return NextResponse.json({ error: 'Thiếu ID bản ghi hoặc File ID để xóa!' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Xác nhận xem bản ghi lịch sử này có thực sự thuộc về người dùng hiện tại không
    const { data: record, error: checkError } = await supabaseAdmin
      .from('history_qr')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError || !record) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa tệp tin này hoặc tệp tin không tồn tại!' }, { status: 403 });
    }

    // 3. Lấy Refresh Token của người dùng để tương tác với Drive
    const { data: user, error: dbError } = await supabaseAdmin
      .from('users')
      .select('google_refresh_token')
      .eq('id', userId)
      .single();

    if (dbError || !user || !user.google_refresh_token) {
      return NextResponse.json({ error: 'Lỗi xác thực Google Drive khi thực hiện xóa!' }, { status: 400 });
    }

    // Giải mã Google Refresh Token
    const decryptedRefreshToken = decrypt(user.google_refresh_token);

    // 4. Xóa tệp tin trên Google Drive
    try {
      const driveClient = getDriveClient(decryptedRefreshToken);
      await driveClient.files.delete({
        fileId: fileId,
      });
    } catch (driveErr: any) {
      console.warn('Cảnh báo: Không thể xóa file trên Google Drive (Có thể đã bị xóa thủ công trước đó):', driveErr);
      // Vẫn tiếp tục thực hiện xóa trong Database
    }

    // 5. Xóa bản ghi lịch sử khỏi Database Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('history_qr')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Lỗi khi xóa bản ghi khỏi DB:', deleteError);
      return NextResponse.json({ error: 'Không thể xóa bản ghi khỏi cơ sở dữ liệu!' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa tệp tin và mã QR thành công khỏi hệ thống!',
    });
  } catch (error: any) {
    console.error('Lỗi API Xóa QR:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi không xác định khi xóa!' },
      { status: 500 }
    );
  }
}
