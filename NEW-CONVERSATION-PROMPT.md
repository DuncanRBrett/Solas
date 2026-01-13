# New Conversation Prompt

**Copy and paste this when starting a new conversation with Claude:**

---

I'm working on **Solas** - a privacy-first retirement planning web application.

## Project Context

- **Location**: `/Users/duncan/Documents/Solas/solas-v3-app`
- **Repository**: `DuncanRBrett/Solas` (new, separate from Turas)
- **Current State**: B+ working code, ready for upgrade to production quality (A+)
- **Timeline**: 6-8 weeks upgrade plan
- **Tech Stack**: React 19 + Vite + Zustand + Chart.js

## Please Read These Documents

1. **HANDOVER.md** - Complete project context and current state
2. **UPGRADE-SUMMARY.md** - Quick executive overview of the upgrade plan
3. **UPGRADE-PLAN-TO-PRODUCTION.md** - Detailed implementation plan (focus on Phase 0 for now)

## Key Decisions Already Made

We are aligned on:
- ✅ **Web app approach** (not single file distribution)
- ✅ **Separate repository from Turas** (DuncanRBrett/Solas)
- ✅ **Explicit about limitations** (warning banners, not pretending perfection)
- ✅ **Modular portfolio quality** (clear upgrade path for future sophistication)
- ✅ **Maintainability first** (handoff-ready code, high test coverage)
- ✅ **Never break the working app** (feature branches, incremental upgrades)

## Current Status

**What Works** (B+):
- Comprehensive features fully implemented
- Clean, modular architecture (~14,500 lines across 25+ files)
- Multi-currency support with SA tax awareness
- Scenario modeling with market crashes
- Portfolio quality analysis
- Import/export functionality

**Critical Gaps**:
1. ❌ No automated tests (EXTREME risk)
2. ❌ No data backups (users can lose everything)
3. ❌ Calculations unverified (no proof they're correct)
4. ⚠️ No input validation (bad data breaks app)
5. ⚠️ 29 alerts (unprofessional UI)
6. ⚠️ localStorage quota not handled (app crashes when full)

## What We're Starting

**Phase 0: Foundation & Safety Net** (Week 1, 2 days)

Goals:
- Set up Git with proper branching strategy
- Add automated testing infrastructure (Vitest)
- Set up CI/CD (GitHub Actions)
- **Implement automatic data backups** ⚠️ MOST CRITICAL
- Add data migration system
- Add error boundaries

## Key Files to Review

Before we start, you should be aware of these key files:

1. **src/utils/calculations.js** (497 lines)
   - Core financial calculations (currency, net worth, allocation, tax)
   - Currently has ZERO tests

2. **src/services/scenarioCalculations.js** (641 lines)
   - Retirement projection engine
   - Market crashes, age-based expenses, tax-aware withdrawals
   - Currently has ZERO tests

3. **src/store/useStore.js** (442 lines)
   - Zustand state management
   - Profile management, CRUD operations
   - No automatic backups yet

## First Task

Let's start with **Phase 0: Foundation & Safety Net**.

Specifically, I want to begin with:
1. Setting up Git properly (if not done in GITHUB-SETUP.md)
2. Installing testing infrastructure (Vitest)
3. Implementing automatic data backups (CRITICAL - prevents data loss)

## Questions Before We Start?

Please confirm you've read:
- HANDOVER.md (context)
- UPGRADE-SUMMARY.md (overview)
- Phase 0 section of UPGRADE-PLAN-TO-PRODUCTION.md (implementation details)

Then let me know if you have any questions before we begin Phase 0.

---

**Ready to proceed when you are!**
