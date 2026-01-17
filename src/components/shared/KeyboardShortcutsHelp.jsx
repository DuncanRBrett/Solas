/**
 * KeyboardShortcutsHelp Component
 *
 * Modal displaying all available keyboard shortcuts in the application.
 * Triggered by pressing '?' or through a help button.
 */

import './KeyboardShortcutsHelp.css';

const shortcuts = [
  {
    category: 'General',
    items: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Escape'], description: 'Close modals/cancel actions' },
    ],
  },
  {
    category: 'Navigation',
    items: [
      { keys: ['Ctrl', 'N'], description: 'Add new item (context-dependent)' },
      { keys: ['Ctrl', 'S'], description: 'Save current form' },
    ],
  },
  {
    category: 'Assets',
    items: [
      { keys: ['Ctrl', 'N'], description: 'Add new asset' },
    ],
  },
  {
    category: 'Scenarios',
    items: [
      { keys: ['Ctrl', 'N'], description: 'Create new scenario' },
    ],
  },
];

function KeyboardShortcutsHelp({ onClose }) {
  return (
    <div className="keyboard-shortcuts-modal-overlay" onClick={onClose}>
      <div className="keyboard-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="keyboard-shortcuts-content">
          {shortcuts.map((section) => (
            <div key={section.category} className="shortcuts-section">
              <h3>{section.category}</h3>
              <div className="shortcuts-list">
                {section.items.map((item, idx) => (
                  <div key={idx} className="shortcut-item">
                    <div className="shortcut-keys">
                      {item.keys.map((key, keyIdx) => (
                        <span key={keyIdx}>
                          <kbd className="key">{key}</kbd>
                          {keyIdx < item.keys.length - 1 && <span className="key-separator">+</span>}
                        </span>
                      ))}
                    </div>
                    <div className="shortcut-description">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="keyboard-shortcuts-footer">
          <p className="text-muted">Press <kbd className="key">?</kbd> anytime to show this dialog</p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsHelp;
