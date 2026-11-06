import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Novel, Chapter, ReadingSettings, ReadingHistoryItem } from './types/novel';
import { GitBookSidebar } from './components/GitBookSidebar';
import { ReaderHeader } from './components/ReaderHeader';
import { ReaderCanvas, ContentStatus } from './components/ReaderCanvas';
import { useOverscrollNavigation } from './hooks/useOverscrollNavigation';
import { ImportModal } from './components/ImportModal';
import { LibraryModal, NovelResume } from './components/LibraryModal';
import { EmptyLibrary } from './components/EmptyLibrary';
import { watchUser, signInWithGoogle, signOutUser, AppUser } from './services/firebase';
import {
  subscribeNovels,
  fetchChapterText,
  prefetchChapterText,
  getCachedChapterText,
  deleteNovel,
} from './services/library';
import { message } from 'antd';

const STORAGE_KEY_SETTINGS = 'slothful_reading_settings';
const STORAGE_KEY_LAST_READ = 'slothful_last_read';
const STORAGE_KEY_HISTORY = 'slothful_reading_history';

// Dọn dữ liệu cũ của bản đọc từ Google Drive (cache chương chiếm nhiều chỗ trong localStorage)
const cleanupLegacyStorage = () => {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('slothful_chapter_cache_') ||
          key === 'slothful_cache_index' ||
          key === 'slothful_drive_novels_cache' ||
          key === 'slothful_google_session')
      ) {
        stale.push(key);
      }
    }
    stale.forEach((k) => localStorage.removeItem(k));
  } catch {}
};

// Chưa từng chỉnh gì thì theo giao diện sáng/tối của thiết bị
const buildDefaultSettings = (): ReadingSettings => ({
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: 'serif',
  theme:
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  textAlign: 'left',
  maxWidth: 'normal',
});

interface ContentState {
  chapterId: string | null;
  status: ContentStatus;
  text: string | null;
  error: string;
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as T;
  } catch {}
  return fallback;
};

export default function App() {
  // --- Reading Settings ---
  const [settings, setSettings] = useState<ReadingSettings>(() => ({
    ...buildDefaultSettings(),
    ...readJson<Partial<ReadingSettings>>(STORAGE_KEY_SETTINGS, {}),
  }));

  // Sync dark class on documentElement
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // --- Đăng nhập & thư viện (Firebase) ---
  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [allNovels, setAllNovels] = useState<Novel[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [currentNovelId, setCurrentNovelId] = useState<string | null>(
    () => readJson<{ novelId?: string }>(STORAGE_KEY_LAST_READ, {}).novelId ?? null
  );
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(
    () => readJson<{ chapterId?: string }>(STORAGE_KEY_LAST_READ, {}).chapterId ?? null
  );

  const currentNovel = useMemo<Novel | null>(() => {
    return allNovels.find((n) => n.id === currentNovelId) || allNovels[0] || null;
  }, [allNovels, currentNovelId]);

  const currentChapter = useMemo<Chapter | null>(() => {
    if (!currentNovel) return null;
    return (
      currentNovel.chapters.find((c) => c.id === currentChapterId) || currentNovel.chapters[0] || null
    );
  }, [currentNovel, currentChapterId]);

  // Navigation indexes
  const currentChapterIndex = useMemo(() => {
    if (!currentNovel || !currentChapter) return -1;
    return currentNovel.chapters.findIndex((c) => c.id === currentChapter.id);
  }, [currentNovel, currentChapter]);

  const hasNext =
    !!currentNovel && currentChapterIndex >= 0 && currentChapterIndex < currentNovel.chapters.length - 1;
  const hasPrev = currentChapterIndex > 0;

  const nextChapter = hasNext && currentNovel ? currentNovel.chapters[currentChapterIndex + 1] : undefined;
  const prevChapter = hasPrev && currentNovel ? currentNovel.chapters[currentChapterIndex - 1] : undefined;

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  // Reading history store (tiến độ từng chương: vị trí cuộn + lần đọc gần nhất)
  const [readingHistory, setReadingHistory] = useState<Record<string, ReadingHistoryItem>>(() =>
    readJson<Record<string, ReadingHistoryItem>>(STORAGE_KEY_HISTORY, {})
  );

  // Refs cho các listener chạy một lần nhưng cần giá trị mới nhất
  const historyRef = useRef(readingHistory);
  historyRef.current = readingHistory;
  const currentNovelRef = useRef(currentNovel);
  currentNovelRef.current = currentNovel;
  const currentChapterRef = useRef(currentChapter);
  currentChapterRef.current = currentChapter;

  // Chương đang đọc dở của một bộ truyện (dùng cho "Đọc tiếp")
  const getResume = useCallback(
    (novel: Novel): NovelResume | null => {
      if (novel.chapters.length === 0) return null;
      let best: ReadingHistoryItem | null = null;
      for (const item of Object.values(readingHistory)) {
        if (item.novelId === novel.id && (!best || item.updatedAt > best.updatedAt)) best = item;
      }
      if (best) {
        const index = novel.chapters.findIndex((c) => c.id === best!.chapterId);
        if (index >= 0) return { chapter: novel.chapters[index], index, updatedAt: best.updatedAt };
      }
      return { chapter: novel.chapters[0], index: 0, updatedAt: 0 };
    },
    [readingHistory]
  );

  // --- Nội dung chương ---
  const [contentState, setContentState] = useState<ContentState>({
    chapterId: null,
    status: 'idle',
    text: null,
    error: '',
  });
  const [reloadKey, setReloadKey] = useState(0);
  const contentStateRef = useRef(contentState);
  contentStateRef.current = contentState;

  // Trạng thái hiển thị: nếu nội dung đang giữ chưa phải của chương hiện tại thì coi như đang tải
  const viewStatus: ContentStatus = !currentChapter
    ? 'idle'
    : contentState.chapterId === currentChapter.id
    ? contentState.status
    : 'loading';

  useEffect(() => {
    cleanupLegacyStorage();
  }, []);

  // Theo dõi đăng nhập (Firebase giữ phiên lâu dài, không tự đăng xuất sau vài ngày)
  useEffect(() => {
    return watchUser((u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  // Đã đăng nhập thì lắng nghe thư viện truyện trong Firestore
  useEffect(() => {
    if (!user) {
      setAllNovels([]);
      setLibraryLoaded(false);
      setLoadError('');
      return;
    }
    setLoadError('');
    return subscribeNovels(
      (novels) => {
        setAllNovels(novels);
        setLibraryLoaded(true);
      },
      (err) => {
        console.error('Library error', err);
        setLibraryLoaded(true);
        setLoadError(
          /permission|insufficient/i.test(err.message)
            ? 'Tài khoản này chưa được phép truy cập thư viện.'
            : `Không tải được thư viện: ${err.message}`
        );
      }
    );
  }, [user?.uid]);

  const handleImported = (novel: Novel) => {
    // Chuyển sang truyện vừa nhập (bản cập nhật từ Firestore sẽ tới ngay sau đó)
    startNovel(novel);
  };

  // Mở một bộ truyện ở đúng chương đang đọc dở
  const startNovel = (novel: Novel) => {
    pendingEndRef.current = false;
    const resume = getResume(novel);
    setCurrentNovelId(novel.id);
    setCurrentChapterId(resume ? resume.chapter.id : null);
  };

  const handleRemoveNovel = async (novel: Novel) => {
    try {
      await deleteNovel(novel);
      message.success(`Đã xóa "${novel.title}"`);
      if (currentNovel?.id === novel.id) {
        const other = allNovels.find((n) => n.id !== novel.id);
        if (other) {
          startNovel(other);
        } else {
          setCurrentNovelId(null);
          setCurrentChapterId(null);
        }
      }
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || 'Không xóa được truyện');
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      // Popup bị chặn/đóng không báo về thì sau 45s tự thoát khỏi trạng thái chờ
      await Promise.race([
        signInWithGoogle(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Cửa sổ đăng nhập không phản hồi. Hãy cho phép popup rồi thử lại.')),
            45000
          )
        ),
      ]);
    } catch (err: any) {
      // Người dùng tự đóng cửa sổ đăng nhập thì không cần báo lỗi
      const code = err?.code as string | undefined;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        console.error('Login error', err);
        message.error(err?.message || 'Không thể đăng nhập Google');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      setIsImportOpen(false);
      setIsLibraryOpen(false);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Load Chapter Content
  useEffect(() => {
    if (!currentChapter || !currentNovel) return;
    const chapter = currentChapter;
    const novelId = currentNovel.id;
    // Chương này đã tải xong rồi (vd chỉ đổi token) thì không tải lại
    const current = contentStateRef.current;
    if (current.chapterId === chapter.id && current.status === 'ready') return;

    let cancelled = false;

    const setState = (status: ContentStatus, text: string | null = null, error = '') => {
      if (cancelled) return;
      setContentState({ chapterId: chapter.id, status, text, error });
    };

    const finish = (text: string) => {
      if (cancelled) return;
      setState('ready', text);
    };

    const run = async () => {
      // Đã đọc rồi (có trong cache thiết bị) thì hiện ngay, không cần mạng
      const cached = await getCachedChapterText(novelId, chapter.id);
      if (cached !== null) {
        finish(cached);
        return;
      }

      setState('loading');
      try {
        finish(await fetchChapterText(novelId, chapter.id));
      } catch (err: any) {
        if (/permission|insufficient/i.test(err?.message || '')) setState('needs-auth');
        else setState('error', null, err?.message || '');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [currentNovel?.id, currentChapter?.id, reloadKey]);

  const handleRetryContent = () => {
    setReloadKey((k) => k + 1);
  };

  // Tải trước chương kế tiếp để sang chương không phải chờ
  useEffect(() => {
    if (viewStatus !== 'ready' || !nextChapter || !currentNovel) return;
    const next = nextChapter;
    const novelId = currentNovel.id;
    const timer = setTimeout(() => prefetchChapterText(novelId, next.id), 1500);
    return () => clearTimeout(timer);
  }, [viewStatus, nextChapter?.id, currentNovel?.id]);

  // Ghi nhớ chương đang đọc + đánh dấu đã mở (giữ nguyên vị trí cuộn đã lưu)
  useEffect(() => {
    if (!currentNovel || !currentChapter) return;
    localStorage.setItem(
      STORAGE_KEY_LAST_READ,
      JSON.stringify({ novelId: currentNovel.id, chapterId: currentChapter.id })
    );

    const novelId = currentNovel.id;
    const chapterId = currentChapter.id;
    const key = `${novelId}_${chapterId}`;
    setReadingHistory((prev) => {
      const updated = {
        ...prev,
        [key]: {
          novelId,
          chapterId,
          scrollRatio: prev[key]?.scrollRatio ?? 0,
          updatedAt: Date.now(),
        },
      };
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      return updated;
    });
  }, [currentNovel?.id, currentChapter?.id]);

  // Khôi phục vị trí đọc khi nội dung chương đã sẵn sàng
  const restoreStartedRef = useRef<string | null>(null);
  const restoredRef = useRef<string | null>(null);
  const pendingEndRef = useRef(false); // vừa lùi về chương trước bằng cuộn: hạ cánh ở cuối chương
  const lastYRef = useRef(0);

  useEffect(() => {
    if (viewStatus !== 'ready' || !currentNovel || !currentChapter) return;
    if (restoreStartedRef.current === currentChapter.id) return;
    restoreStartedRef.current = currentChapter.id;

    const chapterId = currentChapter.id;
    const saved = historyRef.current[`${currentNovel.id}_${chapterId}`]?.scrollRatio ?? 0;
    const goEnd = pendingEndRef.current;
    pendingEndRef.current = false;

    // Đợi trình duyệt dựng xong nội dung rồi mới cuộn
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const total = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        let top = 0;
        if (goEnd) top = total;
        else if (saved > 0.02 && saved < 0.98) top = total * saved;

        window.scrollTo({ top, behavior: 'auto' });
        lastYRef.current = top;
        restoredRef.current = chapterId;
        setScrollProgress(total <= 0 ? 1 : top / total);
        setIsHeaderHidden(false);
      })
    );
  }, [viewStatus, currentChapter?.id, currentNovel?.id]);

  // Theo dõi cuộn: tiến độ, ẩn/hiện header, lưu vị trí đọc
  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      const y = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const progress = total <= 0 ? 1 : Math.min(1, Math.max(0, y / total));
      setScrollProgress(progress);

      // Cuộn xuống thì ẩn header cho rộng chỗ đọc, cuộn lên thì hiện lại
      if (y < 80) {
        setIsHeaderHidden(false);
        lastYRef.current = y;
      } else {
        const dy = y - lastYRef.current;
        if (dy > 8) {
          setIsHeaderHidden(true);
          lastYRef.current = y;
        } else if (dy < -8) {
          setIsHeaderHidden(false);
          lastYRef.current = y;
        }
      }

      const novel = currentNovelRef.current;
      const chapter = currentChapterRef.current;
      // Chưa khôi phục xong vị trí thì không ghi, tránh ghi đè bằng vị trí tạm
      if (!novel || !chapter || restoredRef.current !== chapter.id) return;

      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const key = `${novel.id}_${chapter.id}`;
        setReadingHistory((prev) => {
          const updated = {
            ...prev,
            [key]: { novelId: novel.id, chapterId: chapter.id, scrollRatio: progress, updatedAt: Date.now() },
          };
          localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
          return updated;
        });
      }, 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, []);

  // Chapter Navigation Handlers (vị trí cuộn do effect khôi phục ở trên lo)
  const handleNextChapter = useCallback(() => {
    pendingEndRef.current = false;
    if (hasNext && nextChapter) setCurrentChapterId(nextChapter.id);
  }, [hasNext, nextChapter]);

  const handlePrevChapter = useCallback(() => {
    pendingEndRef.current = false;
    if (hasPrev && prevChapter) setCurrentChapterId(prevChapter.id);
  }, [hasPrev, prevChapter]);

  // Kéo xuống ở đầu chương để về chương trước: hạ cánh ở cuối chương đó (đọc ngược cho tự nhiên)
  const handlePrevFromOverscroll = useCallback(() => {
    handlePrevChapter();
    pendingEndRef.current = true;
  }, [handlePrevChapter]);

  // Overscroll Navigation hook (scroll past bottom -> next; scroll past top -> prev)
  // Chỉ bật khi chương đã tải xong, tránh nhảy chương nhầm lúc trang còn trống
  const { bottomProgress, topProgress, isNavigating } = useOverscrollNavigation({
    onNext: handleNextChapter,
    onPrev: handlePrevFromOverscroll,
    hasNext: hasNext && viewStatus === 'ready',
    hasPrev: hasPrev && viewStatus === 'ready',
    threshold: 80,
  });

  // Phím tắt ←/→ để chuyển chương (iPad / laptop có bàn phím)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isImportOpen || isLibraryOpen) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'ArrowRight') handleNextChapter();
      else if (e.key === 'ArrowLeft') handlePrevChapter();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNextChapter, handlePrevChapter, isImportOpen, isLibraryOpen]);

  const handleSelectChapter = (chapter: Chapter) => {
    pendingEndRef.current = false;
    setCurrentChapterId(chapter.id);
  };

  const updateSettings = (newSettings: Partial<ReadingSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const importModal = (
    <ImportModal
      open={isImportOpen}
      onClose={() => setIsImportOpen(false)}
      user={user}
      novels={allNovels}
      onLogout={handleLogout}
      onImported={handleImported}
    />
  );

  // Chưa đăng nhập / đang tải / chưa có truyện nào
  if (!user || !currentNovel || !currentChapter) {
    return (
      <>
        <EmptyLibrary
          authReady={authReady}
          user={user}
          isLoggingIn={isLoggingIn}
          libraryLoaded={libraryLoaded}
          loadError={loadError}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onOpenImport={() => setIsImportOpen(true)}
        />
        {user && importModal}
      </>
    );
  }

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
          onSelectChapter={handleSelectChapter}
          onOpenLibrary={() => setIsLibraryOpen(true)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenImport={() => setIsImportOpen(true)}
          isSignedIn={!!user}
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
          onOpenImport={() => setIsImportOpen(true)}
          user={user}
          scrollProgress={scrollProgress}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode((prev) => !prev)}
          isHidden={isHeaderHidden}
        />

        {/* Reading Canvas */}
        <ReaderCanvas
          currentNovel={currentNovel}
          currentChapter={currentChapter}
          chapterContent={viewStatus === 'ready' ? contentState.text : null}
          status={viewStatus}
          errorMessage={contentState.error}
          onReconnect={handleLogin}
          onRetry={handleRetryContent}
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

      {/* Tủ truyện: đổi truyện, xem tiến độ, "đọc tiếp" */}
      <LibraryModal
        open={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        novels={allNovels}
        currentNovelId={currentNovel.id}
        getResume={getResume}
        onSelectNovel={startNovel}
        onRemoveNovel={handleRemoveNovel}
        onOpenImport={() => setIsImportOpen(true)}
      />

      {/* Nhập truyện & tài khoản */}
      {importModal}
    </div>
  );
}
