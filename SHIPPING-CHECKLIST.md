# Solas v3 - Shipping Checklist

Copy this checklist and track your progress.

---

## Phase 1: BUILD IT (30 minutes)

- [ ] Install dependencies: `npm install`
- [ ] Build package: `npm run build:package`
- [ ] Check output: `package/solas-v3.0.0-standalone.html` exists
- [ ] Check size: File is 2-5 MB (reasonable for email)
- [ ] Open file: Double-click, opens in browser
- [ ] Works: Can navigate, add data

**If all checked**: ✅ Package builds successfully!

---

## Phase 2: TEST IT (2 hours)

### Basic Functionality
- [ ] Dashboard loads without errors
- [ ] Can add asset
- [ ] Can add liability
- [ ] Can add income source
- [ ] Can add expense
- [ ] Dashboard shows correct calculations
- [ ] Can create scenario
- [ ] Can run scenario
- [ ] Charts render correctly

### Data Persistence
- [ ] Add some data
- [ ] Close browser completely
- [ ] Reopen file
- [ ] Data is still there
- [ ] Add more data
- [ ] Refresh page (F5)
- [ ] Data is still there

### Export/Import
- [ ] Add test data (10 assets, 5 expenses, 2 scenarios)
- [ ] Export profile (Settings → Export)
- [ ] File downloads as `solas-[name]-[date].json`
- [ ] Open browser DevTools (F12)
- [ ] Go to Application → Local Storage
- [ ] Clear all solas_ keys
- [ ] Refresh page - no data (empty state)
- [ ] Import the exported file (Settings → Import)
- [ ] All data restored correctly
- [ ] Calculations still work

### Offline Mode
- [ ] Open file in browser
- [ ] Add some data
- [ ] Disconnect from internet (turn off WiFi)
- [ ] Refresh page
- [ ] Still works
- [ ] Data still there
- [ ] All features work

### Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge (if on Windows)
- [ ] Test on iPhone Safari
- [ ] Test on Android Chrome

**If all checked**: ✅ Package works correctly!

---

## Phase 3: FIX CRITICAL ISSUES (2-3 days)

### Issue 1: Automatic Backups (2-3 hours)
- [ ] Install dependencies (none needed, use localStorage)
- [ ] Update `saveProfile()` to create timestamped backups
- [ ] Keep only last 5 backups (delete older)
- [ ] Add `getBackups()` function
- [ ] Add `recoverFromBackup()` function
- [ ] Add backup list UI in Settings
- [ ] Test: Add data, check localStorage has backups
- [ ] Test: Corrupt data, restore from backup

### Issue 2: Input Validation (2-3 hours)
- [ ] Install Zod: `npm install zod`
- [ ] Create `src/models/validation.js`
- [ ] Create AssetSchema
- [ ] Create ProfileSettingsSchema
- [ ] Update store to validate on add/update
- [ ] Test: Try to add asset with negative units (should fail)
- [ ] Test: Try to set retirement age < current age (should fail)
- [ ] Test: Valid data still works

### Issue 3: Replace Alerts (1-2 hours)
- [ ] Install toast library: `npm install react-hot-toast`
- [ ] Add Toaster to App.jsx
- [ ] Replace alerts in useStore.js (4 instances)
- [ ] Replace alerts in Settings.jsx (8 instances)
- [ ] Replace alerts in Assets.jsx (1 instance)
- [ ] Replace alerts in Liabilities.jsx (1 instance)
- [ ] Replace alerts in Income.jsx (1 instance)
- [ ] Replace alerts in ExpensesV2.jsx (5 instances)
- [ ] Replace alerts in AgeBasedExpensePlanning.jsx (1 instance)
- [ ] Replace alerts in Scenarios.jsx (1 instance)
- [ ] Replace alert in expenseImportExport.js (1 instance)
- [ ] Test: All messages show as nice toasts

### Issue 4: localStorage Quota (1-2 hours)
- [ ] Create `src/utils/storage.js`
- [ ] Add `getStorageInfo()` function
- [ ] Add `isStorageNearLimit()` function
- [ ] Add `cleanOldBackups()` function
- [ ] Add `safeSetItem()` function
- [ ] Update store to use `safeSetItem()`
- [ ] Add storage monitor to Settings
- [ ] Test: Check storage usage shows correctly
- [ ] Test: Fill storage (add 500+ assets), app handles gracefully

### Issue 5: Error Boundaries (1 hour)
- [ ] Create `src/components/ErrorBoundary.jsx`
- [ ] Wrap App in ErrorBoundary (main.jsx)
- [ ] Add error recovery UI (reload, restore backup, export)
- [ ] Test: Force an error (throw in component)
- [ ] Test: Error boundary catches it, shows recovery UI

### Issue 6: Test Calculations (4-6 hours)
- [ ] Install Vitest: `npm install --save-dev vitest @testing-library/react @testing-library/jest-dom`
- [ ] Create `vitest.config.js`
- [ ] Create `src/test/setup.js`
- [ ] Write tests for `calculations.js` (currency conversion)
- [ ] Write tests for `scenarioCalculations.js` (retirement projection)
- [ ] Create reference scenario with known correct answer
- [ ] Run tests: `npm test`
- [ ] All tests pass

**If all checked**: ✅ Critical issues fixed!

---

## Phase 4: POLISH (1 day, optional but recommended)

### Documentation
- [ ] Update README.md with actual instructions (not Vite template)
- [ ] Add screenshots to README
- [ ] Write user FAQ
- [ ] Write troubleshooting guide
- [ ] Add version number visible in app UI

### User Experience
- [ ] Add first-run tutorial or welcome screen
- [ ] Add sample data option for new users
- [ ] Add "Tip of the Day" or helpful hints
- [ ] Add keyboard shortcuts (document them)
- [ ] Add "What's New" for version updates
- [ ] Improve mobile responsiveness (test on phone)

### Professional Touch
- [ ] Add disclaimer in Settings or About page
- [ ] Add version number in footer
- [ ] Add "Export Reminder" (every 30 days)
- [ ] Add "Last backup" timestamp display
- [ ] Add helpful tooltips on complex fields
- [ ] Spell-check all UI text
- [ ] Consistent terminology (Investible vs Investment)

**If all checked**: ✅ App is polished!

---

## Phase 5: BETA TEST (1 week)

### Recruit Beta Users
- [ ] Find 5-10 people willing to test
- [ ] Mix of technical and non-technical users
- [ ] Send them the package with instructions
- [ ] Ask them to use it for real for 1 week

### What to Ask Beta Users
- [ ] Can you open the file and get started?
- [ ] Is anything confusing?
- [ ] Did you encounter any errors?
- [ ] Do the calculations seem right?
- [ ] Does it work on your device/browser?
- [ ] Would you use this for real?
- [ ] What's missing?

### Track Feedback
- [ ] Create spreadsheet of all feedback
- [ ] Categorize: Critical, Important, Nice-to-have
- [ ] Fix critical issues immediately
- [ ] Fix important issues before launch
- [ ] Add nice-to-haves to backlog

**If all checked**: ✅ Beta tested!

---

## Phase 6: LAUNCH PREP (1 day)

### Final Testing
- [ ] Test in clean browser (incognito, no data)
- [ ] Test all critical user journeys
- [ ] Test export/import one more time
- [ ] Test with realistic data (100+ assets)
- [ ] Test scenario calculations against spreadsheet
- [ ] Check file size is reasonable
- [ ] Check no console errors

### Documentation
- [ ] Create user guide (PDF or webpage)
- [ ] Create email template for distribution
- [ ] Create FAQ document
- [ ] Create "Getting Started" video (optional)
- [ ] Prepare support email responses

### Legal/Compliance
- [ ] Add disclaimer to README
- [ ] Add disclaimer in app
- [ ] Add privacy statement (no data collection)
- [ ] Add license (MIT? All rights reserved?)
- [ ] Add contact info for support

### Distribution Package
- [ ] `solas-v3.0.0-standalone.html` - the app
- [ ] `README.txt` - quick start instructions
- [ ] `FAQ.txt` - common questions
- [ ] `TROUBLESHOOTING.txt` - common issues
- [ ] `LICENSE.txt` - usage terms
- [ ] Zip it all: `solas-v3.0.0-complete.zip`

**If all checked**: ✅ Ready to launch!

---

## Phase 7: LAUNCH (1 day)

### Distribution Method

**Option A: Direct Email**
- [ ] Prepare email text (see QUICK-START-DISTRIBUTION.md)
- [ ] Attach zip file or provide download link
- [ ] Send to initial users
- [ ] Set up support email
- [ ] Monitor for questions

**Option B: Hosted Version**
- [ ] Build: `npm run build`
- [ ] Upload to GitHub Pages / Netlify
- [ ] Test hosted version
- [ ] Get URL
- [ ] Send URL to users

**Option C: Both**
- [ ] Do both A and B
- [ ] Let users choose

### Launch Checklist
- [ ] Support email set up and monitored
- [ ] Prepared to answer questions quickly
- [ ] Backup plan if critical bug found
- [ ] Way to notify users of urgent fixes
- [ ] Tracking who has which version
- [ ] Release notes prepared

**If all checked**: ✅ LAUNCHED! 🚀

---

## Phase 8: POST-LAUNCH (Ongoing)

### First Week
- [ ] Monitor support emails daily
- [ ] Fix critical bugs immediately
- [ ] Document common questions
- [ ] Update FAQ based on questions
- [ ] Check if users are actually using it

### First Month
- [ ] Collect usage feedback
- [ ] Identify most-wanted features
- [ ] Fix reported bugs
- [ ] Release v3.1.0 with improvements
- [ ] Send update announcement

### Ongoing
- [ ] Monthly check-ins with active users
- [ ] Quarterly feature releases
- [ ] Annual major version updates
- [ ] Keep dependencies updated
- [ ] Monitor browser compatibility

---

## Time Estimates

| Phase | Time | Can Skip? |
|-------|------|-----------|
| 1. Build | 30 min | ❌ No |
| 2. Test | 2 hours | ❌ No |
| 3. Fix Critical | 2-3 days | ❌ No |
| 4. Polish | 1 day | ⚠️ Recommended |
| 5. Beta Test | 1 week | ⚠️ Recommended |
| 6. Launch Prep | 1 day | ⚠️ Recommended |
| 7. Launch | 1 day | ❌ No |
| 8. Post-Launch | Ongoing | ❌ No |

**Minimum time to safe launch**: ~1 week (phases 1-3, 7)
**Recommended time to professional launch**: 2-3 weeks (all phases)

---

## Current Status

Check what's done:

- [x] Code assessment completed
- [x] Distribution strategy planned
- [x] Build configuration created
- [x] Packaging script written
- [x] Documentation written
- [ ] Critical issues fixed (YOU ARE HERE)
- [ ] Beta testing completed
- [ ] Launch

---

## Need Help?

- **How-to questions**: Read `QUICK-START-DISTRIBUTION.md`
- **Technical details**: Read `DISTRIBUTION.md`
- **What to fix**: Read `CRITICAL-FIXES-BEFORE-DISTRIBUTION.md`
- **Quick overview**: Read `DISTRIBUTION-SUMMARY.md`
- **This checklist**: `SHIPPING-CHECKLIST.md` (you're here!)

---

## One-Page Summary

```
1. Build it: npm run build:package (30 min)
2. Test it: Open, add data, export/import (2 hours)
3. Fix critical issues: See CRITICAL-FIXES... (2-3 days)
4. Beta test: 5-10 users, 1 week
5. Launch: Email file or host online
6. Support: Answer questions, fix bugs
```

**You're ready when all Phase 1-3 boxes are checked.**

Everything else is optional polish.

---

**Current priority**: Complete Phase 3 (Fix Critical Issues)

Start with Issue #1 (Automatic Backups) - most important for data safety.

Good luck! 🚀
