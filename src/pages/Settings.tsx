import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Type, Globe, Bell } from "lucide-react";
import type { ReaderTheme } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { getReaderSettings, saveReaderSettings } from "@/lib/guest";

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [readerSettings, setReaderSettings] = useState(() =>
    getReaderSettings(),
  );

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    () => {
      try {
        return localStorage.getItem("semesta_novel_notifications") !== "false";
      } catch {
        return true;
      }
    },
  );

  const updateReader = (partial: Partial<typeof readerSettings>) => {
    const newSettings = {
      ...readerSettings,
      ...partial,
    };

    setReaderSettings(newSettings);
    saveReaderSettings(newSettings);
  };

  const toggleNotifications = () => {
    const newValue = !notificationsEnabled;

    setNotificationsEnabled(newValue);

    try {
      localStorage.setItem("semesta_novel_notifications", String(newValue));
    } catch {
      // Abaikan jika localStorage tidak tersedia.
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">
        Pengaturan
      </h1>

      {/* =========================
          READER SETTINGS
      ========================== */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Type className="h-5 w-5 text-primary-400" />
          Pengaturan Reader
        </h2>

        <div className="space-y-4">
          {/* Tema Reader */}
          <div>
            <label className="text-sm text-white mb-2 block">Tema Reader</label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: "dark", label: "Gelap" },
                { value: "black", label: "Hitam" },
                { value: "sepia", label: "Sepia" },
                { value: "light", label: "Terang" },
              ].map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() =>
                    updateReader({
                      theme: theme.value as ReaderTheme,
                    })
                  }
                  className={`py-2.5 rounded-lg text-sm transition-colors ${
                    readerSettings.theme === theme.value
                      ? "bg-primary text-white"
                      : "bg-white/5 text-muted hover:bg-white/10"
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jenis Font */}
          <div>
            <label className="text-sm text-white mb-2 block">Jenis Font</label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  updateReader({
                    fontFamily: "sans",
                  })
                }
                className={`flex-1 py-2.5 rounded-lg text-sm transition-colors ${
                  readerSettings.fontFamily === "sans"
                    ? "bg-primary text-white"
                    : "bg-white/5 text-muted hover:bg-white/10"
                }`}
              >
                Sans Serif
              </button>

              <button
                type="button"
                onClick={() =>
                  updateReader({
                    fontFamily: "serif",
                  })
                }
                className={`flex-1 py-2.5 rounded-lg text-sm transition-colors ${
                  readerSettings.fontFamily === "serif"
                    ? "bg-primary text-white"
                    : "bg-white/5 text-muted hover:bg-white/10"
                }`}
              >
                Serif
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          APP SETTINGS
      ========================== */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Preferensi Aplikasi
        </h2>

        <div className="space-y-5">
          {/* Notifikasi */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bell className="h-5 w-5 text-primary-400" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Notifikasi</p>

                <p className="text-xs text-muted mt-1">
                  {notificationsEnabled
                    ? "Notifikasi aktif"
                    : "Notifikasi dinonaktifkan"}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              aria-label={
                notificationsEnabled
                  ? "Matikan notifikasi"
                  : "Aktifkan notifikasi"
              }
              onClick={toggleNotifications}
              className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${
                notificationsEnabled
                  ? "bg-primary"
                  : "bg-white/10 border border-white/10"
              }`}
            >
              <span
                className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                  notificationsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Bahasa */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Globe className="h-5 w-5 text-muted" />
              </div>

              <div>
                <p className="text-sm font-medium text-white">Bahasa</p>

                <p className="text-xs text-muted mt-1">
                  Bahasa yang digunakan aplikasi
                </p>
              </div>
            </div>

            <span className="text-sm text-muted flex-shrink-0">Indonesia</span>
          </div>
        </div>
      </div>

      {/* =========================
          VERSI WEBSITE
      ========================== */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">
              Versi Website
            </p>
            <p className="text-xs text-muted mt-1">
              Semesta Novel
            </p>
          </div>

          <span className="text-sm text-muted">
            v1.0.0
          </span>
        </div>
      </div>

      {/* =========================
          LOGIN / SYNC
      ========================== */}
      {!user && (
        <div className="card p-6 text-center">
          <p className="text-sm text-muted mb-4">
            Masuk untuk menyinkronkan pengaturan dan data kamu di semua
            perangkat.
          </p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="btn-primary w-full"
          >
            Masuk
          </button>
        </div>
      )}
    </div>
  );
}
