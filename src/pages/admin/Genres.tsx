import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Tag, X, Loader2 } from 'lucide-react';
import type { Genre } from '@/types';
import { fetchGenres } from '@/lib/services';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/utils';

export default function AdminGenres() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', icon: '' });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGenres();
      setGenres(data);
    } catch (error) {
      console.error('Failed to load genres:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await supabase.from('genres').insert({ name: form.name, slug: form.slug || slugify(form.name), icon: form.icon || null });
      setShowForm(false);
      setForm({ name: '', slug: '', icon: '' });
      loadData();
    } catch (error) {
      console.error('Failed to save genre:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('genres').delete().eq('id', id);
    setConfirmDelete(null);
    loadData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Manajemen Genre</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Tambah Genre
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {genres.map((genre) => (
            <div key={genre.id} className="card p-4 flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Tag className="h-5 w-5 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{genre.name}</p>
                <p className="text-xs text-muted truncate">{genre.slug}</p>
              </div>
              <button onClick={() => setConfirmDelete(genre.id)} className="btn-ghost p-1.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Tambah Genre</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-white mb-1 block">Nama</label>
                <input type="text" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) }); }} className="input w-full" required />
              </div>
              <div>
                <label className="text-sm text-white mb-1 block">Slug</label>
                <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input w-full" required />
              </div>
              <div>
                <label className="text-sm text-white mb-1 block">Icon (Lucide name)</label>
                <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="BookOpen" className="input w-full" />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
          <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Hapus genre ini?</h3>
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
