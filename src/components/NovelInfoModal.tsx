import React, { useEffect, useMemo, useState } from 'react';
import { Modal, message } from 'antd';
import { Novel } from '../types/novel';
import { updateNovelInfo } from '../services/library';
import { NovelInfoFields } from './NovelInfoFields';

interface NovelInfoModalProps {
  novel: Novel | null; // null = đóng
  novels: Novel[];
  onClose: () => void;
}

// Sửa thông tin một bộ truyện đã có: thể loại, tác giả, ảnh bìa
export const NovelInfoModal: React.FC<NovelInfoModalProps> = ({ novel, novels, onClose }) => {
  const [author, setAuthor] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [cover, setCover] = useState<string | undefined>(undefined);
  const [coverChanged, setCoverChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mở hộp cho truyện nào thì nạp thông tin hiện có của truyện đó
  useEffect(() => {
    if (!novel) return;
    setAuthor(novel.author || '');
    setCategories(novel.categories || []);
    setCover(novel.cover);
    setCoverChanged(false);
  }, [novel?.id]);

  const knownAuthors = useMemo(
    () => Array.from(new Set(novels.map((n) => n.author).filter((a): a is string => !!a))).sort(),
    [novels]
  );
  const knownCategories = useMemo(
    () => Array.from(new Set(novels.flatMap((n) => n.categories || []))).sort(),
    [novels]
  );

  const save = async () => {
    if (!novel) return;
    setSaving(true);
    try {
      await updateNovelInfo(novel.id, {
        author,
        categories,
        cover: coverChanged ? cover ?? null : undefined,
      });
      message.success('Đã lưu thông tin truyện');
      onClose();
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!novel}
      title={novel ? `Sửa thông tin: ${novel.title}` : ''}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={saving}
      onOk={save}
      onCancel={saving ? undefined : onClose}
      closable={!saving}
      maskClosable={!saving}
      width={480}
      destroyOnHidden
    >
      <div className="pt-2">
        <NovelInfoFields
          author={author}
          categories={categories}
          cover={cover}
          knownAuthors={knownAuthors}
          knownCategories={knownCategories}
          disabled={saving}
          onAuthor={setAuthor}
          onCategories={setCategories}
          onCover={(value) => {
            setCover(value);
            setCoverChanged(true);
          }}
        />
      </div>
    </Modal>
  );
};
