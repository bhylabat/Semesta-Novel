import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Type, Globe, Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getReaderSettings, saveReaderSettings } from '@/lib/guest';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [readerSettings, setReaderSettings] = useState(getReaderSettings());

  const updateReader = (partial: Partial<typeof readerSettings>) => {
    const newSettings = { ...readerSettings, ...partial };
    setReaderSettings(newSettings);
    saveReaderSettings(newSettings);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">Pengaturan</h1>

      {/* Reader Settings */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Type className="h-5 w-5 text-primary-400" />
          Pengaturan Reader
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-white mb-2 block">Tema Reader</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'dark', label: 'Gelap' },
                { value: 'black', label: 'Hitam' },
                { value: 'sepia', label: 'Sepia' },
                { value: 'light', label: 'Terang' },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => updateReader({ theme: t.value as any })}
                  className={`py-2 rounded-lg text-sm transition-colors ${
                    readerSettings.theme === t.value ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-white mb-2 block">Jenis Font</label>
            <div className="flex gap-2">
              <button
                onClick={() => updateReader({ fontFamily: 'sans' })}
                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                  readerSettings.fontFamily === 'sans' ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'
                }`}
              >
                Sans Serif
              </button>
              <button
                onClick={() => updateReader({ fontFamily: 'serif' })}
                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                  readerSettings.fontFamily === 'serif' ? 'bg-primary text-white' : 'bg-white/5 text-muted hover:bg-white/10'
                }`}
              >
                Serif
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* App Settings */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Preferensi Aplikasi</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted" />
              <span className="text-sm text-white">Notifikasi</span>
            </div>
            <button className="relative w-11 h-6 rounded-full bg-primary">
              <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted" />
              <span className="text-sm text-white">Bahasa</span>
            </div>
            <span className="text-sm text-muted">Indonesia</span>
          </div>
        </div>
      </div>

      {!user && (
        <div className="card p-6 text-center">
          <p className="text-sm text-muted mb-4">Masuk untuk menyinkronkan pengaturan dan data kamu di semua perangkat.</p>
          <button onClick={() => navigate('/login')} className="btn-primary w-full">Masuk</button>
        </div>
      )}
    </div>
  );
}
