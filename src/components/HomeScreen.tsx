import React, { useMemo } from 'react';
import { Button } from 'antd';
import { CloseOutlined, PlusOutlined, ReadOutlined } from '@ant-design/icons';
import { Novel, ReadingHistoryItem, ThemeMode } from '../types/novel';
import { AppUser } from '../services/firebase';
import { NovelResume } from './LibraryModal';
import { NovelCover } from './NovelCover';

interface HomeScreenProps {
  novels: Novel[];
  user: AppUser | null;
  theme: ThemeMode;
  readingHistory: Record<string, ReadingHistoryItem>;
  getResume: (novel: Novel) => NovelResume | null;
  currentNovelId: string;
  onRead: (novel: Novel) => void;
  onClose: () => void;
  onOpenImport: () => void;
}

const DAY = 24 * 60 * 60 * 1000;

const percentOf = (resume: NovelResume | null, novel: Novel) =>
  resume && resume.updatedAt > 0 && novel.chapters.length > 0
    ? Math.round(((resume.index + 1) / novel.chapters.length) * 100)
    : 0;

export const HomeScreen: React.FC<HomeScreenProps> = ({
  novels,
  user,
  theme,
  readingHistory,
  getResume,
  currentNovelId,
  onRead,
  onClose,
  onOpenImport,
}) => {
  const items = useMemo(
    () => novels.map((novel) => ({ novel, resume: getResume(novel) })),
    [novels, getResume]
  );

  // Bộ đang đọc gần nhất (chưa đọc bộ nào thì lấy bộ hiện tại)
  const latest = useMemo(() => {
    const read = items.filter((i) => i.resume && i.resume.updatedAt > 0);
    if (read.length > 0) return read.reduce((a, b) => (b.resume!.updatedAt > a.resume!.updatedAt ? b : a));
    return items.find((i) => i.novel.id === currentNovelId) || items[0];
  }, [items, currentNovelId]);

  const stats = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const list = Object.values(readingHistory);
    return {
      today: list.filter((h) => h.updatedAt >= startOfToday.getTime()).length,
      week: list.filter((h) => h.updatedAt >= now - 7 * DAY).length,
      total: list.length,
    };
  }, [readingHistory]);

  const bg = theme === 'dark' ? 'bg-neutral-950 text-neutral-100' : theme === 'warm' ? 'bg-neutral-50 text-neutral-900' : 'bg-white text-neutral-900';

  return (
    <div className={`fixed inset-0 z-[60] overflow-y-auto overscroll-contain ${bg}`}>
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-16">
        {/* Thanh trên */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/assets/aistudio/slothfulface1_11858195.png"
              alt=""
              className="w-8 h-8 rounded-full object-contain"
            />
            <span className="font-semibold tracking-tight truncate">slothfulchilling</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenImport}
              aria-label="Tài khoản & nhập truyện"
              className="h-11 px-2 flex items-center gap-2 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-xs">
                  {user?.email?.slice(0, 1).toUpperCase() || 'G'}
                </span>
              )}
            </button>
            <button
              onClick={onClose}
              aria-label="Quay lại trang đọc"
              className="w-11 h-11 flex items-center justify-center rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <CloseOutlined />
            </button>
          </div>
        </div>

        {/* Đọc tiếp */}
        {latest && (
          <section className="mb-6">
            <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-mono mb-2">Đọc tiếp</h2>
            <div className="flex gap-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60">
              <NovelCover title={latest.novel.title} cover={latest.novel.cover} className="w-24 h-36 rounded-md shrink-0" />
              <div className="min-w-0 flex-1 flex flex-col">
                <div className="font-semibold leading-snug line-clamp-2">{latest.novel.title}</div>
                {latest.novel.author && (
                  <div className="text-xs text-neutral-500 truncate mt-0.5">{latest.novel.author}</div>
                )}
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 truncate">
                  {latest.resume ? latest.resume.chapter.title : ''}
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 dark:bg-neutral-200"
                    style={{ width: `${percentOf(latest.resume, latest.novel)}%` }}
                  />
                </div>
                <div className="text-[11px] text-neutral-500 font-mono mt-1">
                  {latest.resume ? latest.resume.index + 1 : 0}/{latest.novel.chapters.length} chương
                </div>
                <Button
                  type="primary"
                  size="large"
                  icon={<ReadOutlined />}
                  onClick={() => onRead(latest.novel)}
                  className="mt-auto h-11"
                >
                  Đọc tiếp
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Thống kê */}
        <section className="grid grid-cols-3 gap-2 mb-8">
          {[
            { label: 'Hôm nay', value: stats.today },
            { label: '7 ngày qua', value: stats.week },
            { label: 'Tổng đã mở', value: stats.total },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2.5 text-center"
            >
              <div className="text-xl font-semibold font-mono">{s.value}</div>
              <div className="text-[11px] text-neutral-500">{s.label} (chương)</div>
            </div>
          ))}
        </section>

        {/* Thư viện */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-mono mb-3">
            Thư viện · {novels.length} truyện
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map(({ novel, resume }) => {
              const pct = percentOf(resume, novel);
              return (
                <button key={novel.id} onClick={() => onRead(novel)} className="text-left group">
                  <div className="relative">
                    <NovelCover
                      title={novel.title}
                      cover={novel.cover}
                      className="w-full aspect-[2/3] rounded-lg shadow-sm group-active:opacity-80"
                    />
                    {pct > 0 && (
                      <div className="absolute left-0 right-0 bottom-0 h-1 bg-black/30 rounded-b-lg overflow-hidden">
                        <div className="h-full bg-white" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-medium leading-snug line-clamp-2">{novel.title}</div>
                  <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                    {pct > 0 ? `${pct}% · ` : ''}
                    {novel.chapters.length} chương
                  </div>
                </button>
              );
            })}

            <button
              onClick={onOpenImport}
              className="aspect-[2/3] rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 text-neutral-500 hover:border-neutral-500"
            >
              <PlusOutlined className="text-xl" />
              <span className="text-sm">Nhập truyện</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
