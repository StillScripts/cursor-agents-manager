# Linting Enforcement - Complete Solution

This document explains the **linting enforcement system** that ensures code with linting errors **cannot** be merged into the repository.

## The Problem

Cursor agents (and other AI tools) were committing code with linting errors. This happened because:
1. Local hooks can be bypassed
2. Agents might not run `lint:fix` before pushing
3. No automated enforcement at the repository level

## The Solution: GitHub Actions

We now have **two GitHub Actions** that enforce linting:

### Action 1: Lint Check (Main Branch)

**File**: `.github/workflows/biome-lint-check.yml`

**What it does**:
1. Runs on every push to `main` branch
2. Checks for linting errors using `bun run lint`
3. **Fails the workflow** if any errors exist

**Why it's effective**:
- ✅ **Cannot be bypassed** - runs automatically on GitHub
- ✅ **Blocks merging** - if branch protection is enabled, pushes with failed workflows are blocked
- ✅ **Catches everything** - validates all code on main branch

### Action 2: Lint Check & Fix (Pull Requests)

**File**: `.github/workflows/biome-lint-fix.yml`

**What it does**:
1. Runs on every pull request to `main` branch
2. Auto-fixes linting issues using `bun run lint:fix`
3. Checks for remaining errors using `bun run lint`
4. **Fails the workflow** if any unfixable errors exist

**Why it's effective**:
- ✅ **Cannot be bypassed** - runs automatically on GitHub
- ✅ **Blocks merging** - if branch protection is enabled, PRs with failed workflows cannot be merged
- ✅ **Auto-fixes** - fixes what it can automatically
- ✅ **Catches everything** - validates all code in PRs

### Manual Commands (Developer Responsibility)

**Commands**:
- `bun run lint` - Check for errors
- `bun run lint:fix` - Auto-fix errors

**Why it's important**:
- ✅ Fix issues **before** pushing (faster feedback)
- ✅ Understand what's being fixed
- ✅ Required for AI agents (see AGENTS.md)

## How It Works in Practice

### Scenario 1: Agent pushes with linting errors

1. Agent makes changes and commits
2. Agent pushes to GitHub (directly to main or via PR)
3. **GitHub Action runs automatically**
4. **On main**: Action runs `bun run lint` (checks for errors)
5. **On PR**: Action runs `bun run lint:fix` (auto-fixes), then `bun run lint` (checks remaining)
6. **If errors exist**: Workflow fails ❌
7. **If branch protection enabled**: Push/PR cannot proceed
8. Agent must fix errors and push again

### Scenario 2: All issues are auto-fixable (PR only)

1. Code has formatting issues (fixable)
2. GitHub Action runs `bun run lint:fix` on PR
3. Issues are auto-fixed ✅
4. Action runs `bun run lint` to verify
5. Workflow passes ✅
6. PR can be merged

### Scenario 3: Developer follows best practices

1. Developer makes changes
2. Developer runs `bun run lint:fix` locally
3. Developer runs `bun run lint` to verify
4. Developer commits and pushes
5. GitHub Action runs as final check ✅
6. Everything proceeds normally

## Setting Up Branch Protection (Recommended)

To make the GitHub Actions **truly unbypassable**, enable branch protection:

1. Go to GitHub repository → Settings → Branches
2. Add a branch protection rule for `main`
3. Enable "Require status checks to pass before merging"
4. Select both "Biome Lint Check" and "Biome Lint Check & Fix" workflows
5. Save

**Result**: Code with linting errors **cannot be merged**, even by repository admins.

## For AI Agents

**MANDATORY WORKFLOW**:

```bash
# 1. Make your changes
# ... edit files ...

# 2. ALWAYS run lint:fix before pushing
bun run lint:fix

# 3. Verify no errors remain
bun run lint

# 4. Commit and push
git add .
git commit -m "your message"
git push
```

**Rules**:
1. ✅ **ALWAYS** run `bun run lint:fix` after making changes
2. ❌ **NEVER** push code with linting errors (GitHub Action will fail anyway)
3. ✅ **ALWAYS** verify with `bun run lint` before pushing

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

### Both workflows failing

This means you have **unfixable linting errors**. You must:
1. Read the error messages in the workflow logs
2. Fix the errors manually
3. Run `bun run lint:fix` again
4. Verify with `bun run lint` that all errors are fixed
5. Commit and push the fixes

## Summary

- **GitHub Actions**: Primary enforcement, cannot be bypassed, blocks merging
- **Manual commands**: Developer responsibility, fastest feedback

**Result**: Code with linting errors **cannot** be merged into the repository.
