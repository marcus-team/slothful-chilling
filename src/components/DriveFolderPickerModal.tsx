import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Progress, Spin, message, Empty } from 'antd';
import {
  FolderOutlined,
  SyncOutlined,
  CloudDownloadOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  GoogleOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { Novel } from '../types/novel';
import {
  listDriveFolders,
  scanDriveForNovels,
  scanFolderAsNovel,
  DriveFolderItem,
  ScanProgress,
} from '../services/googleDrive';
import { GoogleUser } from '../services/googleAuth';

interface DriveFolderPickerModalProps {
  open: boolean;
  onClose: () => void;
  user: GoogleUser | null;
  accessToken: string | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onNovelsSynced: (newNovels: Novel[], opts?: { select?: boolean }) => void;
  isLoggingIn: boolean;
}

export const DriveFolderPickerModal: React.FC<DriveFolderPickerModalProps> = ({
  open,
  onClose,
  user,
  accessToken,
  onLogin,
  onLogout,
  onNovelsSynced,
  isLoggingIn,
}) => {
  const [folders, setFolders] = useState<DriveFolderItem[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);

  // Load folders when opened and user is authenticated
  useEffect(() => {
    if (open && accessToken) {
      loadFolders();
    }
  }, [open, accessToken]);

  const loadFolders = async () => {
    if (!accessToken) return;
    setIsLoadingFolders(true);
    try {
      const items = await listDriveFolders(accessToken);
      setFolders(items);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Không thể tải danh sách thư mục từ Google Drive');
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const handleScanAll = async () => {
    if (!accessToken) {
      message.warning('Vui lòng kết nối tài khoản Google trước');
      return;
    }

    setIsScanning(true);
    setSyncedCount(null);
    try {
      const detected = await scanDriveForNovels(accessToken, setScanProgress);
      if (detected.length === 0) {
        message.info(
          'Chưa tìm thấy thư mục truyện chứa file .txt, .md hoặc .docx ở gốc Drive. Hãy tạo thư mục chứa các file chương truyện!'
        );
      } else {
        message.success(`Đã đồng bộ thành công ${detected.length} bộ truyện từ Google Drive!`);
        setSyncedCount(detected.length);
        onNovelsSynced(detected);
      }
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Lỗi khi quét Google Drive');
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  const handleScanSpecificFolder = async (folder: DriveFolderItem) => {
    if (!accessToken) return;
    setIsScanning(true);
    try {
      const novel = await scanFolderAsNovel(folder, accessToken);
      if (!novel) {
        message.info('Không tìm thấy file .txt, .md hoặc .docx trong thư mục này');
      } else {
        message.success(`Đã thêm bộ truyện "${novel.title}" (${novel.chapters.length} chương)!`);
        onNovelsSynced([novel], { select: true });
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Lỗi khi đồng bộ thư mục');
    } finally {
      setIsScanning(false);
    }
  };

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      title={
        <div className="flex items-center gap-2">
          <img
            src="/assets/aistudio/slothfulface1_11858195.png"
            alt="slothfulchilling"
            className="w-6 h-6 rounded-full"
          />
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            Đồng Bộ Google Drive Cá Nhân
          </span>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        {/* Auth status card */}
        <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-9 h-9 rounded-full border border-neutral-300 dark:border-neutral-700"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-sm">
                    {user.email ? user.email.slice(0, 1).toUpperCase() : 'G'}
                  </div>
                )}
                <div>
                  <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                    {user.displayName || 'Tài khoản Google'}
                  </div>
                  <div className="text-xs text-neutral-500">{user.email}</div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <GoogleOutlined className="text-base" />
                <span>Chưa kết nối tài khoản Google</span>
              </div>
            )}
          </div>

          <div>
            {user ? (
              <Button
                size="small"
                danger
                icon={<DisconnectOutlined />}
                onClick={onLogout}
              >
                Đăng xuất
              </Button>
            ) : (
              <Button
                type="primary"
                size="small"
                loading={isLoggingIn}
                icon={<GoogleOutlined />}
                onClick={onLogin}
                className="bg-black hover:bg-neutral-800 text-white"
              >
                Đăng nhập Google
              </Button>
            )}
          </div>
        </div>

        {/* Instructions banner */}
        <div className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 p-3 rounded-md space-y-1 border border-neutral-200 dark:border-neutral-800">
          <p className="font-medium text-neutral-900 dark:text-neutral-200">
            Cách tổ chức truyện trên Google Drive:
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Mỗi thư mục ở gốc Drive = 1 bộ truyện (Tên thư mục là tên truyện).</li>
            <li>Chương là file <code>.txt</code>, <code>.md</code>, <code>.docx</code> hoặc Google Docs, có thể nằm trong các thư mục con (vd: <code>1-50</code>, <code>51-100</code>).</li>
            <li>slothfulchilling sẽ tự động đọc và phân mục theo số chương để bạn đọc liền mạch.</li>
          </ul>
        </div>

        {/* Action button */}
        {user && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="primary"
                size="large"
                icon={<SyncOutlined spin={isScanning} />}
                loading={isScanning}
                onClick={handleScanAll}
                className="bg-neutral-900 hover:bg-neutral-800 text-white"
              >
                Quét toàn bộ truyện trên Google Drive
              </Button>
              <Button
                size="large"
                icon={<SyncOutlined spin={isLoadingFolders} />}
                onClick={loadFolders}
                disabled={isLoadingFolders || isScanning}
              >
                Làm mới danh sách
              </Button>
              {syncedCount !== null && !isScanning && (
                <span className="text-xs text-neutral-500 flex items-center gap-1">
                  <CheckCircleOutlined className="text-emerald-500" />
                  Đã nhận diện {syncedCount} bộ truyện
                </span>
              )}
            </div>

            {/* Tiến độ quét: biết app đang làm gì, không phải ngồi đoán */}
            {isScanning && scanProgress && scanProgress.total > 0 && (
              <div className="space-y-1">
                <Progress
                  percent={Math.round((scanProgress.done / scanProgress.total) * 100)}
                  showInfo={false}
                  strokeColor="#111"
                  size="small"
                />
                <p className="text-xs text-neutral-500 truncate m-0">
                  Đang quét {scanProgress.done}/{scanProgress.total} thư mục
                  {scanProgress.name ? ` · ${scanProgress.name}` : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Folder explorer */}
        {user && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
              <span>HOẶC CHỌN TRỰC TIẾP THƯ MỤC TRUYỆN:</span>
              <span>{folders.length} thư mục</span>
            </div>

            <Input
              placeholder="Lọc thư mục theo tên..."
              prefix={<SearchOutlined className="text-neutral-400" />}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              size="small"
              allowClear
            />

            <div className="max-h-60 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoadingFolders ? (
                <div className="p-8 text-center">
                  <Spin size="small" />
                  <p className="text-xs text-neutral-500 mt-2">Đang tải thư mục từ Drive...</p>
                </div>
              ) : filteredFolders.length === 0 ? (
                <div className="p-6 text-center">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span className="text-xs text-neutral-400">Không tìm thấy thư mục nào</span>}
                  />
                </div>
              ) : (
                filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="p-2.5 min-h-[48px] hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50 flex items-center justify-between transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FolderOutlined className="text-neutral-400 text-base shrink-0" />
                      <span className="truncate text-neutral-800 dark:text-neutral-200">
                        {folder.name}
                      </span>
                    </div>
                    <Button
                      size="small"
                      icon={<CloudDownloadOutlined />}
                      onClick={() => handleScanSpecificFolder(folder)}
                      loading={isScanning}
                    >
                      Đồng bộ
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
