#!/usr/bin/env node

/**
 * Package Solas v3 for distribution
 *
 * Creates a single HTML file that includes all JavaScript and CSS,
 * ready to be sent to users who can run it locally.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');
const packagePath = path.join(__dirname, '..', 'package');

// Ensure package directory exists
if (!fs.existsSync(packagePath)) {
  fs.mkdirSync(packagePath, { recursive: true });
}

console.log('📦 Packaging Solas v3 for distribution...\n');

// Read the built files
const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
const jsFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.js'));
const cssFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.css'));

console.log(`Found ${jsFiles.length} JS files and ${cssFiles.length} CSS files`);

let html = indexHtml;

// Inline JavaScript
jsFiles.forEach(file => {
  const jsContent = fs.readFileSync(path.join(distPath, file), 'utf-8');
  const scriptTag = `<script type="module" crossorigin src="./${file}"></script>`;
  const inlineScript = `<script type="module">\n${jsContent}\n</script>`;
  html = html.replace(scriptTag, inlineScript);
  console.log(`✓ Inlined ${file} (${(jsContent.length / 1024).toFixed(1)} KB)`);
});

// Inline CSS
cssFiles.forEach(file => {
  const cssContent = fs.readFileSync(path.join(distPath, file), 'utf-8');
  const linkTag = `<link rel="stylesheet" crossorigin href="./${file}">`;
  const inlineStyle = `<style>\n${cssContent}\n</style>`;
  html = html.replace(linkTag, inlineStyle);
  console.log(`✓ Inlined ${file} (${(cssContent.length / 1024).toFixed(1)} KB)`);
});

// Add metadata and instructions
const version = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')).version;
const buildDate = new Date().toISOString().split('T')[0];

html = html.replace(
  '<head>',
  `<head>
    <!-- Solas v${version} - Built ${buildDate} -->
    <!-- Standalone version - All data stored locally in your browser -->
    <!-- Instructions: Open this file in any modern browser (Chrome, Firefox, Safari, Edge) -->`
);

// Write the packaged file
const outputFile = path.join(packagePath, `solas-v${version}-standalone.html`);
fs.writeFileSync(outputFile, html);

const fileSizeKB = (fs.statSync(outputFile).size / 1024).toFixed(1);
console.log(`\n✅ Package created successfully!`);
console.log(`📄 File: ${outputFile}`);
console.log(`📊 Size: ${fileSizeKB} KB`);

// Create a README for distribution
const readme = `# Solas v${version} - Personal Retirement Planning Tool

## What is this?

This is a **standalone, offline-capable** financial planning application. All your data is stored locally in your browser - nothing is sent to any server.

## How to use:

1. **Open the file**: Double-click \`solas-v${version}-standalone.html\` to open it in your default browser
   - Or right-click → Open With → Your preferred browser (Chrome, Firefox, Safari, Edge)

2. **Your data is safe**: All information is stored in your browser's local storage
   - Your data never leaves your computer
   - No internet connection required (except for initial load)
   - No accounts, no passwords, no cloud sync

3. **Backup your data**:
   - Go to Settings → Export Profile to save your data as a file
   - Store the export file somewhere safe (Dropbox, email to yourself, etc.)
   - You can import it back anytime using Settings → Import Profile

## Features:

- 📊 **Dashboard**: Net worth tracking, asset allocation, concentration risk alerts
- 💰 **Assets**: Track investments across multiple currencies and account types
- 💳 **Liabilities**: Manage debts and mortgages
- 📈 **Income**: Model income sources (salary, pensions, rental income, etc.)
- 💸 **Expenses**: Detailed expense tracking with categories
- 🏖️ **Retirement Planning**: See if you're on track to retire comfortably
- 🎯 **Scenarios**: Run "what-if" scenarios (market crashes, inflation, etc.)
- ⚖️ **Rebalancing**: Get advice on portfolio rebalancing

## Important Notes:

⚠️ **Browser Storage Limits**:
- Most browsers allow ~10MB of localStorage
- If you have 500+ assets, consider exporting backups regularly
- Clear browser cache carefully - it will delete your Solas data too

⚠️ **This is NOT Financial Advice**:
- This tool is for planning purposes only
- Consult a qualified financial advisor for professional advice
- The calculations are estimates and may not reflect reality perfectly

⚠️ **Browser Compatibility**:
- Works best in: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Some features may not work in older browsers

## Support & Questions:

- For issues or questions, contact: [Your contact info]
- Source code: [Your repo if open source]
- Version: ${version}
- Built: ${buildDate}

## Privacy:

This application:
- ✅ Runs entirely in your browser
- ✅ Stores data only on your device
- ✅ Makes no network requests (after initial load)
- ✅ Contains no tracking or analytics
- ✅ Is not connected to any database or server
- ✅ Your financial data remains private

---

**Enjoy secure, private financial planning!**
`;

fs.writeFileSync(path.join(packagePath, 'README.txt'), readme);
console.log(`📝 README.txt created`);

console.log(`\n🎉 Ready to distribute!`);
console.log(`\nSend users the entire "package" folder containing:`);
console.log(`  - solas-v${version}-standalone.html (the app)`);
console.log(`  - README.txt (instructions)`);
console.log(`\nUsers can open the HTML file directly in their browser - no installation needed!`);
