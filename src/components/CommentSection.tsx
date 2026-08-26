import { useEffect, useState, useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import {
  MessageSquare,
  Heart,
  Reply,
  Edit2,
  Trash2,
  Flag,
  X,
  Send,
  Loader2,
  MoreHorizontal,
  CornerDownRight,
} from 'lucide-react';

import type { Comment } from '@/types';

import {
  fetchNovelComments,
  fetchChapterComments,
  addComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
  reportComment,
  fetchLikedCommentIds,
} from '@/lib/services';

import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/utils';

interface CommentSectionProps {
  novelId: string;
  chapterId: string | null;
  title: string;
  placeholder: string;
  emptyTitle: string;
  emptyMessage: string;
}

const PAGE_SIZE = 5;
const MAX_COMMENT_DEPTH = 3;

const REPORT_REASONS = [
  'Spam',
  'Bahasa kasar',
  'SARA',
  'Spoiler berlebihan',
  'Harassment',
];

// ============================================================
// COMMENT SECTION
// ============================================================

export default function CommentSection({
  novelId,
  chapterId,
  title,
  placeholder,
  emptyTitle,
  emptyMessage,
}: CommentSectionProps) {
  const { user, profile } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [newComment, setNewComment] = useState('');

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const [likedIds, setLikedIds] = useState<Set<string>>(
    new Set()
  );

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<string | null>(
    null
  );

  const [error, setError] = useState(false);

  /*
   * Menyimpan komentar/thread yang sedang dibuka.
   */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set()
  );

  /*
   * Jumlah reply yang sedang ditampilkan
   * untuk setiap komentar.
   */
  const [visibleReplies, setVisibleReplies] = useState<
    Record<string, number>
  >({});

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // ============================================================
  // LOAD COMMENTS
  // ============================================================

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const data =
        chapterId === null
          ? await fetchNovelComments(novelId)
          : await fetchChapterComments(novelId, chapterId);

      /*
       * Bentuk struktur thread maksimal 3 tingkat
       * sebelum mengambil daftar like.
       */
      const threaded = buildThread(data);

      /*
       * Ambil semua ID komentar yang tampil.
       */
      if (user && threaded.length > 0) {
        const allIds = collectAllCommentIds(threaded);

        const liked = await fetchLikedCommentIds(
          user.id,
          allIds
        );

        setLikedIds(liked);
      } else {
        setLikedIds(new Set());
      }

      setComments(threaded);

      /*
       * Reset pagination reply setelah reload.
       */
      setVisibleReplies({});
    } catch (err) {
      console.error('Failed to load comments:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterId, user]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  // ============================================================
  // CLOSE MENU
  // ============================================================

  useEffect(() => {
    const handler = () => {
      setMenuOpen(null);
    };

    if (!menuOpen) {
      return;
    }

    window.addEventListener('click', handler);

    return () => {
      window.removeEventListener('click', handler);
    };
  }, [menuOpen]);

  // ============================================================
  // NEW COMMENT
  // ============================================================

  const handleSubmit = async () => {
    const trimmed = newComment.trim();

    if (!trimmed || !user || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await addComment(
        user.id,
        novelId,
        chapterId,
        trimmed
      );

      setNewComment('');

      await loadComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // REPLY
  // ============================================================

  const handleReply = async (parentId: string) => {
    const trimmed = replyContent.trim();

    if (!trimmed || !user || submitting) {
      return;
    }

    /*
     * Maksimal 3 tingkat:
     *
     * 1 = komentar utama
     * 2 = balasan komentar utama
     * 3 = balasan dari balasan
     *
     * Tingkat 3 tidak boleh memiliki child.
     */
    const parentDepth = findCommentDepth(
      comments,
      parentId
    );

    if (
      parentDepth === null ||
      parentDepth >= MAX_COMMENT_DEPTH
    ) {
      return;
    }

    setSubmitting(true);

    try {
      await addComment(
        user.id,
        novelId,
        chapterId,
        trimmed,
        parentId
      );

      setReplyContent('');
      setReplyingTo(null);

      await loadComments();

      /*
       * Buka parent agar balasan baru terlihat.
       */
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(parentId);
        return next;
      });
    } catch (err) {
      console.error('Failed to reply:', err);
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // EDIT
  // ============================================================

  const handleEdit = async (commentId: string) => {
    const trimmed = editContent.trim();

    if (!trimmed || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await updateComment(
        commentId,
        trimmed
      );

      setEditingId(null);
      setEditContent('');

      await loadComments();
    } catch (err) {
      console.error('Failed to edit comment:', err);
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async (commentId: string) => {
    setSubmitting(true);

    try {
      await deleteComment(commentId);

      setConfirmDelete(null);

      await loadComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // LIKE
  // ============================================================

  const handleLike = async (commentId: string) => {
    if (!user) {
      return;
    }

    const isLiked = likedIds.has(commentId);

    /*
     * Optimistic update.
     */
    setLikedIds((prev) => {
      const next = new Set(prev);

      if (isLiked) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }

      return next;
    });

    setComments((prev) =>
      updateCommentLikes(
        prev,
        commentId,
        isLiked ? -1 : 1
      )
    );

    try {
      await toggleCommentLike(
        user.id,
        commentId
      );
    } catch (err) {
      console.error(
        'Failed to toggle like:',
        err
      );

      /*
       * Rollback jika gagal.
       */
      setLikedIds((prev) => {
        const next = new Set(prev);

        if (isLiked) {
          next.add(commentId);
        } else {
          next.delete(commentId);
        }

        return next;
      });

      setComments((prev) =>
        updateCommentLikes(
          prev,
          commentId,
          isLiked ? 1 : -1
        )
      );
    }
  };

  // ============================================================
  // REPORT
  // ============================================================

  const handleReport = async (commentId: string) => {
    if (!user || !reportReason || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await reportComment(
        user.id,
        commentId,
        reportReason
      );

      setReportingId(null);
      setReportReason('');
      setMenuOpen(null);
    } catch (err) {
      console.error(
        'Failed to report comment:',
        err
      );

      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // START REPLY
  // ============================================================

  const startReply = (commentId: string) => {
    const depth = findCommentDepth(
      comments,
      commentId
    );

    /*
     * Tingkat 3 tidak boleh dibalas.
     */
    if (
      depth === null ||
      depth >= MAX_COMMENT_DEPTH
    ) {
      return;
    }

    setReplyingTo(
      replyingTo === commentId
        ? null
        : commentId
    );

    setReplyContent('');
    setEditingId(null);
    setMenuOpen(null);

    /*
     * Pastikan thread parent terbuka.
     */
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(commentId);
      return next;
    });

    setTimeout(() => {
      replyRef.current?.focus();
    }, 100);
  };

  // ============================================================
  // START EDIT
  // ============================================================

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setReplyingTo(null);
    setMenuOpen(null);
  };

  // ============================================================
  // EXPAND / COLLAPSE
  // ============================================================

  const toggleExpanded = (commentId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);

      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }

      return next;
    });

    /*
     * Saat pertama dibuka,
     * tampilkan 5 reply.
     */
    setVisibleReplies((prev) => {
      if (prev[commentId]) {
        return prev;
      }

      return {
        ...prev,
        [commentId]: PAGE_SIZE,
      };
    });
  };

  // ============================================================
  // SHOW MORE
  // ============================================================

  const showMoreReplies = (
    commentId: string,
    total: number
  ) => {
    setVisibleReplies((prev) => ({
      ...prev,
      [commentId]: Math.min(
        (prev[commentId] || PAGE_SIZE) + PAGE_SIZE,
        total
      ),
    }));
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="mt-8">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="flex items-center gap-2 mb-5">
        <MessageSquare className="h-5 w-5 text-primary-400" />

        <h2 className="text-lg font-semibold text-white">
          {title}
        </h2>

        <span className="text-sm text-muted">
          ({countAllComments(comments)})
        </span>
      </div>

      {/* ====================================================== */}
      {/* COMMENT INPUT */}
      {/* ====================================================== */}

      {user ? (
        <div className="card p-4 mb-5">
          <div className="flex gap-3">

            <Avatar
              name={profile?.username}
            />

            <div className="flex-1">

              <textarea
                ref={inputRef}
                value={newComment}
                onChange={(e) =>
                  setNewComment(e.target.value)
                }
                placeholder={placeholder}
                rows={3}
                className="input resize-none w-full"
                maxLength={1000}
              />

              <div className="flex items-center justify-between mt-2">

                <span className="text-xs text-muted">
                  {newComment.length}/1000
                </span>

                <button
                  onClick={handleSubmit}
                  disabled={
                    !newComment.trim() ||
                    submitting
                  }
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-30"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}

                  <span>Kirim</span>
                </button>

              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-4 mb-5 text-center">
          <p className="text-sm text-muted">
            Masuk untuk berpartisipasi dalam diskusi
          </p>
        </div>
      )}

      {/* ====================================================== */}
      {/* ERROR */}
      {/* ====================================================== */}

      {error && (
        <div className="card p-4 mb-4 text-center">

          <p className="text-sm text-red-400">
            Gagal memuat komentar. Coba lagi.
          </p>

          <button
            onClick={loadComments}
            className="btn-secondary mt-2 text-sm px-4 py-1.5"
          >
            Coba lagi
          </button>

        </div>
      )}

      {/* ====================================================== */}
      {/* LOADING / EMPTY / COMMENTS */}
      {/* ====================================================== */}

      {loading ? (
        <div className="space-y-3">

          {Array.from({ length: 3 }).map(
            (_, i) => (
              <div
                key={i}
                className="card p-4"
              >
                <div className="flex gap-3">

                  <div className="skeleton h-8 w-8 rounded-full flex-shrink-0" />

                  <div className="flex-1 space-y-2">

                    <div className="skeleton h-4 w-24" />

                    <div className="skeleton h-3 w-full" />

                    <div className="skeleton h-3 w-2/3" />

                  </div>
                </div>
              </div>
            )
          )}

        </div>
      ) : comments.length === 0 ? (
        <div className="card p-8 text-center">

          <MessageSquare className="h-8 w-8 text-muted/40 mx-auto mb-3" />

          <p className="text-sm font-medium text-white mb-1">
            {emptyTitle}
          </p>

          <p className="text-xs text-muted">
            {emptyMessage}
          </p>

        </div>
      ) : (
        <div className="space-y-3">

          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={1}
              currentUserId={user?.id}
              isAdmin={profile?.role === 'admin'}
              likedIds={likedIds}
              replyingTo={replyingTo}
              replyContent={replyContent}
              editingId={editingId}
              editContent={editContent}
              menuOpen={menuOpen}
              submitting={submitting}
              replyRef={replyRef}
              expandedIds={expandedIds}
              visibleReplies={visibleReplies}
              onLike={handleLike}
              onReply={startReply}
              onSubmitReply={handleReply}
              onCancelReply={() => {
                setReplyingTo(null);
                setReplyContent('');
              }}
              onEdit={startEdit}
              onSaveEdit={handleEdit}
              onCancelEdit={() => {
                setEditingId(null);
                setEditContent('');
              }}
              onDelete={setConfirmDelete}
              onReport={setReportingId}
              onMenuToggle={(id) =>
                setMenuOpen((current) =>
                  current === id ? null : id
                )
              }
              onReplyContentChange={
                setReplyContent
              }
              onEditContentChange={
                setEditContent
              }
              onToggleExpanded={
                toggleExpanded
              }
              onShowMoreReplies={
                showMoreReplies
              }
            />
          ))}

        </div>
      )}

      {/* ====================================================== */}
      {/* REPORT MODAL */}
      {/* ====================================================== */}

      {reportingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => {
            setReportingId(null);
            setReportReason('');
          }}
        >
          <div
            className="card p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex items-center justify-between mb-4">

              <h3 className="text-lg font-semibold text-white">
                Laporkan Komentar
              </h3>

              <button
                onClick={() => {
                  setReportingId(null);
                  setReportReason('');
                }}
                className="btn-ghost p-1.5"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <p className="text-sm text-muted mb-4">
              Pilih alasan laporan:
            </p>

            <div className="space-y-2 mb-4">

              {REPORT_REASONS.map(
                (reason) => (
                  <button
                    key={reason}
                    onClick={() =>
                      setReportReason(reason)
                    }
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                      reportReason === reason
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-muted hover:bg-white/10'
                    }`}
                  >
                    {reason}
                  </button>
                )
              )}

            </div>

            <div className="flex gap-3">

              <button
                onClick={() => {
                  setReportingId(null);
                  setReportReason('');
                }}
                className="btn-secondary flex-1"
              >
                Batal
              </button>

              <button
                onClick={() =>
                  handleReport(reportingId)
                }
                disabled={
                  !reportReason ||
                  submitting
                }
                className="btn-primary flex-1 disabled:opacity-30"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flag className="h-4 w-4" />
                )}

                <span>Laporkan</span>
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* DELETE MODAL */}
      {/* ====================================================== */}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="card p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >

            <h3 className="text-lg font-semibold text-white mb-2">
              Hapus komentar ini?
            </h3>

            <p className="text-sm text-muted mb-6">
              Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex gap-3">

              <button
                onClick={() =>
                  setConfirmDelete(null)
                }
                className="btn-secondary flex-1"
              >
                Batal
              </button>

              <button
                onClick={() =>
                  handleDelete(confirmDelete)
                }
                disabled={submitting}
                className="btn flex-1 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 text-sm disabled:opacity-30"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}

                <span>Hapus</span>
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// ============================================================
// COMMENT ITEM
// ============================================================

interface CommentItemProps {
  comment: Comment;
  depth: number;

  currentUserId?: string;
  isAdmin: boolean;

  likedIds: Set<string>;

  replyingTo: string | null;
  replyContent: string;

  editingId: string | null;
  editContent: string;

  menuOpen: string | null;
  submitting: boolean;

  replyRef: RefObject<HTMLTextAreaElement>;

  expandedIds: Set<string>;
  visibleReplies: Record<string, number>;

  onLike: (id: string) => void;

  onReply: (id: string) => void;

  onSubmitReply: (
    parentId: string
  ) => void;

  onCancelReply: () => void;

  onEdit: (
    comment: Comment
  ) => void;

  onSaveEdit: (
    id: string
  ) => void;

  onCancelEdit: () => void;

  onDelete: (
    id: string
  ) => void;

  onReport: (
    id: string
  ) => void;

  onMenuToggle: (
    id: string
  ) => void;

  onReplyContentChange: (
    value: string
  ) => void;

  onEditContentChange: (
    value: string
  ) => void;

  onToggleExpanded: (
    id: string
  ) => void;

  onShowMoreReplies: (
    id: string,
    total: number
  ) => void;
}

function CommentItem({
  comment,
  depth,
  currentUserId,
  isAdmin,
  likedIds,
  replyingTo,
  replyContent,
  editingId,
  editContent,
  menuOpen,
  submitting,
  replyRef,
  expandedIds,
  visibleReplies,
  onLike,
  onReply,
  onSubmitReply,
  onCancelReply,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onReport,
  onMenuToggle,
  onReplyContentChange,
  onEditContentChange,
  onToggleExpanded,
  onShowMoreReplies,
}: CommentItemProps) {
  const isOwner =
    currentUserId === comment.user_id;

  const isLiked =
    likedIds.has(comment.id);

  const isReplying =
    replyingTo === comment.id;

  const isEditing =
    editingId === comment.id;

  const replies =
    comment.replies || [];

  const hasReplies =
    replies.length > 0;

  const isExpanded =
    expandedIds.has(comment.id);

  const currentVisibleCount =
    visibleReplies[comment.id] ||
    PAGE_SIZE;

  const displayedReplies =
    replies.slice(
      0,
      currentVisibleCount
    );

  const hasMoreReplies =
    currentVisibleCount <
    replies.length;

  /*
   * Hanya tingkat 1 dan 2
   * yang boleh mempunyai tombol Balas.
   *
   * Tingkat 3 tidak boleh dibalas.
   */
  const canReply =
    Boolean(currentUserId) &&
    depth < MAX_COMMENT_DEPTH;

  return (
    <div
      className={`card p-4 ${
        depth > 1
          ? 'bg-white/[0.015]'
          : ''
      }`}
    >

      <div className="flex gap-3">

        <Avatar
          name={
            comment.profile?.username
          }
        />

        <div className="flex-1 min-w-0">

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div className="flex items-center gap-2 mb-1">

            <span className="text-sm font-medium text-white">
              {comment.profile?.username ||
                'Unknown'}
            </span>

            <span className="text-xs text-muted">
              {formatDate(
                comment.created_at
              )}
            </span>

            {comment.updated_at !==
              comment.created_at && (
              <span className="text-xs text-muted/60">
                (diedit)
              </span>
            )}

          </div>

          {/* ================================================= */}
          {/* CONTENT */}
          {/* ================================================= */}

          {isEditing ? (
            <div className="mb-3">

              <textarea
                value={editContent}
                onChange={(e) =>
                  onEditContentChange(
                    e.target.value
                  )
                }
                rows={3}
                className="input resize-none w-full"
                maxLength={1000}
                autoFocus
              />

              <div className="flex gap-2 mt-2">

                <button
                  onClick={() =>
                    onSaveEdit(
                      comment.id
                    )
                  }
                  disabled={
                    !editContent.trim() ||
                    submitting
                  }
                  className="btn-primary px-3 py-1.5 text-sm disabled:opacity-30"
                >
                  Simpan
                </button>

                <button
                  onClick={onCancelEdit}
                  className="btn-secondary px-3 py-1.5 text-sm"
                >
                  Batal
                </button>

              </div>

            </div>
          ) : (
            <p className="text-sm text-white/90 break-words whitespace-pre-line mb-3">
              {comment.content}
            </p>
          )}

          {/* ================================================= */}
          {/* ACTIONS */}
          {/* ================================================= */}

          {!isEditing && (
            <div className="flex items-center gap-1 flex-wrap">

              {/* LIKE */}

              <button
                onClick={() =>
                  onLike(comment.id)
                }
                disabled={!currentUserId}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors min-h-[36px] ${
                  isLiked
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-muted hover:text-white hover:bg-white/5'
                } disabled:opacity-30`}
              >
                <Heart
                  className={`h-4 w-4 ${
                    isLiked
                      ? 'fill-red-400'
                      : ''
                  }`}
                />

                <span>
                  {comment.likes}
                </span>
              </button>

              {/* BALAS */}

              {canReply && (
                <button
                  onClick={() =>
                    onReply(comment.id)
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-white hover:bg-white/5 transition-colors min-h-[36px]"
                >
                  <Reply className="h-4 w-4" />

                  <span>Balas</span>
                </button>
              )}

              {/* MENU */}

              {currentUserId && (
                <div className="relative ml-auto">

                  <button
                    onClick={(e) => {
                      e.stopPropagation();

                      onMenuToggle(
                        comment.id
                      );
                    }}
                    className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {menuOpen ===
                    comment.id && (
                    <div
                      className="absolute right-0 top-full mt-1 z-20 card p-1 min-w-[140px] shadow-xl"
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >

                      {/* EDIT */}

                      {isOwner && (
                        <button
                          onClick={() =>
                            onEdit(
                              comment
                            )
                          }
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white hover:bg-white/5 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      )}

                      {/* DELETE */}

                      {(isOwner ||
                        isAdmin) && (
                        <button
                          onClick={() =>
                            onDelete(
                              comment.id
                            )
                          }
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </button>
                      )}

                      {/* REPORT */}

                      {!isOwner && (
                        <button
                          onClick={() =>
                            onReport(
                              comment.id
                            )
                          }
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                        >
                          <Flag className="h-3.5 w-3.5" />
                          Laporkan
                        </button>
                      )}

                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* ================================================= */}
          {/* REPLY INPUT */}
          {/* ================================================= */}

          {isReplying && canReply && (
            <div className="mt-3 pl-3 border-l-2 border-white/10">

              <div className="flex gap-2">

                <CornerDownRight className="h-4 w-4 text-muted flex-shrink-0 mt-2" />

                <div className="flex-1">

                  <textarea
                    ref={replyRef}
                    value={replyContent}
                    onChange={(e) =>
                      onReplyContentChange(
                        e.target.value
                      )
                    }
                    placeholder="Tulis balasan..."
                    rows={2}
                    className="input resize-none w-full text-sm"
                    maxLength={1000}
                  />

                  <div className="flex gap-2 mt-2">

                    <button
                      onClick={() =>
                        onSubmitReply(
                          comment.id
                        )
                      }
                      disabled={
                        !replyContent.trim() ||
                        submitting
                      }
                      className="btn-primary px-3 py-1.5 text-sm disabled:opacity-30"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}

                      <span>Kirim</span>
                    </button>

                    <button
                      onClick={onCancelReply}
                      className="btn-secondary px-3 py-1.5 text-sm"
                    >
                      Batal
                    </button>

                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* REPLIES */}
          {/* ================================================= */}

          {hasReplies && (
            <div className="mt-3">

              {/* ================================================= */}
              {/* COLLAPSED */}
              {/* ================================================= */}

              {!isExpanded ? (
                <button
                  onClick={() =>
                    onToggleExpanded(
                      comment.id
                    )
                  }
                  className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Lihat {replies.length}{' '}
                  {replies.length === 1
                    ? 'balasan'
                    : 'balasan'}
                </button>
              ) : (
                <>
                  {/* ================================================= */}
                  {/* REPLY LIST */}
                  {/* ================================================= */}

                  <div className="pl-3 border-l-2 border-white/10 space-y-3">

                    {displayedReplies.map(
                      (reply) => (
                        <CommentItem
                          key={reply.id}
                          comment={reply}
                          depth={
                            depth + 1
                          }
                          currentUserId={
                            currentUserId
                          }
                          isAdmin={
                            isAdmin
                          }
                          likedIds={
                            likedIds
                          }
                          replyingTo={
                            replyingTo
                          }
                          replyContent={
                            replyContent
                          }
                          editingId={
                            editingId
                          }
                          editContent={
                            editContent
                          }
                          menuOpen={
                            menuOpen
                          }
                          submitting={
                            submitting
                          }
                          replyRef={
                            replyRef
                          }
                          expandedIds={
                            expandedIds
                          }
                          visibleReplies={
                            visibleReplies
                          }
                          onLike={
                            onLike
                          }
                          onReply={
                            onReply
                          }
                          onSubmitReply={
                            onSubmitReply
                          }
                          onCancelReply={
                            onCancelReply
                          }
                          onEdit={
                            onEdit
                          }
                          onSaveEdit={
                            onSaveEdit
                          }
                          onCancelEdit={
                            onCancelEdit
                          }
                          onDelete={
                            onDelete
                          }
                          onReport={
                            onReport
                          }
                          onMenuToggle={
                            onMenuToggle
                          }
                          onReplyContentChange={
                            onReplyContentChange
                          }
                          onEditContentChange={
                            onEditContentChange
                          }
                          onToggleExpanded={
                            onToggleExpanded
                          }
                          onShowMoreReplies={
                            onShowMoreReplies
                          }
                        />
                      )
                    )}

                  </div>

                  {/* ================================================= */}
                  {/* LOAD MORE / HIDE */}
                  {/* ================================================= */}

                  <div className="pl-3 mt-2">

                    {hasMoreReplies && (
                      <button
                        onClick={() =>
                          onShowMoreReplies(
                            comment.id,
                            replies.length
                          )
                        }
                        className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        Lihat balasan lainnya
                      </button>
                    )}

                    {!hasMoreReplies && (
                      <button
                        onClick={() =>
                          onToggleExpanded(
                            comment.id
                          )
                        }
                        className="text-sm text-muted hover:text-white transition-colors"
                      >
                        Sembunyikan balasan
                      </button>
                    )}

                  </div>
                </>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ============================================================
// AVATAR
// ============================================================

function Avatar({
  name,
  size = 'md',
}: {
  name?: string;
  size?: 'sm' | 'md';
}) {
  const dimensions =
    size === 'sm'
      ? 'h-6 w-6 text-[10px]'
      : 'h-8 w-8 text-xs';

  return (
    <div
      className={`${dimensions} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white flex-shrink-0`}
    >
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

// ============================================================
// BUILD THREAD
// ============================================================

/*
 * Membentuk struktur maksimal 3 tingkat:
 *
 * Komentar utama
 * └── Balasan
 *     └── Balasan dari balasan
 *
 * Tidak ada tingkat 4.
 */
function buildThread(
  comments: Comment[]
): Comment[] {
  const commentMap = new Map<string, Comment>();
  const topLevel: Comment[] = [];

  /*
   * Copy komentar agar tidak memodifikasi
   * array dari service secara langsung.
   */
  for (const comment of comments) {
    commentMap.set(
      comment.id,
      {
        ...comment,
        replies: [],
      }
    );
  }

  /*
   * Cache kedalaman.
   */
  const depthCache = new Map<string, number>();

  const getDepth = (
    commentId: string,
    visited = new Set<string>()
  ): number => {
    const cached =
      depthCache.get(commentId);

    if (cached !== undefined) {
      return cached;
    }

    /*
     * Perlindungan dari parent_id yang
     * membentuk siklus.
     */
    if (visited.has(commentId)) {
      return 1;
    }

    const comment =
      commentMap.get(commentId);

    if (!comment || !comment.parent_id) {
      depthCache.set(commentId, 1);
      return 1;
    }

    const parent =
      commentMap.get(comment.parent_id);

    if (!parent) {
      depthCache.set(commentId, 1);
      return 1;
    }

    const nextVisited =
      new Set(visited);

    nextVisited.add(commentId);

    const parentDepth =
      getDepth(
        parent.id,
        nextVisited
      );

    const depth =
      parentDepth + 1;

    depthCache.set(
      commentId,
      depth
    );

    return depth;
  };

  /*
   * Masukkan komentar ke parent.
   */
  for (const original of comments) {
    const comment =
      commentMap.get(
        original.id
      );

    if (!comment) {
      continue;
    }

    const depth =
      getDepth(original.id);

    /*
     * Komentar utama.
     */
    if (
      !original.parent_id ||
      depth === 1
    ) {
      topLevel.push(comment);
      continue;
    }

    /*
     * Tingkat 4 ke atas tidak dimasukkan.
     */
    if (depth > MAX_COMMENT_DEPTH) {
      continue;
    }

    const parent =
      commentMap.get(
        original.parent_id
      );

    if (!parent) {
      continue;
    }

    if (!parent.replies) {
      parent.replies = [];
    }

    parent.replies.push(comment);
  }

  /*
   * Sort reply lama -> baru.
   */
  const sortReplies = (
    list: Comment[]
  ) => {
    list.sort(
      (a, b) =>
        new Date(
          a.created_at
        ).getTime() -
        new Date(
          b.created_at
        ).getTime()
    );

    for (const item of list) {
      if (
        item.replies &&
        item.replies.length > 0
      ) {
        sortReplies(
          item.replies
        );
      }
    }
  };

  sortReplies(topLevel);

  /*
   * Komentar utama terbaru berada di atas.
   */
  topLevel.sort(
    (a, b) =>
      new Date(
        b.created_at
      ).getTime() -
      new Date(
        a.created_at
      ).getTime()
  );

  return topLevel;
}

// ============================================================
// FIND DEPTH
// ============================================================

function findCommentDepth(
  comments: Comment[],
  commentId: string
): number | null {
  const search = (
    list: Comment[],
    depth: number
  ): number | null => {
    for (const comment of list) {
      if (comment.id === commentId) {
        return depth;
      }

      if (
        comment.replies &&
        comment.replies.length > 0
      ) {
        const result = search(
          comment.replies,
          depth + 1
        );

        if (result !== null) {
          return result;
        }
      }
    }

    return null;
  };

  return search(comments, 1);
}

// ============================================================
// COLLECT COMMENT IDS
// ============================================================

function collectAllCommentIds(
  comments: Comment[]
): string[] {
  const ids: string[] = [];

  const walk = (
    list: Comment[]
  ) => {
    for (const comment of list) {
      ids.push(comment.id);

      if (
        comment.replies &&
        comment.replies.length > 0
      ) {
        walk(comment.replies);
      }
    }
  };

  walk(comments);

  return ids;
}

// ============================================================
// UPDATE LIKE
// ============================================================

function updateCommentLikes(
  comments: Comment[],
  commentId: string,
  change: number
): Comment[] {
  return comments.map(
    (comment) => {
      if (
        comment.id === commentId
      ) {
        return {
          ...comment,
          likes: Math.max(
            0,
            comment.likes + change
          ),
        };
      }

      if (
        comment.replies &&
        comment.replies.length > 0
      ) {
        return {
          ...comment,
          replies:
            updateCommentLikes(
              comment.replies,
              commentId,
              change
            ),
        };
      }

      return comment;
    }
  );
}

// ============================================================
// COUNT COMMENTS
// ============================================================

function countAllComments(
  comments: Comment[]
): number {
  let count = 0;

  const walk = (
    list: Comment[]
  ) => {
    for (const comment of list) {
      count++;

      if (
        comment.replies &&
        comment.replies.length > 0
      ) {
        walk(comment.replies);
      }
    }
  };

  walk(comments);

  return count;
}