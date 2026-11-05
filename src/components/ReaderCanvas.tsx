import React, { useMemo } from 'react';
import { Novel, Chapter, ReadingSettings } from '../types/novel';
import {
  LeftOutlined,
  RightOutlined,
  VerticalAlignTopOutlined,
  LoadingOutlined,
  BookOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Spin } from 'antd';

interface ReaderCanvasProps {
  currentNovel: Novel;
  currentChapter: Chapter;
  chapterContent: string | null;
  isLoadingContent: boolean;
  settings: ReadingSettings;
  onNextChapter: () => void;
  onPrevChapter: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  overscrollBottomProgress: number; // 0 to 1
  overscrollTopProgress: number; // 0 to 1
  isNavigating: boolean;
  nextChapterTitle?: string;
  prevChapterTitle?: string;
}

export const ReaderCanvas: React.FC<ReaderCanvasProps> = ({
  currentNovel,
  currentChapter,
  chapterContent,
  isLoadingContent,
  settings,
  onNextChapter,
  onPrevChapter,
  hasNext,
  hasPrev,
  overscrollBottomProgress,
  overscrollTopProgress,
  isNavigating,
  nextChapterTitle,
  prevChapterTitle,
}) => {
  // Split content into clean paragraphs
  const paragraphs = useMemo(() => {
    if (!chapterContent) return [];
    return chapterContent
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }, [chapterContent]);

  // Compute word count and reading time
  const { wordCount, readingTimeMinutes } = useMemo(() => {
    if (!chapterContent) return { wordCount: 0, readingTimeMinutes: 1 };
    const words = chapterContent.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 220));
    return { wordCount: words, readingTimeMinutes: minutes };
  }, [chapterContent]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Font family class mapper
  const fontClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  }[settings.fontFamily];

  // Theme container style mapper
  const themeContainerStyle = {
    light: 'bg-white text-neutral-900',
    warm: 'bg-neutral-50/80 text-neutral-850',
    dark: 'bg-neutral-925 text-neutral-200',
  }[settings.theme];

  // Max width container mapper
  const maxWidthClass = {
    normal: 'max-w-2xl lg:max-w-3xl',
    wide: 'max-w-4xl',
    zen: 'max-w-2xl',
  }[settings.maxWidth];

  return (
    <main
      className={`min-h-screen py-8 px-4 sm:px-8 lg:px-12 transition-colors duration-200 ${themeContainerStyle}`}
    >
      {/* Top Overscroll Indicator (Roll up past top to previous chapter) */}
      {hasPrev && overscrollTopProgress > 0 && (
        <div className="fixed top-14 left-0 right-0 z-20 flex justify-center pointer-events-none px-4">
          <div className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 rounded-full shadow-lg text-xs font-medium flex items-center gap-2 transform transition-transform">
            <VerticalAlignTopOutlined className="rotate-180 text-xs" />
            <span>
              {overscrollTopProgress >= 0.85
                ? 'Đang chuyển về chương trước...'
                : `Cuộn tiếp để về: ${prevChapterTitle || 'Chương trước'}`}
            </span>
            <div className="w-12 h-1.5 bg-neutral-700 dark:bg-neutral-300 rounded-full overflow-hidden ml-1">
              <div
                className="h-full bg-white dark:bg-black transition-all duration-75"
                style={{ width: `${overscrollTopProgress * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Reading Column */}
      <article className={`mx-auto ${maxWidthClass}`}>
        {/* Chapter Header (GitBook editorial presentation) */}
        <header className="pb-8 mb-8 border-b border-neutral-200 dark:border-neutral-800">
          <div className="text-xs uppercase tracking-widest text-neutral-400 font-mono mb-2">
            {currentNovel.title}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-4 leading-tight">
            {currentChapter.title}
          </h1>

          {/* Clean unboxed metadata (anti-slop discipline) */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 font-mono">
            <span className="flex items-center gap-1">
              <FileTextOutlined className="text-neutral-400" />
              <span>{wordCount.toLocaleString()} từ</span>
            </span>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
            <span className="flex items-center gap-1">
              <ClockCircleOutlined className="text-neutral-400" />
              <span>~{readingTimeMinutes} phút đọc</span>
            </span>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
            <span className="capitalize">
              Nguồn: {currentChapter.source === 'drive' ? 'Google Drive' : 'Thư viện'}
            </span>
          </div>
        </header>

        {/* Content body */}
        {isLoadingContent ? (
          <div className="py-24 text-center space-y-3">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: '#111' }} spin />} />
            <p className="text-sm text-neutral-500">Đang tải nội dung chương từ Google Drive...</p>
          </div>
        ) : paragraphs.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-400">
            Nội dung chương trống hoặc đang được cập nhật.
          </div>
        ) : (
          <div
            className={`prose prose-neutral max-w-none ${fontClass} leading-relaxed`}
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              textAlign: settings.textAlign,
            }}
          >
            {paragraphs.map((para, index) => {
              // Apply elegant initial drop cap for the very first paragraph
              const isFirst = index === 0;

              if (isFirst && para.length > 20) {
                const firstLetter = para.charAt(0);
                const restOfPara = para.slice(1);

                return (
                  <p key={index} className="mb-6 text-neutral-850 dark:text-neutral-200">
                    <span className="float-left text-4xl sm:text-5xl font-serif font-bold mr-2 mt-1 leading-none text-neutral-900 dark:text-white select-none">
                      {firstLetter}
                    </span>
                    {restOfPara}
                  </p>
                );
              }

              return (
                <p key={index} className="mb-6 text-neutral-850 dark:text-neutral-200">
                  {para}
                </p>
              );
            })}
          </div>
        )}

        {/* Bottom Overscroll Indicator (Roll down past bottom to next chapter) */}
        {hasNext && overscrollBottomProgress > 0 && (
          <div className="my-8 flex justify-center">
            <div className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-5 py-2.5 rounded-full shadow-lg text-xs font-medium flex items-center gap-2.5 animate-pulse">
              <span>
                {overscrollBottomProgress >= 0.85
                  ? 'Đang chuyển sang chương tiếp theo...'
                  : `Cuộn tiếp để sang: ${nextChapterTitle || 'Chương kế tiếp'}`}
              </span>
              <div className="w-16 h-1.5 bg-neutral-700 dark:bg-neutral-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white dark:bg-black transition-all duration-75"
                  style={{ width: `${overscrollBottomProgress * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Reading End / Divider */}
        <div className="my-12 flex items-center justify-center gap-3">
          <span className="w-12 h-px bg-neutral-200 dark:bg-neutral-800" />
          <img
            src="/assets/aistudio/slothfulface1_11858195.png"
            alt="slothful"
            className="w-5 h-5 opacity-40 filter contrast-125 grayscale"
          />
          <span className="w-12 h-px bg-neutral-200 dark:bg-neutral-800" />
        </div>

        {/* Footer Navigation Bar */}
        <footer className="pt-6 pb-16 border-t border-neutral-200 dark:border-neutral-800 space-y-6">
          {/* Chapter Prev / Next buttons */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={onPrevChapter}
              disabled={!hasPrev || isNavigating}
              className={`p-3 sm:p-4 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                hasPrev
                  ? 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/60'
                  : 'border-transparent opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                <LeftOutlined className="text-[10px]" />
                <span>CHƯƠNG TRƯỚC</span>
              </div>
              <div className="text-xs sm:text-sm font-semibold truncate text-neutral-800 dark:text-neutral-200">
                {prevChapterTitle || 'Không còn chương trước'}
              </div>
            </button>

            <button
              onClick={onNextChapter}
              disabled={!hasNext || isNavigating}
              className={`p-3 sm:p-4 rounded-lg border text-right flex flex-col justify-between transition-colors ${
                hasNext
                  ? 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/60'
                  : 'border-transparent opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-end gap-1.5 text-xs text-neutral-400 mb-1">
                <span>CHƯƠNG TIẾP THEO</span>
                <RightOutlined className="text-[10px]" />
              </div>
              <div className="text-xs sm:text-sm font-semibold truncate text-neutral-800 dark:text-neutral-200">
                {nextChapterTitle || 'Đã hết chương'}
              </div>
            </button>
          </div>

          {/* User Request Utility: "footer (cuối trang) thì xuất hiện nút quay lại đầu trang" */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs text-neutral-500">
            <div className="flex items-center gap-2">
              <span>slothfulchilling · cuộn trang để tự động chuyển chương</span>
            </div>

            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-850 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-750 transition-colors shadow-xs"
              title="Quay lại đầu trang"
            >
              <VerticalAlignTopOutlined />
              <span>Quay lại đầu trang</span>
            </button>
          </div>
        </footer>
      </article>
    </main>
  );
};
