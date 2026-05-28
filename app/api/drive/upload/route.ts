import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getDriveClient, findOrCreateFolder, uploadFileToDrive, makeFilePublic } from '@/lib/googleDrive';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    // 1. Kiểm tra session đăng nhập từ cookie
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

    // 2. Đọc dữ liệu Multipart Form-Data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy tệp đính kèm!' }, { status: 400 });
    }

    // Chuyển đổi File sang Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name;
    const mimeType = file.type || 'application/octet-stream';

    // 3. Lấy Google Refresh Token của người dùng từ DB
    const supabaseAdmin = getSupabaseAdmin();
    const { data: user, error: dbError } = await supabaseAdmin
      .from('users')
      .select('google_refresh_token')
      .eq('id', userId)
      .single();

    if (dbError || !user || !user.google_refresh_token) {
      console.error('Không tìm thấy Google Refresh Token:', dbError);
      return NextResponse.json({ error: 'Tài khoản chưa được liên kết Google Drive đúng cách. Vui lòng đăng nhập lại!' }, { status: 400 });
    }

    // Giải mã Google Refresh Token
    const decryptedRefreshToken = decrypt(user.google_refresh_token);

    // 4. Khởi tạo Google Drive client
    const driveClient = getDriveClient(decryptedRefreshToken);

    // 5. Tìm hoặc tạo thư mục 'ScanToQR_Uploads'
    const FOLDER_NAME = 'ScanToQR_Uploads';
    const folderId = await findOrCreateFolder(driveClient, FOLDER_NAME);

    // 6. Upload file lên thư mục đó
    const uploadResult = await uploadFileToDrive(
      driveClient,
      buffer,
      fileName,
      mimeType,
      folderId
    );

    // 7. Thiết lập quyền xem công khai cho file
    await makeFilePublic(driveClient, uploadResult.id);

    // 8. Tạo mã QR Code dạng Base64 Data URL từ webViewLink
    // Cấu hình mã QR chất lượng cao
    const qrCodeDataUrl = await QRCode.toDataURL(uploadResult.webViewLink, {
      errorCorrectionLevel: 'H', // Mức sửa lỗi cao nhất để dễ quét
      margin: 2,
      width: 512,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // 9. Lưu vào lịch sử trong DB Supabase
    const { error: insertHistoryError } = await supabaseAdmin
      .from('history_qr')
      .insert([
        {
          user_id: userId,
          file_name: fileName,
          file_id: uploadResult.id,
          web_view_link: uploadResult.webViewLink,
        },
      ]);

    if (insertHistoryError) {
      console.error('Lỗi khi lưu lịch sử tạo QR:', insertHistoryError);
      // Vẫn tiếp tục trả về kết quả cho người dùng mặc dù lưu lịch sử lỗi
    }

    // 10. Trả về kết quả
    return NextResponse.json({
      success: true,
      fileName: fileName,
      fileId: uploadResult.id,
      webViewLink: uploadResult.webViewLink,
      qrCode: qrCodeDataUrl,
    });
  } catch (error: any) {
    console.error('Lỗi trong API Upload File:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi không xác định khi upload và tạo mã QR!' },
      { status: 500 }
    );
  }
}
export const maxDuration = 60; // Hỗ trợ Vercel Serverless Function chạy tối đa 60s cho việc upload file lớn
