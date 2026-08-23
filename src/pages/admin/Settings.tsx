export default function AdminSettings() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Pengaturan</h1>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Informasi Platform</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Nama Platform</span>
            <span className="text-sm text-white">Semesta Novel</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Versi</span>
            <span className="text-sm text-white">1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Database</span>
            <span className="text-sm text-green-400">Terhubung</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Konfigurasi</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white">Pendaftaran User Baru</span>
            <button className="relative w-11 h-6 rounded-full bg-primary">
              <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white">Komentar Publik</span>
            <button className="relative w-11 h-6 rounded-full bg-primary">
              <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white">Moderasi Otomatis</span>
            <button className="relative w-11 h-6 rounded-full bg-white/10">
              <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white/40" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
