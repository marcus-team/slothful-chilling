// Thư viện truyện lưu trong Firestore.
//   novels/{novelId}                  -> { title, chapters: [{id,title,order}], updatedAt }  (mục lục)
//   novels/{novelId}/chapters/{chapId} -> { text }                                          (nội dung)
// Mở app chỉ đọc các tài liệu mục lục; mỗi chương chỉ đọc khi người dùng mở tới.
import { unzipSync, strFromU8 } from 'fflate';
import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Chapter, Novel } from '../types/novel';

const NOVELS = 'novels';
const BATCH_MAX_DOCS = 200;
const BATCH_MAX_BYTES = 3 * 1024 * 1024; // Firestore giới hạn ~10MB mỗi lần ghi
const MAX_CHAPTER_BYTES = 900 * 1024; // Firestore giới hạn 1MB mỗi tài liệu

// ---------------- Đọc ----------------

export function subscribeNovels(
  onData: (novels: Novel[]) => void,
  onError: (err: Error) => void
): () => void {
  return onSnapshot(
    collection(db, NOVELS),
    (snap) => {
      const novels: Novel[] = snap.docs.map((d) => {
        const data = d.data() as { title?: string; chapters?: Chapter[] };
        return {
          id: d.id,
          title: data.title || 'Không tên',
          chapters: Array.isArray(data.chapters) ? data.chapters : [],
        };
      });
      novels.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
      onData(novels);
    },
    (err) => onError(err)
  );
}

// Giữ vài chương gần đây trong bộ nhớ để lật qua lại không phải đọc lại
const memory = new Map<string, string>();
const MEMORY_MAX = 12;

const remember = (key: string, text: string) => {
  memory.delete(key);
  memory.set(key, text);
  while (memory.size > MEMORY_MAX) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
};

const chapterRef = (novelId: string, chapterId: string) =>
  doc(db, NOVELS, novelId, 'chapters', chapterId);

// Chương đã đọc trước đó có sẵn trong cache của thiết bị -> trả về ngay, không tốn lượt đọc
export async function getCachedChapterText(novelId: string, chapterId: string): Promise<string | null> {
  const key = `${novelId}/${chapterId}`;
  const mem = memory.get(key);
  if (mem !== undefined) return mem;
  try {
    const snap = await getDocFromCache(chapterRef(novelId, chapterId));
    if (snap.exists()) {
      const text = (snap.data().text as string) ?? '';
      remember(key, text);
      return text;
    }
  } catch {
    // chưa có trong cache
  }
  return null;
}

export async function fetchChapterText(novelId: string, chapterId: string): Promise<string> {
  const cached = await getCachedChapterText(novelId, chapterId);
  if (cached !== null) return cached;

  const snap = await getDoc(chapterRef(novelId, chapterId));
  if (!snap.exists()) throw new Error('Chương này không còn trong thư viện.');
  const text = (snap.data().text as string) ?? '';
  remember(`${novelId}/${chapterId}`, text);
  return text;
}

// Tải trước chương kế tiếp. Lỗi thì bỏ qua.
export async function prefetchChapterText(novelId: string, chapterId: string): Promise<void> {
  try {
    await fetchChapterText(novelId, chapterId);
  } catch {
    // sẽ tải lại khi người đọc thật sự mở chương
  }
}

// ---------------- Đọc file .docx / .txt ----------------

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

// Lấy chữ của một đoạn (w:p) theo đúng thứ tự trong tài liệu
function paragraphText(node: Node): string {
  let out = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType !== 1) return;
    const el = child as Element;
    if (el.namespaceURI === W_NS) {
      if (el.localName === 't') {
        out += el.textContent || '';
        return;
      }
      if (el.localName === 'tab') {
        out += '\t';
        return;
      }
      if (el.localName === 'br' || el.localName === 'cr') {
        out += '\n';
        return;
      }
    }
    out += paragraphText(el);
  });
  return out;
}

// .docx là file zip; nội dung nằm ở word/document.xml
export function docxToText(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer), {
    filter: (f) => f.name === 'word/document.xml',
  });
  const xml = files['word/document.xml'];
  if (!xml) throw new Error('File .docx không hợp lệ (thiếu word/document.xml)');

  const parsed = new DOMParser().parseFromString(strFromU8(xml), 'application/xml');
  const paragraphs = Array.from(parsed.getElementsByTagNameNS(W_NS, 'p'))
    .map((p) => paragraphText(p).trim())
    .filter((t) => t.length > 0);

  // Reader tách đoạn theo dòng trống
  return paragraphs.join('\n\n');
}

const CHAPTER_EXT = /\.(docx|txt|md)$/i;

export const isChapterFile = (file: File): boolean =>
  CHAPTER_EXT.test(file.name) && !file.name.startsWith('~$') && !file.name.startsWith('.');

async function readChapterFile(file: File): Promise<string> {
  if (/\.docx$/i.test(file.name)) return docxToText(await file.arrayBuffer());
  return (await file.text()).replace(/\r\n/g, '\n').trim();
}

// Lấy số chương trong tên file ("Chương 12", "Chap 12", "12 - ...") để sắp xếp
export function extractChapterOrder(filename: string): number {
  const match = filename.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 9999;
}

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// ---------------- Nhập truyện ----------------

export interface ImportProgress {
  stage: 'reading' | 'uploading';
  done: number;
  total: number;
}

export interface ImportResult {
  novel: Novel;
  skipped: string[]; // file bị bỏ qua (lỗi đọc hoặc quá dài)
}

const hashTitle = (title: string) => {
  let h = 5381;
  const s = title.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};

// Nhập một bộ truyện. Nhập lại cùng tên truyện sẽ ghi đè bộ cũ.
export async function importNovel(
  title: string,
  files: File[],
  onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
  const novelTitle = title.trim();
  if (!novelTitle) throw new Error('Thiếu tên truyện');

  const relPath = (f: File) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
  const sorted = files
    .filter(isChapterFile)
    .map((file) => ({ file, order: extractChapterOrder(file.name), path: relPath(file) }))
    .sort((a, b) => a.order - b.order || naturalCompare(a.path, b.path));

  if (sorted.length === 0) throw new Error('Không có file .docx, .txt hoặc .md nào để nhập.');

  const novelId = `n_${hashTitle(novelTitle)}`;
  const chapters: Chapter[] = [];
  const skipped: string[] = [];

  let batch = writeBatch(db);
  let batchDocs = 0;
  let batchBytes = 0;
  let uploaded = 0;

  const flush = async () => {
    if (batchDocs === 0) return;
    await batch.commit();
    uploaded += batchDocs;
    onProgress?.({ stage: 'uploading', done: uploaded, total: chapters.length });
    batch = writeBatch(db);
    batchDocs = 0;
    batchBytes = 0;
  };

  onProgress?.({ stage: 'reading', done: 0, total: sorted.length });

  for (let i = 0; i < sorted.length; i++) {
    const { file, order } = sorted[i];
    const chapterTitle = file.name.replace(CHAPTER_EXT, '').trim();
    try {
      const text = await readChapterFile(file);
      const bytes = new Blob([text]).size;
      if (!text) throw new Error('Nội dung trống');
      if (bytes > MAX_CHAPTER_BYTES) throw new Error('Chương quá dài (hơn ~900KB)');

      // Id duy nhất trên toàn thư viện (App dùng id chương để phân biệt trạng thái đọc)
      const id = `${novelId}-${String(chapters.length + 1).padStart(5, '0')}`;
      chapters.push({ id, title: chapterTitle, order });

      batch.set(chapterRef(novelId, id), { text });
      batchDocs += 1;
      batchBytes += bytes;
      if (batchDocs >= BATCH_MAX_DOCS || batchBytes >= BATCH_MAX_BYTES) await flush();
    } catch (err: any) {
      console.warn(`Bỏ qua "${file.name}"`, err);
      skipped.push(file.name);
    }
    onProgress?.({ stage: 'reading', done: i + 1, total: sorted.length });
  }

  if (chapters.length === 0) throw new Error('Không đọc được chương nào từ các file đã chọn.');

  await flush();

  // Ghi mục lục sau cùng: truyện chỉ hiện ra khi đã đủ nội dung
  const novel: Novel = { id: novelId, title: novelTitle, chapters };
  const indexBatch = writeBatch(db);
  indexBatch.set(doc(db, NOVELS, novelId), {
    title: novelTitle,
    chapters,
    updatedAt: Date.now(),
  });
  await indexBatch.commit();

  return { novel, skipped };
}

export async function deleteNovel(novel: Novel): Promise<void> {
  const ids = novel.chapters.map((c) => c.id);
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => batch.delete(chapterRef(novel.id, id)));
    await batch.commit();
  }
  const last = writeBatch(db);
  last.delete(doc(db, NOVELS, novel.id));
  await last.commit();
  ids.forEach((id) => memory.delete(`${novel.id}/${id}`));
}
