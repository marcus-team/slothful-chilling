import { Chapter, Novel } from '../types/novel';

const CACHE_PREFIX = 'slothful_chapter_cache_';

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

// Search for novel folders on Google Drive
export async function listDriveFolders(
  accessToken: string,
  parentFolderId?: string
): Promise<DriveFolderItem[]> {
  let query = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', query);
  url.searchParams.set('fields', 'files(id, name, modifiedTime)');
  url.searchParams.set('pageSize', '100');
  url.searchParams.set('orderBy', 'name');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi tải thư mục Google Drive: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
  }));
}

// Fetch all text/markdown files inside a novel folder
export async function listFolderChapters(
  folderId: string,
  accessToken: string
): Promise<Chapter[]> {
  const query = `'${folderId}' in parents and trashed = false and (mimeType = 'text/plain' or mimeType = 'text/markdown' or name contains '.txt' or name contains '.md')`;

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', query);
  url.searchParams.set('fields', 'files(id, name, size)');
  url.searchParams.set('pageSize', '500');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi tải danh sách chương: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const files: any[] = data.files || [];

  const chapters: Chapter[] = files.map((file) => {
    // Strip extension for cleaner UI title
    const cleanTitle = file.name.replace(/\.(txt|md)$/i, '');
    const order = extractChapterOrder(file.name);

    return {
      id: file.id,
      title: cleanTitle,
      order,
      fileId: file.id,
      source: 'drive',
    };
  });

  return sortChapters(chapters);
}

// Scan Drive for folders that contain novel files
export async function scanDriveForNovels(
  accessToken: string,
  specificParentFolderId?: string
): Promise<Novel[]> {
  // First, find candidate folders
  const folders = await listDriveFolders(accessToken, specificParentFolderId);
  const detectedNovels: Novel[] = [];

  // Parallel inspection of folders (batch of 5 to respect rate limits)
  const batchSize = 5;
  for (let i = 0; i < folders.length; i += batchSize) {
    const batch = folders.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (folder) => {
        try {
          const chapters = await listFolderChapters(folder.id, accessToken);
          if (chapters.length > 0) {
            const novel: Novel = {
              id: `drive_${folder.id}`,
              title: folder.name,
              folderId: folder.id,
              author: 'Google Drive Sync',
              description: `Bộ truyện từ Google Drive gồm ${chapters.length} chương.`,
              chapters,
              source: 'drive',
            };
            return novel;
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    for (const res of results) {
      if (res) detectedNovels.push(res);
    }
  }

  return detectedNovels;
}

// Fetch chapter content with local caching
export async function fetchChapterText(fileId: string, accessToken: string): Promise<string> {
  const cacheKey = `${CACHE_PREFIX}${fileId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Không thể tải nội dung chương (HTTP ${response.status})`);
  }

  const text = await response.text();
  try {
    localStorage.setItem(cacheKey, text);
  } catch (e) {
    console.warn('LocalStorage full, skipped chapter caching', e);
  }

  return text;
}
