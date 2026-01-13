# Solas v3 - Distribution Guide

## Overview

This document explains how to package Solas v3 for distribution as a **standalone, self-contained application** that users can run locally without any server or database.

## Distribution Methods

### Method 1: Single HTML File (Recommended)

**Best for**: Email, Dropbox, Google Drive, USB stick distribution

**How it works**:
- Single `.html` file contains everything (JavaScript, CSS, app logic)
- Users double-click to open in browser
- Data stored in browser's localStorage
- 100% offline after first load

**To build**:
```bash
npm run build:package
```

**Output**:
- `package/solas-v3.0.0-standalone.html` (~2-3 MB file)
- `package/README.txt` (user instructions)

**To distribute**:
1. Zip the `package` folder
2. Send via email, Dropbox link, or any file sharing service
3. User unzips and opens the HTML file

---

### Method 2: Progressive Web App (PWA)

**Best for**: Web hosting, better offline experience, app-like feel

**Advantages**:
- Installable (appears as app icon on desktop/mobile)
- Automatic updates when you publish new versions
- Better offline caching
- Push notifications (if needed in future)

**To implement**:
1. Add service worker for offline caching
2. Add `manifest.json` for installability
3. Host on GitHub Pages, Netlify, or Vercel
4. Users visit URL, click "Install App"

**Implementation needed** (not yet built):
```bash
# Install PWA plugin
npm install vite-plugin-pwa -D

# Configure in vite.config.js
# Add manifest.json
# Add service worker
```

---

### Method 3: Desktop App (Electron)

**Best for**: Professional users, advanced features, better file system access

**Advantages**:
- Native app experience
- Better file system access (for backups)
- Auto-updates built-in
- Can bundle Node.js features

**Disadvantages**:
- Larger download size (~100-150 MB)
- More complex to build and distribute
- Need to maintain multiple builds (Mac, Windows, Linux)

**Implementation needed**:
```bash
npm install electron electron-builder -D
```

---

## Current Implementation Status

### ✅ Ready Now
- Single HTML file distribution
- Works offline
- No server required
- localStorage persistence

### ⚠️ Needs Attention Before Distribution

#### 1. Data Safety (CRITICAL)
```javascript
// Add to store/useStore.js

// Automatic backup on every save
saveProfile: () => {
  const { currentProfileName, profile } = get();

  // Create backup
  const backupKey = `solas_backup_${currentProfileName}_${Date.now()}`;
  localStorage.setItem(backupKey, JSON.stringify(profile));

  // Keep only last 5 backups (prevent storage overflow)
  const backups = Object.keys(localStorage)
    .filter(k => k.startsWith(`solas_backup_${currentProfileName}`))
    .sort()
    .reverse();

  backups.slice(5).forEach(k => localStorage.removeItem(k));

  // Save current
  localStorage.setItem(`solas_profile_${currentProfileName}`, JSON.stringify(profile));
},

// Add recovery function
recoverFromBackup: (backupKey) => {
  const backupData = localStorage.getItem(backupKey);
  if (backupData) {
    const profile = JSON.parse(backupData);
    set({ profile });
    alert('Profile recovered from backup!');
  }
}
```

#### 2. Version Management
```javascript
// Add to models/defaults.js

export const APP_VERSION = '3.0.0';
export const DATA_VERSION = '3.0';

// Add migration check on init
const checkDataVersion = (profile) => {
  if (!profile.dataVersion || profile.dataVersion !== DATA_VERSION) {
    console.log(`Migrating from ${profile.dataVersion || 'legacy'} to ${DATA_VERSION}`);
    return migrateProfile(profile);
  }
  return profile;
};
```

#### 3. Data Validation
```javascript
// Add validation before save
import { z } from 'zod';

const ProfileSchema = z.object({
  name: z.string().min(1),
  assets: z.array(z.object({
    id: z.string(),
    name: z.string(),
    units: z.number().positive(),
    currentPrice: z.number().nonnegative(),
    // ... etc
  })),
  settings: z.object({
    profile: z.object({
      age: z.number().min(0).max(120),
      retirementAge: z.number().min(0).max(120),
      // ... etc
    })
  })
});

// Validate before save
saveProfile: () => {
  const { profile } = get();
  try {
    ProfileSchema.parse(profile);
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (error) {
    console.error('Invalid profile data:', error);
    alert('Cannot save: Invalid data. Please check your inputs.');
  }
}
```

#### 4. Export/Import Enhancement
```javascript
// Add timestamped exports with metadata
export const exportProfile = (profile) => {
  const exportData = {
    version: APP_VERSION,
    dataVersion: DATA_VERSION,
    exportDate: new Date().toISOString(),
    profileName: profile.name,
    data: profile
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });

  const filename = `solas-${profile.name}-${new Date().toISOString().split('T')[0]}.json`;
  // ... download logic
};

// Validate on import
export const importProfile = (fileContent) => {
  try {
    const importData = JSON.parse(fileContent);

    // Check version compatibility
    if (importData.dataVersion !== DATA_VERSION) {
      const migrate = confirm(
        `This file is from version ${importData.dataVersion}. ` +
        `Migrate to ${DATA_VERSION}?`
      );
      if (!migrate) return null;
      importData.data = migrateProfile(importData.data);
    }

    // Validate structure
    ProfileSchema.parse(importData.data);

    return importData.data;
  } catch (error) {
    alert('Invalid import file: ' + error.message);
    return null;
  }
};
```

#### 5. localStorage Quota Handling
```javascript
// Add quota monitoring
const getStorageUsage = () => {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return {
    used: total,
    usedMB: (total / 1024 / 1024).toFixed(2),
    // Most browsers allow ~5-10MB
    percentFull: ((total / (10 * 1024 * 1024)) * 100).toFixed(1)
  };
};

// Show warning in Settings
const StorageWarning = () => {
  const usage = getStorageUsage();
  if (usage.percentFull > 80) {
    return (
      <div className="warning">
        ⚠️ Storage {usage.percentFull}% full.
        Consider exporting and clearing old backups.
      </div>
    );
  }
  return null;
};
```

---

## Distribution Checklist

### Before Sending to Users

- [ ] **Test in clean browser** (no existing data)
- [ ] **Test in incognito/private mode**
- [ ] **Test on different browsers** (Chrome, Firefox, Safari, Edge)
- [ ] **Test on mobile devices** (iOS Safari, Chrome Android)
- [ ] **Test import/export** (export data, clear storage, import back)
- [ ] **Test with large datasets** (100+ assets, 10+ scenarios)
- [ ] **Verify all calculations** (compare with reference scenarios)
- [ ] **Check file size** (should be < 5MB for email-ability)
- [ ] **Update version number** in package.json
- [ ] **Update README** with current version info
- [ ] **Create release notes** (what's new, bug fixes)

### Security Checklist

- [ ] **No API keys** hardcoded in source
- [ ] **No console.logs** with sensitive data
- [ ] **No external API calls** (except for price updates if added)
- [ ] **localStorage data** is not encrypted (document this limitation)
- [ ] **Clear warning** about browser cache clearing
- [ ] **Add data export reminder** in UI

### User Experience Checklist

- [ ] **First-run tutorial** or welcome screen
- [ ] **Sample data** option for new users to explore
- [ ] **Regular backup reminders** (every 30 days)
- [ ] **Clear error messages** (no technical jargon)
- [ ] **Help tooltips** on complex fields
- [ ] **Keyboard shortcuts** documented
- [ ] **Mobile responsiveness** verified

---

## File Delivery Methods

### Method A: Direct Email
```
Subject: Solas v3.0.0 - Your Personal Retirement Planning Tool

Hi [Name],

Attached is Solas v3, a financial planning tool that runs entirely
in your browser with no server or cloud connection.

To use:
1. Download the attached file (solas-v3.0.0-standalone.html)
2. Double-click to open in your browser
3. All your data stays on your device

For detailed instructions, see the included README.txt

Best,
Duncan
```

**Pros**: Simple, personal
**Cons**: Email attachment limits (~25MB), may be flagged as spam

---

### Method B: Cloud Link (Dropbox, Google Drive)
1. Upload `solas-v3.0.0-standalone.html` to cloud storage
2. Create shareable link
3. Send link to users

**Pros**: No size limits, can update file without resending
**Cons**: Requires cloud service, users must trust download

---

### Method C: GitHub Releases
1. Create repository (can be private)
2. Tag release: `git tag v3.0.0`
3. Upload built file as release asset
4. Share release URL

**Pros**: Version history, professional, diff tracking
**Cons**: Requires GitHub account, slightly technical

---

### Method D: Static Hosting (Recommended for Scale)
Host on: Netlify, Vercel, GitHub Pages, Cloudflare Pages

```bash
# Example: GitHub Pages
npm run build
cd dist
git init
git add .
git commit -m "Deploy v3.0.0"
git push -f git@github.com:yourusername/solas-v3.git main:gh-pages
```

**URL**: `https://yourusername.github.io/solas-v3/`

**Pros**:
- Professional URL
- Automatic HTTPS
- Easy updates (just redeploy)
- Users always get latest version

**Cons**:
- Requires hosting setup (one-time)
- Users need internet for first load

---

## Advanced: Auto-Update Mechanism

If hosting online, add version checking:

```javascript
// Add to App.jsx
useEffect(() => {
  const checkForUpdates = async () => {
    try {
      const response = await fetch('/version.json');
      const { version: latestVersion } = await response.json();

      if (latestVersion !== APP_VERSION) {
        const update = confirm(
          `New version ${latestVersion} available! ` +
          `You have ${APP_VERSION}. Update now?`
        );
        if (update) {
          window.location.reload(true);
        }
      }
    } catch (error) {
      // Offline or no update check available
      console.log('Update check failed:', error);
    }
  };

  // Check on load and every hour
  checkForUpdates();
  const interval = setInterval(checkForUpdates, 60 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

---

## Support Strategy

### Documentation to Include

1. **README.txt** - Quick start guide
2. **FAQ.txt** - Common questions
3. **TROUBLESHOOTING.txt** - Common issues

### FAQ Examples:
```
Q: Where is my data stored?
A: In your browser's localStorage. It never leaves your computer.

Q: What if I clear my browser cache?
A: Export your data first (Settings → Export). Then import after clearing.

Q: Can I use this on multiple devices?
A: Yes, but you need to export/import to sync between devices.

Q: Is my data secure?
A: It's stored unencrypted in localStorage. Don't use this on shared computers.

Q: What browsers are supported?
A: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

Q: Can I access this offline?
A: Yes, after the first load it works completely offline.
```

---

## Monetization Options (If Relevant)

If you want to charge for this:

### Option 1: License Key System
- Generate unique keys
- User enters key to unlock full features
- Verify key against localStorage flag (simple, client-side)

### Option 2: Tiered Versions
- **Free**: Limited to 50 assets, 3 scenarios
- **Pro**: Unlimited, $50 one-time payment
- Build two versions: `solas-free.html` and `solas-pro.html`

### Option 3: Donation/Support
- No restrictions, but add "Support This Project" button
- Link to PayPal, Ko-fi, GitHub Sponsors

---

## Build and Test Now

```bash
# 1. Build the package
npm run build:package

# 2. Test the output
cd package
open solas-v3.0.0-standalone.html

# 3. Test in different browsers
# Chrome: open -a "Google Chrome" solas-v3.0.0-standalone.html
# Firefox: open -a Firefox solas-v3.0.0-standalone.html
# Safari: open -a Safari solas-v3.0.0-standalone.html

# 4. Test import/export
# - Add some data
# - Export profile
# - Clear localStorage (Dev Tools → Application → Local Storage → Clear)
# - Import profile back
# - Verify all data restored

# 5. Check file size
ls -lh solas-v3.0.0-standalone.html
```

---

## Next Steps

1. **Immediate** (before distribution):
   - Run `npm run build:package`
   - Test in clean browser
   - Verify calculations are correct
   - Add automatic backups

2. **Short-term** (nice to have):
   - Add data validation (Zod)
   - Add version management
   - Add storage quota monitoring
   - Improve error messages

3. **Long-term** (future enhancements):
   - PWA for installability
   - Service worker for better offline
   - Electron app for desktop distribution
   - Mobile-optimized version

---

## Summary

**To distribute Solas v3 as a self-contained package:**

1. Run: `npm run build:package`
2. Get: `package/solas-v3.0.0-standalone.html` (single file)
3. Send via: Email, Dropbox, Google Drive, USB, or host online
4. Users: Double-click to open, all data stays local
5. No server, no database, no accounts needed

**Your users get**:
- ✅ Complete financial planning tool
- ✅ Works offline after first load
- ✅ All data stays on their device
- ✅ No subscription, no accounts
- ✅ Privacy-first design

**You control**:
- ✅ When to release updates
- ✅ Who gets the file
- ✅ Version distribution
- ✅ No hosting costs (if using HTML file)
