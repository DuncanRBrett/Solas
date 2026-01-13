# GitHub Repository Setup - DuncanRBrett/Solas

## Quick Start

Follow these steps **exactly** to set up the new Solas repository:

---

## Step 1: Create Repository on GitHub (5 minutes)

### In Your Browser

1. **Go to GitHub**: https://github.com/DuncanRBrett

2. **Click "New repository"** (green button, top right)

3. **Fill in details**:
   - **Repository name**: `Solas` (exactly this, capital S)
   - **Description**: `Privacy-first personal retirement planning tool`
   - **Visibility**: Your choice (Public or Private)
     - Public: Others can see and contribute
     - Private: Only you can see (recommended initially)
   - **Initialize repository**:
     - ❌ **DO NOT** add README
     - ❌ **DO NOT** add .gitignore
     - ❌ **DO NOT** add license
     - (We already have these files locally)

4. **Click "Create repository"**

5. **Leave that page open** - you'll need the commands in Step 3

---

## Step 2: Prepare Local Repository (2 minutes)

### In Terminal

```bash
# Navigate to project
cd /Users/duncan/Documents/Solas/solas-v3-app

# Verify you're in the right place
pwd
# Should show: /Users/duncan/Documents/Solas/solas-v3-app

# Check if Git is already initialized
git status

# If you get "not a git repository", initialize it:
git init

# Create .gitignore (if it doesn't exist)
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build output
dist/
build/
package/

# Environment
.env
.env.local

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Editor
.vscode/
.idea/
*.swp
*.swo

# Test coverage
coverage/

# Temporary files
*.tmp
.cache/
EOF

# Check what files will be committed
git status
```

**Expected output**: Should show lots of files in "Untracked files"

---

## Step 3: Initial Commit (2 minutes)

```bash
# Add all files
git add .

# Verify what's staged
git status
# Should show files in "Changes to be committed"

# Create initial commit
git commit -m "Initial commit: Solas baseline (B+ working code)

- React 19 + Vite build system
- Zustand state management
- Comprehensive features: assets, liabilities, income, expenses, scenarios
- Multi-currency support (ZAR, USD, EUR, GBP)
- Scenario modeling with market crashes
- Portfolio quality analysis
- Import/export functionality
- ~14,500 lines of code across 25+ files

Status: B+ grade - solid architecture, needs verification & robustness
Next: Phase 0 (Foundation & Safety Net)

See HANDOVER.md for full context and upgrade plan."

# Tag this baseline
git tag v3.0.0-baseline

# Verify tag created
git tag
# Should show: v3.0.0-baseline
```

---

## Step 4: Connect to GitHub (3 minutes)

### Copy Commands from GitHub Page

GitHub should show you commands like this (use the SSH version):

```bash
git remote add origin git@github.com:DuncanRBrett/Solas.git
git branch -M main
git push -u origin main
```

### Run Those Commands

```bash
# Add remote (use YOUR exact URL from GitHub)
git remote add origin git@github.com:DuncanRBrett/Solas.git

# Verify remote added
git remote -v
# Should show:
# origin  git@github.com:DuncanRBrett/Solas.git (fetch)
# origin  git@github.com:DuncanRBrett/Solas.git (push)

# Rename branch to main (if needed)
git branch -M main

# Push code to GitHub
git push -u origin main

# Push tags
git push --tags
```

**If you get SSH key error**:
```bash
# Check if you have SSH key
ls -la ~/.ssh
# Should see id_rsa or id_ed25519

# If not, create one:
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key
cat ~/.ssh/id_ed25519.pub
# Copy the output

# Go to GitHub Settings → SSH Keys → Add SSH key
# Paste the key, save

# Try push again
git push -u origin main
```

---

## Step 5: Create Develop Branch (1 minute)

```bash
# Create and switch to develop branch
git checkout -b develop

# Push develop to GitHub
git push -u origin develop

# Switch back to main
git checkout main

# Verify branches
git branch -a
# Should show:
#   develop
# * main
#   remotes/origin/develop
#   remotes/origin/main
```

---

## Step 6: Verify Setup (2 minutes)

### In Browser

1. **Go to**: https://github.com/DuncanRBrett/Solas

2. **Check**:
   - ✅ Repository exists
   - ✅ Files are there (should see package.json, src/, etc.)
   - ✅ Two branches: main and develop
   - ✅ Tag: v3.0.0-baseline (click "tags" or "releases")

3. **Look at files**:
   - Click through src/ folder
   - Open HANDOVER.md
   - Verify everything looks right

### In Terminal

```bash
# Verify everything is clean
git status
# Should show: "nothing to commit, working tree clean"

# Verify remote is correct
git remote get-url origin
# Should show: git@github.com:DuncanRBrett/Solas.git

# Verify branches are up to date
git branch -vv
# Should show main and develop tracking origin
```

---

## Step 7: Set Up Branch Protection (Optional but Recommended)

### In GitHub Web UI

1. **Go to**: https://github.com/DuncanRBrett/Solas/settings/branches

2. **Add rule** for `main` branch:
   - Branch name pattern: `main`
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging (after CI/CD setup)
   - Click "Create"

3. **Add rule** for `develop` branch (optional):
   - Same as above, but less strict

**Why?**: Prevents accidentally pushing directly to main, forces PR workflow

---

## Troubleshooting

### Problem: "Permission denied (publickey)"

**Solution**:
```bash
# Check SSH connection
ssh -T git@github.com
# Should say: "Hi DuncanRBrett! You've successfully authenticated"

# If not, set up SSH key (see Step 4)
```

### Problem: "Repository not found"

**Solution**:
- Check repository name is exactly: `Solas` (capital S)
- Check you're logged into correct GitHub account
- Try HTTPS instead: `https://github.com/DuncanRBrett/Solas.git`

### Problem: "Updates were rejected"

**Solution**:
```bash
# Pull first (if GitHub has changes)
git pull origin main --allow-unrelated-histories

# Then push
git push -u origin main
```

### Problem: Files not showing in GitHub

**Solution**:
```bash
# Check they were committed
git log --oneline
# Should show: "Initial commit..."

# Check they were pushed
git log origin/main --oneline
# Should match local log

# Force push if needed (only on initial setup!)
git push -f origin main
```

---

## Success Checklist

After completing all steps, verify:

- [ ] ✅ Repository exists at https://github.com/DuncanRBrett/Solas
- [ ] ✅ All code files visible in GitHub
- [ ] ✅ Two branches: `main` and `develop`
- [ ] ✅ Tag exists: `v3.0.0-baseline`
- [ ] ✅ README.md, HANDOVER.md, all docs visible
- [ ] ✅ Local git status is clean
- [ ] ✅ Can push and pull without errors
- [ ] ✅ Turas repository completely separate and untouched

---

## Next Steps

**You're done with repository setup!** 🎉

**Now**:
1. In your browser, open: https://github.com/DuncanRBrett/Solas
2. Click "Watch" (get notifications for activity)
3. Click "Star" (bookmark it)
4. Read through the files on GitHub to verify everything is there

**Next session**:
1. Start new conversation with Claude
2. Provide context from HANDOVER.md
3. Begin Phase 0: Foundation & Safety Net

---

## Repository Info Summary

**Name**: Solas
**Owner**: DuncanRBrett
**URL**: https://github.com/DuncanRBrett/Solas
**Clone**: `git clone git@github.com:DuncanRBrett/Solas.git`
**Branches**:
- `main` - Production-ready code
- `develop` - Integration branch
**Current Tag**: v3.0.0-baseline
**Status**: B+ working code, ready for Phase 0

**Separate from**: DuncanRBrett/Turas (completely independent)

---

## Commands Summary (Quick Reference)

```bash
# Setup
cd /Users/duncan/Documents/Solas/solas-v3-app
git init
git add .
git commit -m "Initial commit: Solas baseline"
git tag v3.0.0-baseline

# Connect to GitHub
git remote add origin git@github.com:DuncanRBrett/Solas.git
git branch -M main
git push -u origin main
git push --tags

# Create develop
git checkout -b develop
git push -u origin develop

# Verify
git status
git remote -v
git branch -a
```

---

You're all set! Repository is ready for Phase 0. 🚀
