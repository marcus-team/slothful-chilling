import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Novel, Chapter, ReadingHistoryItem } from '../types/novel';
import { Input } from 'antd';
import {
  SearchOutlined,
  CloudSyncOutlined,
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  RightOutlined,
  SwapOutlined,
} from '@ant-design/icons';

// Truyện dài (hàng trăm chương) được gom thành các nhóm để mục lục không dài vô tận
const GROUP_SIZE = 50;
const MAX_SEARCH_RESULTS = 100;

interface GitBookSidebarProps {
  novels: Novel[];
  currentNovel: Novel;
  currentChapter: Chapter;
  onSelectChapter: (chapter: Chapter) => void;
  onOpenLibrary: () => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenImport: () => void;
  isSignedIn: boolean;
  readingHistory: Record<string, ReadingHistoryItem>;
}

interface ChapterGroup {
  index: number;
  label: string;
  chapters: Chapter[];
}

export const GitBookSidebar: React.FC<GitBookSidebarProps> = ({
  novels,
  currentNovel,
  currentChapter,
  onSelectChapter,
  onOpenLibrary,
  isOpen,
  onClose,
  onOpenImport,
  isSignedIn,
  readingHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const chapters = currentNovel.chapters;
  const currentIndex = chapters.findIndex((c) => c.id === currentChapter.id);
  const activeGroupIndex = Math.max(0, Math.floor(currentIndex / GROUP_SIZE));
  const isGrouped = chapters.length > GROUP_SIZE;

  const groups = useMemo<ChapterGroup[]>(() => {
    const result: ChapterGroup[] = [];
    for (let i = 0; i < chapters.length; i += GROUP_SIZE) {
      const slice = chapters.slice(i, i + GROUP_SIZE);
      const first = slice[0].order;
      const last = slice[slice.length - 1].order;
      const hasNumbers = first < 9999 && last < 9999;
      result.push({
        index: i / GROUP_SIZE,
        label: hasNumbers ? `Chương ${first} – ${last}` : `Mục ${i + 1} – ${i + slice.length}`,
        chapters: slice,
      });
    }
    return result;
  }, [chapters]);

  // Nhóm chứa chương đang đọc luôn được mở
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([activeGroupIndex]));
  useEffect(() => {
    setExpanded((prev) => (prev.has(activeGroupIndex) ? prev : new Set(prev).add(activeGroupIndex)));
  }, [currentNovel.id, activeGroupIndex]);

  // Khi đổi truyện thì xóa ô tìm kiếm
  useEffect(() => {
    setSearchQuery('');
  }, [currentNovel.id]);

  const query = searchQuery.trim().toLowerCase();

  // Tìm theo tên chương; nếu nhập số thì chương có đúng số đó lên đầu
  const searchResults = useMemo(() => {
    if (!query) return [];
    if (/^\d+$/.test(query)) {
      const n = parseInt(query, 10);
      const exact = chapters.filter((c) => c.order === n);
      const rest = chapters.filter(
        (c) => c.order !== n && (String(c.order).startsWith(query) || c.title.toLowerCase().includes(query))
      );
      return [...exact, ...rest];
    }
    return chapters.filter((c) => c.title.toLowerCase().includes(query));
  }, [chapters, query]);

  // Tự cuộn mục lục tới chương đang đọc
  // (chỉ một lần cho mỗi chương/lần mở, để mở/đóng nhóm thủ công không bị giật về chỗ cũ)
  const centeredForRef = useRef<string | null>(null);
  useEffect(() => {
    if (query) return;
    const container = listRef.current;
    const active = activeRef.current;
    if (!container || !active) return;
    const key = `${currentNovel.id}:${currentChapter.id}:${isOpen}`;
    if (centeredForRef.current === key) return;
    centeredForRef.current = key;
    container.scrollTop = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2;
  }, [isOpen, currentChapter.id, currentNovel.id, expanded, query]);

  const selectChapter = (chap: Chapter) => {
    onSelectChapter(chap);
    setSearchQuery('');
    if (window.innerWidth < 1024) onClose();
  };

  const toggleGroup = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const renderChapterButton = (chap: Chapter) => {
    const isActive = chap.id === currentChapter.id;
    const isRead = !!readingHistory[`${currentNovel.id}_${chap.id}`];

    return (
      <button
        key={chap.id}
        ref={isActive ? activeRef : undefined}
        onClick={() => selectChapter(chap)}
        className={`w-full text-left px-2.5 py-2.5 lg:py-1.5 rounded-md text-sm lg:text-xs transition-colors flex items-center justify-between group ${
          isActive
            ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-950 dark:text-neutral-50 font-semibold shadow-xs'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-850 hover:text-neutral-900 dark:hover:text-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          <span
            className={`font-sans tabular-nums text-xs lg:text-[11px] shrink-0 ${
              isActive
                ? 'text-neutral-950 dark:text-white font-bold'
                : 'text-neutral-400 group-hover:text-neutral-600'
            }`}
          >
            {chap.order < 9999 ? String(chap.order).padStart(2, '0') : '··'}
          </span>
          <span className="truncate">{chap.title}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isRead && !isActive && (
            <CheckOutlined className="text-[10px] text-neutral-400" title="Đã đọc" />
          )}
          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />}
        </div>
      </button>
    );
  };

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
        className={`fixed top-0 bottom-0 left-0 z-40 w-80 max-w-[88vw] bg-neutral-50 dark:bg-neutral-925 border-r border-neutral-200 dark:border-neutral-800 flex flex-col transition-transform duration-200 ease-in-out ${
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
              <span className="text-[11px] text-neutral-500 font-sans tabular-nums">reading · chilling</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenImport}
              aria-label={isSignedIn ? 'Đã đăng nhập' : 'Đăng nhập'}
              title={isSignedIn ? 'Đã đăng nhập' : 'Đăng nhập'}
              className="p-2.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              <CloudSyncOutlined
                className={`text-base ${isSignedIn ? 'text-neutral-900 dark:text-white' : ''}`}
              />
            </button>
            <button
              onClick={onClose}
              aria-label="Đóng menu"
              className="lg:hidden p-2.5 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors"
            >
              <CloseOutlined className="text-sm" />
            </button>
          </div>
        </div>

        {/* Current novel -> mở tủ truyện để đổi */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onOpenLibrary}
            className="w-full text-left px-3 py-2.5 min-h-[52px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {currentNovel.title}
              </div>
              <div className="text-xs text-neutral-500 font-sans tabular-nums mt-0.5">
                {currentIndex >= 0 ? currentIndex + 1 : 1}/{chapters.length} chương
                {novels.length > 1 ? ` · ${novels.length} truyện` : ''}
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs text-neutral-500 shrink-0">
              <SwapOutlined />
              <span>Đổi</span>
            </span>
          </button>
        </div>

        {/* Chapter Search / Jump */}
        <div className="p-3 pb-2">
          <Input
            placeholder="Tìm chương hoặc nhập số rồi Enter"
            prefix={<SearchOutlined className="text-neutral-400 text-xs" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={() => {
              if (searchResults.length > 0) selectChapter(searchResults[0]);
            }}
            allowClear
            inputMode="search"
            enterKeyHint="go"
            className="rounded-md bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          />
        </div>

        {/* GitBook Chapter Tree / Nav */}
        <div ref={listRef} className="relative flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 px-2 py-1 flex items-center justify-between">
            <span>MỤC LỤC CHƯƠNG</span>
            {query && (
              <span className="text-[10px] text-neutral-500 font-sans tabular-nums">
                {Math.min(searchResults.length, MAX_SEARCH_RESULTS)}/{searchResults.length} kết quả
              </span>
            )}
          </div>

          {query ? (
            searchResults.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">Không tìm thấy chương nào</div>
            ) : (
              searchResults.slice(0, MAX_SEARCH_RESULTS).map(renderChapterButton)
            )
          ) : isGrouped ? (
            groups.map((group) => {
              const isOpenGroup = expanded.has(group.index);
              return (
                <div key={group.index}>
                  <button
                    onClick={() => toggleGroup(group.index)}
                    aria-expanded={isOpenGroup}
                    className="w-full flex items-center justify-between px-2.5 py-2.5 lg:py-1.5 rounded-md text-sm lg:text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-850 transition-colors"
                  >
                    <span>{group.label}</span>
                    {isOpenGroup ? (
                      <DownOutlined className="text-[10px] text-neutral-400" />
                    ) : (
                      <RightOutlined className="text-[10px] text-neutral-400" />
                    )}
                  </button>
                  {isOpenGroup && (
                    <div className="space-y-0.5 pl-1">{group.chapters.map(renderChapterButton)}</div>
                  )}
                </div>
              );
            })
          ) : (
            chapters.map(renderChapterButton)
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isSignedIn ? 'bg-neutral-800 dark:bg-neutral-200' : 'bg-neutral-300'
              }`}
            />
            <span className="text-[11px]">
              {isSignedIn ? 'Đã đăng nhập' : 'Chưa đăng nhập'}
            </span>
          </div>

          <button
            onClick={onOpenImport}
            className="text-xs py-1 text-neutral-700 dark:text-neutral-300 hover:underline flex items-center gap-1"
          >
            <span>Nhập truyện</span>
            <RightOutlined className="text-[9px]" />
          </button>
        </div>
      </aside>
    </>
  );
};
