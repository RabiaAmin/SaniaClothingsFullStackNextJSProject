'use client';

/**
 * Singleton-based toast hook — identical pattern to shadcn/ui's own implementation.
 * ALL components that call useToast() share the SAME toast queue.
 * The standalone `toast()` function can be called outside React (e.g. in API interceptors).
 */

import { useState, useEffect } from 'react';

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 800;

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

// ── Reducer ───────────────────────────────────────────────────────────────────
const toastTimeouts = new Map();

function addToRemoveQueue(toastId) {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: 'REMOVE_TOAST', toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case 'DISMISS_TOAST': {
      const { toastId } = action;
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((t) => addToRemoveQueue(t.id));
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t
        ),
      };
    }

    case 'REMOVE_TOAST':
      if (action.toastId === undefined) return { ...state, toasts: [] };
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };

    default:
      return state;
  }
}

// ── Module-level singleton state ──────────────────────────────────────────────
const listeners = [];
let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Standalone toast function — can be called outside React components.
 *
 * @param {{ title?: string, description?: string, variant?: 'default'|'destructive', duration?: number }} opts
 */
export function toast({ duration = 5000, ...props }) {
  const id = genId();

  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id });
  const update = (updateProps) =>
    dispatch({ type: 'UPDATE_TOAST', toast: { ...updateProps, id } });

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  // Auto-dismiss after `duration`
  setTimeout(dismiss, duration);

  return { id, dismiss, update };
}

/**
 * React hook — subscribes to the shared toast queue.
 * Call anywhere; all instances share the same state.
 */
export function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []); // stable: we push/pop the setter itself, not a closure

  return {
    toasts: state.toasts,
    toast,
    dismiss: (toastId) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  };
}
