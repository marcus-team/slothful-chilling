import React, { useMemo, useRef, useState } from 'react';
import { Modal, Input, Button, Progress, message } from 'antd';
import { FolderOpenOutlined, FileAddOutlined, DisconnectOutlined, UploadOutlined } from '@ant-design/icons';
import { Novel } from '../types/novel';
import { AppUser } from '../services/firebase';
import {
  ChapterSource,
  ImportProgress,
  importNovel,
  isChapterFile,
  isEpubFile,
  readEpub,
  sourcesFromFiles,
} from '../services/library';
import { NovelInfoFields } from './NovelInfoFields';
import { sameName } from '../utils/categories';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  user: AppUser | null;
  novels: Novel[];
  onLogout: () => void;
  onImported: (novel: Novel) => void;
}

const relPathOf = (f: File) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || '';

export const ImportModal: React.FC<ImportModalProps> = ({
  open,
  onClose,
  user,
  novels,
  onLogout,
  onImported,
}) => {
  const folderInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [epubSources, setEpubSources] = useState<ChapterSource[] | null>(null);
  const [isReadingEpub, setIsReadingEpub] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [cover, setCover] = useState<string | undefined>(undefined);
  const [categories, setCategories] = useState<string[]>([]);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const sources = useMemo(() => epubSources ?? sourcesFromFiles(files), [epubSources, files]);
  const existing = useMemo(
    () => (title.trim() ? novels.find((n) => sameName(n.title, title)) : undefined),
    [novels, title]
  );
  const willOverwrite = !!existing;
  const knownAuthors = useMemo(
    () => Array.from(new Set(novels.map((n) => n.author).filter((a): a is string => !!a))).sort(),
    [novels]
  );
  const knownCategories = useMemo(
    () => Array.from(new Set(novels.flatMap((n) => n.categories || []))).sort(),
    [novels]
  );

  const pick = async (list: FileList | null, fromFolder: boolean) => {
    if (!list || list.length === 0) return;
    const picked = Array.from(list);
    const epub = picked.find(isEpubFile);
    if (epub && !picked.some(isChapterFile)) {
      setIsReadingEpub(true);
      try {
        const book = await readEpub(epub);
        setFiles(picked);
        setEpubSources(book.sources);
        setTitle(book.title);
        setAuthor(book.author || '');
        setCover(book.cover);
      } catch (err: any) {
        console.error(err);
        message.error(err?.message || 'Không đọc được file .epub');
      } finally {
        setIsReadingEpub(false);
      }
      return;
    }
    setEpubSources(null);
    setAuthor('');
    setCover(undefined);
    setFiles(picked);
    if (fromFolder) {
      // Tên thư mục đã chọn = tên truyện
      const first = relPathOf(picked[0]).split('/')[0];
      if (first) setTitle(first);
    }
  };

  const reset = () => {
    setFiles([]);
    setEpubSources(null);
    setTitle('');
    setAuthor('');
    setCover(undefined);
    setCategories([]);
    setProgress(null);
    if (folderInput.current) folderInput.current.value = '';
    if (filesInput.current) filesInput.current.value = '';
  };

  const handleImport = async () => {
    setIsImporting(true);
    setProgress({ stage: 'reading', done: 0, total: sources.length });
    try {
      // Nhập đè lên bộ cũ mà để trống thông tin thì giữ lại thông tin đã có
      const { novel, skipped } = await importNovel(title, sources, setProgress, {
        author: author.trim() || existing?.author,
        cover: cover || existing?.cover,
        categories: categories.length > 0 ? categories : existing?.categories,
      });
      message.success(`Đã nhập "${novel.title}" (${novel.chapters.length} chương)`);
      if (skipped.length > 0) {
        message.warning(`Bỏ qua ${skipped.length} file không đọc được: ${skipped.slice(0, 3).join(', ')}${skipped.length > 3 ? '…' : ''}`, 8);
      }
      reset();
      onImported(novel);
      onClose();
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || 'Nhập truyện thất bại');
    } finally {
      setIsImporting(false);
      setProgress(null);
    }
  };

  const percent =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Modal
      open={open}
      onCancel={isImporting ? undefined : onClose}
      closable={!isImporting}
      maskClosable={!isImporting}
      footer={null}
      width={560}
      title="Nhập truyện & tài khoản"
    >
      <div className="space-y-4 pt-2">
        {/* Tài khoản */}
        {user && (
          <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full border border-neutral-300 dark:border-neutral-700"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-sm">
                  {user.email ? user.email.slice(0, 1).toUpperCase() : 'G'}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{user.displayName || 'Tài khoản Google'}</div>
                <div className="text-xs text-neutral-500 truncate">{user.email}</div>
              </div>
            </div>
            <Button size="small" danger icon={<DisconnectOutlined />} onClick={onLogout} disabled={isImporting}>
              Đăng xuất
            </Button>
          </div>
        )}

        {/* Chọn file */}
        <div className="space-y-2">
          <p className="text-sm font-medium m-0">Thêm một bộ truyện</p>
          <p className="text-xs text-neutral-500 m-0 leading-relaxed">
            Chọn thư mục chứa các chương (có thể có thư mục con như 1-50, 51-100), hoặc chọn nhiều file
            .docx / .txt, hoặc một file .epub. App tự sắp xếp theo số chương trong tên file.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="large"
              icon={<FolderOpenOutlined />}
              onClick={() => folderInput.current?.click()}
              disabled={isImporting || isReadingEpub}
              className="h-12"
            >
              Chọn thư mục
            </Button>
            <Button
              size="large"
              icon={<FileAddOutlined />}
              onClick={() => filesInput.current?.click()}
              disabled={isImporting || isReadingEpub}
              loading={isReadingEpub}
              className="h-12"
            >
              Chọn file
            </Button>
          </div>

          <input
            ref={folderInput}
            type="file"
            multiple
            className="hidden"
            {...({ webkitdirectory: '' } as any)}
            onChange={(e) => pick(e.target.files, true)}
          />
          <input
            ref={filesInput}
            type="file"
            multiple
            accept=".docx,.txt,.md,.epub"
            className="hidden"
            onChange={(e) => pick(e.target.files, false)}
          />
        </div>

        {/* Xem lại trước khi nhập */}
        {files.length > 0 && (
          <div className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="text-sm">
              Tìm thấy <b>{sources.length}</b> chương
              {!epubSources && files.length > sources.length
                ? ` (bỏ qua ${files.length - sources.length} file khác)`
                : ''}
              .
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-500">Tên truyện</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tên truyện"
                size="large"
                disabled={isImporting}
              />
              {willOverwrite && title.trim() && (
                <p className="text-xs text-amber-600 m-0">
                  Đã có truyện tên này: nhập lại sẽ thay thế bản cũ.
                </p>
              )}
            </div>

            <NovelInfoFields
              author={author}
              categories={categories}
              cover={cover}
              knownAuthors={knownAuthors}
              knownCategories={knownCategories}
              disabled={isImporting}
              onAuthor={setAuthor}
              onCategories={setCategories}
              onCover={setCover}
            />

            {isImporting && progress ? (
              <div className="space-y-1">
                <Progress percent={percent} showInfo={false} strokeColor="#111" size="small" />
                <p className="text-xs text-neutral-500 m-0">
                  {progress.stage === 'reading' ? 'Đang đọc file' : 'Đang lưu lên thư viện'} {progress.done}/
                  {progress.total}. Đừng đóng trang cho tới khi xong.
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="primary"
                  size="large"
                  icon={<UploadOutlined />}
                  disabled={!title.trim() || sources.length === 0}
                  onClick={handleImport}
                  className="flex-1 h-12"
                >
                  Nhập {sources.length} chương
                </Button>
                <Button size="large" onClick={reset} className="h-12">
                  Hủy
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
