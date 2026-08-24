const BOOKMARKS_KEY = 'semesta_bookmarks';
const HISTORY_KEY = 'semesta_history';
const READER_SETTINGS_KEY = 'semesta_reader_settings';

// ---- Guest Bookmarks (localStorage) ----

export function getGuestBookmarks(): string[] {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function toggleGuestBookmark(novelId: string): boolean {
  const bookmarks = getGuestBookmarks();
  const idx = bookmarks.indexOf(novelId);
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return false;
  } else {
    bookmarks.push(novelId);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return true;
  }
}

export function isGuestBookmarked(novelId: string): boolean {
  return getGuestBookmarks().includes(novelId);
}

// ---- Guest Reading History (localStorage) ----

interface GuestHistoryEntry {
  novel_id: string;
  chapter_id: string;
  chapter_number: number;
  progress: number;
  last_read_at: string;
}

export function getGuestHistory(): GuestHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function updateGuestHistory(novelId: string, chapterId: string, chapterNumber: number, progress: number): void {
  const history = getGuestHistory();
  const idx = history.findIndex((h) => h.novel_id === novelId);
  const entry: GuestHistoryEntry = {
    novel_id: novelId,
    chapter_id: chapterId,
    chapter_number: chapterNumber,
    progress,
    last_read_at: new Date().toISOString(),
  };
  if (idx >= 0) {
    history[idx] = entry;
  } else {
    history.unshift(entry);
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function deleteGuestHistory(novelId: string): void {
  const history = getGuestHistory().filter((h) => h.novel_id !== novelId);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ---- Reader Settings (localStorage) ----

export interface StoredReaderSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: 'sans' | 'serif';
  theme: 'dark' | 'black' | 'sepia' | 'light';
}

export function getReaderSettings(): StoredReaderSettings {
  try {
    const stored = localStorage.getItem(READER_SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load reader settings:', error);
  }
  return {
    fontSize: 18,
    lineHeight: 1.8,
    fontFamily: 'serif',
    theme: 'dark',
  };
}

export function saveReaderSettings(settings: StoredReaderSettings): void {
  localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify(settings));
}
