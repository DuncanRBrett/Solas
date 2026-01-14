/**
 * ConfirmDialog - Reusable confirmation dialog component
 *
 * Replaces window.confirm() with a better-looking, more accessible dialog.
 */

import { useEffect } from 'react';
import './ConfirmDialog.css';

export const ConfirmDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
}) => {
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="confirm-dialog-backdrop"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
      >
        <div className={`confirm-dialog-content confirm-dialog-${variant}`}>
          {/* Title */}
          <h3 id="dialog-title" className="confirm-dialog-title">
            {title}
          </h3>

          {/* Message */}
          <p id="dialog-message" className="confirm-dialog-message">
            {message}
          </p>

          {/* Actions */}
          <div className="confirm-dialog-actions">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              autoFocus
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`btn btn-${variant}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Hook for managing confirm dialogs
 *
 * Usage:
 * const { confirmDialog, showConfirm } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await showConfirm({
 *     message: 'Delete this item?',
 *   });
 *   if (confirmed) {
 *     // do deletion
 *   }
 * };
 *
 * return (
 *   <>
 *     {confirmDialog}
 *     <button onClick={handleDelete}>Delete</button>
 *   </>
 * );
 */
import { useState, useCallback } from 'react';

export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    onConfirm: () => {},
  });

  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'danger',
        onConfirm: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
      });
    });
  }, []);

  const handleCancel = useCallback(() => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const confirmDialog = (
    <ConfirmDialog
      isOpen={dialogState.isOpen}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      variant={dialogState.variant}
      onConfirm={dialogState.onConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirmDialog, showConfirm };
};
