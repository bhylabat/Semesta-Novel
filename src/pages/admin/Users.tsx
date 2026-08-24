import { useEffect, useState, useCallback } from 'react';
import { Search, Shield, User, Edit, X } from 'lucide-react';
import type { Profile, UserRole } from '@/types';
import { adminFetchAllProfiles, adminUpdateProfileRole } from '@/lib/services';
import { formatDate } from '@/lib/utils';

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('reader');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetchAllProfiles();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRoleChange = async () => {
    if (!editing) return;
    await adminUpdateProfileRole(editing.id, newRole);
    setEditing(null);
    loadData();
  };

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500/20 text-red-400',
      author: 'bg-blue-500/20 text-blue-400',
      reader: 'bg-green-500/20 text-green-400',
    };
    return colors[role] || colors.reader;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Manajemen User</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari user..." className="input pl-9 w-full" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="card divide-y divide-white/5">
          {filtered.map((user) => (
            <div key={user.id} className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {user.username[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white truncate">{user.username}</h3>
                <p className="text-xs text-muted truncate">{user.email} · {formatDate(user.created_at)}</p>
              </div>
              <span className={`badge ${roleBadge(user.role)} capitalize`}>{user.role}</span>
              <button onClick={() => { setEditing(user); setNewRole(user.role); }} className="btn-ghost p-2"><Edit className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditing(null)}>
          <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Ubah Role User</h2>
              <button onClick={() => setEditing(null)} className="btn-ghost p-2"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white">
                {editing.username[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{editing.username}</p>
                <p className="text-xs text-muted">{editing.email}</p>
              </div>
            </div>
            <div className="space-y-2 mb-6">
              {(['reader', 'author', 'admin'] as UserRole[]).map((role) => (
                <button key={role} onClick={() => setNewRole(role)} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-colors ${newRole === role ? 'bg-primary/20 text-primary-300' : 'bg-white/5 text-muted hover:bg-white/10'}`}>
                  {role === 'admin' ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  <span className="text-sm capitalize">{role}</span>
                </button>
              ))}
            </div>
            <button onClick={handleRoleChange} className="btn-primary w-full">Simpan</button>
          </div>
        </div>
      )}
    </div>
  );
}
