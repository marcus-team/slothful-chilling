import { unzipSync, strFromU8 } from 'fflate';
import { Chapter, Novel } from '../types/novel';

const CACHE_PREFIX = 'slothful_chapter_cache_';

const MIME_FOLDER = 'application/vnd.google-apps.folder';
const MIME_GDOC = 'application/vnd.google-apps.document';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Độ sâu tối đa khi duyệt thư mục con (truyện -> nhóm chương -> dải chương -> ...)
const MAX_FOLDER_DEPTH = 5;
// Số thư mục duyệt song song, để không vượt giới hạn rate của Drive API
const FOLDER_CONCURRENCY = 4;

// Natural sort for chapter filenames: extracts numbers and compares cleanly
export function extractChapterOrder(filename: string): number {
  const match = filename.match(/(?:chương|chap|c|chapter|hồi|bài|tập|phần)?\s*(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 9999;
}

export function sortChapters(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export interface DriveFolderItem {
  id: string;
  name: string;
  modifiedTime?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
}

// Liệt kê toàn bộ con trực tiếp của một thư mục (có phân trang)
async function listChildren(parentId: string, accessToken: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${parentId}' in parents and trashed = false`);
    url.searchParams.set('fields', 'nextPageToken, files(id, name, mimeType, modifiedTime)');
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lỗi đọc thư mục Google Drive: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    files.push(...((data.files || []) as DriveFile[]));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

function isChapterFile(file: DriveFile): boolean {
  return (
    file.mimeType === MIME_DOCX ||
    file.mimeType === MIME_GDOC ||
    file.mimeType === 'text/plain' ||
    file.mimeType === 'text/markdown' ||
    /\.(txt|md|docx)$/i.test(file.name)
  );
}

// Danh sách thư mục ở gốc My Drive (hoặc con trực tiếp của parentFolderId)
export async function listDriveFolders(
  accessToken: string,
  parentFolderId: string = 'root'
): Promise<DriveFolderItem[]> {
  const children = await listChildren(parentFolderId, accessToken);
  return children
    .filter((f) => f.mimeType === MIME_FOLDER)
    .map((f) => ({ id: f.id, name: f.name, modifiedTime: f.modifiedTime }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
}

// Gom chương từ một thư mục, đi sâu vào mọi thư mục con
export async function listFolderChapters(
  folderId: string,
  accessToken: string,
  depth = 0
): Promise<Chapter[]> {
  const children = await listChildren(folderId, accessToken);

  const chapters: Chapter[] = children.filter(isChapterFile).map((file) => ({
    id: file.id,
    // Strip extension for cleaner UI title
    title: file.name.replace(/\.(txt|md|docx)$/i, ''),
    order: extractChapterOrder(file.name),
    fileId: file.id,
    mimeType: file.mimeType,
    source: 'drive' as const,
  }));

  if (depth < MAX_FOLDER_DEPTH) {
    const subfolders = children.filter((f) => f.mimeType === MIME_FOLDER);
    for (let i = 0; i < subfolders.length; i += FOLDER_CONCURRENCY) {
      const batch = subfolders.slice(i, i + FOLDER_CONCURRENCY);
      const results = await Promise.all(
        batch.map((folder) => listFolderChapters(folder.id, accessToken, depth + 1))
      );
      for (const r of results) chapters.push(...r);
    }
  }

  return sortChapters(chapters);
}

// Coi một thư mục là một bộ truyện (chương có thể nằm trong các thư mục con)
export async function scanFolderAsNovel(
  folder: DriveFolderItem,
  accessToken: string
): Promise<Novel | null> {
  const chapters = await listFolderChapters(folder.id, accessToken);
  if (chapters.length === 0) return null;

  return {
    id: `drive_${folder.id}`,
    title: folder.name,
    folderId: folder.id,
    author: 'Google Drive Sync',
    description: `Bộ truyện từ Google Drive gồm ${chapters.length} chương.`,
    chapters,
    source: 'drive',
  };
}

// Quét các thư mục ở gốc My Drive, mỗi thư mục chứa chương (ở bất kỳ cấp nào) là một bộ truyện
export async function scanDriveForNovels(accessToken: string): Promise<Novel[]> {
  const folders = await listDriveFolders(accessToken);
  const detectedNovels: Novel[] = [];
  let firstError: Error | null = null;

  for (let i = 0; i < folders.length; i += FOLDER_CONCURRENCY) {
    const batch = folders.slice(i, i + FOLDER_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (folder) => {
        try {
          return await scanFolderAsNovel(folder, accessToken);
        } catch (err: any) {
          console.warn(`Không quét được thư mục "${folder.name}"`, err);
          if (!firstError) firstError = err;
          return null;
        }
      })
    );
    for (const res of results) {
      if (res) detectedNovels.push(res);
    }
  }

  // Nếu không tìm được gì mà có lỗi thật thì báo lỗi, đừng báo "không có truyện"
  if (detectedNovels.length === 0 && firstError) throw firstError;

  return detectedNovels;
}

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
  if (!xml) {
    throw new Error('File .docx không hợp lệ (thiếu word/document.xml)');
  }

  const doc = new DOMParser().parseFromString(strFromU8(xml), 'application/xml');
  const paragraphs = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'))
    .map((p) => paragraphText(p).trim())
    .filter((t) => t.length > 0);

  // Reader tách đoạn theo dòng trống
  return paragraphs.join('\n\n');
}

// Fetch chapter content with local caching
export async function fetchChapterText(
  fileId: string,
  accessToken: string,
  mimeType?: string
): Promise<string> {
  const cacheKey = `${CACHE_PREFIX}${fileId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return cached;
  }

  const headers = { Authorization: `Bearer ${accessToken}` };
  let text: string;

  if (mimeType === MIME_GDOC) {
    // Google Docs không tải trực tiếp được, phải export
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Không thể tải nội dung chương (HTTP ${response.status})`);
    }
    text = await response.text();
  } else {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Không thể tải nội dung chương (HTTP ${response.status})`);
    }
    text = mimeType === MIME_DOCX ? docxToText(await response.arrayBuffer()) : await response.text();
  }

  try {
    localStorage.setItem(cacheKey, text);
  } catch (e) {
    console.warn('LocalStorage full, skipped chapter caching', e);
  }

  return text;
}
