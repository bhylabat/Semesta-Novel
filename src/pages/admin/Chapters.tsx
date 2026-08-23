import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, X, Loader2, BookOpen } from 'lucide-react';
import type { Novel, Chapter } from '@/types';
import { fetchNovels, fetchChapters, fetchLatestChapters, adminCreateChapter, adminUpdateChapter, adminDeleteChapter } from '@/lib/services';
import { formatDate } from '@/lib/utils';

export default function AdminChapters() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selectedNovel, setSelectedNovel] = useState<string>('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ novel_id: '', chapter_number: 1, title: '', content: '' });
  const [saving, setSaving] = useState(false);

  const loadNovels = useCallback(async () => {
    const { data } = await fetchNovels({ limit: 100, sort: 'az' });
    setNovels(data);
    if (data.length > 0 && !selectedNovel) {
      setSelectedNovel(data[0].id);
    }
  }, []);

  const loadChapters = useCallback(async () => {
    if (!selectedNovel) return;
    setLoading(true);
    const { data } = await fetchChapters(selectedNovel, { limit: 100, order: 'desc' });
    setChapters(data);
    setLoading(false);
  }, [selectedNovel]);

  useEffect(() => {
    loadNovels();
  }, [loadNovels]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  const openCreate = async () => {
    if (!selectedNovel) return;
    const latest = await fetchLatestChapters(selectedNovel, 1);
    const nextNum = latest.length > 0 ? latest[0].chapter_number + 1 : 1;
    setEditing(null);
    setForm({ novel_id: selectedNovel, chapter_number: nextNum, title: '', content: '' });
    setShowForm(true);
  };

  const openEdit = (chapter: Chapter) => {
    setEditing(chapter);
    setForm({ novel_id: chapter.novel_id, chapter_number: chapter.chapter_number, title: chapter.title, content: chapter.content });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await adminUpdateChapter(editing.id, { chapter_number: form.chapter_number, title: form.title, content: form.content });
      } else {
        await adminCreateChapter({ novel_id: form.novel_id, chapter_number: form.chapter_number, title: form.title, content: form.content });
      }
      setShowForm(false);
      loadChapters();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await adminDeleteChapter(id);
    setConfirmDelete(null);
    loadChapters();
  };

  const filtered = chapters.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) || String(c.chapter_number).includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Manajemen Bab</h1>
        <button onClick={openCreate} disabled={!selectedNovel} className="btn-primary disabled:opacity-30">
          <Plus className="h-4 w-4" />
          Tambah Bab
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select value={selectedNovel} onChange={(e) => setSelectedNovel(e.target.value)} className="input flex-1">
          <option value="">Pilih Novel...</option>
          {novels.map((n) => (
            <option key={n.id} value={n.id}>{n.title}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari bab..." className="input pl-9 w-full" />
        </div>
      </div>

      {!selectedNovel ? (
        <div className="card p-12 text-center">
          <BookOpen className="h-10 w-10 text-muted/50 mx-auto mb-3" />
          <p className="text-sm text-muted">Pilih novel untuk melihat daftar bab</p>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-muted">Belum ada bab untuk novel ini</p>
        </div>
      ) : (
        <div className="card divide-y divide-white/5">
          {filtered.map((chapter) => (
            <div key={chapter.id} className="flex items-center gap-3 p-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary-300">{chapter.chapter_number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white truncate">Bab {chapter.chapter_number}: {chapter.title}</h3>
                <p className="text-xs text-muted">{formatDate(chapter.created_at)}</p>
              </div>
              <button onClick={() => openEdit(chapter)} className="btn-ghost p-2"><Edit className="h-4 w-4" /></button>
              <button onClick={() => setConfirmDelete(chapter.id)} className="btn-ghost p-2 text-red-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="card p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{editing ? 'Edit Bab' : 'Tambah Bab'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-white mb-1 block">Novel</label>
                  <select value={form.novel_id} onChange={(e) => setForm({ ...form, novel_id: e.target.value })} className="input w-full" disabled={Boolean(editing)}>
                    {novels.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-white mb-1 block">Nomor Bab</label>
                  <input type="number" min="1" value={form.chapter_number} onChange={(e) => setForm({ ...form, chapter_number: parseInt(e.target.value) })} className="input w-full" required />
                </div>
              </div>
              <div>
                <label className="text-sm text-white mb-1 block">Judul Bab</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input w-full" required />
              </div>
              <div>
                <label className="text-sm text-white mb-1 block">Isi Bab</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input w-full min-h-[300px] font-serif" required />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Bab'}
              </button>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
          <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Hapus bab ini?</h3>
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
