import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { Modal } from 'antd';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-md transition-colors border border-neutral-300 dark:border-neutral-700"
        title="Cài đặt slothfulchilling thành ứng dụng trên thiết bị"
      >
        <DownloadOutlined className="text-xs" />
        <span>Cài App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-md transition-colors border border-neutral-300 dark:border-neutral-700"
          title="Cài đặt trên iPhone/iPad"
        >
          <DownloadOutlined className="text-xs" />
          <span>Cài iOS</span>
        </button>

        <Modal
          open={showIOSModal}
          onCancel={() => setShowIOSModal(false)}
          footer={null}
          title={
            <div className="flex items-center gap-2">
              <img
                src="/assets/aistudio/slothfulface1_11858195.png"
                alt="slothfulchilling"
                className="w-5 h-5 rounded-full"
              />
              <span className="font-semibold text-neutral-900">Cài đặt trên iOS / Safari</span>
            </div>
          }
        >
          <div className="space-y-3 pt-2 text-sm text-neutral-600 dark:text-neutral-400">
            <p>Để thêm <strong>slothfulchilling</strong> vào màn hình chính thiết bị Apple của bạn:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Nhấn vào nút <strong>Chia sẻ (Share)</strong> hình ô vuông có mũi tên hướng lên trên thanh công cụ Safari.
              </li>
              <li>
                Cuộn xuống danh sách tùy chọn và chọn <strong>Thêm vào MH chính (Add to Home Screen)</strong>.
              </li>
              <li>
                Nhấn <strong>Thêm (Add)</strong> ở góc trên bên phải để hoàn tất.
              </li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full py-2 bg-neutral-900 text-white rounded-md text-sm hover:bg-neutral-800 transition-colors"
            >
              Đã hiểu
            </button>
          </div>
        </Modal>
      </>
    );
  }

  return null;
};
