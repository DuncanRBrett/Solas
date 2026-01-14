import { Component } from 'react';
import { getBackups, restoreFromBackup } from '../../utils/backup';

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs the errors, and displays a fallback UI instead of crashing.
 *
 * Critical for Solas because:
 * - Prevents full app crashes from breaking user access to data
 * - Provides recovery options (backup restore)
 * - Maintains user trust by handling errors gracefully
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      backups: [],
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Try to get available backups
    try {
      const profileName = localStorage.getItem('solas_currentProfile') || 'Duncan';
      const backups = getBackups(profileName);
      this.setState({
        error,
        errorInfo,
        backups: backups.filter(b => b.isValid).slice(0, 5), // Show last 5 valid backups
      });
    } catch (e) {
      console.error('Could not retrieve backups:', e);
      this.setState({ error, errorInfo });
    }

    // In production, send error to monitoring service (e.g., Sentry)
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleRestore = async (backupKey) => {
    try {
      const result = restoreFromBackup(backupKey);

      if (result.success) {
        // Save restored data
        const profileName = result.profileName || 'Duncan';
        localStorage.setItem(`solas_profile_${profileName}`, JSON.stringify(result.data));

        // Reload the page to reset state
        alert('Backup restored successfully. The page will now reload.');
        window.location.reload();
      } else {
        alert(`Restore failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Restore failed: ${error.message}`);
    }
  };

  handleReset = () => {
    // Clear error state and try to recover
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleExportData = () => {
    try {
      // Export all localStorage data
      const exportData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          exportData[key] = localStorage.getItem(key);
        }
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solas-emergency-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      alert('Emergency export completed. Your data has been saved to a file.');
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>⚠️ Something Went Wrong</h1>

            <p style={styles.message}>
              Solas encountered an error and couldn't continue. Your data is safe,
              but the app needs to recover.
            </p>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>What happened?</h2>
              <div style={styles.errorBox}>
                <strong>{this.state.error?.toString()}</strong>
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Recovery Options</h2>

              <button
                onClick={() => window.location.reload()}
                style={styles.buttonPrimary}
              >
                🔄 Reload Application
              </button>

              <button
                onClick={this.handleExportData}
                style={styles.buttonSecondary}
              >
                💾 Emergency Export (Save All Data)
              </button>

              {this.state.backups.length > 0 && (
                <div style={styles.backupSection}>
                  <h3 style={styles.backupTitle}>
                    Restore from Backup ({this.state.backups.length} available)
                  </h3>
                  <p style={styles.backupHelp}>
                    If the current data is corrupted, you can restore from a recent backup:
                  </p>
                  {this.state.backups.map((backup) => (
                    <button
                      key={backup.key}
                      onClick={() => this.handleRestore(backup.key)}
                      style={styles.backupButton}
                    >
                      📦 {backup.displayDate} ({backup.sizeKB}KB)
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Need Help?</h2>
              <p style={styles.helpText}>
                If this problem persists:
              </p>
              <ol style={styles.helpList}>
                <li>Export your data using the button above</li>
                <li>Clear your browser cache and reload</li>
                <li>Try restoring from a recent backup</li>
                <li>Contact support with the error details</li>
              </ol>
            </div>

            {import.meta.env.DEV && this.state.errorInfo && (
              <details style={styles.details}>
                <summary style={styles.detailsSummary}>Technical Details (Dev Only)</summary>
                <pre style={styles.stackTrace}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inline styles for error boundary (no CSS dependencies)
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '30px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: '16px',
    textAlign: 'center',
  },
  message: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '24px',
    textAlign: 'center',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    border: '1px solid #ef9a9a',
    borderRadius: '4px',
    padding: '12px',
    fontSize: '14px',
    color: '#c62828',
    fontFamily: 'monospace',
    overflowX: 'auto',
  },
  buttonPrimary: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#2196f3',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'background-color 0.2s',
  },
  buttonSecondary: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#e0e0e0',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'background-color 0.2s',
  },
  backupSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    border: '1px solid #90caf9',
  },
  backupTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: '8px',
  },
  backupHelp: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '12px',
  },
  backupButton: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    color: '#1976d2',
    backgroundColor: 'white',
    border: '1px solid #90caf9',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '8px',
    textAlign: 'left',
    transition: 'background-color 0.2s',
  },
  helpText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
  },
  helpList: {
    fontSize: '14px',
    color: '#666',
    paddingLeft: '20px',
    lineHeight: '1.8',
  },
  details: {
    marginTop: '24px',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
  detailsSummary: {
    cursor: 'pointer',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  stackTrace: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#666',
    overflowX: 'auto',
    maxHeight: '200px',
    overflowY: 'auto',
  },
};

export default ErrorBoundary;
