export interface Chapter {
  id: string;
  title: string;
  order: number;
}

export interface Novel {
  id: string;
  title: string;
  chapters: Chapter[];
  author?: string;
  cover?: string; // ảnh bìa thu nhỏ dạng data URL
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
  tapScroll: boolean; // chạm mép trên/dưới màn hình để cuộn (điện thoại)
}

export interface ReadingHistoryItem {
  novelId: string;
  chapterId: string;
  scrollRatio: number; // 0 to 1
  updatedAt: number;
}
