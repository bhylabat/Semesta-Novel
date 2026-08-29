import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Novel,
  Chapter,
  Genre,
  Bookmark,
  ReadingHistory,
  Comment,
  Notification,
  Profile,
  UserRole,
} from '@/types';

// ============================================================
// HELPERS
// ============================================================

/**
 * Mengambil jumlah bab dan jumlah bookmark setiap novel.
 *
 * Dipakai agar NovelCard selalu mendapatkan:
 * - chapter_count
 * - bookmark_count
 */
async function attachNovelStats(
  novels: Novel[]
): Promise<Novel[]> {
  if (!isSupabaseConfigured || novels.length === 0) {
    return novels;
  }

  return Promise.all(
    novels.map(async (novel) => {
      const [
        chapterResult,
        bookmarkResult,
      ] = await Promise.all([
        supabase
          .from('chapters')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('novel_id', novel.id),

        supabase
          .from('bookmarks')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('novel_id', novel.id),
      ]);

      if (chapterResult.error) {
        throw chapterResult.error;
      }

      if (bookmarkResult.error) {
        throw bookmarkResult.error;
      }

      return {
        ...novel,
        chapter_count: chapterResult.count || 0,
        bookmark_count: bookmarkResult.count || 0,
      };
    })
  );
}

/**
 * Mengambil data novel lengkap untuk tampilan card.
 */
async function enrichNovel(
  novel: Novel
): Promise<Novel> {
  const result = await attachNovelStats([novel]);
  return result[0] || novel;
}

// ============================================================
// NOVELS
// ============================================================

export async function fetchNovels(options?: {
  genre?: string;
  status?: string;
  search?: string;
  sort?: 'terbaru' | 'terpopuler' | 'rating' | 'az' | 'chapter';
  limit?: number;
  offset?: number;
}): Promise<{ data: Novel[]; total: number }> {
  if (!isSupabaseConfigured) {
    return {
      data: [],
      total: 0,
    };
  }

  let query = supabase
    .from('novels')
    .select('*', {
      count: 'exact',
    });

  if (
    options?.status &&
    options.status !== 'all'
  ) {
    query = query.eq(
      'status',
      options.status
    );
  }

  if (options?.search) {
    const search =
      options.search.trim();

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,author.ilike.%${search}%,description.ilike.%${search}%`
      );
    }
  }

  switch (options?.sort) {
    case 'terpopuler':
      query = query.order(
        'views',
        {
          ascending: false,
        }
      );
      break;

    case 'rating':
      query = query.order(
        'rating',
        {
          ascending: false,
        }
      );
      break;

    case 'az':
      query = query.order(
        'title',
        {
          ascending: true,
        }
      );
      break;

    case 'chapter':
      query = query.order(
        'updated_at',
        {
          ascending: false,
        }
      );
      break;

    case 'terbaru':
    default:
      query = query.order(
        'created_at',
        {
          ascending: false,
        }
      );
      break;
  }

  if (options?.limit) {
    const offset =
      options.offset || 0;

    query = query.range(
      offset,
      offset +
        options.limit -
        1
    );
  }

  const {
    data,
    error,
    count,
  } = await query;

  if (error) {
    throw error;
  }

  let novels =
    (data || []) as Novel[];

  // Filter genre
  if (
    options?.genre &&
    options.genre !== 'all'
  ) {
    const {
      data: ngData,
      error: genreError,
    } = await supabase
      .from('novel_genres')
      .select('novel_id')
      .eq(
        'genre_id',
        options.genre
      );

    if (genreError) {
      throw genreError;
    }

    const novelIds =
      (ngData || []).map(
        (
          row: {
            novel_id: string;
          }
        ) => row.novel_id
      );

    novels = novels.filter(
      (novel) =>
        novelIds.includes(
          novel.id
        )
    );
  }

  // Tambahkan jumlah bab + bookmark
  novels =
    await attachNovelStats(
      novels
    );

  return {
    data: novels,
    total: count || 0,
  };
}

// ============================================================
// NOVEL BY SLUG
// ============================================================

export async function fetchNovelBySlug(
  slug: string
): Promise<Novel | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('novels')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const novel =
    data as Novel;

  // Genres
  const {
    data: ngData,
    error: genreError,
  } = await supabase
    .from('novel_genres')
    .select('genres(*)')
    .eq(
      'novel_id',
      novel.id
    );

  if (genreError) {
    throw genreError;
  }

  novel.genres =
    (ngData || []).flatMap(
      (
        row: {
          genres:
            | Genre
            | Genre[]
            | null;
        }
      ) => {
        if (!row.genres) {
          return [];
        }

        return Array.isArray(
          row.genres
        )
          ? row.genres
          : [row.genres];
      }
    );

  // Latest chapter
  const {
    data: latestChapter,
    error: chapterError,
  } = await supabase
    .from('chapters')
    .select('*')
    .eq(
      'novel_id',
      novel.id
    )
    .order(
      'chapter_number',
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (chapterError) {
    throw chapterError;
  }

  novel.latest_chapter = latestChapter
  ? (latestChapter as Chapter)
  : undefined;

  // Chapter count
  const {
    count: chapterCount,
    error: chapterCountError,
  } = await supabase
    .from('chapters')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq(
      'novel_id',
      novel.id
    );

  if (chapterCountError) {
    throw chapterCountError;
  }

  novel.chapter_count =
    chapterCount || 0;

  // Bookmark count
  const {
    count: bookmarkCount,
    error: bookmarkCountError,
  } = await supabase
    .from('bookmarks')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq(
      'novel_id',
      novel.id
    );

  if (bookmarkCountError) {
    throw bookmarkCountError;
  }

  novel.bookmark_count =
    bookmarkCount || 0;

  return novel;
}

// ============================================================
// NOVELS BY IDS
// ============================================================

export async function fetchNovelsByIds(
  ids: string[]
): Promise<Novel[]> {
  if (
    !isSupabaseConfigured ||
    ids.length === 0
  ) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('novels')
    .select('*')
    .in('id', ids);

  if (error) {
    throw error;
  }

  return attachNovelStats(
    (data || []) as Novel[]
  );
}

// ============================================================
// SIMILAR NOVELS
// ============================================================

export async function fetchSimilarNovels(
  novel: Novel,
  limit = 6
): Promise<Novel[]> {
  if (
    !isSupabaseConfigured ||
    !novel.genres?.length
  ) {
    return [];
  }

  const genreIds =
    novel.genres.map(
      (genre) => genre.id
    );

  const {
    data: ngData,
    error,
  } = await supabase
    .from('novel_genres')
    .select('novel_id')
    .in(
      'genre_id',
      genreIds
    )
    .neq(
      'novel_id',
      novel.id
    )
    .limit(
      limit * 2
    );

  if (error) {
    throw error;
  }

  const novelIds = [
    ...new Set(
      (ngData || []).map(
        (
          row: {
            novel_id: string;
          }
        ) =>
          row.novel_id
      )
    ),
  ].slice(
    0,
    limit
  );

  if (
    novelIds.length === 0
  ) {
    return [];
  }

  const {
    data,
    error: novelError,
  } = await supabase
    .from('novels')
    .select('*')
    .in(
      'id',
      novelIds
    )
    .limit(limit);

  if (novelError) {
    throw novelError;
  }

  return attachNovelStats(
    (data || []) as Novel[]
  );
}

// ============================================================
// NOVEL RATINGS
// ============================================================

export async function fetchNovelRating(
  novelId: string,
  userId: string
): Promise<number | null> {
  if (!isSupabaseConfigured || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('novel_ratings')
    .select('rating')
    .eq('novel_id', novelId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return Number(data.rating);
}

export async function submitNovelRating(
  novelId: string,
  userId: string,
  rating: number
): Promise<number> {
  if (!isSupabaseConfigured) {
    return 0;
  }

  const safeRating = Math.min(
    5,
    Math.max(1, Math.round(Number(rating)))
  );

  // Simpan / update rating user.
  const { error: upsertError } = await supabase
    .from('novel_ratings')
    .upsert(
      {
        novel_id: novelId,
        user_id: userId,
        rating: safeRating,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'novel_id,user_id',
      }
    );

  if (upsertError) {
    throw upsertError;
  }

  // Ambil semua rating untuk novel.
  const { data: ratingsData, error: ratingsError } =
    await supabase
      .from('novel_ratings')
      .select('rating')
      .eq('novel_id', novelId);

  if (ratingsError) {
    throw ratingsError;
  }

  const ratings = (ratingsData || [])
    .map((row) => Number(row.rating))
    .filter((value) => Number.isFinite(value));

  const average =
    ratings.length > 0
      ? ratings.reduce(
          (sum, value) => sum + value,
          0
        ) / ratings.length
      : 0;

  const roundedAverage = Number(
    average.toFixed(1)
  );

  // Simpan rata-rata ke tabel novels.
  const { error: updateError } = await supabase
    .from('novels')
    .update({
      rating: roundedAverage,
    })
    .eq('id', novelId);

  if (updateError) {
    throw updateError;
  }

  return roundedAverage;
}
// ============================================================
// CHAPTERS
// ============================================================

export async function fetchChapters(
  novelId: string,
  options?: {
    limit?: number;
    offset?: number;
    order?: 'asc' | 'desc';
  }
): Promise<{
  data: Chapter[];
  total: number;
}> {
  if (!isSupabaseConfigured) {
    return {
      data: [],
      total: 0,
    };
  }

  const limit =
    options?.limit || 10;

  const offset =
    options?.offset || 0;

  const ascending =
    options?.order !== 'desc';

  const {
    data,
    error,
    count,
  } = await supabase
    .from('chapters')
    .select('*', {
      count: 'exact',
    })
    .eq(
      'novel_id',
      novelId
    )
    .order(
      'chapter_number',
      {
        ascending,
      }
    )
    .range(
      offset,
      offset +
        limit -
        1
    );

  if (error) {
    throw error;
  }

  return {
    data:
      (data || []) as Chapter[],
    total:
      count || 0,
  };
}

export async function fetchChapterByNumber(
  novelId: string,
  chapterNumber: number
): Promise<Chapter | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('chapters')
    .select('*')
    .eq(
      'novel_id',
      novelId
    )
    .eq(
      'chapter_number',
      chapterNumber
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as
    | Chapter
    | null;
}

export async function fetchLatestChapters(
  novelId: string,
  limit = 10
): Promise<Chapter[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('chapters')
    .select('*')
    .eq(
      'novel_id',
      novelId
    )
    .order(
      'chapter_number',
      {
        ascending: false,
      }
    )
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ||
    []) as Chapter[];
}

// ============================================================
// CHAPTER VIEWS
// ============================================================

/**
 * Mencatat view ketika pembaca membuka bab.
 *
 * Yang bertambah:
 * 1. chapters.views
 * 2. novels.views
 *
 * Tidak membutuhkan scroll.
 */
export async function recordChapterView(
  chapterId: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    data: chapter,
    error: fetchError,
  } = await supabase
    .from('chapters')
    .select(
      'id, novel_id, views'
    )
    .eq(
      'id',
      chapterId
    )
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!chapter) {
    return;
  }

  const currentChapterViews =
    Number(
      chapter.views || 0
    );

  // Tambah view bab
  const {
    error: chapterUpdateError,
  } = await supabase
    .from('chapters')
    .update({
      views:
        currentChapterViews +
        1,
    })
    .eq(
      'id',
      chapterId
    );

  if (chapterUpdateError) {
    throw chapterUpdateError;
  }

  // Ambil view novel
  const {
    data: novel,
    error: novelFetchError,
  } = await supabase
    .from('novels')
    .select(
      'id, views'
    )
    .eq(
      'id',
      chapter.novel_id
    )
    .maybeSingle();

  if (novelFetchError) {
    throw novelFetchError;
  }

  if (!novel) {
    return;
  }

  const currentNovelViews =
    Number(
      novel.views || 0
    );

  // Tambah view novel
  const {
    error: novelUpdateError,
  } = await supabase
    .from('novels')
    .update({
      views:
        currentNovelViews +
        1,
    })
    .eq(
      'id',
      chapter.novel_id
    );

  if (novelUpdateError) {
    throw novelUpdateError;
  }
}

// ============================================================
// CHAPTER VIEW STATISTICS
// ============================================================

export interface DailyViewStat {
  view_date: string;
  total_views: number;
}

/**
 * Mengambil jumlah view per hari.
 *
 * Dipakai oleh AdminDashboard untuk grafik
 * "Aktivitas Membaca (7 Hari Terakhir)".
 */
export async function fetchDailyViewStats(
  days = 7
): Promise<DailyViewStat[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const safeDays = Math.max(
    1,
    Math.min(31, Math.floor(days))
  );

  const { data, error } = await supabase.rpc(
    'get_daily_chapter_views',
    {
      days_count: safeDays,
    }
  );

  if (error) {
    throw error;
  }

  return (data || []).map(
    (row: {
      view_date: string;
      total_views: number;
    }) => ({
      view_date: row.view_date,
      total_views: Number(
        row.total_views || 0
      ),
    })
  );
}
// ============================================================
// GENRES
// ============================================================

export async function fetchGenres(): Promise<Genre[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('genres')
    .select('*')
    .order('name');

  if (error) {
    throw error;
  }

  return (data ||
    []) as Genre[];
}

// ============================================================
// BOOKMARKS
// ============================================================

export async function fetchBookmarks(
  userId: string
): Promise<Bookmark[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('bookmarks')
    .select(
      '*, novel:novels(*)'
    )
    .eq(
      'user_id',
      userId
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  const bookmarks =
    (data ||
      []) as Bookmark[];

  // Lengkapi statistik novel di bookmark
  await Promise.all(
    bookmarks.map(
      async (bookmark) => {
        if (
          bookmark.novel
        ) {
          bookmark.novel =
            await enrichNovel(
              bookmark.novel as Novel
            );
        }
      }
    )
  );

  return bookmarks;
}

export async function toggleBookmark(
  userId: string,
  novelId: string
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return false;
  }

  const {
    data: existing,
    error: lookupError,
  } = await supabase
    .from('bookmarks')
    .select('id')
    .eq(
      'user_id',
      userId
    )
    .eq(
      'novel_id',
      novelId
    )
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  // Hapus bookmark
  if (existing) {
    const {
      error,
    } = await supabase
      .from('bookmarks')
      .delete()
      .eq(
        'id',
        existing.id
      );

    if (error) {
      throw error;
    }

    return false;
  }

  // Tambah bookmark
  const {
    error,
  } = await supabase
    .from('bookmarks')
    .insert({
      user_id:
        userId,
      novel_id:
        novelId,
    });

  if (error) {
    throw error;
  }

  return true;
}

export async function isBookmarked(
  userId: string,
  novelId: string
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return false;
  }

  const {
    data,
    error,
  } = await supabase
    .from('bookmarks')
    .select('id')
    .eq(
      'user_id',
      userId
    )
    .eq(
      'novel_id',
      novelId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

/**
 * Mengambil jumlah bookmark novel.
 */
export async function fetchNovelBookmarkCount(
  novelId: string
): Promise<number> {
  if (!isSupabaseConfigured) {
    return 0;
  }

  const {
    count,
    error,
  } = await supabase
    .from('bookmarks')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq(
      'novel_id',
      novelId
    );

  if (error) {
    throw error;
  }

  return count || 0;
}

// ============================================================
// READING HISTORY
// ============================================================

export async function fetchReadingHistory(
  userId: string
): Promise<ReadingHistory[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('reading_history')
    .select(
      '*, novel:novels(*), chapter:chapters(*)'
    )
    .eq(
      'user_id',
      userId
    )
    .order(
      'last_read_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  const history =
    (data ||
      []) as ReadingHistory[];

  await Promise.all(
    history.map(
      async (item) => {
        if (item.novel) {
          item.novel =
            await enrichNovel(
              item.novel as Novel
            );
        }
      }
    )
  );

  return history;
}

export async function updateReadingHistory(
  userId: string,
  novelId: string,
  chapterId: string,
  progress: number
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const safeProgress =
    Math.min(
      100,
      Math.max(
        0,
        Number(progress)
      )
    );

  const {
    data: existing,
    error: lookupError,
  } = await supabase
    .from('reading_history')
    .select('id')
    .eq(
      'user_id',
      userId
    )
    .eq(
      'novel_id',
      novelId
    )
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    const {
      error,
    } = await supabase
      .from('reading_history')
      .update({
        chapter_id:
          chapterId,
        progress:
          safeProgress,
        last_read_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        existing.id
      );

    if (error) {
      throw error;
    }

    return;
  }

  const {
    error,
  } = await supabase
    .from('reading_history')
    .insert({
      user_id:
        userId,
      novel_id:
        novelId,
      chapter_id:
        chapterId,
      progress:
        safeProgress,
      last_read_at:
        new Date().toISOString(),
    });

  if (error) {
    throw error;
  }
}

export async function deleteReadingHistory(
  userId: string,
  novelId: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('reading_history')
    .delete()
    .eq(
      'user_id',
      userId
    )
    .eq(
      'novel_id',
      novelId
    );

  if (error) {
    throw error;
  }
}

// ============================================================
// COMMENTS
// ============================================================

async function attachCommentProfiles(
  comments: Comment[]
): Promise<Comment[]> {
  if (comments.length === 0) {
    return comments;
  }

  const userIds = [
    ...new Set(
      comments.map(
        (comment) =>
          comment.user_id
      )
    ),
  ];

  if (userIds.length === 0) {
    return comments;
  }

  const {
    data: profiles,
    error,
  } = await supabase
    .from('profiles')
    .select('*')
    .in(
      'id',
      userIds
    );

  if (error) {
    throw error;
  }

  const profilesById =
    new Map<
      string,
      Profile
    >(
      (profiles || []).map(
        (profile) => [
          profile.id,
          profile as Profile,
        ]
      )
    );

  return comments.map(
    (comment) => ({
      ...comment,
      profile:
        profilesById.get(
          comment.user_id
        ),
    })
  );
}

export async function fetchMyComments(
  userId: string
): Promise<Comment[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('comments')
    .select('*')
    .eq(
      'user_id',
      userId
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return attachCommentProfiles(
    (data ||
      []) as Comment[]
  );
}

export async function fetchNovelComments(
  novelId: string
): Promise<Comment[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('comments')
    .select('*')
    .eq(
      'novel_id',
      novelId
    )
    .is(
      'chapter_id',
      null
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return attachCommentProfiles(
    (data ||
      []) as Comment[]
  );
}

export async function fetchChapterComments(
  novelId: string,
  chapterId: string
): Promise<Comment[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('comments')
    .select('*')
    .eq(
      'novel_id',
      novelId
    )
    .eq(
      'chapter_id',
      chapterId
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return attachCommentProfiles(
    (data ||
      []) as Comment[]
  );
}

export async function addComment(
  userId: string,
  novelId: string,
  chapterId: string | null,
  content: string,
  parentId?: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const trimmedContent =
    content.trim();

  if (!trimmedContent) {
    throw new Error(
      'Komentar tidak boleh kosong.'
    );
  }

  const {
    error,
  } = await supabase
    .from('comments')
    .insert({
      user_id:
        userId,
      novel_id:
        novelId,
      chapter_id:
        chapterId,
      parent_id:
        parentId || null,
      content:
        trimmedContent,
    });

  if (error) {
    throw error;
  }
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const trimmedContent =
    content.trim();

  if (!trimmedContent) {
    throw new Error(
      'Komentar tidak boleh kosong.'
    );
  }

  const {
    error,
  } = await supabase
    .from('comments')
    .update({
      content:
        trimmedContent,
    })
    .eq(
      'id',
      commentId
    );

  if (error) {
    throw error;
  }
}

export async function deleteComment(
  commentId: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('comments')
    .delete()
    .eq(
      'id',
      commentId
    );

  if (error) {
    throw error;
  }
}

export async function toggleCommentLike(
  userId: string,
  commentId: string
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return false;
  }

  const {
    data: existing,
    error: lookupError,
  } = await supabase
    .from('comment_likes')
    .select('id')
    .eq(
      'user_id',
      userId
    )
    .eq(
      'comment_id',
      commentId
    )
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    const {
      error: deleteError,
    } = await supabase
      .from('comment_likes')
      .delete()
      .eq(
        'id',
        existing.id
      );

    if (deleteError) {
      throw deleteError;
    }

    const {
      error: decrementError,
    } = await supabase.rpc(
      'decrement_comment_likes',
      {
        comment_id:
          commentId,
      }
    );

    if (decrementError) {
      throw decrementError;
    }

    return false;
  }

  const {
    error: insertError,
  } = await supabase
    .from('comment_likes')
    .insert({
      user_id:
        userId,
      comment_id:
        commentId,
    });

  if (insertError) {
    throw insertError;
  }

  const {
    error: incrementError,
  } = await supabase.rpc(
    'increment_comment_likes',
    {
      comment_id:
        commentId,
    }
  );

  if (incrementError) {
    throw incrementError;
  }

  return true;
}

export async function reportComment(
  userId: string,
  commentId: string,
  reason: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const trimmedReason =
    reason.trim();

  if (!trimmedReason) {
    throw new Error(
      'Alasan laporan tidak boleh kosong.'
    );
  }

  const {
    error,
  } = await supabase
    .from('reports')
    .insert({
      user_id:
        userId,
      comment_id:
        commentId,
      reason:
        trimmedReason,
    });

  if (error) {
    throw error;
  }
}

export async function fetchLikedCommentIds(
  userId: string,
  commentIds: string[]
): Promise<Set<string>> {
  if (
    !isSupabaseConfigured ||
    commentIds.length === 0
  ) {
    return new Set();
  }

  const {
    data,
    error,
  } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq(
      'user_id',
      userId
    )
    .in(
      'comment_id',
      commentIds
    );

  if (error) {
    throw error;
  }

  return new Set(
    (data || []).map(
      (
        row: {
          comment_id: string;
        }
      ) =>
        row.comment_id
    )
  );
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function fetchNotifications(
  userId: string
): Promise<Notification[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('notifications')
    .select('*')
    .eq(
      'user_id',
      userId
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return (data ||
    []) as Notification[];
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('notifications')
    .update({
      is_read: true,
    })
    .eq(
      'id',
      notificationId
    );

  if (error) {
    throw error;
  }
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('notifications')
    .update({
      is_read: true,
    })
    .eq(
      'user_id',
      userId
    )
    .eq(
      'is_read',
      false
    );

  if (error) {
    throw error;
  }
}

export async function deleteNotification(
  notificationId: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('notifications')
    .delete()
    .eq(
      'id',
      notificationId
    );

  if (error) {
    throw error;
  }
}

export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  if (!isSupabaseConfigured) {
    return 0;
  }

  const {
    count,
    error,
  } = await supabase
    .from('notifications')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq(
      'user_id',
      userId
    )
    .eq(
      'is_read',
      false
    );

  if (error) {
    throw error;
  }

  return count || 0;
}

// ============================================================
// PROFILE
// ============================================================

export async function fetchProfile(
  userId: string
): Promise<Profile | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .select('*')
    .eq(
      'id',
      userId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as
    | Profile
    | null;
}

export async function createProfile(
  userId: string,
  email: string,
  username: string,
  role: UserRole = 'reader'
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      username,
      role,
    });

  if (error) {
    throw error;
  }
}

export async function updateProfile(
  userId: string,
  updates: {
    username?: string;
    display_name?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
  }
): Promise<Profile | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .update(updates)
    .eq(
      'id',
      userId
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
}

export async function uploadProfileAvatar(
  userId: string,
  file: File
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase belum dikonfigurasi.'
    );
  }

  if (!file.type.startsWith('image/')) {
    throw new Error(
      'File yang dipilih harus berupa gambar.'
    );
  }

  const maxSize =
    5 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      'Ukuran foto maksimal 5 MB.'
    );
  }

  const fileExt =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase() ||
    'jpg';

  const filePath =
    `${userId}/avatar.${fileExt}`;

  const {
    error: uploadError,
  } = await supabase.storage
    .from('avatars')
    .upload(
      filePath,
      file,
      {
        cacheControl:
          '3600',
        upsert: true,
        contentType:
          file.type,
      }
    );

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: publicUrlData,
  } =
    supabase.storage
      .from('avatars')
      .getPublicUrl(
        filePath
      );

  const avatarUrl =
    publicUrlData.publicUrl;

  if (!avatarUrl) {
    throw new Error(
      'URL foto profil gagal dibuat.'
    );
  }

  const {
    error: profileError,
  } = await supabase
    .from('profiles')
    .update({
      avatar_url:
        avatarUrl,
    })
    .eq(
      'id',
      userId
    );

  if (profileError) {
    throw profileError;
  }

  return avatarUrl;
}

// ============================================================
// ADMIN - PROFILES
// ============================================================

export async function adminFetchAllProfiles(): Promise<Profile[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .select('*')
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return (data ||
    []) as Profile[];
}

export async function adminUpdateProfileRole(
  userId: string,
  role: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('profiles')
    .update({
      role,
    })
    .eq(
      'id',
      userId
    );

  if (error) {
    throw error;
  }
}

// ============================================================
// ADMIN - NOVELS
// ============================================================

export async function adminCreateNovel(
  novel: Partial<Novel>
): Promise<Novel | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user =
    userData.user;

  if (!user) {
    throw new Error(
      'User belum login'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('novels')
    .insert({
      ...novel,
      author_id:
        user.id,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as
    | Novel
    | null;
}

export async function adminUpdateNovel(
  id: string,
  updates: Partial<Novel>
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('novels')
    .update(updates)
    .eq(
      'id',
      id
    );

  if (error) {
    throw error;
  }
}

export async function adminDeleteNovel(
  id: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('novels')
    .delete()
    .eq(
      'id',
      id
    );

  if (error) {
    throw error;
  }
}

// ============================================================
// ADMIN - CHAPTERS
// ============================================================

export async function adminCreateChapter(
  chapter: Partial<Chapter>
): Promise<Chapter | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('chapters')
    .insert(chapter)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as
    | Chapter
    | null;
}

export async function adminUpdateChapter(
  id: string,
  updates: Partial<Chapter>
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('chapters')
    .update(updates)
    .eq(
      'id',
      id
    );

  if (error) {
    throw error;
  }
}

export async function adminDeleteChapter(
  id: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('chapters')
    .delete()
    .eq(
      'id',
      id
    );

  if (error) {
    throw error;
  }
}

// ============================================================
// ADMIN - COMMENTS
// ============================================================

export async function adminFetchAllComments(): Promise<Comment[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('comments')
    .select('*')
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return attachCommentProfiles(
    (data ||
      []) as Comment[]
  );
}

export async function adminDeleteComment(
  id: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('comments')
    .delete()
    .eq(
      'id',
      id
    );

  if (error) {
    throw error;
  }
}

// ============================================================
// ADMIN - REPORTS
// ============================================================

export interface AdminReport {
  id: string;
  user_id: string;
  created_at: string;
  reason: string;
  status: string;
  profile?: {
    username: string;
  } | null;
  comment?: {
    user_id: string;
    content: string;
    profile?: {
      username: string;
    } | null;
  } | null;
}

export async function adminFetchReports(): Promise<
  AdminReport[]
> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('reports')
    .select(
      '*, comment:comments(*)'
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  const reports =
    (data ||
      []) as AdminReport[];

  const userIds = [
    ...new Set(
      reports.flatMap(
        (report) => [
          report.user_id,

          ...(report.comment
            ? [
                report
                  .comment
                  .user_id,
              ]
            : []),
        ]
      )
    ),
  ];

  if (
    userIds.length === 0
  ) {
    return reports;
  }

  const {
    data: profiles,
    error: profilesError,
  } = await supabase
    .from('profiles')
    .select(
      'id, username'
    )
    .in(
      'id',
      userIds
    );

  if (profilesError) {
    throw profilesError;
  }

  const profilesById =
    new Map<
      string,
      {
        id: string;
        username: string;
      }
    >(
      (profiles || []).map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

  return reports.map(
    (report) => ({
      ...report,

      profile:
        profilesById.get(
          report.user_id
        ) || null,

      comment:
        report.comment
          ? {
              ...report.comment,

              profile:
                profilesById.get(
                  report
                    .comment
                    .user_id
                ) || null,
            }
          : null,
    })
  );
}

export async function adminUpdateReportStatus(
  id: string,
  status: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('reports')
    .update({
      status,
    })
    .eq(
      'id',
      id
    );

  if (error) {
    throw error;
  }
}