import { useEffect, useState, useCallback } from 'react';
import { Trash2, MessageSquare } from 'lucide-react';
import type { Comment } from '@/types';
import { adminFetchAllComments, adminDeleteComment } from '@/lib/services';
import { formatDate } from '@/lib/utils';

export default function AdminComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetchAllComments();
      setComments(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    await adminDeleteComment(id);
    setConfirmDelete(null);
    loadData();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Manajemen Komentar</h1>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}
        </div>
      ) : comments.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="h-10 w-10 text-muted/50 mx-auto mb-3" />
          <p className="text-sm text-muted">Belum ada komentar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => (
            <div key={comment.id} className="card p-4 flex gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {comment.profile?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">{comment.profile?.username || 'Unknown'}</span>
                  <span className="text-xs text-muted">{formatDate(comment.created_at)}</span>
                </div>
                <p className="text-sm text-muted line-clamp-2">{comment.content}</p>
              </div>
              <button onClick={() => setConfirmDelete(comment.id)} className="btn-ghost p-2 text-red-400 flex-shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
          <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Hapus komentar ini?</h3>
            <p className="text-sm text-muted mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={() => handleDelete(confirmDelete)} className="btn flex-1 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 text-sm">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
