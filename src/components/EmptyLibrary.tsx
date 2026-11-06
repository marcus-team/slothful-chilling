import React from 'react';
import { Button, Spin } from 'antd';
import { GoogleOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import { AppUser } from '../services/firebase';

interface EmptyLibraryProps {
  authReady: boolean; // đã biết đăng nhập hay chưa
  user: AppUser | null;
  isLoggingIn: boolean;
  libraryLoaded: boolean; // đã nhận danh sách truyện từ server
  loadError: string;
  onLogin: () => void;
  onLogout: () => void;
  onOpenImport: () => void;
}

// Màn khi chưa có truyện để đọc: chờ, đăng nhập, báo lỗi quyền, hoặc nhập truyện đầu tiên
export const EmptyLibrary: React.FC<EmptyLibraryProps> = ({
  authReady,
  user,
  isLoggingIn,
  libraryLoaded,
  loadError,
  onLogin,
  onLogout,
  onOpenImport,
}) => {
  const waiting = !authReady || (user && !libraryLoaded && !loadError);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="w-full max-w-sm text-center space-y-6">
        <img
          src="/assets/aistudio/slothfulface1_11858195.png"
          alt="slothfulchilling"
          className="w-16 h-16 rounded-full mx-auto object-contain"
        />

        <h1 className="text-xl font-bold tracking-tight">slothfulchilling</h1>

        {waiting ? (
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
        ) : !user ? (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Đăng nhập để mở thư viện truyện của bạn.
            </p>
            <Button
              type="primary"
              size="large"
              block
              loading={isLoggingIn}
              icon={<GoogleOutlined />}
              onClick={onLogin}
              className="h-12"
            >
              Đăng nhập với Google
            </Button>
          </div>
        ) : loadError ? (
          <div className="space-y-4">
            <p className="text-sm text-red-600 leading-relaxed break-words">{loadError}</p>
            <p className="text-xs text-neutral-500">Đang đăng nhập bằng {user.email}</p>
            <Button size="large" block onClick={onLogout} className="h-12">
              Đăng xuất để dùng tài khoản khác
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Thư viện còn trống. Nhập bộ truyện đầu tiên từ thư mục .docx hoặc .txt trên máy bạn.
            </p>
            <Button
              type="primary"
              size="large"
              block
              icon={<UploadOutlined />}
              onClick={onOpenImport}
              className="h-12"
            >
              Nhập truyện
            </Button>
            <button onClick={onLogout} className="text-xs text-neutral-400 hover:underline">
              Đăng xuất ({user.email})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
