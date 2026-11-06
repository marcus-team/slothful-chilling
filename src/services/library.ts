// Thư viện truyện lưu trong Firestore.
//   novels/{novelId}                  -> { title, chapters: [{id,title,order}], updatedAt }  (mục lục)
//   novels/{novelId}/chapters/{chapId} -> { text }                                          (nội dung)
// Mở app chỉ đọc các tài liệu mục lục; mỗi chương chỉ đọc khi người dùng mở tới.
import { unzipSync, strFromU8 } from 'fflate';
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocFromCache,
  onSnapshot,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Chapter, Novel } from '../types/novel';
import { normalizeCategories } from '../utils/categories';

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
        const data = d.data() as {
          title?: string;
          chapters?: Chapter[];
          author?: string;
          categories?: string[];
          cover?: string;
        };
        return {
          id: d.id,
          title: data.title || 'Không tên',
          chapters: Array.isArray(data.chapters) ? data.chapters : [],
          author: data.author || undefined,
          categories: Array.isArray(data.categories) ? normalizeCategories(data.categories) : undefined,
          cover: data.cover || undefined,
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

// ---------------- Nguồn chương (file lẻ hoặc epub) ----------------

export interface ChapterSource {
  name: string; // dùng để báo lỗi
  title: string;
  order: number;
  read: () => Promise<string>;
}

export function sourcesFromFiles(files: File[]): ChapterSource[] {
  const relPath = (f: File) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
  return files
    .filter(isChapterFile)
    .map((file) => ({ file, order: extractChapterOrder(file.name), path: relPath(file) }))
    .sort((a, b) => a.order - b.order || naturalCompare(a.path, b.path))
    .map(({ file, order }) => ({
      name: file.name,
      title: file.name.replace(CHAPTER_EXT, '').trim(),
      order,
      read: () => readChapterFile(file),
    }));
}

export const isEpubFile = (file: File): boolean => /\.epub$/i.test(file.name);

// Thu nhỏ ảnh bìa (~240px) để lưu gọn trong tài liệu truyện (vài chục KB)
export async function imageToCover(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const width = Math.min(240, bitmap.width);
  const height = Math.max(1, Math.round((bitmap.height * width) / bitmap.width));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không xử lý được ảnh bìa');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.8);
}

const XHTML_BLOCKS = 'p,h1,h2,h3,h4,h5,h6,li,pre,blockquote,div,table,ul,ol,section';
const LEAF_BLOCKS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'PRE', 'DT', 'DD', 'FIGCAPTION', 'TD', 'TH']);

const cleanLine = (s: string) =>
  s.replace(/\u0001/g, '\n').replace(/[ \t\r\f\v ]+/g, ' ').replace(/ *\n */g, '\n').trim();

// Lấy các đoạn chữ của một trang XHTML theo thứ tự
function htmlToParagraphs(html: string): { paragraphs: string[]; heading: string } {
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  if (!body) return { paragraphs: [], heading: '' };
  body.querySelectorAll('script,style,nav,svg,img').forEach((n) => n.remove());
  body.querySelectorAll('br').forEach((n) => n.replaceWith('\u0001'));

  const heading = cleanLine(body.querySelector('h1,h2,h3')?.textContent?.replace(/\s+/g, ' ') || '');
  const paragraphs: string[] = [];
  const push = (raw: string | null) => {
    const t = cleanLine((raw || '').replace(/[\r\n]+/g, ' '));
    if (t) paragraphs.push(t);
  };
  const walk = (el: Element) => {
    if (LEAF_BLOCKS.has(el.tagName) || !el.querySelector(XHTML_BLOCKS)) {
      push(el.textContent);
      return;
    }
    el.childNodes.forEach((child) => {
      if (child.nodeType === 1) walk(child as Element);
      else if (child.nodeType === 3) push(child.textContent);
    });
  };
  walk(body);
  return { paragraphs, heading };
}

// Gộp đường dẫn tương đối trong epub (xử lý "../")
function resolvePath(baseDir: string, href: string): string {
  const clean = decodeURIComponent(href.split('#')[0]);
  const parts = (baseDir ? baseDir.split('/') : []).concat(clean.split('/'));
  const out: string[] = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p && p !== '.') out.push(p);
  }
  return out.join('/');
}

// .epub là file zip: container.xml -> file .opf (danh sách + thứ tự chương) -> các trang XHTML
export interface EpubBook {
  title: string;
  author?: string;
  cover?: string;
  sources: ChapterSource[];
}

export async function readEpub(file: File): Promise<EpubBook> {
  const raw = new Uint8Array(await file.arrayBuffer());
  const files = unzipSync(raw, {
    filter: (f) => /\.(x?html?|opf|ncx|xml)$/i.test(f.name),
  });
  const text = (path: string) => (files[path] ? strFromU8(files[path]) : null);
  const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml');

  const containerXml = text('META-INF/container.xml');
  const opfPath = containerXml
    ? xml(containerXml).getElementsByTagName('rootfile')[0]?.getAttribute('full-path')
    : Object.keys(files).find((p) => /\.opf$/i.test(p));
  const opfSrc = opfPath ? text(opfPath) : null;
  if (!opfPath || !opfSrc) throw new Error('File .epub không hợp lệ (không tìm thấy danh sách chương).');

  const opf = xml(opfSrc);
  const baseDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';
  const bookTitle =
    opf.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'title')[0]?.textContent?.trim() || '';

  const author =
    opf.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'creator')[0]?.textContent?.trim() || undefined;

  const manifest = new Map<string, { path: string; props: string }>();
  Array.from(opf.getElementsByTagName('item')).forEach((it) => {
    const id = it.getAttribute('id');
    const href = it.getAttribute('href');
    if (id && href) manifest.set(id, { path: resolvePath(baseDir, href), props: it.getAttribute('properties') || '' });
  });

  // Ảnh bìa: khai báo trong <meta name="cover"> (epub2) hoặc properties="cover-image" (epub3)
  let cover: string | undefined;
  try {
    const metaId = Array.from(opf.getElementsByTagName('meta'))
      .find((m) => m.getAttribute('name') === 'cover')
      ?.getAttribute('content');
    const isImage = (p: string) => /\.(jpe?g|png|webp|gif)$/i.test(p);
    const coverPath =
      [manifest.get(metaId || '')?.path, ...Array.from(manifest.values())
        .filter((m) => m.props.split(/\s+/).includes('cover-image'))
        .map((m) => m.path)].find((p): p is string => !!p && isImage(p));
    if (coverPath) {
      const imgs = unzipSync(raw, { filter: (f) => f.name === coverPath });
      const bytes = imgs[coverPath];
      if (bytes) cover = await imageToCover(new Blob([bytes]));
    }
  } catch (err) {
    console.warn('Không lấy được ảnh bìa epub', err);
  }

  // Tên chương lấy từ mục lục của sách (nav của epub3 hoặc toc.ncx của epub2)
  const tocTitles = new Map<string, string>();
  const addToc = (path: string, label: string | null | undefined) => {
    const t = (label || '').replace(/\s+/g, ' ').trim();
    if (t && !tocTitles.has(path)) tocTitles.set(path, t);
  };
  const navItem = Array.from(manifest.values()).find((m) => m.props.split(/\s+/).includes('nav'));
  const navSrc = navItem ? text(navItem.path) : null;
  if (navItem && navSrc) {
    const navDir = navItem.path.includes('/') ? navItem.path.slice(0, navItem.path.lastIndexOf('/')) : '';
    const doc = new DOMParser().parseFromString(navSrc, 'text/html');
    const navs = Array.from(doc.querySelectorAll('nav'));
    const tocNav = navs.find((n) => (n.getAttribute('epub:type') || '').includes('toc')) || navs[0];
    tocNav?.querySelectorAll('a[href]').forEach((a) =>
      addToc(resolvePath(navDir, a.getAttribute('href') || ''), a.textContent)
    );
  } else {
    const ncxPath = Array.from(manifest.values()).find((m) => /\.ncx$/i.test(m.path))?.path;
    const ncxSrc = ncxPath ? text(ncxPath) : null;
    if (ncxPath && ncxSrc) {
      const ncxDir = ncxPath.includes('/') ? ncxPath.slice(0, ncxPath.lastIndexOf('/')) : '';
      Array.from(xml(ncxSrc).getElementsByTagName('navPoint')).forEach((np) => {
        const label = np.getElementsByTagName('text')[0]?.textContent;
        const src = np.getElementsByTagName('content')[0]?.getAttribute('src');
        if (src) addToc(resolvePath(ncxDir, src), label);
      });
    }
  }

  const sources: ChapterSource[] = [];
  const spine = Array.from(opf.getElementsByTagName('itemref')).filter((r) => r.getAttribute('linear') !== 'no');
  for (const ref of spine) {
    const item = manifest.get(ref.getAttribute('idref') || '');
    const html = item ? text(item.path) : null;
    if (!item || !html) continue;

    const { paragraphs, heading } = htmlToParagraphs(html);
    const chapterTitle = tocTitles.get(item.path) || heading || `Phần ${sources.length + 1}`;
    if (paragraphs[0] === chapterTitle || paragraphs[0] === heading) paragraphs.shift();
    const body = paragraphs.join('\n\n');
    if (body.length < 150) continue; // bìa, trang tên sách, trang trắng...

    const order = sources.length + 1;
    sources.push({ name: chapterTitle, title: chapterTitle, order, read: async () => body });
  }

  if (sources.length === 0) throw new Error('Không đọc được chương nào trong file .epub này.');
  return { title: bookTitle || file.name.replace(/\.epub$/i, ''), author, cover, sources };
}

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
  sorted: ChapterSource[],
  onProgress?: (p: ImportProgress) => void,
  meta?: { author?: string; cover?: string; categories?: string[] }
): Promise<ImportResult> {
  const novelTitle = title.trim();
  if (!novelTitle) throw new Error('Thiếu tên truyện');
  if (sorted.length === 0) throw new Error('Không có chương nào để nhập.');

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
    const { title: chapterTitle, order } = sorted[i];
    try {
      const text = await sorted[i].read();
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
      console.warn(`Bỏ qua "${sorted[i].name}"`, err);
      skipped.push(sorted[i].name);
    }
    onProgress?.({ stage: 'reading', done: i + 1, total: sorted.length });
    // Nhường trình duyệt định kỳ: đọc epub gần như tức thì, nếu không nghỉ thì React báo lặp cập nhật (#185)
    if (i % 25 === 24) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (chapters.length === 0) throw new Error('Không đọc được chương nào từ các file đã chọn.');

  await flush();

  // Ghi mục lục sau cùng: truyện chỉ hiện ra khi đã đủ nội dung
  const author = meta?.author?.trim() || undefined;
  const cover = meta?.cover || undefined;
  const categories = normalizeCategories(meta?.categories);
  const novel: Novel = {
    id: novelId,
    title: novelTitle,
    chapters,
    author,
    cover,
    categories: categories.length ? categories : undefined,
  };
  const indexBatch = writeBatch(db);
  indexBatch.set(doc(db, NOVELS, novelId), {
    title: novelTitle,
    chapters,
    updatedAt: Date.now(),
    ...(author ? { author } : {}),
    ...(cover ? { cover } : {}),
    ...(categories.length ? { categories } : {}),
  });
  await indexBatch.commit();

  return { novel, skipped };
}

// Sửa thông tin một bộ truyện đã có (không đụng tới nội dung chương)
export async function updateNovelInfo(
  novelId: string,
  info: { author?: string; categories?: string[]; cover?: string | null }
): Promise<void> {
  const author = info.author?.trim();
  const categories = normalizeCategories(info.categories);
  const data: Record<string, unknown> = {
    author: author ? author : deleteField(),
    categories: categories.length ? categories : deleteField(),
  };
  if (info.cover !== undefined) data.cover = info.cover ? info.cover : deleteField(); // undefined = giữ nguyên
  await updateDoc(doc(db, NOVELS, novelId), data);
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
