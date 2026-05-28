import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // Đối với AES-256-CBC, IV luôn có độ dài 16 byte

// Lấy encryption key từ env và đảm bảo nó đủ 32 byte bằng cách băm SHA-256
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not defined!');
  }
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Mã hóa dữ liệu dạng text thành một chuỗi an toàn
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Trả về iv và text đã mã hóa ngăn cách bởi dấu hai chấm
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Giải mã chuỗi đã được mã hóa trở lại dạng text ban đầu
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Định dạng chuỗi mã hóa không hợp lệ!');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Lỗi khi giải mã dữ liệu:', error);
    throw new Error('Không thể giải mã dữ liệu an toàn!');
  }
}
