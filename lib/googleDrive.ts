import { auth, drive as createDriveClient } from '@googleapis/drive';
import { Readable } from 'stream';

/**
 * Khởi tạo Google OAuth2 Client
 */
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Cấu hình Google OAuth chưa đầy đủ trong file env!');
  }

  return new auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Khởi tạo Google Drive Client bằng Refresh Token của người dùng
 */
export function getDriveClient(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return createDriveClient({
    version: 'v3',
    auth: oauth2Client,
  });
}

/**
 * Tìm hoặc tạo mới thư mục chuyên dụng trên Google Drive
 */
export async function findOrCreateFolder(drive: ReturnType<typeof createDriveClient>, folderName: string): Promise<string> {
  try {
    // 1. Tìm thư mục theo tên và kiểm tra xem có phải là thư mục không và chưa bị xóa
    const response = await drive.files.list({
      q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const files = response.data.files;
    if (files && files.length > 0 && files[0].id) {
      return files[0].id;
    }

    // 2. Nếu không tìm thấy, tạo mới thư mục
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });

    if (folder.data.id) {
      return folder.data.id;
    }
    throw new Error('Không thể lấy ID của thư mục mới tạo!');
  } catch (error) {
    console.error('Lỗi trong findOrCreateFolder:', error);
    throw error;
  }
}

/**
 * Upload tệp tin lên thư mục chỉ định trên Google Drive
 */
export async function uploadFileToDrive(
  drive: ReturnType<typeof createDriveClient>,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<{ id: string; webViewLink: string }> {
  try {
    // Chuyển Buffer thành Readable Stream để Drive API có thể đọc
    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    const file = response.data;
    if (file.id && file.webViewLink) {
      return { id: file.id, webViewLink: file.webViewLink };
    }
    throw new Error('Lỗi phản hồi khi tạo file trên Drive!');
  } catch (error) {
    console.error('Lỗi trong uploadFileToDrive:', error);
    throw error;
  }
}

/**
 * Thiết lập quyền xem công khai cho tệp tin (Anyone with the link can view)
 */
export async function makeFilePublic(drive: ReturnType<typeof createDriveClient>, fileId: string): Promise<void> {
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (error) {
    console.error('Lỗi khi thiết lập quyền công khai file:', error);
    throw error;
  }
}
