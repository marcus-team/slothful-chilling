import React, { useState, useMemo } from 'react';
import { Novel, Chapter, ReadingHistoryItem } from '../types/novel';
import { Input, Select, Tooltip, Badge } from 'antd';
import {
  SearchOutlined,
  CloudSyncOutlined,
  BookOutlined,
  CheckOutlined,
  FolderOpenOutlined,
  ReadOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';

interface GitBookSidebarProps {
  novels: Novel[];
  currentNovel: Novel;
  currentChapter: Chapter;
  onSelectNovel: (novel: Novel) => void;
  onSelectChapter: (chapter: Chapter) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenDriveModal: () => void;
  isDriveConnected: boolean;
  readingHistory: Record<string, ReadingHistoryItem>;
}

export const GitBookSidebar: React.FC<GitBookSidebarProps> = ({
  novels,
  currentNovel,
  currentChapter,
  onSelectNovel,
  onSelectChapter,
  isOpen,
  onClose,
  onOpenDriveModal,
  isDriveConnected,
  readingHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter chapters by search query
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return currentNovel.chapters;
    const query = searchQuery.toLowerCase();
    return currentNovel.chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        `chương ${c.order}`.includes(query) ||
        `chap ${c.order}`.includes(query)
    );
  }, [currentNovel, searchQuery]);

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* GitBook Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 lg:w-80 bg-neutral-50 dark:bg-neutral-925 border-r border-neutral-200 dark:border-neutral-800 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/slothfulface1_11858195.png"
              alt="slothfulchilling logo"
              className="w-7 h-7 rounded-full object-contain filter contrast-125"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                slothfulchilling
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">
                reading · chilling
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenDriveModal}
              title={isDriveConnected ? 'Đã kết nối Google Drive' : 'Kết nối Google Drive'}
              className="p-1.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              <CloudSyncOutlined className={`text-base ${isDriveConnected ? 'text-neutral-900 dark:text-white' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors"
            >
              <CloseOutlined className="text-sm" />
            </button>
          </div>
        </div>

        {/* Novel Selector */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            TỦ TRUYỆN ({novels.length})
          </label>
          <Select
            value={currentNovel.id}
            onChange={(novelId) => {
              const selected = novels.find((n) => n.id === novelId);
              if (selected) onSelectNovel(selected);
            }}
            className="w-full text-xs"
            popupMatchSelectWidth={false}
            options={novels.map((n) => ({
              value: n.id,
              label: (
                <div className="flex items-center justify-between gap-2 py-0.5">
                  <span className="truncate font-medium text-xs text-neutral-800 dark:text-neutral-200">
                    {n.title}
                  </span>
                  <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                    {n.source === 'drive' ? 'Drive' : 'Sẵn có'}
                  </span>
                </div>
              ),
            }))}
          />

          {/* Quick info of current novel */}
          <div className="text-xs text-neutral-500 flex items-center justify-between pt-1">
            <span className="truncate">{currentNovel.author || 'Khuyết danh'}</span>
            <span className="text-[11px] font-mono shrink-0">
              {currentNovel.chapters.length} chap
            </span>
          </div>
        </div>

        {/* Chapter Search */}
        <div className="p-3 pb-2">
          <Input
            placeholder="Tìm chương... (VD: 01, Mở đầu)"
            prefix={<SearchOutlined className="text-neutral-400 text-xs" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            size="small"
            className="text-xs rounded-md bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          />
        </div>

        {/* GitBook Chapter Tree / Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 px-2 py-1 flex items-center justify-between">
            <span>MỤC LỤC CHƯƠNG</span>
            {searchQuery && (
              <span className="text-[10px] text-neutral-500 font-mono">
                {filteredChapters.length}/{currentNovel.chapters.length}
              </span>
            )}
          </div>

          {filteredChapters.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              Không tìm thấy chương nào
            </div>
          ) : (
            filteredChapters.map((chap) => {
              const isActive = chap.id === currentChapter.id;
              const historyKey = `${currentNovel.id}_${chap.id}`;
              const isRead = !!readingHistory[historyKey];

              return (
                <button
                  key={chap.id}
                  onClick={() => {
                    onSelectChapter(chap);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between group ${
                    isActive
                      ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-950 dark:text-neutral-50 font-semibold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-850 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className={`font-mono text-[11px] shrink-0 ${
                        isActive
                          ? 'text-neutral-950 dark:text-white font-bold'
                          : 'text-neutral-400 group-hover:text-neutral-600'
                      }`}
                    >
                      {String(chap.order).padStart(2, '0')}
                    </span>
                    <span className="truncate">{chap.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isRead && !isActive && (
                      <CheckOutlined className="text-[10px] text-neutral-400" title="Đã đọc" />
                    )}
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isDriveConnected ? 'bg-neutral-800 dark:bg-neutral-200' : 'bg-neutral-300'
              }`}
            />
            <span className="text-[11px]">
              {isDriveConnected ? 'Drive đã kết nối' : 'Thư viện offline'}
            </span>
          </div>

          <button
            onClick={onOpenDriveModal}
            className="text-[11px] text-neutral-700 dark:text-neutral-300 hover:underline flex items-center gap-1"
          >
            <span>Đồng bộ</span>
            <RightOutlined className="text-[9px]" />
          </button>
        </div>
      </aside>
    </>
  );
};
