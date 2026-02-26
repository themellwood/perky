import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const toastStyles: Record<ToastProps['type'], string> = {
  success: 'bg-perky-200 text-ink',
  error: 'bg-red-200 text-ink',
  info: 'bg-fight-200 text-ink',
};

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-brutal border-3 border-ink shadow-brutal-md px-4 py-3 flex items-center gap-3 ${toastStyles[type]}`}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 font-bold text-ink hover:opacity-70"
        aria-label="Close"
      >
        &#10005;
      </button>
    </div>
  );
}
