# Solas - Privacy-First Retirement Planning

**A comprehensive personal financial planning tool for DIY investors**

[![Status](https://img.shields.io/badge/status-upgrade_to_production-yellow)]()
[![Version](https://img.shields.io/badge/version-3.0.0--baseline-blue)]()
[![Grade](https://img.shields.io/badge/grade-B+-success)]()

---

## 🚀 New to Solas?

**👉 START HERE: [START-HERE.md](START-HERE.md)**

This will guide you through:
1. Setting up the GitHub repository
2. Reading the key documents
3. Starting Phase 0 (Foundation & Safety Net)

---

## 📋 Quick Links

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[START-HERE.md](START-HERE.md)** | Getting started guide | **Read first** |
| **[HANDOVER.md](HANDOVER.md)** | Complete project context | **Read second** |
| **[UPGRADE-SUMMARY.md](UPGRADE-SUMMARY.md)** | Executive overview | Quick reference |
| **[UPGRADE-PLAN-TO-PRODUCTION.md](UPGRADE-PLAN-TO-PRODUCTION.md)** | Detailed plan | Phase by phase |
| **[GITHUB-SETUP.md](GITHUB-SETUP.md)** | Repository setup | Before starting |

---

## What is Solas?

Solas is a **privacy-first, comprehensive financial planning application** that helps you:

- 📊 **Track net worth** across multiple currencies (ZAR, USD, EUR, GBP)
- 🏖️ **Model retirement scenarios** with sophisticated assumptions
- 📈 **Analyze portfolio quality** and concentration risks
- 💥 **Plan for market crashes** and unexpected expenses
- 👥 **Support multiple profiles** for different planning scenarios

### Key Features

✅ **Privacy-first** - All data stored locally in your browser (no server, no cloud)
✅ **Multi-currency** - Full support for international portfolios
✅ **SA tax-aware** - South African tax calculations
✅ **Comprehensive** - Assets, liabilities, income, expenses, scenarios all in one
✅ **Sophisticated** - Market crashes, age-based expenses, tax-aware withdrawals
✅ **Free & Open** - No subscriptions, no accounts, no tracking

---

## Current Status

**Grade**: B+ (solid foundation, needs verification & robustness)

**What Works**:
- ✅ Comprehensive features fully implemented
- ✅ Clean, modular architecture
- ✅ React 19 + Vite + Zustand
- ✅ Multi-currency support
- ✅ Scenario modeling with market crashes
- ✅ Portfolio quality analysis
- ✅ Import/export functionality

**What Needs Work**:
- ❌ No automated tests (CRITICAL)
- ❌ No data backups (users can lose data)
- ❌ Calculations unverified (no proof they're correct)
- ⚠️ No input validation (bad data breaks app)
- ⚠️ Primitive error handling (29 alerts)

**Goal**: Upgrade to A+ production quality in 6-8 weeks

---

## Technology Stack

- **React** 19.2.0 - UI framework
- **Vite** 7.2.4 - Build tool
- **Zustand** 5.0.9 - State management
- **Chart.js** 4.5.1 - Visualizations
- **XLSX** 0.18.5 - Excel export
- **localStorage** - Data persistence

---

## Getting Started

### For Users (Not Ready Yet)

⚠️ **Solas is currently being upgraded from B+ to production quality.**

Come back in 6-8 weeks for a bulletproof, trustworthy version.

### For Developers (Start Here)

1. **Read**: [START-HERE.md](START-HERE.md)
2. **Set up Git**: [GITHUB-SETUP.md](GITHUB-SETUP.md)
3. **Understand context**: [HANDOVER.md](HANDOVER.md)
4. **Follow the plan**: [UPGRADE-PLAN-TO-PRODUCTION.md](UPGRADE-PLAN-TO-PRODUCTION.md)

### Quick Setup

```bash
# Clone repository (after setup)
git clone git@github.com:DuncanRBrett/Solas.git
cd Solas

# Install dependencies
npm install

# Start development server
npm run dev
# Open http://localhost:5173

# Run tests (after Phase 0)
npm test

# Build for production
npm run build
```

---

## Project Structure

```
solas-v3-app/
├── src/
│   ├── components/       # React UI components
│   │   ├── Dashboard/    # Main dashboard
│   │   ├── Assets/       # Asset management
│   │   ├── Scenarios/    # Scenario modeling
│   │   └── ...
│   ├── services/         # Business logic
│   │   ├── scenarioCalculations.js  # Retirement projections
│   │   ├── portfolioQuality.js      # Portfolio analysis
│   │   └── ...
│   ├── utils/            # Helper functions
│   │   └── calculations.js           # Core financial calculations
│   ├── store/            # Zustand state management
│   │   └── useStore.js
│   └── models/           # Data models
│       └── defaults.js
│
├── Documentation/
│   ├── START-HERE.md                      # 👈 Read first
│   ├── HANDOVER.md                        # Project context
│   ├── UPGRADE-PLAN-TO-PRODUCTION.md      # Detailed upgrade plan
│   ├── UPGRADE-SUMMARY.md                 # Quick overview
│   └── GITHUB-SETUP.md                    # Repository setup
│
├── package.json          # Dependencies & scripts
├── vite.config.js        # Vite configuration
└── README.md             # This file
```

---

## Upgrade Roadmap (6-8 Weeks)

### Phase 0: Foundation (Week 1 - 2 days)
- Git setup with branching
- Testing infrastructure (Vitest)
- CI/CD (GitHub Actions)
- **Automatic data backups** ⚠️ CRITICAL
- Data migration system
- Error boundaries

### Phase 1: Verification (Weeks 2-3)
- 100+ calculation tests
- External verification
- Financial advisor review
- Tax limitation documentation

### Phase 2: Validation (Week 4)
- Zod schema validation
- Input validation components
- Edge case handling

### Phase 3: Polish (Week 5)
- Replace 29 alerts with toasts
- Loading states
- Documentation updates
- Better error messages

### Phase 4: Performance (Week 6)
- React optimization
- List virtualization
- localStorage quota management

### Phase 5: Deployment (Weeks 7-8)
- Deploy to Netlify/GitHub Pages
- Error monitoring (optional)
- Analytics (optional)
- Go live! 🚀

---

## Contributing

We're currently in the upgrade phase. Contributions welcome after Phase 1 is complete.

See [CONTRIBUTING.md](CONTRIBUTING.md) (to be created) for guidelines.

---

## Limitations & Disclaimers

### Tax Calculations
⚠️ **Simplified estimates** - Not comprehensive tax advice

**Included**: Basic SA marginal rates, CGT, dividend withholding
**Not included**: Deductions, lump sum tables, living annuities, estate duty

**Recommendation**: Consult a tax professional for accurate planning

### Portfolio Quality Metrics
✅ **Verified**: Diversification, concentration, staleness
⚠️ **Experimental**: Cost efficiency, advanced metrics

### Data Storage
**Current**: localStorage (browser-based)
- ✅ Privacy-first (no server)
- ⚠️ ~10MB limit
- ⚠️ Cleared if user clears browser cache
- ⚠️ No encryption

**Recommendation**: Export data regularly for backup

---

## Roadmap

### Current (January 2026)
- Phase 0: Foundation & Safety Net
- Repository setup
- Testing infrastructure

### Near-term (February-March 2026)
- Phase 1-2: Verification & Validation
- Professional reviews
- Input validation

### Mid-term (April 2026)
- Phase 3-5: Polish & Deployment
- Production launch
- Public beta

### Future (2026+)
- Advanced portfolio metrics
- Mobile optimization
- PWA capabilities
- Cloud sync (optional)

---

## Support

- **Documentation**: See files in this directory
- **Issues**: [GitHub Issues](https://github.com/DuncanRBrett/Solas/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DuncanRBrett/Solas/discussions)

---

## License

[To be determined]

---

## Acknowledgments

- Inspired by the FIRE (Financial Independence, Retire Early) community
- Built for DIY investors who value privacy
- Special thanks to the South African financial independence community

---

## Related Projects

- **[Turas](https://github.com/DuncanRBrett/Turas)** - Completely separate project (unchanged)

---

**Current Version**: v3.0.0-baseline (B+ grade)
**Target Version**: v3.1.0-production-ready (A+ grade)
**Status**: Upgrade in progress
**Repository**: https://github.com/DuncanRBrett/Solas

**👉 To get started: [START-HERE.md](START-HERE.md)**
test
