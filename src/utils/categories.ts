// Gợi ý thể loại; người dùng vẫn gõ thêm thể loại khác tùy ý
export const DEFAULT_CATEGORIES = [
  'Tu tiên',
  'Kiếm hiệp',
  'Tiểu thuyết',
  'Huyền huyễn',
  'Ngôn tình',
  'Đô thị',
  'Khoa huyễn',
  'Lịch sử',
  'Trinh thám',
  'Võng du',
];

export const MAX_CATEGORIES = 5;

// Bỏ trống, bỏ trùng (không phân biệt hoa thường), giữ tối đa MAX_CATEGORIES thể loại
export function normalizeCategories(list: string[] | undefined | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list || []) {
    const name = String(raw).replace(/\s+/g, ' ').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= MAX_CATEGORIES) break;
  }
  return out;
}

// Tên thể loại/tác giả viết khác hoa thường vẫn tính là một
export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
