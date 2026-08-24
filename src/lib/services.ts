import { supabase, isSupabaseConfigured } from './supabase';
import type { Novel, Chapter, Genre, Bookmark, ReadingHistory, Comment, Notification, Profile, UserRole } from '@/types';

// ---- Novels ----

export async function fetchNovels(options?: {
  genre?: string;
  status?: string;
  search?: string;
  sort?: 'terbaru' | 'terpopuler' | 'rating' | 'az' | 'chapter';
  limit?: number;
  offset?: number;
}): Promise<{ data: Novel[]; total: number }> {
  if (!isSupabaseConfigured) return { data: [], total: 0 };

  let query = supabase.from('novels').select('*', { count: 'exact' });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.search) {
    query = query.or(`title.ilike.%${options.search}%,author.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  switch (options?.sort) {
    case 'terpopuler':
      query = query.order('views', { ascending: false });
      break;
    case 'rating':
      query = query.order('rating', { ascending: false });
      break;
    case 'az':
      query = query.order('title', { ascending: true });
      break;
    case 'chapter':
      query = query.order('updated_at', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + options.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  let novels = (data || []) as Novel[];

  if (options?.genre && options.genre !== 'all') {
    const { data: ngData } = await supabase
      .from('novel_genres')
      .select('novel_id')
      .eq('genre_id', options.genre);
    const novelIds = (ngData || []).map((r: { novel_id: string }) => r.novel_id);
    novels = novels.filter((n) => novelIds.includes(n.id));
  }

  return { data: novels, total: count || 0 };
}

export async function fetchNovelBySlug(slug: string): Promise<Novel | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('novels')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const novel = data as Novel;

  const { data: ngData } = await supabase
    .from('novel_genres')
    .select('genres(*)')
    .eq('novel_id', novel.id);

  novel.genres = (ngData || []).flatMap((r: { genres: Genre[] }) => r.genres || []);

  const { data: latestChapter } = await supabase
    .from('chapters')
    .select('*')
    .eq('novel_id', novel.id)
    .order('chapter_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  novel.latest_chapter = latestChapter as Chapter | undefined;

  const { count } = await supabase
    .from('chapters')
    .select('*', { count: 'exact', head: true })
    .eq('novel_id', novel.id);

  novel.chapter_count = count || 0;

  return novel;
}

export async function fetchNovelsByIds(ids: string[]): Promise<Novel[]> {
  if (!isSupabaseConfigured || ids.length === 0) return [];
  const { data, error } = await supabase
    .from('novels')
    .select('*')
    .in('id', ids);
  if (error) throw error;
  return (data || []) as Novel[];
}

export async function fetchSimilarNovels(novel: Novel, limit = 6): Promise<Novel[]> {
  if (!isSupabaseConfigured || !novel.genres?.length) return [];

  const genreIds = novel.genres.map((g) => g.id);
  const { data: ngData } = await supabase
    .from('novel_genres')
    .select('novel_id')
    .in('genre_id', genreIds)
    .neq('novel_id', novel.id)
    .limit(limit * 2);

  const novelIds = [...new Set((ngData || []).map((r: { novel_id: string }) => r.novel_id))].slice(0, limit);
  if (novelIds.length === 0) return [];

  const { data } = await supabase
    .from('novels')
    .select('*')
    .in('id', novelIds)
    .limit(limit);

  return (data || []) as Novel[];
}

// ---- Chapters ----

export async function fetchChapters(
  novelId: string,
  options?: { limit?: number; offset?: number; order?: 'asc' | 'desc' }
): Promise<{ data: Chapter[]; total: number }> {
  if (!isSupabaseConfigured) return { data: [], total: 0 };

  const limit = options?.limit || 10;
  const offset = options?.offset || 0;
  const ascending = options?.order !== 'desc';

  const { data, error, count } = await supabase
    .from('chapters')
    .select('*', { count: 'exact' })
    .eq('novel_id', novelId)
    .order('chapter_number', { ascending })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data: (data || []) as Chapter[], total: count || 0 };
}

export async function fetchChapterByNumber(novelId: string, chapterNumber: number): Promise<Chapter | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('novel_id', novelId)
    .eq('chapter_number', chapterNumber)
    .maybeSingle();
  if (error) throw error;
  return data as Chapter | null;
}

export async function fetchLatestChapters(novelId: string, limit = 10): Promise<Chapter[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('novel_id', novelId)
    .order('chapter_number', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Chapter[];
}

// ---- Genres ----

export async function fetchGenres(): Promise<Genre[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('genres').select('*').order('name');
  if (error) throw error;
  return (data || []) as Genre[];
}

// ---- Bookmarks ----

export async function fetchBookmarks(userId: string): Promise<Bookmark[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*, novel:novels(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Bookmark[];
}

export async function toggleBookmark(userId: string, novelId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('novel_id', novelId)
    .maybeSingle();

  if (existing) {
    await supabase.from('bookmarks').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('bookmarks').insert({ user_id: userId, novel_id: novelId });
    return true;
  }
}

export async function isBookmarked(userId: string, novelId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('novel_id', novelId)
    .maybeSingle();
  return Boolean(data);
}

// ---- Reading History ----

export async function fetchReadingHistory(userId: string): Promise<ReadingHistory[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('reading_history')
    .select('*, novel:novels(*), chapter:chapters(*)')
    .eq('user_id', userId)
    .order('last_read_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ReadingHistory[];
}

export async function updateReadingHistory(
  userId: string,
  novelId: string,
  chapterId: string,
  progress: number
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { data: existing } = await supabase
    .from('reading_history')
    .select('id')
    .eq('user_id', userId)
    .eq('novel_id', novelId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('reading_history')
      .update({ chapter_id: chapterId, progress, last_read_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('reading_history').insert({
      user_id: userId,
      novel_id: novelId,
      chapter_id: chapterId,
      progress,
    });
  }
}

export async function deleteReadingHistory(userId: string, novelId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('reading_history').delete().eq('user_id', userId).eq('novel_id', novelId);
}

// ---- Comments ----
// Novel comments: chapter_id = NULL
// Chapter comments: chapter_id = specific chapter

async function attachCommentProfiles(comments: Comment[]): Promise<Comment[]> {
  if (comments.length === 0) return comments;

  const userIds = [...new Set(comments.map((comment) => comment.user_id))];
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  if (error) throw error;

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile as Profile]));
  return comments.map((comment) => ({
    ...comment,
    profile: profilesById.get(comment.user_id),
  }));
}

export async function fetchNovelComments(novelId: string): Promise<Comment[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('novel_id', novelId)
    .is('chapter_id', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return attachCommentProfiles((data || []) as Comment[]);
}

export async function fetchChapterComments(novelId: string, chapterId: string): Promise<Comment[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('novel_id', novelId)
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return attachCommentProfiles((data || []) as Comment[]);
}

export async function addComment(
  userId: string,
  novelId: string,
  chapterId: string | null,
  content: string,
  parentId?: string
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('comments').insert({
    user_id: userId,
    novel_id: novelId,
    chapter_id: chapterId,
    parent_id: parentId || null,
    content,
  });
  if (error) throw error;
}

export async function updateComment(commentId: string, content: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('comments').update({ content }).eq('id', commentId);
  if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function toggleCommentLike(userId: string, commentId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { data: existing, error: lookupError } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('comment_id', commentId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing) {
    const { error: deleteError } = await supabase.from('comment_likes').delete().eq('id', existing.id);
    if (deleteError) throw deleteError;
    const { error: decrementError } = await supabase.rpc('decrement_comment_likes', { comment_id: commentId });
    if (decrementError) throw decrementError;
    return false;
  } else {
    const { error: insertError } = await supabase.from('comment_likes').insert({ user_id: userId, comment_id: commentId });
    if (insertError) throw insertError;
    const { error: incrementError } = await supabase.rpc('increment_comment_likes', { comment_id: commentId });
    if (incrementError) throw incrementError;
    return true;
  }
}

export async function reportComment(userId: string, commentId: string, reason: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('reports').insert({
    user_id: userId,
    comment_id: commentId,
    reason,
  });
  if (error) throw error;
}

export async function fetchLikedCommentIds(userId: string, commentIds: string[]): Promise<Set<string>> {
  if (!isSupabaseConfigured || commentIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('user_id', userId)
    .in('comment_id', commentIds);
  if (error) throw error;
  return new Set((data || []).map((r: { comment_id: string }) => r.comment_id));
}

// ---- Notifications ----

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

// ---- Profile ----

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function createProfile(userId: string, email: string, username: string, role: UserRole = 'reader'): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('profiles').insert({ id: userId, email, username, role });
  if (error) throw error;
}

// ---- Admin ----

export async function adminFetchAllProfiles(): Promise<Profile[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Profile[];
}

export async function adminUpdateProfileRole(userId: string, role: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('profiles').update({ role }).eq('id', userId);
}

export async function adminCreateNovel(novel: Partial<Novel>): Promise<Novel | null> {
  if (!isSupabaseConfigured) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const user = userData.user;

  if (!user) {
    throw new Error('User belum login');
  }

  const { data, error } = await supabase
    .from('novels')
    .insert({
      ...novel,
      author_id: user.id,
    })
    .select('*')
    .maybeSingle();

  if (error) throw error;

  return data as Novel | null;
}

export async function adminUpdateNovel(id: string, updates: Partial<Novel>): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('novels').update(updates).eq('id', id);
}

export async function adminDeleteNovel(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('novels').delete().eq('id', id);
}

export async function adminCreateChapter(chapter: Partial<Chapter>): Promise<Chapter | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from('chapters').insert(chapter).select('*').maybeSingle();
  if (error) throw error;
  return data as Chapter | null;
}

export async function adminUpdateChapter(id: string, updates: Partial<Chapter>): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('chapters').update(updates).eq('id', id);
}

export async function adminDeleteChapter(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('chapters').delete().eq('id', id);
}

export async function adminFetchAllComments(): Promise<Comment[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return attachCommentProfiles((data || []) as Comment[]);
}

export async function adminDeleteComment(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('comments').delete().eq('id', id);
}

export interface AdminReport {
  id: string;
  user_id: string;
  created_at: string;
  reason: string;
  status: string;
  profile?: { username: string } | null;
  comment?: {
    user_id: string;
    content: string;
    profile?: { username: string } | null;
  } | null;
}

export async function adminFetchReports(): Promise<AdminReport[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('reports')
    .select('*, comment:comments(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const reports = (data || []) as AdminReport[];
  const userIds = [
    ...new Set(
      reports.flatMap((report) => [
        report.user_id,
        ...(report.comment ? [report.comment.user_id] : []),
      ])
    ),
  ];
  if (userIds.length === 0) return reports;

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds);
  if (profilesError) throw profilesError;

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  return reports.map((report) => ({
    ...report,
    profile: profilesById.get(report.user_id) || null,
    comment: report.comment
      ? {
          ...report.comment,
          profile: profilesById.get(report.comment.user_id) || null,
        }
      : null,
  }));
}

export async function adminUpdateReportStatus(id: string, status: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('reports').update({ status }).eq('id', id);
}
