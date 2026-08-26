export type NovelStatus = 'ongoing' | 'completed' | 'hiatus';
export type UserRole = 'reader' | 'author' | 'admin';
export type ReaderTheme = 'dark' | 'black' | 'sepia' | 'light';

export interface Profile {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  display_name?: string | null;
  bio?: string | null;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface Novel {
  id: string;
  title: string;
  slug: string;
  author: string;
  description: string;
  cover_url: string | null;
  banner_url: string | null;
  status: NovelStatus;
  rating: number;
  views: number;
  bookmark_count: number;
  created_at: string;
  updated_at: string;
  genres?: Genre[];
  latest_chapter?: Chapter;
  chapter_count?: number;
}

export interface NovelGenre {
  id: string;
  novel_id: string;
  genre_id: string;
}

export interface Chapter {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  novel_id: string;
  created_at: string;
  novel?: Novel;
}

export interface ReadingHistory {
  id: string;
  user_id: string;
  novel_id: string;
  chapter_id: string;
  progress: number;
  last_read_at: string;
  novel?: Novel;
  chapter?: Chapter;
}

export interface Comment {
  id: string;
  user_id: string;
  novel_id: string;
  chapter_id: string | null;
  parent_id: string | null;
  content: string;
  likes: number;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  replies?: Comment[];
  is_liked?: boolean;
}

export interface CommentLike {
  id: string;
  user_id: string;
  comment_id: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  comment_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: 'sans' | 'serif';
  theme: ReaderTheme;
}
