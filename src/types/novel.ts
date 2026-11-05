export interface Chapter {
  id: string;
  title: string;
  order: number;
  content?: string;
  wordCount?: number;
  fileId?: string;
  mimeType?: string;
  source: 'drive' | 'builtin';
}

export interface Novel {
  id: string;
  title: string;
  author?: string;
  description?: string;
  folderId?: string;
  chapters: Chapter[];
  coverUrl?: string;
  source: 'drive' | 'builtin';
}

export type FontFamily = 'sans' | 'serif' | 'mono';
export type ThemeMode = 'light' | 'warm' | 'dark';

export interface ReadingSettings {
  fontSize: number; // e.g. 18
  lineHeight: number; // e.g. 1.8
  fontFamily: FontFamily;
  theme: ThemeMode;
  textAlign: 'left' | 'justify';
  maxWidth: 'normal' | 'wide' | 'zen';
}

export interface ReadingHistoryItem {
  novelId: string;
  chapterId: string;
  scrollRatio: number; // 0 to 1
  updatedAt: number;
}
