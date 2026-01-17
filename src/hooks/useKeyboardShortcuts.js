/**
 * useKeyboardShortcuts Hook
 *
 * Provides keyboard shortcut functionality for the application.
 * Supports common shortcuts like Ctrl+N, Ctrl+S, Escape, etc.
 *
 * @example
 * const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
 *
 * useEffect(() => {
 *   registerShortcut('ctrl+n', () => handleAddNew());
 *   registerShortcut('escape', () => handleClose());
 *
 *   return () => {
 *     unregisterShortcut('ctrl+n');
 *     unregisterShortcut('escape');
 *   };
 * }, []);
 */

import { useEffect, useCallback, useRef } from 'react';

/**
 * Parse keyboard event to shortcut string
 * @param {KeyboardEvent} event
 * @returns {string} Shortcut string like "ctrl+n" or "escape"
 */
const parseShortcut = (event) => {
  const keys = [];

  if (event.ctrlKey || event.metaKey) keys.push('ctrl');
  if (event.altKey) keys.push('alt');
  if (event.shiftKey) keys.push('shift');

  const key = event.key.toLowerCase();
  if (key !== 'control' && key !== 'alt' && key !== 'shift' && key !== 'meta') {
    keys.push(key);
  }

  return keys.join('+');
};

/**
 * Custom hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  const shortcuts = useRef(new Map());

  const handleKeyDown = useCallback((event) => {
    const shortcut = parseShortcut(event);
    const handler = shortcuts.current.get(shortcut);

    if (handler) {
      // Prevent default behavior for registered shortcuts
      event.preventDefault();
      event.stopPropagation();
      handler(event);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const registerShortcut = useCallback((shortcut, handler) => {
    shortcuts.current.set(shortcut.toLowerCase(), handler);
  }, []);

  const unregisterShortcut = useCallback((shortcut) => {
    shortcuts.current.delete(shortcut.toLowerCase());
  }, []);

  const clearAllShortcuts = useCallback(() => {
    shortcuts.current.clear();
  }, []);

  return {
    registerShortcut,
    unregisterShortcut,
    clearAllShortcuts,
  };
}

/**
 * Hook for common modal shortcuts (Escape to close)
 * @param {Function} onClose - Callback when modal should close
 * @param {boolean} isOpen - Whether modal is currently open
 */
export function useModalShortcuts(onClose, isOpen = true) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    if (isOpen && onClose) {
      registerShortcut('escape', onClose);
      return () => unregisterShortcut('escape');
    }
  }, [isOpen, onClose, registerShortcut, unregisterShortcut]);
}

/**
 * Hook for form shortcuts (Ctrl+S to save, Escape to cancel)
 * @param {Function} onSave - Callback when save shortcut triggered
 * @param {Function} onCancel - Callback when cancel shortcut triggered
 * @param {boolean} enabled - Whether shortcuts are enabled
 */
export function useFormShortcuts(onSave, onCancel, enabled = true) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    if (enabled) {
      if (onSave) registerShortcut('ctrl+s', onSave);
      if (onCancel) registerShortcut('escape', onCancel);

      return () => {
        if (onSave) unregisterShortcut('ctrl+s');
        if (onCancel) unregisterShortcut('escape');
      };
    }
  }, [enabled, onSave, onCancel, registerShortcut, unregisterShortcut]);
}

export default useKeyboardShortcuts;
