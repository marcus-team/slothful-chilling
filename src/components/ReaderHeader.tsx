import React from 'react';
import { Novel, Chapter, ReadingSettings } from '../types/novel';
import { Popover, Slider } from 'antd';
import {
  MenuOutlined,
  SettingOutlined,
  CloudSyncOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons';
import { PWAInstallButton } from './PWAInstallButton';
import { AppUser } from '../services/firebase';

interface ReaderHeaderProps {
  currentNovel: Novel;
  currentChapter: Chapter;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  settings: ReadingSettings;
  onUpdateSettings: (newSettings: Partial<ReadingSettings>) => void;
  onOpenImport: () => void;
  user: AppUser | null;
  scrollProgress: number; // 0 to 1
  isZenMode: boolean;
  onToggleZenMode: () => void;
  isHidden: boolean; // ẩn header khi cuộn xuống để có thêm chỗ đọc
}

const iconButton =
  'w-11 h-11 flex items-center justify-center rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors';

const sectionLabel = 'font-semibold text-neutral-500 text-xs mb-2';

const optionButton = (active: boolean) =>
  `min-h-[40px] px-2 text-center rounded-md text-sm transition-colors border ${
    active
      ? 'bg-neutral-900 text-white border-neutral-900 font-medium dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100'
      : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
  }`;

const FONT_CLASS = { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' } as const;

export const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  currentNovel,
  currentChapter,
  onToggleSidebar,
  isSidebarOpen,
  settings,
  onUpdateSettings,
  onOpenImport,
  user,
  scrollProgress,
  isZenMode,
  onToggleZenMode,
  isHidden,
}) => {
  // Reading settings popover content
  const settingsContent = (
    <div className="w-72 max-w-[80vw] p-1 space-y-5">
      {/* Preview: thấy ngay chữ thay đổi thế nào */}
      <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 overflow-hidden">
        <p
          className={`${FONT_CLASS[settings.fontFamily]} text-neutral-800 dark:text-neutral-200 m-0`}
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            textAlign: settings.textAlign,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          Chiếc lá cuối cùng rơi xuống mặt hồ, và cả buổi chiều như chậm lại.
        </p>
      </div>

      {/* Font Size */}
      <div>
        <div className={`${sectionLabel} flex items-center justify-between`}>
          <span>Cỡ chữ</span>
          <span className="font-mono">{settings.fontSize}px</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onUpdateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
            disabled={settings.fontSize <= 14}
            aria-label="Giảm cỡ chữ"
            className="w-10 h-10 shrink-0 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 text-xs"
          >
            A
          </button>
          <Slider
            min={14}
            max={26}
            step={1}
            value={settings.fontSize}
            onChange={(v) => onUpdateSettings({ fontSize: v })}
            tooltip={{ open: false }}
            className="flex-1 !my-0"
          />
          <button
            onClick={() => onUpdateSettings({ fontSize: Math.min(26, settings.fontSize + 1) })}
            disabled={settings.fontSize >= 26}
            aria-label="Tăng cỡ chữ"
            className="w-10 h-10 shrink-0 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 text-lg"
          >
            A
          </button>
        </div>
      </div>

      {/* Line height */}
      <div>
        <div className={sectionLabel}>Giãn dòng</div>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { value: 1.6, label: 'Gọn' },
              { value: 1.8, label: 'Vừa' },
              { value: 2.0, label: 'Thoáng' },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              onClick={() => onUpdateSettings({ lineHeight: item.value })}
              className={optionButton(settings.lineHeight === item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div>
        <div className={sectionLabel}>Kiểu chữ</div>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { key: 'serif', label: 'Sách' },
              { key: 'sans', label: 'Hiện đại' },
              { key: 'mono', label: 'Mono' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => onUpdateSettings({ fontFamily: item.key })}
              className={`${optionButton(settings.fontFamily === item.key)} ${FONT_CLASS[item.key]}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <div className={sectionLabel}>Màu nền</div>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { key: 'light', label: 'Sáng', preview: 'bg-white text-black border-neutral-300' },
              { key: 'warm', label: 'Xám', preview: 'bg-neutral-100 text-neutral-800 border-neutral-300' },
              { key: 'dark', label: 'Tối', preview: 'bg-neutral-900 text-neutral-100 border-neutral-700' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => onUpdateSettings({ theme: item.key })}
              className={`min-h-[40px] rounded-md text-center border text-sm transition-all ${item.preview} ${
                settings.theme === item.key
                  ? 'ring-2 ring-neutral-500 font-semibold'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alignment */}
      <div>
        <div className={sectionLabel}>Căn lề</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onUpdateSettings({ textAlign: 'left' })}
            className={optionButton(settings.textAlign === 'left')}
          >
            Căn trái
          </button>
          <button
            onClick={() => onUpdateSettings({ textAlign: 'justify' })}
            className={optionButton(settings.textAlign === 'justify')}
          >
            Đều hai bên
          </button>
        </div>
      </div>

      {/* Reading Width (chủ yếu hữu ích trên iPad / laptop) */}
      <div className="hidden md:block">
        <div className={sectionLabel}>Độ rộng trang</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onUpdateSettings({ maxWidth: 'normal' })}
            className={optionButton(settings.maxWidth === 'normal')}
          >
            Vừa
          </button>
          <button
            onClick={() => onUpdateSettings({ maxWidth: 'wide' })}
            className={optionButton(settings.maxWidth === 'wide')}
          >
            Rộng
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <header
      className={`sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-[transform,colors] duration-200 ${
        isHidden && !isSidebarOpen ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-13 flex items-center justify-between gap-2">
        {/* Left: Sidebar toggle & Breadcrumbs */}
        <div className="flex items-center gap-1 min-w-0">
          <button onClick={onToggleSidebar} aria-label="Mở mục lục" className={`${iconButton} shrink-0`}>
            <MenuOutlined className="text-base" />
          </button>

          <nav className="flex flex-col min-w-0 leading-tight">
            <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {currentChapter.title}
            </span>
            <span className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
              {currentNovel.title}
            </span>
          </nav>
        </div>

        {/* Right: Controls & Account */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Scroll progress % */}
          <div className="text-[11px] font-mono text-neutral-500 w-9 text-right mr-1">
            {Math.round(scrollProgress * 100)}%
          </div>

          {/* PWA Install */}
          <PWAInstallButton />

          {/* Reading Settings Popover */}
          <Popover content={settingsContent} trigger="click" placement="bottomRight" arrow={false}>
            <button aria-label="Cài đặt đọc truyện" className={iconButton} title="Tùy chỉnh chữ & giao diện">
              <SettingOutlined className="text-base" />
            </button>
          </Popover>

          {/* Zen mode toggle */}
          <button
            onClick={onToggleZenMode}
            aria-label={isZenMode ? 'Thoát chế độ tập trung' : 'Chế độ tập trung'}
            className={`hidden md:flex ${iconButton}`}
            title={isZenMode ? 'Thoát chế độ tập trung' : 'Chế độ tập trung Zen'}
          >
            {isZenMode ? (
              <FullscreenExitOutlined className="text-base" />
            ) : (
              <FullscreenOutlined className="text-base" />
            )}
          </button>

          {/* Tài khoản & nhập truyện */}
          <button
            onClick={onOpenImport}
            className={`${iconButton} md:w-auto md:px-2 md:gap-1.5 text-xs font-medium`}
            aria-label="Tài khoản & nhập truyện"
            title="Tài khoản & nhập truyện"
          >
            {user ? (
              <>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google'}
                    className="w-6 h-6 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[11px]">
                    {user.email ? user.email.slice(0, 1).toUpperCase() : 'G'}
                  </div>
                )}
                <span className="hidden md:inline truncate max-w-[80px]">
                  {user.displayName?.split(' ')[0] || 'Tài khoản'}
                </span>
              </>
            ) : (
              <>
                <CloudSyncOutlined className="text-base" />
                <span className="hidden md:inline">Đăng nhập</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reading Progress Indicator line */}
      <div className="h-[2px] w-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="h-full bg-neutral-900 dark:bg-neutral-200 transition-all duration-150 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, scrollProgress * 100))}%` }}
        />
      </div>
    </header>
  );
};
