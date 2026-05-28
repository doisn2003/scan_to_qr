import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
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

    // 2. Lấy danh sách lịch sử từ Supabase
    const supabaseAdmin = getSupabaseAdmin();
    const { data: history, error: dbError } = await supabaseAdmin
      .from('history_qr')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Lỗi khi lấy lịch sử tạo QR:', dbError);
      return NextResponse.json({ error: 'Không thể tải lịch sử tạo QR!' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      history: history || [],
    });
  } catch (error: any) {
    console.error('Lỗi API Lịch sử QR:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi không xác định khi tải lịch sử!' },
      { status: 500 }
    );
  }
}
