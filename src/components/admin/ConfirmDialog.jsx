'use client';

import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Reusable confirmation dialog for destructive actions (delete, etc.).
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onConfirm: () => void | Promise<void>,
 *   loading?: boolean,
 *   title?: string,
 *   description?: string,
 *   confirmLabel?: string,
 * }} props
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Delete',
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-0.5">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
