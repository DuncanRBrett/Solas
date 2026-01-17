/**
 * Debug script to check why platform fees are showing as 0
 *
 * Run this in browser console or as a Node script to inspect data
 */

// Instructions to run in browser:
// 1. Open your Solas app in browser
// 2. Open browser console (F12)
// 3. Copy and paste this script
// 4. Check the output

console.log('=== PLATFORM FEE DEBUG ===\n');

// Get data from localStorage
const profilesData = localStorage.getItem('solas_profiles');
if (!profilesData) {
  console.error('❌ No profiles data found in localStorage');
  console.log('This means you need to create a profile first.');
} else {
  const profiles = JSON.parse(profilesData);
  const currentProfileId = localStorage.getItem('solas_currentProfile');
  const currentProfile = profiles.find(p => p.id === currentProfileId) || profiles[0];

  console.log('✓ Found profile:', currentProfile.name);
  console.log('\n--- PLATFORMS CONFIGURED ---');

  const platforms = currentProfile.settings?.platforms || [];
  if (platforms.length === 0) {
    console.warn('⚠️  NO PLATFORMS CONFIGURED');
    console.log('Go to Settings → Fees & Platforms to add platforms');
  } else {
    platforms.forEach((platform, idx) => {
      console.log(`\n${idx + 1}. Platform: ${platform.name}`);
      console.log(`   ID: ${platform.id}`);
      console.log(`   Fee Structure:`, platform.feeStructure);
      if (platform.feeStructure) {
        console.log(`   Type: ${platform.feeStructure.type}`);
        if (platform.feeStructure.type === 'percentage' || platform.feeStructure.type === 'combined') {
          console.log(`   Rate: ${platform.feeStructure.rate}%`);
        }
        if (platform.feeStructure.type === 'fixed' || platform.feeStructure.type === 'combined') {
          console.log(`   Amount: ${platform.feeStructure.currency || 'ZAR'} ${platform.feeStructure.amount}`);
          console.log(`   Frequency: ${platform.feeStructure.frequency}`);
        }
      } else {
        console.warn('   ⚠️  NO FEE STRUCTURE CONFIGURED');
      }
    });
  }

  console.log('\n--- ASSETS ---');
  const assets = currentProfile.assets || [];
  if (assets.length === 0) {
    console.warn('⚠️  NO ASSETS FOUND');
    console.log('Add assets to see fee calculations');
  } else {
    const investibleAssets = assets.filter(a => a.assetType === 'Investible');
    console.log(`Total assets: ${assets.length}`);
    console.log(`Investible assets: ${investibleAssets.length}`);

    console.log('\n--- ASSET PLATFORM ASSIGNMENT ---');
    investibleAssets.forEach((asset, idx) => {
      console.log(`\n${idx + 1}. ${asset.name}`);
      console.log(`   Asset Type: ${asset.assetType}`);
      console.log(`   Platform: ${asset.platform || '❌ NOT ASSIGNED'}`);

      if (!asset.platform) {
        console.warn(`   ⚠️  This asset has NO platform assigned - fees won't be calculated`);
      } else {
        const platform = platforms.find(p => p.id === asset.platform);
        if (!platform) {
          console.error(`   ❌ Platform ID "${asset.platform}" not found in configured platforms`);
        } else {
          console.log(`   ✓ Platform found: ${platform.name}`);
          if (!platform.feeStructure) {
            console.warn(`   ⚠️  Platform "${platform.name}" has no fee structure`);
          } else {
            console.log(`   ✓ Fee structure configured: ${platform.feeStructure.type}`);
          }
        }
      }

      // Calculate asset value
      const value = (asset.units || 0) * (asset.currentPrice || 0);
      console.log(`   Value: ${asset.currency} ${value.toLocaleString()}`);
    });
  }

  console.log('\n--- DIAGNOSIS ---');

  // Check for common issues
  const issues = [];

  if (platforms.length === 0) {
    issues.push('❌ No platforms configured - add platforms in Settings');
  }

  const platformsWithoutFees = platforms.filter(p => !p.feeStructure);
  if (platformsWithoutFees.length > 0) {
    issues.push(`⚠️  ${platformsWithoutFees.length} platform(s) have no fee structure: ${platformsWithoutFees.map(p => p.name).join(', ')}`);
  }

  const investibleAssets = assets.filter(a => a.assetType === 'Investible');
  const assetsWithoutPlatform = investibleAssets.filter(a => !a.platform);
  if (assetsWithoutPlatform.length > 0) {
    issues.push(`❌ ${assetsWithoutPlatform.length} investible asset(s) have no platform assigned: ${assetsWithoutPlatform.map(a => a.name).join(', ')}`);
  }

  const assetsWithInvalidPlatform = investibleAssets.filter(a => {
    if (!a.platform) return false;
    return !platforms.find(p => p.id === a.platform);
  });
  if (assetsWithInvalidPlatform.length > 0) {
    issues.push(`❌ ${assetsWithInvalidPlatform.length} asset(s) assigned to non-existent platforms: ${assetsWithInvalidPlatform.map(a => `${a.name} → ${a.platform}`).join(', ')}`);
  }

  if (issues.length === 0) {
    console.log('✓ All checks passed! Fees should be calculating correctly.');
    console.log('If fees still show as 0, check the browser console for calculation errors.');
  } else {
    console.log('Issues found:');
    issues.forEach(issue => console.log(`  ${issue}`));

    console.log('\n--- HOW TO FIX ---');
    if (platforms.length === 0) {
      console.log('1. Go to Settings → Fees & Platforms tab');
      console.log('2. Add platforms where your assets are held (e.g., Easy Equities, Credo, etc.)');
      console.log('3. Configure fee structures for each platform');
    }

    if (assetsWithoutPlatform.length > 0) {
      console.log('1. Go to Assets page');
      console.log('2. Edit each asset that shows "NOT ASSIGNED"');
      console.log('3. Select the platform from the dropdown');
      console.log('4. Save the asset');
    }
  }
}

console.log('\n=== END DEBUG ===');
