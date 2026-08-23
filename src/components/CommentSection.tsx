import { useEffect, useState, useCallback, useRef } from 'react';
import {
  MessageSquare, Heart, Reply, Edit2, Trash2, Flag, X,
  Send, Loader2, MoreHorizontal, CornerDownRight
} from 'lucide-react';
import type { Comment } from '@/types';
import {
  fetchNovelComments, fetchChapterComments,
  addComment, updateComment, deleteComment,
  toggleCommentLike, reportComment, fetchLikedCommentIds,
} from '@/lib/services';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';

interface CommentSectionProps {
  novelId: string;
  chapterId: string | null;
  title: string;
  placeholder: string;
  emptyTitle: string;
  emptyMessage: string;
}

const PAGE_SIZE = 10;
const REPORT_REASONS = [
  'Spam',
  'Bahasa kasar',
  'SARA',
  'Spoiler berlebihan',
  'Harassment',
];

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
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = chapterId === null
        ? await fetchNovelComments(novelId)
        : await fetchChapterComments(novelId, chapterId);

      if (user && data.length > 0) {
        const allIds = collectAllCommentIds(data);
        const liked = await fetchLikedCommentIds(user.id, allIds);
        setLikedIds(liked);
      } else {
        setLikedIds(new Set());
      }
      setComments(buildThread(data));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [novelId, chapterId, user]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [novelId, chapterId]);

  useEffect(() => {
    const handler = () => setMenuOpen(null);
    if (menuOpen) {
      window.addEventListener('click', handler);
      return () => window.removeEventListener('click', handler);
    }
  }, [menuOpen]);

  const handleSubmit = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || !user || submitting) return;
    setSubmitting(true);
    try {
      await addComment(user.id, novelId, chapterId, trimmed);
      setNewComment('');
      await loadComments();
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    const trimmed = replyContent.trim();
    if (!trimmed || !user || submitting) return;
    setSubmitting(true);
    try {
      await addComment(user.id, novelId, chapterId, trimmed, parentId);
      setReplyContent('');
      setReplyingTo(null);
      await loadComments();
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await updateComment(commentId, trimmed);
      setEditingId(null);
      setEditContent('');
      await loadComments();
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setSubmitting(true);
    try {
      await deleteComment(commentId);
      setConfirmDelete(null);
      await loadComments();
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) return;
    const isLiked = likedIds.has(commentId);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, likes: isLiked ? c.likes - 1 : c.likes + 1 }
          : {
              ...c,
              replies: c.replies?.map((r) =>
                r.id === commentId
                  ? { ...r, likes: isLiked ? r.likes - 1 : r.likes + 1 }
                  : r
              ),
            }
      )
    );
    try {
      await toggleCommentLike(user.id, commentId);
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(commentId);
        else next.delete(commentId);
        return next;
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, likes: isLiked ? c.likes + 1 : c.likes - 1 }
            : {
                ...c,
                replies: c.replies?.map((r) =>
                  r.id === commentId
                    ? { ...r, likes: isLiked ? r.likes + 1 : r.likes - 1 }
                    : r
                ),
              }
        )
      );
    }
  };

  const handleReport = async (commentId: string) => {
    if (!user || !reportReason) return;
    setSubmitting(true);
    try {
      await reportComment(user.id, commentId, reportReason);
      setReportingId(null);
      setReportReason('');
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const startReply = (commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
    setReplyContent('');
    setEditingId(null);
    setTimeout(() => replyRef.current?.focus(), 100);
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setReplyingTo(null);
    setMenuOpen(null);
  };

  const visibleComments = comments.slice(0, visibleCount);
  const hasMore = visibleCount < comments.length;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-5">
        <MessageSquare className="h-5 w-5 text-primary-400" />
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="text-sm text-muted">({comments.length})</span>
      </div>

      {/* Comment Input */}
      {user ? (
        <div className="card p-4 mb-5">
          <div className="flex gap-3">
            <Avatar name={profile?.username} />
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="input resize-none w-full"
                maxLength={1000}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted">{newComment.length}/1000</span>
                <button
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || submitting}
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-30"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>Kirim</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-4 mb-5 text-center">
          <p className="text-sm text-muted">Masuk untuk berpartisipasi dalam diskusi</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card p-4 mb-4 text-center">
          <p className="text-sm text-red-400">Gagal memuat komentar. Coba lagi.</p>
          <button onClick={loadComments} className="btn-secondary mt-2 text-sm px-4 py-1.5">Coba lagi</button>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="flex gap-3">
                <div className="skeleton h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="card p-8 text-center">
          <MessageSquare className="h-8 w-8 text-muted/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-white mb-1">{emptyTitle}</p>
          <p className="text-xs text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {visibleComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={user?.id}
                isAdmin={profile?.role === 'admin'}
                likedIds={likedIds}
                replyingTo={replyingTo}
                replyContent={replyContent}
                editingId={editingId}
                editContent={editContent}
                menuOpen={menuOpen}
                submitting={submitting}
                reportReasons={REPORT_REASONS}
                replyRef={replyRef}
                onLike={handleLike}
                onReply={startReply}
                onSubmitReply={handleReply}
                onCancelReply={() => { setReplyingTo(null); setReplyContent(''); }}
                onEdit={startEdit}
                onSaveEdit={handleEdit}
                onCancelEdit={() => { setEditingId(null); setEditContent(''); }}
                onDelete={setConfirmDelete}
                onReport={setReportingId}
                onMenuToggle={(id) => setMenuOpen(menuOpen === id ? null : id)}
                onReplyContentChange={setReplyContent}
                onEditContentChange={setEditContent}
              />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-4">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="btn-secondary px-6 py-2 text-sm"
              >
                Muat lebih banyak ({comments.length - visibleCount} lagi)
              </button>
            </div>
          )}
        </>
      )}

      {/* Report Modal */}
      {reportingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setReportingId(null)}>
          <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Laporkan Komentar</h3>
              <button onClick={() => setReportingId(null)} className="btn-ghost p-1.5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted mb-4">Pilih alasan laporan:</p>
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    reportReason === reason
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-muted hover:bg-white/10'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReportingId(null)} className="btn-secondary flex-1">Batal</button>
              <button
                onClick={() => handleReport(reportingId)}
                disabled={!reportReason || submitting}
                className="btn-primary flex-1 disabled:opacity-30"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                <span>Laporkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
          <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Hapus komentar ini?</h3>
            <p className="text-sm text-muted mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Batal</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={submitting}
                className="btn flex-1 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 text-sm disabled:opacity-30"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Sub Components ----

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  isAdmin: boolean;
  likedIds: Set<string>;
  replyingTo: string | null;
  replyContent: string;
  editingId: string | null;
  editContent: string;
  menuOpen: string | null;
  submitting: boolean;
  reportReasons: string[];
  replyRef: React.RefObject<HTMLTextAreaElement>;
  onLike: (id: string) => void;
  onReply: (id: string) => void;
  onSubmitReply: (parentId: string) => void;
  onCancelReply: () => void;
  onEdit: (comment: Comment) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
  onMenuToggle: (id: string) => void;
  onReplyContentChange: (v: string) => void;
  onEditContentChange: (v: string) => void;
}

function CommentItem({
  comment,
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
}: CommentItemProps) {
  const isOwner = currentUserId === comment.user_id;
  const isLiked = likedIds.has(comment.id);
  const isReplying = replyingTo === comment.id;
  const isEditing = editingId === comment.id;

  return (
    <div className="card p-4">
      <div className="flex gap-3">
        <Avatar name={comment.profile?.username} />
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">{comment.profile?.username || 'Unknown'}</span>
            <span className="text-xs text-muted">{formatDate(comment.created_at)}</span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-xs text-muted/60">(diedit)</span>
            )}
          </div>

          {/* Content or Edit Mode */}
          {isEditing ? (
            <div className="mb-3">
              <textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                rows={3}
                className="input resize-none w-full"
                maxLength={1000}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onSaveEdit(comment.id)}
                  disabled={!editContent.trim() || submitting}
                  className="btn-primary px-3 py-1.5 text-sm disabled:opacity-30"
                >
                  Simpan
                </button>
                <button onClick={onCancelEdit} className="btn-secondary px-3 py-1.5 text-sm">
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/90 break-words whitespace-pre-line mb-3">{comment.content}</p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => onLike(comment.id)}
                disabled={!currentUserId}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors min-h-[36px] ${
                  isLiked
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-muted hover:text-white hover:bg-white/5'
                } disabled:opacity-30`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-400' : ''}`} />
                <span>{comment.likes}</span>
              </button>

              {currentUserId && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-white hover:bg-white/5 transition-colors min-h-[36px]"
                >
                  <Reply className="h-4 w-4" />
                  <span className="hidden sm:inline">Balas</span>
                </button>
              )}

              {/* Menu */}
              {(isOwner || isAdmin || currentUserId) && (
                <div className="relative ml-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); onMenuToggle(comment.id); }}
                    className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuOpen === comment.id && (
                    <div
                      className="absolute right-0 top-full mt-1 z-20 card p-1 min-w-[140px] shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isOwner && (
                        <button
                          onClick={() => onEdit(comment)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white hover:bg-white/5 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      )}
                      {(isOwner || isAdmin) && (
                        <button
                          onClick={() => onDelete(comment.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </button>
                      )}
                      {!isOwner && currentUserId && (
                        <button
                          onClick={() => onReport(comment.id)}
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

          {/* Reply Input */}
          {isReplying && currentUserId && (
            <div className="mt-3 pl-3 border-l-2 border-white/10">
              <div className="flex gap-2">
                <CornerDownRight className="h-4 w-4 text-muted flex-shrink-0 mt-2" />
                <div className="flex-1">
                  <textarea
                    ref={replyRef}
                    value={replyContent}
                    onChange={(e) => onReplyContentChange(e.target.value)}
                    placeholder="Tulis balasan..."
                    rows={2}
                    className="input resize-none w-full text-sm"
                    maxLength={1000}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => onSubmitReply(comment.id)}
                      disabled={!replyContent.trim() || submitting}
                      className="btn-primary px-3 py-1.5 text-sm disabled:opacity-30"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      <span>Kirim</span>
                    </button>
                    <button onClick={onCancelReply} className="btn-secondary px-3 py-1.5 text-sm">
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 pl-3 border-l-2 border-white/10 space-y-3">
              {comment.replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  likedIds={likedIds}
                  isLiked={likedIds.has(reply.id)}
                  onLike={onLike}
                  onDelete={onDelete}
                  onReport={onReport}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReplyItemProps {
  reply: Comment;
  currentUserId?: string;
  isAdmin: boolean;
  likedIds: Set<string>;
  isLiked: boolean;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
}

function ReplyItem({
  reply,
  currentUserId,
  isAdmin,
  isLiked,
  onLike,
  onDelete,
  onReport,
}: ReplyItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwner = currentUserId === reply.user_id;

  return (
    <div className="flex gap-2">
      <Avatar name={reply.profile?.username} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">{reply.profile?.username || 'Unknown'}</span>
          <span className="text-xs text-muted">{formatDate(reply.created_at)}</span>
          {reply.updated_at !== reply.created_at && (
            <span className="text-xs text-muted/60">(diedit)</span>
          )}
        </div>
        <p className="text-sm text-white/90 break-words whitespace-pre-line mb-2">{reply.content}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onLike(reply.id)}
            disabled={!currentUserId}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors min-h-[32px] ${
              isLiked
                ? 'text-red-400 bg-red-500/10'
                : 'text-muted hover:text-white hover:bg-white/5'
            } disabled:opacity-30`}
          >
            <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-red-400' : ''}`} />
            <span>{reply.likes}</span>
          </button>

          {(isOwner || isAdmin || currentUserId) && (
            <div className="relative ml-auto">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-20 card p-1 min-w-[140px] shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(isOwner || isAdmin) && (
                    <button
                      onClick={() => { onDelete(reply.id); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  )}
                  {!isOwner && currentUserId && (
                    <button
                      onClick={() => { onReport(reply.id); setMenuOpen(false); }}
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
      </div>
    </div>
  );
}

// ---- Helpers ----

function Avatar({ name, size = 'md' }: { name?: string; size?: 'sm' | 'md' }) {
  const dimensions = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  return (
    <div className={`${dimensions} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function collectAllCommentIds(comments: Comment[]): string[] {
  const ids: string[] = [];
  for (const c of comments) {
    ids.push(c.id);
    if (c.replies) {
      for (const r of c.replies) ids.push(r.id);
    }
  }
  return ids;
}

function buildThread(comments: Comment[]): Comment[] {
  const topLevel: Comment[] = [];
  const repliesMap: Record<string, Comment[]> = {};

  for (const c of comments) {
    if (c.parent_id) {
      if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
      repliesMap[c.parent_id].push(c);
    } else {
      topLevel.push(c);
    }
  }

  return topLevel.map((c) => ({
    ...c,
    replies: (repliesMap[c.id] || []).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  }));
}
