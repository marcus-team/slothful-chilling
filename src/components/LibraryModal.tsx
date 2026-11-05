import React, { useMemo } from 'react';
import { Modal, Popconfirm, Progress } from 'antd';
import { CloudSyncOutlined, DeleteOutlined } from '@ant-design/icons';
import { Chapter, Novel } from '../types/novel';

export interface NovelResume {
  chapter: Chapter;
  index: number; // vị trí chương đang đọc dở trong novel.chapters
  updatedAt: number; // 0 nếu chưa đọc
}

interface LibraryModalProps {
  open: boolean;
  onClose: () => void;
  novels: Novel[];
  currentNovelId: string | null;
  getResume: (novel: Novel) => NovelResume | null;
  onSelectNovel: (novel: Novel) => void;
  onRemoveNovel: (novel: Novel) => void;
  onOpenDriveModal: () => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  open,
  onClose,
  novels,
  currentNovelId,
  getResume,
  onSelectNovel,
  onRemoveNovel,
  onOpenDriveModal,
}) => {
  // Truyện đọc gần nhất lên đầu
  const items = useMemo(() => {
    return novels
      .map((novel) => ({ novel, resume: getResume(novel) }))
      .sort((a, b) => (b.resume?.updatedAt ?? 0) - (a.resume?.updatedAt ?? 0));
  }, [novels, getResume, open]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={`Tủ truyện (${novels.length})`}
      width={560}
    >
      <div className="space-y-2 pt-2 max-h-[65vh] overflow-y-auto">
        {items.map(({ novel, resume }) => {
          const total = novel.chapters.length;
          const percent = resume && total > 0 ? Math.round(((resume.index + 1) / total) * 100) : 0;
          const isCurrent = novel.id === currentNovelId;

          return (
            <div
              key={novel.id}
              className={`rounded-lg border transition-colors ${
                isCurrent
                  ? 'border-neutral-900 dark:border-neutral-200'
                  : 'border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <div className="flex items-stretch">
                <button
                  onClick={() => {
                    onSelectNovel(novel);
                    onClose();
                  }}
                  className="flex-1 min-w-0 text-left px-4 py-3 min-h-[64px] hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-l-lg"
                >
                  <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                    {novel.title}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 truncate">
                    {resume && resume.updatedAt > 0
                      ? `Đang đọc: ${resume.chapter.title}`
                      : `${total} chương · chưa đọc`}
                  </div>
                  {resume && resume.updatedAt > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Progress
                        percent={percent}
                        showInfo={false}
                        size="small"
                        strokeColor="#111"
                        className="!m-0 flex-1"
                      />
                      <span className="text-[11px] font-mono text-neutral-500 shrink-0">
                        {resume.index + 1}/{total}
                      </span>
                    </div>
                  )}
                </button>

                <Popconfirm
                  title="Xóa khỏi tủ truyện?"
                  description="Chỉ xóa khỏi app, file trên Drive không bị ảnh hưởng."
                  okText="Xóa"
                  cancelText="Hủy"
                  onConfirm={() => onRemoveNovel(novel)}
                >
                  <button
                    aria-label={`Xóa ${novel.title} khỏi tủ truyện`}
                    className="px-4 text-neutral-400 hover:text-red-600 transition-colors"
                  >
                    <DeleteOutlined />
                  </button>
                </Popconfirm>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => {
            onClose();
            onOpenDriveModal();
          }}
          className="w-full flex items-center justify-center gap-2 py-3 min-h-[48px] rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
        >
          <CloudSyncOutlined />
          <span>Đồng bộ thêm từ Google Drive</span>
        </button>
      </div>
    </Modal>
  );
};
