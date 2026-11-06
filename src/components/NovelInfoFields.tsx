import React, { useRef } from 'react';
import { AutoComplete, Button, Select, message } from 'antd';
import { imageToCover } from '../services/library';
import { DEFAULT_CATEGORIES, MAX_CATEGORIES, normalizeCategories } from '../utils/categories';

interface NovelInfoFieldsProps {
  author: string;
  categories: string[];
  cover?: string;
  knownAuthors: string[]; // tác giả đã có trong thư viện, để gợi ý
  knownCategories: string[]; // thể loại đã có trong thư viện, để gợi ý
  disabled?: boolean;
  onAuthor: (value: string) => void;
  onCategories: (value: string[]) => void;
  onCover: (value: string | undefined) => void;
}

// Các ô nhập thông tin truyện (tác giả, thể loại, bìa) dùng chung cho màn nhập và màn sửa
export const NovelInfoFields: React.FC<NovelInfoFieldsProps> = ({
  author,
  categories,
  cover,
  knownAuthors,
  knownCategories,
  disabled,
  onAuthor,
  onCategories,
  onCover,
}) => {
  const coverInput = useRef<HTMLInputElement>(null);

  const categoryOptions = Array.from(new Set([...DEFAULT_CATEGORIES, ...knownCategories])).map((c) => ({
    value: c,
    label: c,
  }));

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs text-neutral-500">Thể loại (chọn hoặc gõ thêm, tối đa {MAX_CATEGORIES})</label>
        <Select
          mode="tags"
          value={categories}
          onChange={(v: string[]) => onCategories(normalizeCategories(v))}
          options={categoryOptions}
          tokenSeparators={[',']}
          placeholder="Ví dụ: Tu tiên, Kiếm hiệp, Tiểu thuyết"
          disabled={disabled}
          className="w-full"
          maxTagCount="responsive"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-500">Tác giả (tùy chọn)</label>
        <AutoComplete
          value={author}
          onChange={(v) => onAuthor(v)}
          options={knownAuthors.map((a) => ({ value: a }))}
          filterOption={(input, option) => (option?.value as string).toLowerCase().includes(input.toLowerCase())}
          placeholder="Tên tác giả"
          disabled={disabled}
          className="w-full"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="w-12 h-[72px] rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center text-[10px] text-neutral-400">
          {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : 'Bìa'}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="small" onClick={() => coverInput.current?.click()} disabled={disabled}>
            {cover ? 'Đổi ảnh bìa' : 'Chọn ảnh bìa'}
          </Button>
          {cover && (
            <Button size="small" onClick={() => onCover(undefined)} disabled={disabled}>
              Bỏ ảnh bìa
            </Button>
          )}
        </div>
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const img = e.target.files?.[0];
            e.target.value = '';
            if (!img) return;
            try {
              onCover(await imageToCover(img));
            } catch {
              message.error('Không đọc được ảnh này');
            }
          }}
        />
      </div>
    </div>
  );
};
