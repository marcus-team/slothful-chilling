import React, { useMemo, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { CloseOutlined, EditOutlined, PlusOutlined, ReadOutlined, SearchOutlined } from '@ant-design/icons';
import { Novel, ReadingHistoryItem, ThemeMode } from '../types/novel';
import { AppUser } from '../services/firebase';
import { NovelResume } from './LibraryModal';
import { NovelCover } from './NovelCover';
import { sameName } from '../utils/categories';

interface HomeScreenProps {
  novels: Novel[];
  user: AppUser | null;
  theme: ThemeMode;
  readingHistory: Record<string, ReadingHistoryItem>;
  getResume: (novel: Novel) => NovelResume | null;
  currentNovelId: string;
  onRead: (novel: Novel) => void;
  onEditNovel: (novel: Novel) => void;
  onClose: () => void;
  onOpenImport: () => void;
}

const DAY = 24 * 60 * 60 * 1000;
const UNCATEGORIZED = '__none__';

const percentOf = (resume: NovelResume | null, novel: Novel) =>
  resume && resume.updatedAt > 0 && novel.chapters.length > 0
    ? Math.round(((resume.index + 1) / novel.chapters.length) * 100)
    : 0;

// Bỏ dấu để tìm "tien hiep" cũng ra "Tiên hiệp"
const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

export const HomeScreen: React.FC<HomeScreenProps> = ({
  novels,
  user,
  theme,
  readingHistory,
  getResume,
  currentNovelId,
  onRead,
  onEditNovel,
  onClose,
  onOpenImport,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [author, setAuthor] = useState<string | null>(null);

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

  // Thể loại và tác giả đang có trong thư viện (kèm số truyện)
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    novels.forEach((n) => (n.categories || []).forEach((c) => counts.set(c, (counts.get(c) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi'));
  }, [novels]);
  const uncategorizedCount = useMemo(() => novels.filter((n) => !n.categories?.length).length, [novels]);
  const authorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    novels.forEach((n) => n.author && counts.set(n.author, (counts.get(n.author) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], 'vi'));
  }, [novels]);

  const filtered = useMemo(() => {
    const q = plain(query.trim());
    return items.filter(({ novel }) => {
      if (category === UNCATEGORIZED) {
        if (novel.categories?.length) return false;
      } else if (category && !novel.categories?.some((c) => sameName(c, category))) {
        return false;
      }
      if (author && !(novel.author && sameName(novel.author, author))) return false;
      if (q && !plain(`${novel.title} ${novel.author || ''}`).includes(q)) return false;
      return true;
    });
  }, [items, query, category, author]);

  const hasFilter = !!(query.trim() || category || author);
  const clearFilters = () => {
    setQuery('');
    setCategory(null);
    setAuthor(null);
  };

  const bg =
    theme === 'dark'
      ? 'bg-neutral-950 text-neutral-100'
      : theme === 'warm'
      ? 'bg-neutral-50 text-neutral-900'
      : 'bg-white text-neutral-900';

  const chip = (active: boolean) =>
    `shrink-0 h-8 px-3 rounded-full text-sm border transition-colors ${
      active
        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100'
        : 'bg-transparent text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-neutral-500'
    }`;

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
            <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-sans tabular-nums mb-2">Đọc tiếp</h2>
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
                <div className="text-[11px] text-neutral-500 font-sans tabular-nums mt-1">
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
              <div className="text-xl font-semibold font-sans tabular-nums">{s.value}</div>
              <div className="text-[11px] text-neutral-500">{s.label} (chương)</div>
            </div>
          ))}
        </section>

        {/* Thư viện */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-sans tabular-nums mb-3">
            Thư viện · {hasFilter ? `${filtered.length}/${novels.length}` : novels.length} truyện
          </h2>

          {/* Tìm và lọc theo thể loại, tác giả */}
          {novels.length > 1 && (
            <div className="space-y-3 mb-4">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                prefix={<SearchOutlined className="text-neutral-400" />}
                placeholder="Tìm theo tên truyện hoặc tác giả"
                allowClear
                size="large"
              />

              {categoryCounts.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none]">
                  <button className={chip(category === null)} onClick={() => setCategory(null)}>
                    Tất cả
                  </button>
                  {categoryCounts.map(([name, count]) => (
                    <button
                      key={name}
                      className={chip(category !== null && category !== UNCATEGORIZED && sameName(category, name))}
                      onClick={() => setCategory(category && sameName(category, name) ? null : name)}
                    >
                      {name} <span className="opacity-60 tabular-nums">{count}</span>
                    </button>
                  ))}
                  {uncategorizedCount > 0 && (
                    <button
                      className={chip(category === UNCATEGORIZED)}
                      onClick={() => setCategory(category === UNCATEGORIZED ? null : UNCATEGORIZED)}
                    >
                      Chưa phân loại <span className="opacity-60 tabular-nums">{uncategorizedCount}</span>
                    </button>
                  )}
                </div>
              )}

              {authorCounts.length > 0 && (
                <Select
                  value={author}
                  onChange={(v) => setAuthor(v ?? null)}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Lọc theo tác giả"
                  size="large"
                  className="w-full"
                  options={authorCounts.map(([name, count]) => ({ value: name, label: `${name} (${count})` }))}
                />
              )}
            </div>
          )}

          {filtered.length === 0 && hasFilter ? (
            <div className="py-10 text-center text-sm text-neutral-500 space-y-3">
              <p className="m-0">Không có truyện nào khớp bộ lọc.</p>
              <Button onClick={clearFilters}>Bỏ lọc</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filtered.map(({ novel, resume }) => {
                const pct = percentOf(resume, novel);
                return (
                  <div key={novel.id} className="relative">
                    <button onClick={() => onRead(novel)} className="text-left group flex flex-col w-full">
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
                      {novel.author && (
                        <div className="text-[11px] text-neutral-500 truncate mt-0.5">{novel.author}</div>
                      )}
                      {novel.categories && novel.categories.length > 0 && (
                        <div className="text-[11px] text-neutral-400 truncate">{novel.categories.join(' · ')}</div>
                      )}
                      <div className="text-[11px] text-neutral-500 font-sans tabular-nums mt-0.5">
                        {pct > 0 ? `${pct}% · ` : ''}
                        {novel.chapters.length} chương
                      </div>
                    </button>

                    {/* Sửa thể loại, tác giả, bìa */}
                    <button
                      onClick={() => onEditNovel(novel)}
                      aria-label={`Sửa thông tin ${novel.title}`}
                      title="Sửa thể loại, tác giả, bìa"
                      className="absolute top-1.5 right-1.5 w-9 h-9 flex items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/65"
                    >
                      <EditOutlined />
                    </button>
                  </div>
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
          )}
        </section>
      </div>
    </div>
  );
};
