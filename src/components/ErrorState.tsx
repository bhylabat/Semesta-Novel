import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Data belum dapat dimuat. Silakan coba lagi.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 mb-4">
        <AlertCircle className="h-10 w-10 text-red-400/70" />
      </div>
      <p className="text-sm text-muted max-w-sm mb-6">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Coba Lagi
        </button>
      )}
    </div>
  );
}
