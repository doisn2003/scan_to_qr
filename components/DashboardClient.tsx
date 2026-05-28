'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  FileImage,
  Copy,
  Download,
  Trash2,
  ExternalLink,
  LogOut,
  QrCode,
  X,
  Check,
  Loader2,
  FolderOpen,
  Info,
} from 'lucide-react';

interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string;
}

interface QRHistoryItem {
  id: string;
  file_name: string;
  file_id: string;
  web_view_link: string;
  created_at: string;
}

interface DashboardClientProps {
  user: User;
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  
  // History & Loading States
  const [history, setHistory] = useState<QRHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  
  // Success QR Modal State
  const [activeQr, setActiveQr] = useState<{
    fileName: string;
    webViewLink: string;
    qrCode: string;
  } | null>(null);
  
  // Copy Link Alert State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch('/api/drive/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Không thể tải lịch sử:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Đăng xuất
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('Đăng xuất thất bại:', err);
    }
  };

  // Xử lý kéo thả file
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUploadFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Validate File & Upload
  const validateAndUploadFile = async (file: File) => {
    setErrorMsg('');
    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      setErrorMsg('Định dạng tệp không được hỗ trợ! Chỉ cho phép tệp PDF, PNG, JPG, JPEG.');
      return;
    }

    // Giới hạn dung lượng 25MB (Giới hạn thông thường của email/Google)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMsg('Dung lượng tệp quá lớn! Tối đa 25MB.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(15);
      
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress(40);
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload thất bại!');
      }

      setUploadProgress(100);
      
      // Hiển thị Popup QR Code vừa tạo thành công
      setActiveQr({
        fileName: data.fileName,
        webViewLink: data.webViewLink,
        qrCode: data.qrCode,
      });

      // Tải lại lịch sử
      fetchHistory();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi kết nối server, không thể upload file!');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // Sao chép liên kết Drive
  const handleCopyLink = async (link: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(link);
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (err) {
      console.error('Không thể sao chép liên kết:', err);
    }
  };

  // Tải xuống mã QR
  const handleDownloadQr = (qrBase64: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = qrBase64;
    link.download = `QR_${fileName.split('.')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Xóa mã QR & File trên Google Drive
  const handleDeleteQr = async (id: string, fileId: string, fileName: string) => {
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa "${fileName}"? Tệp tin sẽ bị xóa vĩnh viễn trên Google Drive của bạn.`);
    if (!confirmDelete) return;

    try {
      setDeletingId(id);
      const res = await fetch('/api/drive/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, fileId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Không thể xóa tệp tin!');
      }

      // Xóa khỏi UI
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa tệp tin!');
    } finally {
      setDeletingId(null);
    }
  };

  // Rút gọn tên file quá dài
  const truncateFileName = (name: string, maxLen = 30) => {
    if (name.length <= maxLen) return name;
    const parts = name.split('.');
    const ext = parts.pop();
    const base = parts.join('.');
    return `${base.substring(0, maxLen - 8)}...${base.substring(base.length - 4)}.${ext}`;
  };

  // Xem nhanh QR cũ trong lịch sử
  const handlePreviewOldQr = async (item: QRHistoryItem) => {
    try {
      // Vì không lưu qrCode dạng Base64 trong DB để tránh tốn dung lượng DB, 
      // ta tạo mã QR mới ngay trên client-side từ link webViewLink bằng API ngoài 
      // hoặc đơn giản là gọi API để backend sinh nhanh base64 QR.
      // Cách tối ưu: sinh QR Code bằng Google Chart API hoặc thư viện Client.
      // Ta có thể dùng thư viện qrcode được tích hợp trên client, nhưng vì qrcode là node-module,
      // cách nhẹ nhất là sinh QR Code thông qua thư viện API công cộng:
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(item.web_view_link)}`;
      
      // Chuyển URL ảnh thành Base64 để đồng nhất định dạng
      setActiveQr({
        fileName: item.file_name,
        webViewLink: item.web_view_link,
        qrCode: qrCodeUrl,
      });
    } catch (err) {
      console.error('Không thể xem nhanh mã QR:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-12 relative">
      {/* Background Decorator Blur Spheres */}
      <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <nav className="w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-extrabold text-lg">Q</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight hidden sm:inline">
              ScanTo<span className="text-indigo-400">QR</span>
            </span>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 glass-panel px-3 py-1.5 rounded-full border-slate-800">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-7 h-7 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                  {user.name.charAt(0)}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-300 hidden md:inline">{user.name}</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl border border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all duration-200 cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 z-10">
        
        {/* Banner Alert Google Scope */}
        <div className="mb-8 p-4 rounded-2xl glass-panel border-indigo-500/10 bg-indigo-500/[0.02] flex gap-3 items-start">
          <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            <strong className="text-slate-200">Lưu ý bảo mật:</strong> Mọi tệp tin bạn tải lên sẽ được chuyển trực tiếp vào thư mục <code className="text-indigo-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">ScanToQR_Uploads</code> trên tài khoản Google Drive cá nhân của bạn. Trạng thái chia sẻ của tệp sẽ được đặt thành <span className="text-emerald-400 font-semibold">Công khai (Bất kỳ ai có link đều xem được)</span> để mã QR có thể quét thành công.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Upload Section */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-purple-600 opacity-60" />
              
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-400" />
                Tải tệp tin lên
              </h2>
              <p className="text-slate-400 text-xs mb-6">Hỗ trợ định dạng PDF, PNG, JPG, JPEG với dung lượng tối đa 25MB.</p>

              {/* Drag Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={onButtonClick}
                className={`w-full py-12 px-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 ${
                  dragActive
                    ? 'border-indigo-400 bg-indigo-500/10 scale-[0.99]'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/20'
                } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                />

                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                    <span className="text-sm font-semibold text-slate-300">Đang tải tệp lên Drive...</span>
                    
                    {/* Progress Bar */}
                    <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-slate-900/60 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-300">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-200">Kéo thả tệp tin vào đây</p>
                      <p className="text-xs text-slate-500 mt-1">hoặc click để chọn từ thiết bị</p>
                    </div>
                  </>
                )}
              </div>

              {errorMsg && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                  <span className="font-extrabold text-sm shrink-0">⚠</span>
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Library / History Section */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass-card rounded-3xl p-6 min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-purple-400" />
                    Thư viện QR cá nhân
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">Danh sách các file và QR code đã chuyển đổi trước đây.</p>
                </div>
                <div className="text-xs text-slate-500 font-medium glass-panel px-3 py-1 rounded-full border-slate-850">
                  {history.length} tệp tin
                </div>
              </div>

              {historyLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  <span className="text-sm">Đang tải danh sách thư viện...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 border border-dashed border-slate-900 rounded-2xl bg-slate-950/20">
                  <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 mb-4">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-300">Thư viện trống</h3>
                  <p className="text-slate-500 text-xs mt-1 max-w-sm">Bạn chưa tạo mã QR nào. Hãy kéo thả file ở cột bên trái để bắt đầu chia sẻ file.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  {history.map(item => {
                    const isPdf = item.file_name.toLowerCase().endsWith('.pdf');
                    return (
                      <div
                        key={item.id}
                        className="glass-card p-4 rounded-2xl flex flex-col justify-between border-slate-850 bg-slate-950/20 hover:border-slate-800 transition-all duration-300 relative group/card"
                      >
                        {/* File Icon & Name */}
                        <div className="flex gap-3 items-start">
                          <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
                            isPdf ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {isPdf ? <FileText className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <h4
                              className="font-bold text-sm text-slate-200 truncate hover:text-indigo-400 transition-all duration-150"
                              title={item.file_name}
                            >
                              {truncateFileName(item.file_name, 26)}
                            </h4>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {new Date(item.created_at).toLocaleDateString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-5 pt-3.5 border-t border-slate-900">
                          {/* Xem QR */}
                          <button
                            onClick={() => handlePreviewOldQr(item)}
                            className="flex-1 py-1.5 rounded-lg border border-slate-800 hover:border-indigo-500/30 hover:bg-indigo-500/10 text-xs font-semibold text-slate-400 hover:text-indigo-400 flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200"
                            title="Xem mã QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            Mã QR
                          </button>

                          {/* Link Drive */}
                          <a
                            href={item.web_view_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center cursor-pointer transition-all duration-200"
                            title="Mở Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Copy Link */}
                          <button
                            onClick={() => handleCopyLink(item.web_view_link, item.id)}
                            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center cursor-pointer transition-all duration-200"
                            title="Sao chép liên kết"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteQr(item.id, item.file_id, item.file_name)}
                            disabled={deletingId === item.id}
                            className="p-1.5 rounded-lg border border-slate-850 hover:border-rose-500/20 text-slate-600 hover:text-rose-400 flex items-center justify-center cursor-pointer transition-all duration-200 disabled:opacity-50"
                            title="Xóa"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Success QR Code Modal */}
      {activeQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setActiveQr(null)}
          />

          {/* Modal Container */}
          <div className="glass-panel w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl relative z-10 border-slate-800 max-h-[90vh] flex flex-col animate-scale-up">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500" />
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-900 flex justify-between items-center shrink-0">
              <h3 className="text-base font-bold text-slate-100 truncate pr-4">
                {truncateFileName(activeQr.fileName, 35)}
              </h3>
              <button
                onClick={() => setActiveQr(null)}
                className="p-1.5 rounded-xl border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 flex flex-col items-center">
              {/* QR Image Frame */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-inner inline-block relative group/qr mb-6">
                <img
                  src={activeQr.qrCode}
                  alt="QR Code"
                  className="w-48 h-48 md:w-56 md:h-56 select-none"
                />
              </div>

              {/* Status Badge */}
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 mb-8 uppercase tracking-wider">
                <Check className="w-3.5 h-3.5" />
                Mã QR đã sẵn sàng
              </span>

              {/* Information */}
              <div className="w-full text-center text-xs text-slate-500 leading-relaxed mb-6 glass-panel p-3.5 rounded-2xl border-slate-900 bg-slate-950/40">
                Khi người khác quét mã QR này bằng Camera điện thoại, họ sẽ lập tức được điều hướng đến trình xem của Google Drive.
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-4 w-full">
                {/* Tải QR */}
                <button
                  onClick={() => handleDownloadQr(activeQr.qrCode, activeQr.fileName)}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-sm font-bold text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/15 active:scale-[0.98] transition-all duration-150 col-span-1"
                >
                  <Download className="w-4.5 h-4.5" />
                  Tải QR xuống
                </button>

                {/* Copy Link */}
                <button
                  onClick={() => handleCopyLink(activeQr.webViewLink)}
                  className="py-3 px-4 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-slate-900/30 text-sm font-bold text-slate-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all duration-150 col-span-1"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4.5 h-4.5 text-emerald-400" />
                      Đã sao chép!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4.5 h-4.5" />
                      Sao chép Link
                    </>
                  )}
                </button>
              </div>

              {/* Link preview */}
              <a
                href={activeQr.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 text-xs text-slate-400 hover:text-indigo-400 underline transition-all flex items-center gap-1"
              >
                Mở thử xem liên kết Google Drive
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
