import { create } from 'zustand';
import { createDefaultProfile } from '../models/defaults';

// Multi-profile Zustand store
const useStore = create((set, get) => ({
  // Profile management
  currentProfileName: null,
  profiles: [], // List of profile names

  // Current profile data
  profile: null,

  // Initialize from localStorage
  init: () => {
    const profilesJson = localStorage.getItem('solas_profiles');
    const profiles = profilesJson ? JSON.parse(profilesJson) : [];

    if (profiles.length === 0) {
      // First time - create default profile
      const defaultProfile = createDefaultProfile('Duncan');
      localStorage.setItem('solas_profile_Duncan', JSON.stringify(defaultProfile));
      localStorage.setItem('solas_profiles', JSON.stringify(['Duncan']));

      set({
        profiles: ['Duncan'],
        currentProfileName: 'Duncan',
        profile: defaultProfile,
      });
    } else {
      // Load first profile
      const firstProfileName = profiles[0];
      const profileData = JSON.parse(
        localStorage.getItem(`solas_profile_${firstProfileName}`)
      );

      set({
        profiles,
        currentProfileName: firstProfileName,
        profile: profileData,
      });
    }
  },

  // Switch profile
  switchProfile: (profileName) => {
    const profileData = JSON.parse(
      localStorage.getItem(`solas_profile_${profileName}`)
    );

    if (profileData) {
      set({
        currentProfileName: profileName,
        profile: profileData,
      });
    }
  },

  // Create new profile
  createProfile: (profileName) => {
    const { profiles } = get();

    if (profiles.includes(profileName)) {
      alert('Profile already exists');
      return false;
    }

    const newProfile = createDefaultProfile(profileName);
    localStorage.setItem(`solas_profile_${profileName}`, JSON.stringify(newProfile));

    const updatedProfiles = [...profiles, profileName];
    localStorage.setItem('solas_profiles', JSON.stringify(updatedProfiles));

    set({
      profiles: updatedProfiles,
      currentProfileName: profileName,
      profile: newProfile,
    });

    return true;
  },

  // Delete profile
  deleteProfile: (profileName) => {
    const { profiles, currentProfileName } = get();

    if (profiles.length === 1) {
      alert('Cannot delete the only profile');
      return false;
    }

    if (!confirm(`Are you sure you want to delete profile "${profileName}"?`)) {
      return false;
    }

    // Remove from localStorage
    localStorage.removeItem(`solas_profile_${profileName}`);

    const updatedProfiles = profiles.filter(p => p !== profileName);
    localStorage.setItem('solas_profiles', JSON.stringify(updatedProfiles));

    // If deleting current profile, switch to first available
    if (profileName === currentProfileName) {
      const newCurrentProfile = updatedProfiles[0];
      const profileData = JSON.parse(
        localStorage.getItem(`solas_profile_${newCurrentProfile}`)
      );

      set({
        profiles: updatedProfiles,
        currentProfileName: newCurrentProfile,
        profile: profileData,
      });
    } else {
      set({ profiles: updatedProfiles });
    }

    return true;
  },

  // Rename profile
  renameProfile: (oldName, newName) => {
    const { profiles, currentProfileName } = get();

    if (profiles.includes(newName)) {
      alert('Profile with that name already exists');
      return false;
    }

    // Get profile data
    const profileData = JSON.parse(localStorage.getItem(`solas_profile_${oldName}`));
    profileData.name = newName;
    profileData.updatedAt = new Date().toISOString();

    // Save with new name
    localStorage.setItem(`solas_profile_${newName}`, JSON.stringify(profileData));
    localStorage.removeItem(`solas_profile_${oldName}`);

    // Update profiles list
    const updatedProfiles = profiles.map(p => p === oldName ? newName : p);
    localStorage.setItem('solas_profiles', JSON.stringify(updatedProfiles));

    set({
      profiles: updatedProfiles,
      currentProfileName: currentProfileName === oldName ? newName : currentProfileName,
      profile: currentProfileName === oldName ? profileData : get().profile,
    });

    return true;
  },

  // Save current profile to localStorage
  saveProfile: () => {
    const { currentProfileName, profile } = get();
    if (profile) {
      profile.updatedAt = new Date().toISOString();
      localStorage.setItem(`solas_profile_${currentProfileName}`, JSON.stringify(profile));
    }
  },

  // Update settings
  updateSettings: (newSettings) => {
    set((state) => ({
      profile: {
        ...state.profile,
        settings: { ...state.profile.settings, ...newSettings },
      },
    }));
    get().saveProfile();
  },

  // Assets
  addAsset: (asset) => {
    set((state) => ({
      profile: {
        ...state.profile,
        assets: [...state.profile.assets, asset],
      },
    }));
    get().saveProfile();
  },

  setAssets: (assets) => {
    set((state) => ({
      profile: {
        ...state.profile,
        assets: assets,
      },
    }));
    get().saveProfile();
  },

  updateAsset: (id, updates) => {
    set((state) => ({
      profile: {
        ...state.profile,
        assets: state.profile.assets.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      },
    }));
    get().saveProfile();
  },

  deleteAsset: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        assets: state.profile.assets.filter((a) => a.id !== id),
      },
    }));
    get().saveProfile();
  },

  // Liabilities
  addLiability: (liability) => {
    set((state) => ({
      profile: {
        ...state.profile,
        liabilities: [...state.profile.liabilities, liability],
      },
    }));
    get().saveProfile();
  },

  updateLiability: (id, updates) => {
    set((state) => ({
      profile: {
        ...state.profile,
        liabilities: state.profile.liabilities.map((l) =>
          l.id === id ? { ...l, ...updates } : l
        ),
      },
    }));
    get().saveProfile();
  },

  deleteLiability: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        liabilities: state.profile.liabilities.filter((l) => l.id !== id),
      },
    }));
    get().saveProfile();
  },

  // Income
  addIncome: (income) => {
    set((state) => ({
      profile: {
        ...state.profile,
        income: [...state.profile.income, income],
      },
    }));
    get().saveProfile();
  },

  updateIncome: (id, updates) => {
    set((state) => ({
      profile: {
        ...state.profile,
        income: state.profile.income.map((i) =>
          i.id === id ? { ...i, ...updates } : i
        ),
      },
    }));
    get().saveProfile();
  },

  deleteIncome: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        income: state.profile.income.filter((i) => i.id !== id),
      },
    }));
    get().saveProfile();
  },

  // Expenses
  addExpense: (expense) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenses: [...state.profile.expenses, expense],
      },
    }));
    get().saveProfile();
  },

  updateExpense: (id, updates) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenses: state.profile.expenses.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        ),
      },
    }));
    get().saveProfile();
  },

  deleteExpense: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenses: state.profile.expenses.filter((e) => e.id !== id),
      },
    }));
    get().saveProfile();
  },

  // Expense Categories (Hierarchical)
  addExpenseCategory: (category) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenseCategories: [...(state.profile.expenseCategories || []), category],
      },
    }));
    get().saveProfile();
  },

  updateExpenseCategory: (id, updates) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenseCategories: (state.profile.expenseCategories || []).map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      },
    }));
    get().saveProfile();
  },

  deleteExpenseCategory: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenseCategories: (state.profile.expenseCategories || []).filter((c) => c.id !== id),
      },
    }));
    get().saveProfile();
  },

  // Subcategories within a category
  addSubcategory: (categoryId, subcategory) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenseCategories: (state.profile.expenseCategories || []).map((c) =>
          c.id === categoryId
            ? { ...c, subcategories: [...c.subcategories, subcategory] }
            : c
        ),
      },
    }));
    get().saveProfile();
  },

  updateSubcategory: (categoryId, subcategoryId, updates) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenseCategories: (state.profile.expenseCategories || []).map((c) =>
          c.id === categoryId
            ? {
                ...c,
                subcategories: c.subcategories.map((s) =>
                  s.id === subcategoryId ? { ...s, ...updates } : s
                ),
              }
            : c
        ),
      },
    }));
    get().saveProfile();
  },

  deleteSubcategory: (categoryId, subcategoryId) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenseCategories: (state.profile.expenseCategories || []).map((c) =>
          c.id === categoryId
            ? {
                ...c,
                subcategories: c.subcategories.filter((s) => s.id !== subcategoryId),
              }
            : c
        ),
      },
    }));
    get().saveProfile();
  },

  // Age-Based Expense Plan
  updateAgeBasedExpensePlan: (plan) => {
    set((state) => ({
      profile: {
        ...state.profile,
        ageBasedExpensePlan: plan,
      },
    }));
    get().saveProfile();
  },

  // Scenarios
  addScenario: (scenario) => {
    set((state) => ({
      profile: {
        ...state.profile,
        scenarios: [...state.profile.scenarios, scenario],
      },
    }));
    get().saveProfile();
  },

  updateScenario: (id, updates) => {
    set((state) => ({
      profile: {
        ...state.profile,
        scenarios: state.profile.scenarios.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      },
    }));
    get().saveProfile();
  },

  deleteScenario: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        scenarios: state.profile.scenarios.filter((s) => s.id !== id),
      },
    }));
    get().saveProfile();
  },
}));

export default useStore;
