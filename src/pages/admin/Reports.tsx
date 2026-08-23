import { useEffect, useState, useCallback } from 'react';
import { Flag, Check, X } from 'lucide-react';
import { adminFetchReports, adminUpdateReportStatus } from '@/lib/services';
import { formatDate } from '@/lib/utils';

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetchReports();
      setReports(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatus = async (id: string, status: string) => {
    await adminUpdateReportStatus(id, status);
    loadData();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Laporan</h1>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 w-full rounded-xl" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center">
          <Flag className="h-10 w-10 text-muted/50 mx-auto mb-3" />
          <p className="text-sm text-muted">Belum ada laporan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10 flex-shrink-0">
                  <Flag className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{report.profile?.username || 'Unknown'}</span>
                    <span className="text-xs text-muted">{formatDate(report.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted mb-2">{report.reason}</p>
                  {report.comment && (
                    <div className="bg-white/5 rounded-lg p-3 mb-3">
                      <p className="text-xs text-muted">{report.comment.profile?.username || 'Unknown'}:</p>
                      <p className="text-sm text-white/80 line-clamp-2">{report.comment.content}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className={`badge ${report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : report.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {report.status}
                    </span>
                    {report.status === 'pending' && (
                      <>
                        <button onClick={() => handleStatus(report.id, 'resolved')} className="btn-ghost text-xs text-green-400"><Check className="h-3 w-3" /> Resolve</button>
                        <button onClick={() => handleStatus(report.id, 'dismissed')} className="btn-ghost text-xs text-red-400"><X className="h-3 w-3" /> Dismiss</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
