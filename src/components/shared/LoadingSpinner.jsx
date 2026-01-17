/**
 * LoadingSpinner Component
 *
 * A reusable loading spinner for async operations.
 * Supports multiple sizes and variants (inline, overlay, fullscreen).
 *
 * @example
 * // Inline spinner
 * <LoadingSpinner size="small" message="Loading..." />
 *
 * // Overlay spinner (covers parent container)
 * <LoadingSpinner variant="overlay" message="Importing assets..." />
 *
 * // Fullscreen spinner (covers entire viewport)
 * <LoadingSpinner variant="fullscreen" message="Processing..." />
 */

import './LoadingSpinner.css';

/**
 * @typedef {'small' | 'medium' | 'large'} SpinnerSize
 * @typedef {'inline' | 'overlay' | 'fullscreen'} SpinnerVariant
 */

/**
 * @param {Object} props
 * @param {SpinnerSize} [props.size='medium'] - Size of the spinner
 * @param {SpinnerVariant} [props.variant='inline'] - Display variant
 * @param {string} [props.message] - Optional loading message
 * @param {string} [props.className] - Additional CSS classes
 */
function LoadingSpinner({
  size = 'medium',
  variant = 'inline',
  message = '',
  className = ''
}) {
  const spinnerClasses = `loading-spinner loading-spinner--${size} ${className}`;
  const containerClasses = `loading-spinner-container loading-spinner-container--${variant}`;

  return (
    <div className={containerClasses}>
      <div className="loading-spinner-content">
        <div className={spinnerClasses} role="status" aria-label="Loading">
          <svg viewBox="0 0 50 50" className="loading-spinner-svg">
            <circle
              className="loading-spinner-circle"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="4"
            />
          </svg>
        </div>
        {message && (
          <p className="loading-spinner-message" aria-live="polite">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default LoadingSpinner;
