/**
 * Debounce utility for performance optimization
 * Delays function execution until after a specified wait time has elapsed
 * since the last time the function was invoked.
 *
 * Used for:
 * - localStorage saves (don't save on every keystroke)
 * - Search input (wait for user to stop typing)
 * - Window resize handlers
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} The debounced function
 *
 * @example
 * const saveProfile = debounce(() => {
 *   localStorage.setItem('profile', JSON.stringify(data));
 * }, 500);
 *
 * // Called multiple times rapidly
 * saveProfile(); // Starts timer
 * saveProfile(); // Resets timer
 * saveProfile(); // Resets timer
 * // ... 500ms later, executes once
 */
export function debounce(func, wait) {
  let timeoutId;

  const debounced = function (...args) {
    // Clear existing timer
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timer
    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, wait);
  };

  // Add cancel method to clear pending execution
  debounced.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  // Add flush method to immediately execute pending call
  debounced.flush = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      func.apply(this, arguments);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 * Useful for rate-limiting functions that fire frequently (scroll, mousemove, etc.)
 *
 * @param {Function} func - The function to throttle
 * @param {number} wait - The number of milliseconds to throttle invocations to
 * @returns {Function} The throttled function
 *
 * @example
 * const handleScroll = throttle(() => {
 *   console.log('Scrolled!');
 * }, 100);
 *
 * window.addEventListener('scroll', handleScroll);
 */
export function throttle(func, wait) {
  let timeoutId;
  let lastRan;

  return function (...args) {
    if (!lastRan) {
      // First call - execute immediately
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      // Subsequent calls - throttle
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (Date.now() - lastRan >= wait) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, wait - (Date.now() - lastRan));
    }
  };
}
