/*
# Semesta Novel — Full Platform Schema

## Overview
Creates the complete database schema for Semesta Novel, a webnovel reading platform.
This migration creates all core tables with Row Level Security policies.

## New Tables
- profiles (user profile with role: reader/author/admin)
- genres (novel genres with icon names)
- novels (novel metadata, stats, status)
- novel_genres (many-to-many novels↔genres)
- chapters (novel chapters with content)
- bookmarks (user novel bookmarks)
- reading_history (user reading progress per novel)
- comments (chapter/novel comments with threading)
- comment_likes (user likes on comments)
- notifications (user notifications)
- reports (comment moderation reports)

## Security (RLS)
- Public read on: genres, novels, novel_genres, chapters, profiles, comments
- Owner-scoped CRUD on: bookmarks, reading_history, notifications, reports, comment_likes
- Comment ownership: insert/update/delete own comments
- Admin full CRUD on all content tables via is_admin() SECURITY DEFINER function

## Notes
1. Owner columns default to auth.uid() so inserts work without passing user_id
2. is_admin() is a SECURITY DEFINER function that checks profiles.role = 'admin'
3. Unique constraints prevent duplicate bookmarks and comment_likes
4. Indexes on frequently queried columns
5. updated_at triggers on novels, chapters, comments
*/

-- profiles (created first so is_admin() can reference it)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text NOT NULL,
  avatar_url text,
  role text NOT NULL DEFAULT 'reader' CHECK (role IN ('reader', 'author', 'admin')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_profiles" ON profiles;
CREATE POLICY "read_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Now add admin policies on profiles (function exists now)
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_profiles" ON profiles;
CREATE POLICY "admin_delete_profiles" ON profiles FOR DELETE
  TO authenticated USING (public.is_admin());

-- genres
CREATE TABLE IF NOT EXISTS genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text
);
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_genres" ON genres;
CREATE POLICY "read_genres" ON genres FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_genres" ON genres;
CREATE POLICY "admin_insert_genres" ON genres FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_genres" ON genres;
CREATE POLICY "admin_update_genres" ON genres FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_genres" ON genres;
CREATE POLICY "admin_delete_genres" ON genres FOR DELETE
  TO authenticated USING (public.is_admin());

-- novels
CREATE TABLE IF NOT EXISTS novels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  author text NOT NULL,
  description text NOT NULL DEFAULT '',
  cover_url text,
  banner_url text,
  status text NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hiatus')),
  rating numeric(3,1) DEFAULT 0,
  views bigint DEFAULT 0,
  bookmark_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE novels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_novels" ON novels;
CREATE POLICY "read_novels" ON novels FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_novels" ON novels;
CREATE POLICY "admin_insert_novels" ON novels FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_novels" ON novels;
CREATE POLICY "admin_update_novels" ON novels FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_novels" ON novels;
CREATE POLICY "admin_delete_novels" ON novels FOR DELETE
  TO authenticated USING (public.is_admin());

-- novel_genres
CREATE TABLE IF NOT EXISTS novel_genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  genre_id uuid NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  UNIQUE (novel_id, genre_id)
);
ALTER TABLE novel_genres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_novel_genres" ON novel_genres;
CREATE POLICY "read_novel_genres" ON novel_genres FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_novel_genres" ON novel_genres;
CREATE POLICY "admin_insert_novel_genres" ON novel_genres FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_novel_genres" ON novel_genres;
CREATE POLICY "admin_update_novel_genres" ON novel_genres FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_novel_genres" ON novel_genres;
CREATE POLICY "admin_delete_novel_genres" ON novel_genres FOR DELETE
  TO authenticated USING (public.is_admin());

-- chapters
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  views bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (novel_id, chapter_number)
);
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_chapters" ON chapters;
CREATE POLICY "read_chapters" ON chapters FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_chapters" ON chapters;
CREATE POLICY "admin_insert_chapters" ON chapters FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_chapters" ON chapters;
CREATE POLICY "admin_update_chapters" ON chapters FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_chapters" ON chapters;
CREATE POLICY "admin_delete_chapters" ON chapters FOR DELETE
  TO authenticated USING (public.is_admin());

-- bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, novel_id)
);
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bookmarks" ON bookmarks;
CREATE POLICY "select_own_bookmarks" ON bookmarks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bookmarks" ON bookmarks;
CREATE POLICY "insert_own_bookmarks" ON bookmarks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_bookmarks" ON bookmarks;
CREATE POLICY "delete_own_bookmarks" ON bookmarks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- reading_history
CREATE TABLE IF NOT EXISTS reading_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  progress numeric(5,2) DEFAULT 0,
  last_read_at timestamptz DEFAULT now(),
  UNIQUE (user_id, novel_id)
);
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_history" ON reading_history;
CREATE POLICY "select_own_history" ON reading_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_history" ON reading_history;
CREATE POLICY "insert_own_history" ON reading_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_history" ON reading_history;
CREATE POLICY "update_own_history" ON reading_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_history" ON reading_history;
CREATE POLICY "delete_own_history" ON reading_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- comments
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_comments" ON comments;
CREATE POLICY "read_comments" ON comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_comments" ON comments;
CREATE POLICY "insert_own_comments" ON comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_comments" ON comments;
CREATE POLICY "update_own_comments" ON comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_comments" ON comments;
CREATE POLICY "delete_own_comments" ON comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_delete_comments" ON comments;
CREATE POLICY "admin_delete_comments" ON comments FOR DELETE
  TO authenticated USING (public.is_admin());

-- comment_likes
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  UNIQUE (user_id, comment_id)
);
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_comment_likes" ON comment_likes;
CREATE POLICY "select_own_comment_likes" ON comment_likes FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_comment_likes" ON comment_likes;
CREATE POLICY "insert_own_comment_likes" ON comment_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_comment_likes" ON comment_likes;
CREATE POLICY "delete_own_comment_likes" ON comment_likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reports" ON reports;
CREATE POLICY "select_own_reports" ON reports FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_reports" ON reports;
CREATE POLICY "insert_own_reports" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_update_reports" ON reports;
CREATE POLICY "admin_update_reports" ON reports FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_reports" ON reports;
CREATE POLICY "admin_delete_reports" ON reports FOR DELETE
  TO authenticated USING (public.is_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_novels_slug ON novels(slug);
CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status);
CREATE INDEX IF NOT EXISTS idx_novels_created_at ON novels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_novels_views ON novels(views DESC);
CREATE INDEX IF NOT EXISTS idx_novels_rating ON novels(rating DESC);
CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id);
CREATE INDEX IF NOT EXISTS idx_chapters_novel_chapter ON chapters(novel_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_chapters_created_at ON chapters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_novel_genres_novel ON novel_genres(novel_id);
CREATE INDEX IF NOT EXISTS idx_novel_genres_genre ON novel_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_novel ON bookmarks(novel_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_last_read ON reading_history(user_id, last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_chapter ON comments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_comments_novel ON comments(novel_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS novels_updated_at ON novels;
CREATE TRIGGER novels_updated_at BEFORE UPDATE ON novels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS chapters_updated_at ON chapters;
CREATE TRIGGER chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS comments_updated_at ON comments;
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
