# Linting Setup Guide

This document explains how the linting system works and how to ensure it's properly configured.

## Overview

The project uses:
- **Biome** for linting and formatting
- **GitHub Actions** that enforce linting on pushes and pull requests

## How It Works

### GitHub Actions

There are **two separate workflows**:

1. **Lint Check** (`.github/workflows/biome-lint-check.yml`)
   - Runs on every push to `main` branch
   - Checks for linting errors using `bun run lint`
   - **Fails the workflow** if any errors exist

2. **Lint Check & Fix** (`.github/workflows/biome-lint-fix.yml`)
   - Runs on every pull request to `main` branch
   - Auto-fixes linting issues using `bun run lint:fix`
   - Checks for remaining errors using `bun run lint`
   - **Fails the workflow** if any unfixable errors remain

### What Happens When You Push

**To main branch**:
1. GitHub Action runs `bun run lint`
2. **If errors exist**: Workflow fails ❌
3. **If no errors**: Workflow passes ✅

**Pull request to main**:
1. GitHub Action runs `bun run lint:fix` (auto-fixes what it can)
2. GitHub Action runs `bun run lint` (checks for remaining errors)
3. **If errors remain**: Workflow fails ❌
4. **If all fixed**: Workflow passes ✅

## For AI Agents (Cursor, Claude, etc.)

### ⚠️ CRITICAL RULES

1. **ALWAYS run `bun run lint:fix` after making code changes**
2. **NEVER push code that has linting errors** - the GitHub Action will fail
3. **ALWAYS verify with `bun run lint` that no errors remain before pushing**

### Workflow

```bash
# 1. Make your code changes
# ... edit files ...

# 2. Run lint:fix to catch and fix issues early
bun run lint:fix

# 3. Verify no errors remain
bun run lint

# 4. Commit and push
git add .
git commit -m "your message"
git push
```

### If GitHub Action Fails

If the GitHub Action fails:

1. Check the workflow logs in GitHub Actions tab
2. Look for the specific linting errors
3. Run `bun run lint` locally to see the same errors
4. Run `bun run lint:fix` to auto-fix what you can
5. Fix any remaining errors manually
6. Commit and push the fixes

## Manual Linting Commands

```bash
# Check for linting errors (doesn't fix)
bun run lint

# Auto-fix linting issues
bun run lint:fix

# Format code only (without linting)
bun run format
```

## Configuration Files

- **Biome config**: `biome.json` - defines linting rules and formatting
- **GitHub Actions**: 
  - `.github/workflows/biome-lint-check.yml` - lint check on main
  - `.github/workflows/biome-lint-fix.yml` - lint check & fix on PRs
- **Package scripts**: `package.json` - defines `lint` and `lint:fix` commands

## Why This Matters

1. **Code Quality**: Ensures consistent formatting and catches errors
2. **CI/CD**: Prevents broken code from entering the repository
3. **Team Collaboration**: Everyone follows the same code style
4. **Automation**: Catches issues before they're merged

## Setting Up Branch Protection (Recommended)

To make the GitHub Actions **truly unbypassable**, enable branch protection:

1. Go to GitHub repository → Settings → Branches
2. Add a branch protection rule for `main`
3. Enable "Require status checks to pass before merging"
4. Select both "Biome Lint Check" and "Biome Lint Check & Fix" workflows
5. Save

**Result**: PRs with linting errors **cannot be merged**, even by repository admins.

## Troubleshooting

### GitHub Action is failing

1. Check the workflow logs in GitHub Actions tab
2. Look for the specific linting errors
3. Run `bun run lint` locally to see the same errors
4. Run `bun run lint:fix` to auto-fix what you can
5. Fix any remaining errors manually
6. Commit and push the fixes

### Workflow not running

1. Check that the workflow files exist in `.github/workflows/`
2. Verify the workflow triggers match your branch/push pattern
3. Check GitHub Actions tab for any workflow errors
