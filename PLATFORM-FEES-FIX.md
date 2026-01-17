# Platform Fees - Fix Summary

## ✅ Issue 1: Combined Fee Type Support - FIXED

### What was changed:

1. **FeesSettings.jsx** - Added "Combined (% + Fixed)" option
   - Location: `src/components/Settings/FeesSettings.jsx`
   - Added new option in dropdown (line 210)
   - Added UI form fields for combined fee type (lines 277-339)
   - Added display for combined fees in view mode (lines 364-368)

2. **feeCalculations.js** - Added calculation logic for combined fees
   - Location: `src/services/feeCalculations.js`
   - Added `case 'combined'` in `calculateAssetPlatformFee` (lines 77-113)
   - Added `case 'combined'` in `calculateScenarioYearFees` (lines 558-579)

### How to use:

1. Go to Settings → Fees & Platforms
2. Click "Edit" on a platform
3. Select "Combined (% + Fixed)" from Fee Type dropdown
4. Enter both:
   - Percentage Fee (e.g., 0.50%)
   - Fixed Amount (e.g., R50/month)
5. Save

Example: A platform charging 0.5% p.a. + R50/month will now calculate:
- Annual fee = (Asset Value × 0.005) + (R50 × 12) = percentage component + R600 fixed

---

## 🔍 Issue 2: Platform Fees Showing as 0 - DEBUGGING

### Why fees might show as 0:

There are **3 common reasons** fees show as 0:

1. ❌ **No platforms configured**
   - Fix: Go to Settings → Fees & Platforms → Add platforms

2. ❌ **Assets don't have platform assigned**
   - Fix: Edit each asset and select a platform from dropdown

3. ❌ **Assets are marked as "Non-Investible"**
   - Fix: Fee calculations only apply to assets where `assetType = "Investible"`

### How to debug:

**Option 1: Use the debug script (RECOMMENDED)**

1. Open your Solas app in browser (run `npm run dev` if not running)
2. Open browser DevTools (F12 or right-click → Inspect)
3. Go to Console tab
4. Copy and paste the contents of `debug-platform-fees.js`
5. Press Enter
6. Read the output - it will tell you exactly what's wrong

**Option 2: Manual check**

1. Open browser DevTools → Application tab → Local Storage
2. Find `solas_profiles` key
3. Check the JSON structure for:
   - `settings.platforms` - are platforms configured with fee structures?
   - `assets[].platform` - do assets have platform IDs assigned?
   - `assets[].assetType` - are assets marked as "Investible"?

### Expected data structure:

```javascript
// Platform in settings
{
  id: "easyequities",
  name: "Easy Equities",
  feeStructure: {
    type: "percentage",  // or "fixed" or "combined"
    rate: 0.25           // for percentage/combined
    amount: 50,          // for fixed/combined (optional)
    frequency: "monthly", // for fixed/combined (optional)
    currency: "ZAR"      // for fixed/combined (optional)
  }
}

// Asset with platform assigned
{
  id: "abc-123",
  name: "Satrix MSCI World",
  assetType: "Investible",  // MUST be "Investible" for fees to apply
  platform: "easyequities",  // MUST match a platform.id
  units: 100,
  currentPrice: 500,
  // ... other fields
}
```

### Code flow for fee calculation:

1. `Fees.jsx` calls `calculateTotalAnnualFees(assets, settings)` (line 57)
2. That calls `calculatePlatformFees(assets, settings)` (line 241)
3. For each asset:
   - Skip if `asset.assetType !== 'Investible'` (line 94)
   - Skip if `!asset.platform` (line 98-101)
   - Find platform: `platforms.find(p => p.id === platformId)` (line 103)
   - Skip if platform not found (line 104-106)
   - Calculate fee using `calculateAssetPlatformFee()` (line 108)

### Quick fixes:

**If platforms are not configured:**
```
1. Settings → Fees & Platforms
2. Scroll to "Add New Platform"
3. Enter Platform ID (e.g., "easyequities")
4. Enter Platform Name (e.g., "Easy Equities")
5. Enter Fee (e.g., 0.25)
6. Click "Add Platform"
7. Click "Save Fee Settings" at bottom
```

**If assets don't have platforms assigned:**
```
1. Assets page
2. Click "Edit" on each asset
3. Find "Platform" dropdown
4. Select the platform
5. Click "Save"
```

**If assets are "Non-Investible":**
```
1. Assets page
2. Click "Edit" on the asset
3. Change "Asset Type" to "Investible"
4. Click "Save"
```

---

## Testing the fix:

After making changes:

1. Go to Fees page
2. You should see:
   - "What You're Paying This Year" section showing platform fees
   - Table showing fees broken down by asset
   - Lifetime projection

If still showing 0:
- Run the debug script (see above)
- Check browser console for errors (F12 → Console tab)
- Verify data structure in localStorage

---

## Files modified:

1. `src/components/Settings/FeesSettings.jsx`
   - Added combined fee type option
   - Added UI for combined fee configuration
   - Added display for combined fees

2. `src/services/feeCalculations.js`
   - Added calculation logic for combined fees in 2 places

3. `debug-platform-fees.js` (NEW)
   - Diagnostic script to identify fee calculation issues

---

## Need more help?

If fees are still showing as 0 after running the debug script:

1. Check the browser console for errors
2. Verify the platform IDs match exactly (case-sensitive)
3. Make sure you clicked "Save Fee Settings" after configuring platforms
4. Try refreshing the page
5. Check that assets have values (units × currentPrice > 0)
