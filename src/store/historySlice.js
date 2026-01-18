/**
 * History Slice - Manages historical snapshots of portfolio data
 *
 * Stores timestamped snapshots of net worth, assets, liabilities, and allocation
 * for tracking portfolio changes over time.
 */

// Generate a unique ID for each snapshot
const generateId = () => `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Creates the history slice for the Zustand store
 * @param {Function} set - Zustand set function
 * @param {Function} get - Zustand get function
 * @returns {Object} History slice methods
 */
export const createHistorySlice = (set, get) => ({
  // Add a snapshot to history
  addSnapshot: (snapshotData) => {
    const snapshot = {
      id: generateId(),
      date: new Date().toISOString(),
      ...snapshotData,
    };

    set((state) => ({
      profile: {
        ...state.profile,
        history: [...(state.profile.history || []), snapshot],
      },
    }));
    get().saveProfile();
    return { success: true, snapshot };
  },

  // Delete a snapshot from history
  deleteSnapshot: (snapshotId) => {
    set((state) => ({
      profile: {
        ...state.profile,
        history: (state.profile.history || []).filter((s) => s.id !== snapshotId),
      },
    }));
    get().saveProfile();
    return { success: true };
  },

  // Clear all history
  clearHistory: () => {
    set((state) => ({
      profile: {
        ...state.profile,
        history: [],
      },
    }));
    get().saveProfile();
    return { success: true };
  },

  // Get history sorted by date (newest first)
  getHistory: () => {
    const { profile } = get();
    const history = profile?.history || [];
    return [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // Get history sorted by date (oldest first) - for charts
  getHistoryChronological: () => {
    const { profile } = get();
    const history = profile?.history || [];
    return [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  },
});
