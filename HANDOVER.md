# Solas - Project Handover Document

**Date**: 2026-01-13
**Project**: Solas (Personal Retirement Planning Tool)
**Repository**: DuncanRBrett/Solas
**Current Status**: B+ working code, ready for upgrade to production quality
**AI Model**: Claude Sonnet 4.5 (switch to Opus 4.5 for complex problems)

---

## Project Context

### What is Solas?

Solas is a **privacy-first, comprehensive financial planning web application** that helps users:
- Track net worth across multiple currencies
- Model retirement scenarios with sophisticated assumptions
- Analyze portfolio quality and concentration risks
- Plan for market crashes and unexpected expenses
- Support multiple profiles for different planning scenarios

**Unique Position**:
- ✅ Privacy-first (client-side only, no server)
- ✅ Multi-currency with South African tax focus
- ✅ Comprehensive (assets, liabilities, income, expenses, scenarios)
- ✅ Free and open source
- ✅ Sophisticated modeling (market crashes, tax-aware, age-based expenses)

**Target Users**:
- DIY investors in South Africa
- Expats with SA ties
- FIRE community (internationally)
- Privacy-conscious investors

---

## Current State

### What Works (B+ Grade)

**Architecture**: ✅ Solid
- React 19 + Vite
- Zustand for state management
- Modular component structure
- ~14,500 lines across 25+ files
- Clean separation: components, services, utils, store

**Features**: ✅ Comprehensive
- Dashboard with allocation charts and concentration alerts
- Asset/liability/income/expense tracking
- Multi-currency support (ZAR, USD, EUR, GBP, etc.)
- Scenario modeling with market crashes
- Retirement projections
- Portfolio quality scoring
- Rebalancing advice
- Import/export functionality

**Technology Stack**: ✅ Modern
- React 19.2.0
- Chart.js 4.5.1 (visualizations)
- Zustand 5.0.9 (state)
- XLSX 0.18.5 (Excel export)
- Vite 7.2.4 (build tool)

### What Needs Work

**Critical Issues** (from code assessment):
1. ❌ **No automated tests** (EXTREME risk)
2. ❌ **No data backups** (users can lose everything)
3. ❌ **Calculations unverified** (no proof they're correct)
4. ⚠️ **No input validation** (bad data can break app)
5. ⚠️ **Primitive error handling** (29 alerts, crashes)
6. ⚠️ **Tax calculations simplified** (need warnings)
7. ⚠️ **Portfolio metrics unverified** (experimental)

**Current Grade**: B+ (good architecture, comprehensive features, but lacks verification and robustness)

**Target Grade**: A+ (bulletproof, production-ready, trustworthy)

---

## Decision Record

### Key Decisions Made

1. **Web app approach** (not single file)
   - Easier updates, better performance
   - Still privacy-first (all data in localStorage)
   - Can host on Netlify/GitHub Pages

2. **Separate repository from Turas**
   - DuncanRBrett/Solas (new)
   - DuncanRBrett/Turas (existing, untouched)
   - Zero risk to Turas

3. **Explicit about limitations**
   - Document what's simplified
   - Warning banners in UI
   - Methodology page
   - Professional reviews for credibility

4. **Modular portfolio quality**
   - Each metric self-contained
   - Clear upgrade path
   - Feature flags for experimental metrics

5. **Maintainability first**
   - High test coverage
   - Clear documentation
   - "Handoff ready" code
   - Architecture decision records

6. **AI model strategy**
   - Sonnet 4.5 for most work (fast, accurate)
   - Opus 4.5 for complex problems (calculations, architecture)

---

## Project Plan

### 6-8 Week Upgrade to Production

**Phase 0: Foundation & Safety Net** (Week 1 - 2 days)
- Set up Git with branching strategy
- Add automated testing infrastructure (Vitest)
- Set up CI/CD (GitHub Actions)
- Implement automatic data backups ⚠️ CRITICAL
- Add data migration system
- Add error boundaries

**Phase 1: Calculation Verification** (Weeks 2-3)
- Write 100+ tests for core calculations
- Create reference scenarios with known answers
- Verify against external calculators
- Document tax calculation limitations
- Flag experimental portfolio metrics
- Get financial advisor review

**Phase 2: Input Validation** (Week 4)
- Install Zod for schema validation
- Add validation to all data entry
- Create validated input components
- Handle edge cases gracefully

**Phase 3: UX Polish** (Week 5)
- Replace 29 alerts with toast notifications
- Add loading states and skeletons
- Update all documentation
- Add helpful tooltips

**Phase 4: Performance** (Week 6)
- Optimize React rendering
- Add list virtualization
- localStorage quota management ⚠️ HIGH
- Performance benchmarks

**Phase 5: Deployment** (Weeks 7-8)
- Deploy to Netlify or GitHub Pages
- Add error monitoring (optional: Sentry)
- Add analytics (optional, privacy-conscious)
- Go live!

### Minimum vs Full

**Minimum Viable Production** (4 weeks):
- Phases 0, 1, 2, 4.2 (quota), 5.1 (deploy)
- Enough to ship safely

**Full Professional Release** (6-8 weeks):
- All phases
- Polished, monitored, professional

---

## Repository Setup

### GitHub Repository Structure

**New Repository**: `DuncanRBrett/Solas`

**Branches**:
```
main         Production-ready code only
develop      Integration branch
feature/*    Feature branches
hotfix/*     Emergency fixes
```

**Initial Setup** (do this first):
```bash
cd /Users/duncan/Documents/Solas/solas-v3-app

# Initialize Git (if not already done)
git init

# Create .gitignore (if needed)
echo "node_modules/
dist/
.DS_Store
*.log
.env" > .gitignore

# Initial commit
git add .
git commit -m "Initial commit: Solas baseline (B+ working code)"
git tag v3.0.0-baseline

# Create GitHub repo (do this in GitHub web UI):
# 1. Go to https://github.com/DuncanRBrett
# 2. Click "New repository"
# 3. Name: Solas
# 4. Description: "Privacy-first personal retirement planning tool"
# 5. Public or Private (your choice)
# 6. Don't initialize with README (we have one)
# 7. Click "Create repository"

# Connect to GitHub
git remote add origin git@github.com:DuncanRBrett/Solas.git
git branch -M main
git push -u origin main
git push --tags

# Create develop branch
git checkout -b develop
git push -u origin develop
```

---

## File Structure & Key Files

### Current Project Structure
```
/Users/duncan/Documents/Solas/solas-v3-app/
├── src/
│   ├── components/          # React UI components
│   │   ├── Dashboard/       # Main dashboard
│   │   ├── Assets/          # Asset management
│   │   ├── Income/          # Income tracking
│   │   ├── Expenses/        # Expense tracking
│   │   ├── Liabilities/     # Liability management
│   │   ├── Scenarios/       # Scenario modeling
│   │   ├── Rebalancing/     # Portfolio rebalancing
│   │   └── Settings/        # Settings & configuration
│   │
│   ├── services/            # Business logic
│   │   ├── scenarioCalculations.js    # Retirement projections (641 lines)
│   │   ├── portfolioQuality.js        # Portfolio metrics
│   │   ├── rebalancing.js             # Rebalancing advice
│   │   └── expenseImportExport.js     # Data import/export
│   │
│   ├── utils/               # Helper functions
│   │   ├── calculations.js  # Core financial calculations (497 lines)
│   │   └── importExport.js  # Data import/export utilities
│   │
│   ├── store/               # State management
│   │   └── useStore.js      # Zustand store (442 lines)
│   │
│   ├── models/              # Data models
│   │   └── defaults.js      # Default values and schemas
│   │
│   ├── App.jsx              # Root component
│   └── main.jsx             # Entry point
│
├── public/                  # Static assets
│
├── package.json             # Dependencies (already updated with build:package)
├── vite.config.js           # Vite configuration
├── vite.config.production.js # Production build config (created)
│
├── scripts/
│   └── package.js           # Packaging script (created)
│
└── Documentation (created during planning):
    ├── README.md                               # Main project README (needs update)
    ├── HANDOVER.md                             # This file - start here
    ├── UPGRADE-PLAN-TO-PRODUCTION.md           # Detailed 6-8 week plan (30+ pages)
    ├── UPGRADE-SUMMARY.md                      # Executive summary of upgrade
    ├── DISTRIBUTION.md                         # How to package & distribute
    ├── DISTRIBUTION-SUMMARY.md                 # Quick distribution overview
    ├── QUICK-START-DISTRIBUTION.md             # Step-by-step distribution guide
    ├── CRITICAL-FIXES-BEFORE-DISTRIBUTION.md   # Must-fix security/safety issues
    └── SHIPPING-CHECKLIST.md                   # Task-by-task shipping checklist
```

### Key Documents (Read in This Order)

1. **HANDOVER.md** (this file) - Start here for context
2. **UPGRADE-SUMMARY.md** - 5-minute executive overview
3. **UPGRADE-PLAN-TO-PRODUCTION.md** - Full detailed plan (read before starting work)
4. **CRITICAL-FIXES-BEFORE-DISTRIBUTION.md** - Must-fix issues

**For later** (when ready to ship):
- DISTRIBUTION-SUMMARY.md
- QUICK-START-DISTRIBUTION.md
- SHIPPING-CHECKLIST.md

---

## Critical Information

### Code Assessment Results (from previous session)

**Strengths** (⭐⭐⭐⭐):
- Clean architecture
- Modular structure
- Comprehensive features
- Modern tech stack
- Good separation of concerns

**Critical Gaps**:
1. **Zero tests** - No confidence calculations are correct
2. **No backups** - Users can lose data
3. **No validation** - Bad data breaks calculations
4. **29 alerts** - Unprofessional UI
5. **localStorage quota** - App crashes when full
6. **Tax simplified** - Needs warnings and professional review

**Bottom Line**:
- Good foundation (B+)
- Needs verification & robustness (to get to A+)
- 4-6 weeks to production-ready

---

## Technologies & Dependencies

### Core Dependencies
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "zustand": "^5.0.9",
  "chart.js": "^4.5.1",
  "react-chartjs-2": "^5.3.1",
  "xlsx": "^0.18.5",
  "vite": "^7.2.4"
}
```

### To Add in Phase 0-2
```bash
# Testing
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @vitest/ui @vitest/coverage-v8

# Validation
npm install zod

# UX improvements
npm install react-hot-toast

# Optional (Phase 5)
npm install @sentry/react  # Error monitoring
npm install react-ga4      # Analytics
```

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Known Limitations & Warnings

### Tax Calculations
**What's included**:
- Basic SA marginal tax rates
- CGT with 40% inclusion rate
- Dividend withholding tax (20%)
- Account type awareness (TFSA, RA, Taxable)

**What's NOT included**:
- Deductions (medical aid, retirement contributions)
- Retirement fund lump sum tax tables
- Living annuity withdrawal rules
- CGT annual exclusions (R40,000)
- Primary residence exclusion
- Estate duty

**Action**: Add warning banners, document limitations, get professional review

### Portfolio Quality Metrics
**Verified**:
- Diversification (standard)
- Concentration (standard)
- Price staleness (custom but reasonable)

**Experimental** (needs review):
- Cost efficiency
- Asset allocation scoring
- Quality score weighting

**Action**: Flag experimental metrics in UI, document methodology

### Data Storage
**Current**: localStorage (browser)
- ✅ Privacy-first (no server)
- ✅ Simple implementation
- ⚠️ ~10MB limit per domain
- ⚠️ Cleared if user clears browser cache
- ⚠️ No encryption

**Action**: Automatic backups, export reminders, storage monitoring

---

## Starting a New Session - What to Tell Claude

### Copy This When Starting New Conversation

```
I'm working on Solas - a privacy-first retirement planning web application.

Current state: B+ working code, ready for upgrade to production quality
Repository: DuncanRBrett/Solas (new, separate from Turas)
Location: /Users/duncan/Documents/Solas/solas-v3-app

Please read these documents:
1. HANDOVER.md - Context and current state
2. UPGRADE-SUMMARY.md - Quick overview of upgrade plan
3. UPGRADE-PLAN-TO-PRODUCTION.md - Detailed plan

We are aligned on:
- Web app approach (not single file distribution)
- Explicit about limitations (warnings, not pretending perfection)
- Modular portfolio quality (upgrade path for sophistication)
- Maintainability first (handoff-ready code)
- Separate repo from Turas (zero risk to existing project)

Ready to start Phase 0: Foundation & Safety Net (Week 1, 2 days)

Key files to review:
- src/utils/calculations.js (core calculations, 497 lines)
- src/services/scenarioCalculations.js (retirement projections, 641 lines)
- src/store/useStore.js (state management, 442 lines)

Current working status: App works, no tests, needs verification.

Let's start with setting up Git and implementing automatic backups.
```

---

## Phase 0 Kickoff - First Tasks

### Day 1 Morning (2 hours)

**1. Git Setup** (30 min)
```bash
cd /Users/duncan/Documents/Solas/solas-v3-app

# Verify Git initialized
git status

# Create .gitignore if needed
# (see Repository Setup section above)

# Initial commit and tag
git add .
git commit -m "Initial commit: Solas baseline"
git tag v3.0.0-baseline

# Create GitHub repo (web UI - instructions above)

# Connect and push
git remote add origin git@github.com:DuncanRBrett/Solas.git
git branch -M main
git push -u origin main
git push --tags

# Create develop branch
git checkout -b develop
git push -u origin develop

# Create first feature branch
git checkout -b feature/phase0-foundation
```

**2. Install Testing Infrastructure** (30 min)
```bash
# Install test dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/ui @vitest/coverage-v8

# Create test config (see UPGRADE-PLAN section 0.2)
# Create vitest.config.js
# Create src/test/setup.js

# Verify it works
npm test
```

**3. Set Up CI/CD** (30 min)
```bash
# Create .github/workflows/test.yml
# (see UPGRADE-PLAN section 0.3)

# Commit and push
git add .
git commit -m "feat: add testing infrastructure and CI/CD"
git push -u origin feature/phase0-foundation
```

**4. Quick Break** (30 min)
- Review what we've done
- Check that CI/CD runs on GitHub
- Plan next steps

### Day 1 Afternoon (3 hours)

**5. Implement Automatic Backups** (3 hours)
- Create src/utils/backup.js (see UPGRADE-PLAN section 0.4)
- Update store to use backup system
- Write tests for backup functionality
- Commit: "feat: add automatic versioned backup system"

### Day 2 Morning (2 hours)

**6. Add Data Migration System** (2 hours)
- Create src/utils/migrations.js (see UPGRADE-PLAN section 0.5)
- Update store initialization
- Write migration tests
- Commit: "feat: add data migration system"

### Day 2 Afternoon (2 hours)

**7. Add Error Boundaries** (1 hour)
- Create src/components/ErrorBoundary.jsx (see UPGRADE-PLAN section 0.6)
- Wrap App in error boundary
- Test error handling
- Commit: "feat: add error boundary for crash recovery"

**8. Merge and Deploy** (1 hour)
```bash
# Switch to develop
git checkout develop

# Merge feature branch
git merge feature/phase0-foundation

# Tag the release
git tag v3.0.1-phase0-complete

# Push
git push origin develop
git push --tags

# Test that everything works
npm run dev
# Manually test: add data, check backups exist, test recovery
```

**Phase 0 Complete!** 🎉
- Safety net in place
- Can't lose data
- Can roll back if needed
- Ready for Phase 1 (calculation verification)

---

## Important Patterns & Conventions

### Code Organization
- **One responsibility per file** (< 500 lines)
- **Pure functions for calculations** (easy to test)
- **React components for UI only** (no business logic)
- **Services for business logic** (importable, testable)

### State Management
```javascript
// Store pattern (Zustand)
const useStore = create((set, get) => ({
  // State
  profile: null,

  // Actions
  updateProfile: (updates) => {
    set(state => ({
      profile: { ...state.profile, ...updates }
    }));
    get().saveProfile(); // Always save after update
  },

  saveProfile: () => {
    const { profile } = get();
    localStorage.setItem('key', JSON.stringify(profile));
    createBackup(profile); // Automatic backup
  },
}));
```

### Error Handling
```javascript
// Use try-catch with user-friendly messages
try {
  const result = complexCalculation(data);
  return result;
} catch (error) {
  logError(error, { context: 'calculation', data });
  toast.error('Calculation failed. Please check your inputs.');
  throw new SolasError('Calculation error', ErrorCodes.CALCULATION_ERROR);
}
```

### Testing Pattern
```javascript
// Test structure
describe('Feature', () => {
  it('handles normal case', () => {
    const result = function(normalInput);
    expect(result).toBe(expectedOutput);
  });

  it('handles edge case', () => {
    const result = function(edgeCase);
    expect(result).toBe(expectedEdgeOutput);
  });

  it('throws on invalid input', () => {
    expect(() => function(invalidInput)).toThrow();
  });
});
```

---

## Common Tasks Reference

### Running the App
```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)

# Testing
npm test                 # Run tests in watch mode
npm run test:ui          # Open test UI
npm run test:coverage    # Generate coverage report

# Building
npm run build            # Production build
npm run preview          # Preview production build
npm run build:package    # Build single-file package (for distribution)

# Linting
npm run lint             # Check code style
```

### Common Git Workflow
```bash
# Start new feature
git checkout develop
git pull
git checkout -b feature/my-feature

# Work on feature
git add .
git commit -m "feat: description"

# Push and create PR
git push -u origin feature/my-feature
# Create PR in GitHub: feature/my-feature → develop

# After PR approved
git checkout develop
git merge feature/my-feature
git push

# Clean up
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

### Adding a New Calculation
```bash
# 1. Write test first (TDD)
# src/utils/__tests__/myCalculation.test.js

# 2. Implement function
# src/utils/calculations.js or new file

# 3. Export function
# Add to exports in calculations.js

# 4. Use in component
import { myCalculation } from '@/utils/calculations';

# 5. Document limitations if any
// Add JSDoc comment with warnings

# 6. Commit
git commit -m "feat: add myCalculation with tests"
```

---

## Contact & Support

### Resources
- **Full plan**: UPGRADE-PLAN-TO-PRODUCTION.md
- **Quick start**: UPGRADE-SUMMARY.md
- **Critical fixes**: CRITICAL-FIXES-BEFORE-DISTRIBUTION.md

### Getting Help
- Review relevant documentation first
- Check UPGRADE-PLAN for detailed implementation
- Use Sonnet 4.5 for most work
- Switch to Opus 4.5 for complex problems

### Professional Reviews Needed
- **Financial advisor**: Verify scenario calculations (Week 2-3, ~$500-1000)
- **Tax professional**: Review tax calculations (Week 3-4, ~$300-500)
- **Security audit** (optional): Before public launch

---

## Success Criteria

### Phase 0 Complete When:
- [ ] Git repo set up and pushed to GitHub
- [ ] Testing infrastructure working (`npm test` runs)
- [ ] CI/CD pipeline running on GitHub Actions
- [ ] Automatic backups implemented and tested
- [ ] Data migration system in place
- [ ] Error boundaries catching crashes
- [ ] Tagged: v3.0.1-phase0-complete

### Overall Project Complete When:
- [ ] 100+ tests passing
- [ ] Calculations verified by professional
- [ ] All 29 alerts replaced with toasts
- [ ] Input validation preventing bad data
- [ ] localStorage quota handled gracefully
- [ ] Warning banners for limitations
- [ ] Documentation complete
- [ ] Deployed to Netlify/GitHub Pages
- [ ] 10 beta users tested successfully
- [ ] Tagged: v3.1.0-production-ready

---

## Timeline Expectations

### Realistic Timeline
- **Phase 0**: 2 days (Foundation)
- **Phase 1**: 2-3 weeks (Verification - most critical)
- **Phase 2**: 1 week (Validation)
- **Phase 3**: 1 week (Polish)
- **Phase 4**: 1 week (Performance)
- **Phase 5**: 1-2 weeks (Deployment)

**Total**: 6-8 weeks to production-ready

### Minimum Viable
- Phases 0, 1, 2, 4.2, 5.1 = 4 weeks
- Good enough to ship safely

### Recommended
- All phases = 6-8 weeks
- Professional, polished, monitored

---

## Final Notes

### Philosophy
- **Ship incrementally** - don't wait for perfect
- **Test everything** - no code ships without tests
- **Be honest about limitations** - builds trust
- **Maintainability > cleverness** - code others can read
- **Privacy first** - user data never leaves their device

### Remember
- Turas is completely separate (different repo)
- Never break the working app (feature branches)
- Add warnings where we simplify (don't pretend perfection)
- Document as you go (future you will thank present you)

### You've Got This! 🚀

The foundation is solid (B+). The plan is clear. The path is laid out.

Start with Phase 0, take it step by step, and in 6-8 weeks you'll have a bulletproof application that people can trust with their financial futures.

**Next step**: Create the GitHub repository, then start Phase 0 with automatic backups.

Good luck!
