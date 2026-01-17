import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import Dashboard from './components/Dashboard/Dashboard';
import Assets from './components/Assets/Assets';
import Income from './components/Income/Income';
import ExpensesV2 from './components/Expenses/ExpensesV2';
import Liabilities from './components/Liabilities/Liabilities';
import RetirementPrep from './components/RetirementPrep/RetirementPrep';
import Scenarios from './components/Scenarios/Scenarios';
import Rebalancing from './components/Rebalancing/Rebalancing';
import Fees from './components/Fees/Fees';
import Settings from './components/Settings/Settings';
import KeyboardShortcutsHelp from './components/shared/KeyboardShortcutsHelp';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import './App.css';

// Load test data generator in development
if (process.env.NODE_ENV === 'development') {
  import('./utils/testDataGenerator');
}

function App() {
  const { init, profile, profiles, currentProfileName, switchProfile, createProfile, deleteProfile } = useStore();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  // Initialize on mount
  useEffect(() => {
    init();

    // Expose store to window in development for testing/debugging
    if (process.env.NODE_ENV === 'development') {
      window.__SOLAS_STORE__ = useStore;
      console.log('🔧 Dev mode: Store exposed as window.__SOLAS_STORE__');
    }
  }, [init]);

  // Global keyboard shortcuts
  useEffect(() => {
    // ? to show keyboard shortcuts
    registerShortcut('?', () => setShowKeyboardHelp(true));
    registerShortcut('shift+/', () => setShowKeyboardHelp(true)); // Alternative for ?

    return () => {
      unregisterShortcut('?');
      unregisterShortcut('shift+/');
    };
  }, [registerShortcut, unregisterShortcut]);

  if (!profile) {
    return <div className="loading">Loading...</div>;
  }

  const handleCreateProfile = () => {
    if (newProfileName.trim()) {
      const success = createProfile(newProfileName.trim());
      if (success) {
        setNewProfileName('');
        setShowProfileMenu(false);
      }
    }
  };

  const handleDeleteProfile = (profileName) => {
    deleteProfile(profileName);
    setShowProfileMenu(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'assets':
        return <Assets />;
      case 'income':
        return <Income />;
      case 'expenses':
        return <ExpensesV2 />;
      case 'liabilities':
        return <Liabilities />;
      case 'retirement':
        return <RetirementPrep />;
      case 'scenarios':
        return <Scenarios />;
      case 'rebalancing':
        return <Rebalancing />;
      case 'fees':
        return <Fees />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <div className="app">
        {/* Header */}
        <header className="app-header">
        <div className="header-left">
          <h1>Solas v3</h1>
          <span className="tagline">Retirement Planning</span>
        </div>

        <div className="header-right">
          {/* Profile Switcher */}
          <div className="profile-switcher">
            <button
              className="profile-button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {currentProfileName} ▼
            </button>

            {showProfileMenu && (
              <div className="profile-menu">
                <div className="profile-menu-header">Profiles</div>
                {profiles.map((p) => (
                  <div key={p} className="profile-menu-item">
                    <button
                      className={p === currentProfileName ? 'active' : ''}
                      onClick={() => {
                        switchProfile(p);
                        setShowProfileMenu(false);
                      }}
                    >
                      {p}
                    </button>
                    {profiles.length > 1 && (
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteProfile(p)}
                        title="Delete profile"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                <div className="profile-menu-divider"></div>

                <div className="profile-menu-create">
                  <input
                    type="text"
                    placeholder="New profile name"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
                  />
                  <button onClick={handleCreateProfile}>Create</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="app-nav">
        <button
          className={currentView === 'dashboard' ? 'active' : ''}
          onClick={() => setCurrentView('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={currentView === 'assets' ? 'active' : ''}
          onClick={() => setCurrentView('assets')}
        >
          Assets
        </button>
        <button
          className={currentView === 'income' ? 'active' : ''}
          onClick={() => setCurrentView('income')}
        >
          Income
        </button>
        <button
          className={currentView === 'expenses' ? 'active' : ''}
          onClick={() => setCurrentView('expenses')}
        >
          Expenses
        </button>
        <button
          className={currentView === 'liabilities' ? 'active' : ''}
          onClick={() => setCurrentView('liabilities')}
        >
          Liabilities
        </button>
        <button
          className={currentView === 'retirement' ? 'active' : ''}
          onClick={() => setCurrentView('retirement')}
        >
          Retirement
        </button>
        <button
          className={currentView === 'scenarios' ? 'active' : ''}
          onClick={() => setCurrentView('scenarios')}
        >
          Scenarios
        </button>
        <button
          className={currentView === 'rebalancing' ? 'active' : ''}
          onClick={() => setCurrentView('rebalancing')}
        >
          Rebalancing
        </button>
        <button
          className={currentView === 'fees' ? 'active' : ''}
          onClick={() => setCurrentView('fees')}
        >
          Fees
        </button>
        <button
          className={currentView === 'settings' ? 'active' : ''}
          onClick={() => setCurrentView('settings')}
        >
          Settings
        </button>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        {renderView()}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <span>Solas v3 - Personal Retirement Planning Tool</span>
        <span>
          Profile: {currentProfileName} | Last updated: {new Date(profile.updatedAt).toLocaleString()}
          {' '} | Press <kbd style={{ padding: '0.125rem 0.375rem', background: '#f3f4f6', borderRadius: '0.25rem', fontSize: '0.75rem' }}>?</kbd> for shortcuts
        </span>
      </footer>
    </div>

    {/* Keyboard Shortcuts Help Modal */}
    {showKeyboardHelp && <KeyboardShortcutsHelp onClose={() => setShowKeyboardHelp(false)} />}
    </>
  );
}

export default App;
