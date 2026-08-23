-- RPC functions for atomic like counter management on comments
-- Used by toggleCommentLike in the service layer

CREATE OR REPLACE FUNCTION public.increment_comment_likes(comment_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.comments SET likes = likes + 1 WHERE id = comment_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_comment_likes(comment_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.comments SET likes = GREATEST(0, likes - 1) WHERE id = comment_id;
$$;

-- Index for efficient novel-level comment queries (chapter_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_comments_novel_chapter_null ON comments(novel_id) WHERE chapter_id IS NULL;

-- Index for efficient chapter-level comment queries
CREATE INDEX IF NOT EXISTS idx_comments_novel_chapter ON comments(novel_id, chapter_id);
