/**
 * EmptyState Component
 *
 * A reusable empty state component to show when lists/tables have no data.
 * Provides clear messaging and optional call-to-action.
 *
 * @example
 * <EmptyState
 *   icon="📊"
 *   title="No assets yet"
 *   message="Start building your portfolio by adding your first asset."
 *   actionLabel="Add Asset"
 *   onAction={handleAddAsset}
 * />
 */

import './EmptyState.css';

/**
 * @param {Object} props
 * @param {string} [props.icon] - Emoji or icon to display (optional)
 * @param {string} props.title - Main heading
 * @param {string} props.message - Explanatory message
 * @param {string} [props.actionLabel] - Label for action button (optional)
 * @param {Function} [props.onAction] - Callback when action button clicked (optional)
 * @param {string} [props.secondaryActionLabel] - Label for secondary action (optional)
 * @param {Function} [props.onSecondaryAction] - Callback for secondary action (optional)
 * @param {string} [props.variant='default'] - Visual variant: 'default' | 'compact'
 */
function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default',
}) {
  const containerClass = `empty-state empty-state--${variant}`;

  return (
    <div className={containerClass}>
      {icon && <div className="empty-state-icon">{icon}</div>}

      <h3 className="empty-state-title">{title}</h3>

      <p className="empty-state-message">{message}</p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="empty-state-actions">
          {actionLabel && onAction && (
            <button className="btn-primary" onClick={onAction}>
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button className="btn-secondary" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
