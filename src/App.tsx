import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Novel, Chapter, ReadingSettings, ReadingHistoryItem } from './types/novel';
import { BUILTIN_NOVELS } from './data/builtinNovels';
import { GitBookSidebar } from './components/GitBookSidebar';
import { ReaderHeader } from './components/ReaderHeader';
import { ReaderCanvas } from './components/ReaderCanvas';
import { DriveFolderPickerModal } from './components/DriveFolderPickerModal';
import { useOverscrollNavigation } from './hooks/useOverscrollNavigation';
import { initAuth, googleSignIn, logout as authLogout, getAccessToken, GoogleUser } from './services/googleAuth';
import { fetchChapterText, scanDriveForNovels } from './services/googleDrive';
import { message } from 'antd';

const STORAGE_KEY_SETTINGS = 'slothful_reading_settings';
const STORAGE_KEY_LAST_READ = 'slothful_last_read';
const STORAGE_KEY_HISTORY = 'slothful_reading_history';
const STORAGE_KEY_DRIVE_NOVELS = 'slothful_drive_novels_cache';

const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: 'serif',
  theme: 'light',
  textAlign: 'left',
  maxWidth: 'normal',
};

export default function App() {
  // --- Reading Settings ---
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Sync dark class on documentElement
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // --- Novels & Chapters State ---
  const [driveNovels, setDriveNovels] = useState<Novel[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DRIVE_NOVELS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const allNovels = useMemo(() => {
    return [...driveNovels, ...BUILTIN_NOVELS];
  }, [driveNovels]);

  // Selected Novel & Chapter
  const [currentNovelId, setCurrentNovelId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAST_READ);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.novelId) return parsed.novelId;
      }
    } catch {}
    return BUILTIN_NOVELS[0].id;
  });

  const currentNovel = useMemo(() => {
    return allNovels.find((n) => n.id === currentNovelId) || allNovels[0];
  }, [allNovels, currentNovelId]);

  const [currentChapterId, setCurrentChapterId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAST_READ);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.chapterId) return parsed.chapterId;
      }
    } catch {}
    return BUILTIN_NOVELS[0].chapters[0]?.id || '';
  });

  const currentChapter = useMemo(() => {
    const found = currentNovel.chapters.find((c) => c.id === currentChapterId);
    return found || currentNovel.chapters[0] || { id: 'empty', title: 'Chưa có chương', order: 1, source: 'builtin' };
  }, [currentNovel, currentChapterId]);

  // Navigation indexes
  const currentChapterIndex = useMemo(() => {
    return currentNovel.chapters.findIndex((c) => c.id === currentChapter.id);
  }, [currentNovel, currentChapter]);

  const hasNext = currentChapterIndex >= 0 && currentChapterIndex < currentNovel.chapters.length - 1;
  const hasPrev = currentChapterIndex > 0;

  const nextChapter = hasNext ? currentNovel.chapters[currentChapterIndex + 1] : undefined;
  const prevChapter = hasPrev ? currentNovel.chapters[currentChapterIndex - 1] : undefined;

  // Chapter content
  const [content, setContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // --- Auth & Google Drive State ---
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Reading history store
  const [readingHistory, setReadingHistory] = useState<Record<string, ReadingHistoryItem>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Init Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        message.success(`Đã kết nối tài khoản Google: ${res.user.displayName || res.user.email}`);

        // Scan novels automatically
        try {
          const detected = await scanDriveForNovels(res.accessToken);
          if (detected.length > 0) {
            handleNovelsSynced(detected);
            message.success(`Đã tự động nhận diện ${detected.length} bộ truyện từ Drive`);
          }
        } catch (scanErr) {
          console.warn('Auto scan on login skipped', scanErr);
        }
      }
    } catch (err: any) {
      console.error('Login error', err);
      message.error(err.message || 'Không thể đăng nhập Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authLogout();
      setUser(null);
      setAccessToken(null);
      message.info('Đã đăng xuất Google Drive');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleNovelsSynced = (newNovels: Novel[]) => {
    setDriveNovels((prev) => {
      // Merge by ID
      const map = new Map<string, Novel>();
      prev.forEach((n) => map.set(n.id, n));
      newNovels.forEach((n) => map.set(n.id, n));
      const merged = Array.from(map.values());
      localStorage.setItem(STORAGE_KEY_DRIVE_NOVELS, JSON.stringify(merged));
      return merged;
    });

    if (newNovels.length > 0) {
      // Switch to first newly synced novel
      setCurrentNovelId(newNovels[0].id);
      if (newNovels[0].chapters[0]) {
        setCurrentChapterId(newNovels[0].chapters[0].id);
      }
    }
  };

  // Load Chapter Content
  useEffect(() => {
    let isCancelled = false;

    const loadChapter = async () => {
      if (!currentChapter) {
        setContent(null);
        return;
      }

      if (currentChapter.source === 'builtin') {
        setContent(currentChapter.content || '');
        setIsLoadingContent(false);
        return;
      }

      // From Drive
      if (currentChapter.fileId) {
        setIsLoadingContent(true);
        try {
          const token = accessToken || (await getAccessToken());
          if (!token) {
            setContent(
              '⚠️ Bạn cần kết nối tài khoản Google Drive để tải nội dung chương này. Hãy bấm "Drive" trên thanh điều hướng để đăng nhập!'
            );
            setIsLoadingContent(false);
            return;
          }

          const text = await fetchChapterText(currentChapter.fileId, token);
          if (!isCancelled) {
            setContent(text);
          }
        } catch (err: any) {
          if (!isCancelled) {
            setContent(`❌ Lỗi tải chương từ Google Drive: ${err.message || 'Vui lòng thử lại sau.'}`);
          }
        } finally {
          if (!isCancelled) setIsLoadingContent(false);
        }
      }
    };

    loadChapter();

    // Save last read state
    const lastReadData = { novelId: currentNovel.id, chapterId: currentChapter.id };
    localStorage.setItem(STORAGE_KEY_LAST_READ, JSON.stringify(lastReadData));

    // Update history
    const historyKey = `${currentNovel.id}_${currentChapter.id}`;
    setReadingHistory((prev) => {
      const updated = {
        ...prev,
        [historyKey]: {
          novelId: currentNovel.id,
          chapterId: currentChapter.id,
          scrollRatio: 0,
          updatedAt: Date.now(),
        },
      };
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      return updated;
    });

    return () => {
      isCancelled = true;
    };
  }, [currentNovel.id, currentChapter.id, accessToken]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll <= 0) {
        setScrollProgress(1);
        return;
      }
      const currentScroll = window.scrollY;
      const progress = Math.min(1, Math.max(0, currentScroll / totalScroll));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Chapter Navigation Handlers
  const handleNextChapter = useCallback(() => {
    if (hasNext && nextChapter) {
      setCurrentChapterId(nextChapter.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [hasNext, nextChapter]);

  const handlePrevChapter = useCallback(() => {
    if (hasPrev && prevChapter) {
      setCurrentChapterId(prevChapter.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [hasPrev, prevChapter]);

  // Overscroll Navigation hook (scroll past bottom -> next; scroll past top -> prev)
  const {
    overscrollBottom,
    overscrollTop,
    bottomProgress,
    topProgress,
    isNavigating,
  } = useOverscrollNavigation({
    onNext: handleNextChapter,
    onPrev: handlePrevChapter,
    hasNext,
    hasPrev,
    threshold: 80,
  });

  const handleSelectNovel = (novel: Novel) => {
    setCurrentNovelId(novel.id);
    if (novel.chapters.length > 0) {
      setCurrentChapterId(novel.chapters[0].id);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectChapter = (chapter: Chapter) => {
    setCurrentChapterId(chapter.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateSettings = (newSettings: Partial<ReadingSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        settings.theme === 'dark'
          ? 'bg-neutral-950 text-neutral-100'
          : settings.theme === 'warm'
          ? 'bg-neutral-50 text-neutral-900'
          : 'bg-white text-neutral-900'
      }`}
    >
      {/* GitBook Sidebar Navigation */}
      {!isZenMode && (
        <GitBookSidebar
          novels={allNovels}
          currentNovel={currentNovel}
          currentChapter={currentChapter}
          onSelectNovel={handleSelectNovel}
          onSelectChapter={handleSelectChapter}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenDriveModal={() => setIsDriveModalOpen(true)}
          isDriveConnected={!!user}
          readingHistory={readingHistory}
        />
      )}

      {/* Main Content Area (offset by sidebar width on desktop if not zen) */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-200 ${
          isZenMode ? 'pl-0' : 'lg:pl-80'
        }`}
      >
        {/* Top Header */}
        <ReaderHeader
          currentNovel={currentNovel}
          currentChapter={currentChapter}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
          settings={settings}
          onUpdateSettings={updateSettings}
          onOpenDriveModal={() => setIsDriveModalOpen(true)}
          user={user}
          scrollProgress={scrollProgress}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode((prev) => !prev)}
        />

        {/* Reading Canvas */}
        <ReaderCanvas
          currentNovel={currentNovel}
          currentChapter={currentChapter}
          chapterContent={content}
          isLoadingContent={isLoadingContent}
          settings={settings}
          onNextChapter={handleNextChapter}
          onPrevChapter={handlePrevChapter}
          hasNext={hasNext}
          hasPrev={hasPrev}
          overscrollBottomProgress={bottomProgress}
          overscrollTopProgress={topProgress}
          isNavigating={isNavigating}
          nextChapterTitle={nextChapter?.title}
          prevChapterTitle={prevChapter?.title}
        />
      </div>

      {/* Google Drive Integration Modal */}
      <DriveFolderPickerModal
        open={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        user={user}
        accessToken={accessToken}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onNovelsSynced={handleNovelsSynced}
        isLoggingIn={isLoggingIn}
      />
    </div>
  );
}
