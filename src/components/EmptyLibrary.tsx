import React from 'react';
import { Button, Progress } from 'antd';
import { CloudSyncOutlined, GoogleOutlined } from '@ant-design/icons';
import { GoogleUser } from '../services/googleAuth';
import { ScanProgress } from '../services/googleDrive';

interface EmptyLibraryProps {
  user: GoogleUser | null;
  isLoggingIn: boolean;
  scanProgress: ScanProgress | null;
  onLogin: () => void;
  onOpenDriveModal: () => void;
}

// Màn mở đầu khi thư viện còn trống: dẫn thẳng người dùng tới việc kết nối Drive
export const EmptyLibrary: React.FC<EmptyLibraryProps> = ({
  user,
  isLoggingIn,
  scanProgress,
  onLogin,
  onOpenDriveModal,
}) => {
  const isScanning = scanProgress !== null;
  const percent =
    scanProgress && scanProgress.total > 0
      ? Math.round((scanProgress.done / scanProgress.total) * 100)
      : 0;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="w-full max-w-sm text-center space-y-6">
        <img
          src="/assets/aistudio/slothfulface1_11858195.png"
          alt="slothfulchilling"
          className="w-16 h-16 rounded-full mx-auto object-contain"
        />

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">slothfulchilling</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {user
              ? 'Chưa tìm thấy truyện nào trên Google Drive của bạn.'
              : 'Kết nối Google Drive để đọc truyện của bạn. Mỗi thư mục ở gốc Drive là một bộ truyện.'}
          </p>
        </div>

        {isScanning ? (
          <div className="space-y-2">
            <Progress percent={percent} showInfo={false} strokeColor="#111" size="small" />
            <p className="text-xs text-neutral-500 truncate">
              Đang quét Drive… {scanProgress!.done}/{scanProgress!.total}
              {scanProgress!.name ? ` · ${scanProgress!.name}` : ''}
            </p>
          </div>
        ) : user ? (
          <div className="space-y-3">
            <Button
              type="primary"
              size="large"
              block
              icon={<CloudSyncOutlined />}
              onClick={onOpenDriveModal}
              className="h-12"
            >
              Quét lại Google Drive
            </Button>
            <p className="text-xs text-neutral-400">
              Truyện cần là thư mục chứa file .txt, .md, .docx hoặc Google Docs.
            </p>
          </div>
        ) : (
          <Button
            type="primary"
            size="large"
            block
            loading={isLoggingIn}
            icon={<GoogleOutlined />}
            onClick={onLogin}
            className="h-12"
          >
            Kết nối Google Drive
          </Button>
        )}
      </div>
    </div>
  );
};
