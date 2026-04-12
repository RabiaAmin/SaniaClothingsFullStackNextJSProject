'use client';

import { useState, useCallback } from 'react';

let toastCount = 0;

/**
 * Minimal toast hook (pairs with src/components/ui/toaster.jsx).
 * For production consider replacing with a library like `sonner`.
 *
 * @returns {{ toasts: Toast[], toast: (opts: ToastOptions) => void, dismiss: (id: string) => void }}
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, variant = 'default', duration = 5000 }) => {
    const id = String(++toastCount);

    setToasts((prev) => [...prev, { id, title, description, variant, open: true }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}
