import { useState } from 'react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { DEFAULT_SETTINGS } from '../../models/defaults';
import './FeesSettings.css';

function FeesSettings() {
  const { profile, updateSettings } = useStore();

  const [platforms, setPlatforms] = useState(profile.settings.platforms || DEFAULT_SETTINGS.platforms);
  const [advisorFee, setAdvisorFee] = useState(profile.settings.advisorFee || DEFAULT_SETTINGS.advisorFee);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [newPlatform, setNewPlatform] = useState({
    id: '',
    name: '',
    feeStructure: {
      type: 'percentage',
      rate: 0.50,
    },
  });

  const handleSave = () => {
    updateSettings({
      platforms,
      advisorFee,
    });
    toast.success('Fee settings saved successfully!');
  };

  const handleAdvisorFeeChange = (field, value) => {
    setAdvisorFee(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddPlatform = () => {
    if (!newPlatform.id || !newPlatform.name) {
      toast.error('Please enter platform ID and name');
      return;
    }

    // Check for duplicate ID
    if (platforms.some(p => p.id === newPlatform.id)) {
      toast.error('Platform ID already exists');
      return;
    }

    setPlatforms(prev => [...prev, { ...newPlatform }]);
    setNewPlatform({
      id: '',
      name: '',
      feeStructure: {
        type: 'percentage',
        rate: 0.50,
      },
    });
    toast.success('Platform added');
  };

  const handleEditPlatform = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    if (platform) {
      // Ensure feeStructure exists with defaults
      const editablePlatform = {
        ...platform,
        feeStructure: platform.feeStructure || {
          type: 'percentage',
          rate: 0.50,
        },
      };
      setEditingPlatform(editablePlatform);
    }
  };

  const handleSavePlatformEdit = () => {
    setPlatforms(prev => prev.map(p =>
      p.id === editingPlatform.id ? editingPlatform : p
    ));
    setEditingPlatform(null);
    toast.success('Platform updated');
  };

  const handleDeletePlatform = (platformId) => {
    if (window.confirm(`Delete platform ${platformId}? This won't delete your assets, but fees won't be calculated for this platform.`)) {
      setPlatforms(prev => prev.filter(p => p.id !== platformId));
      toast.success('Platform deleted');
    }
  };

  return (
    <div className="fees-settings">
      <div className="fees-settings-header">
        <h3>Fees & Platforms</h3>
        <p className="description">
          Configure platform fees and advisor fees. The system will calculate annual and lifetime fee projections.
        </p>
      </div>

      {/* Advisor Fee Configuration */}
      <div className="settings-card">
        <h4>Advisor Fee</h4>
        <p className="card-description">
          Configure your financial advisor's management fee
        </p>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={advisorFee.enabled}
              onChange={(e) => handleAdvisorFeeChange('enabled', e.target.checked)}
            />
            I have a financial advisor
          </label>
        </div>

        {advisorFee.enabled && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Fee Type</label>
                <select
                  value={advisorFee.type}
                  onChange={(e) => handleAdvisorFeeChange('type', e.target.value)}
                >
                  <option value="percentage">Percentage of AUM</option>
                  <option value="fixed">Fixed Annual Amount</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  {advisorFee.type === 'percentage' ? 'Annual Fee (%)' : 'Annual Fee Amount'}
                </label>
                <input
                  type="number"
                  step={advisorFee.type === 'percentage' ? '0.01' : '100'}
                  value={advisorFee.amount}
                  onChange={(e) => handleAdvisorFeeChange('amount', parseFloat(e.target.value) || 0)}
                  placeholder={advisorFee.type === 'percentage' ? 'e.g., 1.0' : 'e.g., 50000'}
                />
                <small>
                  {advisorFee.type === 'percentage'
                    ? 'Typical range: 0.5% - 1.5% per year'
                    : `Fixed amount per year (${advisorFee.currency || 'ZAR'})`
                  }
                </small>
              </div>
            </div>

            {advisorFee.type === 'fixed' && (
              <div className="form-group">
                <label>Currency</label>
                <select
                  value={advisorFee.currency}
                  onChange={(e) => handleAdvisorFeeChange('currency', e.target.value)}
                >
                  <option value="ZAR">ZAR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            )}

            <div className="form-note">
              <strong>Note:</strong> Advisor fee is calculated on all investible assets by default.
              You can exclude specific assets (e.g., crypto) in the Assets form.
            </div>
          </>
        )}
      </div>

      {/* Platform Management */}
      <div className="settings-card">
        <h4>Investment Platforms</h4>
        <p className="card-description">
          Manage platforms where you hold assets and their fee structures
        </p>

        {/* Existing Platforms */}
        <div className="platforms-list">
          {platforms.map((platform) => (
            <div key={platform.id} className="platform-item">
              {editingPlatform && editingPlatform.id === platform.id ? (
                // Edit mode
                <div className="platform-edit-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Platform Name</label>
                      <input
                        type="text"
                        value={editingPlatform.name}
                        onChange={(e) => setEditingPlatform(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label>Fee Type</label>
                      <select
                        value={editingPlatform.feeStructure.type}
                        onChange={(e) => setEditingPlatform(prev => ({
                          ...prev,
                          feeStructure: { type: e.target.value, rate: 0.50 }
                        }))}
                      >
                        <option value="percentage">Percentage (% p.a.)</option>
                        <option value="fixed">Fixed Amount</option>
                        <option value="combined">Combined (% + Fixed)</option>
                        <option value="tiered-percentage">Tiered Percentage</option>
                      </select>
                    </div>
                  </div>

                  {editingPlatform.feeStructure.type === 'percentage' && (
                    <div className="form-group">
                      <label>Annual Fee (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingPlatform.feeStructure.rate}
                        onChange={(e) => setEditingPlatform(prev => ({
                          ...prev,
                          feeStructure: { ...prev.feeStructure, rate: parseFloat(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                  )}

                  {editingPlatform.feeStructure.type === 'fixed' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Amount</label>
                        <input
                          type="number"
                          step="1"
                          value={editingPlatform.feeStructure.amount}
                          onChange={(e) => setEditingPlatform(prev => ({
                            ...prev,
                            feeStructure: { ...prev.feeStructure, amount: parseFloat(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Frequency</label>
                        <select
                          value={editingPlatform.feeStructure.frequency || 'monthly'}
                          onChange={(e) => setEditingPlatform(prev => ({
                            ...prev,
                            feeStructure: { ...prev.feeStructure, frequency: e.target.value }
                          }))}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="annual">Annual</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Currency</label>
                        <select
                          value={editingPlatform.feeStructure.currency || 'ZAR'}
                          onChange={(e) => setEditingPlatform(prev => ({
                            ...prev,
                            feeStructure: { ...prev.feeStructure, currency: e.target.value }
                          }))}
                        >
                          <option value="ZAR">ZAR</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {editingPlatform.feeStructure.type === 'combined' && (
                    <>
                      <div className="form-group">
                        <label>Percentage Fee (% p.a.)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingPlatform.feeStructure.rate || 0}
                          onChange={(e) => setEditingPlatform(prev => ({
                            ...prev,
                            feeStructure: { ...prev.feeStructure, rate: parseFloat(e.target.value) || 0 }
                          }))}
                          placeholder="e.g., 0.50"
                        />
                        <small>Annual percentage fee on asset value</small>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Fixed Amount</label>
                          <input
                            type="number"
                            step="1"
                            value={editingPlatform.feeStructure.amount || 0}
                            onChange={(e) => setEditingPlatform(prev => ({
                              ...prev,
                              feeStructure: { ...prev.feeStructure, amount: parseFloat(e.target.value) || 0 }
                            }))}
                            placeholder="e.g., 50"
                          />
                        </div>
                        <div className="form-group">
                          <label>Frequency</label>
                          <select
                            value={editingPlatform.feeStructure.frequency || 'monthly'}
                            onChange={(e) => setEditingPlatform(prev => ({
                              ...prev,
                              feeStructure: { ...prev.feeStructure, frequency: e.target.value }
                            }))}
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="annual">Annual</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Currency</label>
                          <select
                            value={editingPlatform.feeStructure.currency || 'ZAR'}
                            onChange={(e) => setEditingPlatform(prev => ({
                              ...prev,
                              feeStructure: { ...prev.feeStructure, currency: e.target.value }
                            }))}
                          >
                            <option value="ZAR">ZAR</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </div>
                      </div>
                      <small>Example: 0.50% p.a. + R50/month = both percentage and fixed fees charged</small>
                    </>
                  )}

                  <div className="platform-edit-actions">
                    <button className="btn-primary" onClick={handleSavePlatformEdit}>
                      Save
                    </button>
                    <button className="btn-secondary" onClick={() => setEditingPlatform(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="platform-info">
                    <div className="platform-name">{platform.name}</div>
                    <div className="platform-fee">
                      {platform.feeStructure?.type === 'percentage' && (
                        <span>{platform.feeStructure.rate}% p.a.</span>
                      )}
                      {platform.feeStructure?.type === 'fixed' && (
                        <span>
                          {platform.feeStructure.currency || 'ZAR'} {platform.feeStructure.amount}/{platform.feeStructure.frequency || 'month'}
                        </span>
                      )}
                      {platform.feeStructure?.type === 'combined' && (
                        <span>
                          {platform.feeStructure.rate}% p.a. + {platform.feeStructure.currency || 'ZAR'} {platform.feeStructure.amount}/{platform.feeStructure.frequency || 'month'}
                        </span>
                      )}
                      {platform.feeStructure?.type === 'tiered-percentage' && (
                        <span>Tiered: {platform.feeStructure.tiers?.[0]?.rate}% - {platform.feeStructure.tiers?.[platform.feeStructure.tiers.length - 1]?.rate}%</span>
                      )}
                      {!platform.feeStructure && (
                        <span className="no-fee">No fee configured</span>
                      )}
                    </div>
                  </div>
                  <div className="platform-actions">
                    <button className="btn-small" onClick={() => handleEditPlatform(platform.id)}>
                      Edit
                    </button>
                    <button className="btn-small btn-danger" onClick={() => handleDeletePlatform(platform.id)}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add New Platform */}
        <div className="add-platform-form">
          <h5>Add New Platform</h5>
          <div className="form-row">
            <div className="form-group">
              <label>Platform ID</label>
              <input
                type="text"
                value={newPlatform.id}
                onChange={(e) => setNewPlatform(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                placeholder="e.g., myplatform"
              />
              <small>Lowercase, no spaces</small>
            </div>

            <div className="form-group">
              <label>Platform Name</label>
              <input
                type="text"
                value={newPlatform.name}
                onChange={(e) => setNewPlatform(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., My Platform"
              />
            </div>

            <div className="form-group">
              <label>Fee (%)</label>
              <input
                type="number"
                step="0.01"
                value={newPlatform.feeStructure.rate}
                onChange={(e) => setNewPlatform(prev => ({
                  ...prev,
                  feeStructure: { ...prev.feeStructure, rate: parseFloat(e.target.value) || 0 }
                }))}
                placeholder="0.50"
              />
            </div>

            <button className="btn-primary" onClick={handleAddPlatform}>
              Add Platform
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-actions">
        <button className="btn-primary btn-large" onClick={handleSave}>
          Save Fee Settings
        </button>
      </div>
    </div>
  );
}

export default FeesSettings;
