import React from 'react';
import { Novel, Chapter, ReadingSettings, FontFamily, ThemeMode } from '../types/novel';
import { Popover, Tooltip } from 'antd';
import {
  MenuOutlined,
  SettingOutlined,
  CloudSyncOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  FontColorsOutlined,
  FontSizeOutlined,
  AlignLeftOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { PWAInstallButton } from './PWAInstallButton';
import { GoogleUser } from '../services/googleAuth';

interface ReaderHeaderProps {
  currentNovel: Novel;
  currentChapter: Chapter;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  settings: ReadingSettings;
  onUpdateSettings: (newSettings: Partial<ReadingSettings>) => void;
  onOpenDriveModal: () => void;
  user: GoogleUser | null;
  scrollProgress: number; // 0 to 1
  isZenMode: boolean;
  onToggleZenMode: () => void;
}

export const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  currentNovel,
  currentChapter,
  onToggleSidebar,
  isSidebarOpen,
  settings,
  onUpdateSettings,
  onOpenDriveModal,
  user,
  scrollProgress,
  isZenMode,
  onToggleZenMode,
}) => {
  // Reading settings popover content
  const settingsContent = (
    <div className="w-64 p-2 space-y-4 text-xs">
      {/* Font Family */}
      <div className="space-y-1.5">
        <div className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
          PHÔNG CHỮ ĐỌC
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { key: 'serif', label: 'Serif (Sách)' },
              { key: 'sans', label: 'Sans (GitBook)' },
              { key: 'mono', label: 'Mono' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => onUpdateSettings({ fontFamily: item.key })}
              className={`py-1.5 px-2 text-center rounded text-xs transition-colors border ${
                settings.fontFamily === item.key
                  ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                  : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size & Line Height */}
      <div className="space-y-2">
        <div className="flex items-center justify-between font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
          <span>CỠ CHỮ: {settings.fontSize}px</span>
          <span>GIÃN DÒNG: {settings.lineHeight}x</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
            disabled={settings.fontSize <= 14}
            className="flex-1 py-1 px-2 text-center rounded border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40"
          >
            A-
          </button>
          <button
            onClick={() => onUpdateSettings({ fontSize: Math.min(26, settings.fontSize + 1) })}
            disabled={settings.fontSize >= 26}
            className="flex-1 py-1 px-2 text-center rounded border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40"
          >
            A+
          </button>

          <button
            onClick={() => {
              const heights = [1.6, 1.8, 2.0];
              const nextIdx = (heights.indexOf(settings.lineHeight) + 1) % heights.length;
              onUpdateSettings({ lineHeight: heights[nextIdx] });
            }}
            className="py-1 px-2.5 text-center rounded border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-mono"
            title="Đổi khoảng cách dòng"
          >
            ↕ {settings.lineHeight}
          </button>
        </div>
      </div>

      {/* Monochrome Tone Themes */}
      <div className="space-y-1.5">
        <div className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
          SẮC ĐỘ GIẤY (MONOCHROME)
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { key: 'light', label: 'Trắng tinh', preview: 'bg-white text-black border-neutral-300' },
              { key: 'warm', label: 'Giấy xám', preview: 'bg-neutral-100 text-neutral-800 border-neutral-300' },
              { key: 'dark', label: 'Mực đêm', preview: 'bg-neutral-900 text-neutral-100 border-neutral-800' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => onUpdateSettings({ theme: item.key })}
              className={`p-1.5 rounded text-center border text-[11px] flex items-center justify-center gap-1 transition-all ${item.preview} ${
                settings.theme === item.key ? 'ring-2 ring-neutral-400 font-semibold' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <span>{item.label}</span>
              {settings.theme === item.key && <CheckOutlined className="text-[10px]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Reading Width */}
      <div className="space-y-1.5">
        <div className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
          ĐỘ RỘNG TRANG
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => onUpdateSettings({ maxWidth: 'normal' })}
            className={`py-1 px-2 text-center rounded border text-xs ${
              settings.maxWidth === 'normal'
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            Tiêu chuẩn (GitBook)
          </button>
          <button
            onClick={() => onUpdateSettings({ maxWidth: 'wide' })}
            className={`py-1 px-2 text-center rounded border text-xs ${
              settings.maxWidth === 'wide'
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'border-neutral-200 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            Rộng thoáng
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-13 flex items-center justify-between gap-4">
        {/* Left: Sidebar toggle & Breadcrumbs */}
        <div className="flex items-center gap-3 truncate">
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            className="p-1.5 rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <MenuOutlined className="text-base" />
          </button>

          <nav className="flex items-center gap-1.5 text-xs text-neutral-500 truncate">
            <span className="truncate max-w-[120px] md:max-w-[200px] font-medium text-neutral-800 dark:text-neutral-200">
              {currentNovel.title}
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">/</span>
            <span className="truncate max-w-[150px] md:max-w-[280px] text-neutral-500 dark:text-neutral-400">
              {currentChapter.title}
            </span>
          </nav>
        </div>

        {/* Right: Controls & Account */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Scroll progress % */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-neutral-400">
            <span>{Math.round(scrollProgress * 100)}%</span>
          </div>

          {/* PWA Install */}
          <PWAInstallButton />

          {/* Reading Settings Popover */}
          <Popover
            content={settingsContent}
            trigger="click"
            placement="bottomRight"
            arrow={false}
          >
            <button
              aria-label="Cài đặt đọc truyện"
              className="p-2 rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Tùy chỉnh font, cỡ chữ & giao diện"
            >
              <SettingOutlined className="text-base" />
            </button>
          </Popover>

          {/* Zen mode toggle */}
          <button
            onClick={onToggleZenMode}
            aria-label={isZenMode ? 'Thoát chế độ tập trung' : 'Chế độ tập trung'}
            className="hidden md:flex p-2 rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={isZenMode ? 'Thoát chế độ tập trung' : 'Chế độ tập trung Zen'}
          >
            {isZenMode ? (
              <FullscreenExitOutlined className="text-base" />
            ) : (
              <FullscreenOutlined className="text-base" />
            )}
          </button>

          {/* Google Drive Account / Sync button */}
          <button
            onClick={onOpenDriveModal}
            className="flex items-center gap-1.5 p-1 md:px-2 md:py-1 rounded-md text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-700"
            title="Đồng bộ Google Drive"
          >
            {user ? (
              <>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google'}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px]">
                    {user.email ? user.email.slice(0, 1).toUpperCase() : 'G'}
                  </div>
                )}
                <span className="hidden md:inline truncate max-w-[80px]">
                  {user.displayName?.split(' ')[0] || 'Drive'}
                </span>
              </>
            ) : (
              <>
                <CloudSyncOutlined className="text-sm" />
                <span className="hidden md:inline">Drive</span>
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
