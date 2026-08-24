-- =========================================================
-- SEMESTA NOVEL
-- AUTOMATIC NOTIFICATIONS
-- =========================================================

-- =========================================================
-- 1. NOTIFIKASI BALASAN KOMENTAR
-- =========================================================

CREATE OR REPLACE FUNCTION public.notify_comment_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_owner uuid;
  novel_title text;
BEGIN
  -- Hanya jalankan jika komentar merupakan balasan
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cari pemilik komentar induk
  SELECT user_id
  INTO parent_owner
  FROM public.comments
  WHERE id = NEW.parent_id;

  -- Jika komentar induk tidak ditemukan
  IF parent_owner IS NULL THEN
    RETURN NEW;
  END IF;

  -- Jangan kirim notifikasi ke diri sendiri
  IF parent_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Ambil judul novel
  SELECT title
  INTO novel_title
  FROM public.novels
  WHERE id = NEW.novel_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    is_read
  )
  VALUES (
    parent_owner,
    'comment_reply',
    'Komentar kamu mendapat balasan',
    COALESCE(
      'Ada balasan baru pada komentar kamu di novel "' ||
      novel_title ||
      '".',
      'Ada balasan baru pada komentar kamu.'
    ),
    false
  );

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trigger_notify_comment_reply
ON public.comments;

CREATE TRIGGER trigger_notify_comment_reply
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_comment_reply();


-- =========================================================
-- 2. NOTIFIKASI BAB BARU UNTUK USER YANG BOOKMARK NOVEL
-- =========================================================

CREATE OR REPLACE FUNCTION public.notify_new_chapter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novel_title text;
BEGIN
  -- Ambil judul novel
  SELECT title
  INTO novel_title
  FROM public.novels
  WHERE id = NEW.novel_id;

  -- Kirim ke semua user yang bookmark novel tersebut
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    is_read
  )
  SELECT
    b.user_id,
    'new_chapter',
    'Bab baru tersedia',
    'Bab ' ||
    NEW.chapter_number ||
    ' dari "' ||
    COALESCE(novel_title, 'novel ini') ||
    '" sudah tersedia.',
    false
  FROM public.bookmarks b
  WHERE b.novel_id = NEW.novel_id;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trigger_notify_new_chapter
ON public.chapters;

CREATE TRIGGER trigger_notify_new_chapter
AFTER INSERT ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_chapter();


-- =========================================================
-- 3. INDEX UNTUK NOTIFIKASI
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON public.notifications(user_id, is_read)
WHERE is_read = false;