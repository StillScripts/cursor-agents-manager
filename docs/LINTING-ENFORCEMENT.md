# Linting Enforcement - Complete Solution

This document explains the **complete multi-layer linting enforcement system** that ensures code with linting errors **cannot** be merged into the repository.

## The Problem

Cursor agents (and other AI tools) were committing code with linting errors, even with pre-commit hooks in place. This happened because:
1. Pre-commit hooks can be bypassed with `--no-verify`
2. Hooks might not run in all environments
3. Agents might not run `lint:fix` before committing

## The Solution: Multi-Layer Enforcement

We now have **three layers of protection**:

### Layer 1: GitHub Action (PRIMARY - Cannot be bypassed)

**File**: `.github/workflows/biome-lint.yml`

**What it does**:
1. Runs on every push to `main` and `cursor/**` branches
2. Runs on every pull request to `main`
3. Auto-fixes linting issues using `bun run lint:fix`
4. Checks for remaining errors using `bun run lint`
5. **Fails the workflow** if any unfixable errors exist

**Why it's effective**:
- ✅ **Cannot be bypassed** - runs automatically on GitHub
- ✅ **Blocks merging** - if branch protection is enabled, PRs with failed workflows cannot be merged
- ✅ **Catches everything** - even if local hooks are bypassed
- ✅ **Auto-fixes** - fixes what it can automatically

### Layer 2: Pre-Commit Hook (Local Development)

**File**: `.husky/pre-commit`

**What it does**:
1. Runs automatically before every local commit
2. Auto-fixes linting issues using `bun run lint:fix`
3. Stages auto-fixed files
4. **Blocks the commit** if unfixable errors remain

**Why it's useful**:
- ✅ Catches issues **before** pushing
- ✅ Saves time by fixing issues locally
- ✅ Provides immediate feedback

**Limitation**:
- ⚠️ Can be bypassed with `git commit --no-verify` (but GitHub Action will catch it)

### Layer 3: Manual Commands (Developer Responsibility)

**Commands**:
- `bun run lint` - Check for errors
- `bun run lint:fix` - Auto-fix errors

**Why it's important**:
- ✅ Fix issues **before** committing (faster feedback)
- ✅ Understand what's being fixed
- ✅ Required for AI agents (see AGENTS.md)

## How It Works in Practice

### Scenario 1: Agent commits with linting errors

1. Agent makes changes and commits (maybe bypasses hook with `--no-verify`)
2. Agent pushes to GitHub
3. **GitHub Action runs automatically**
4. Action runs `bun run lint:fix` (auto-fixes what it can)
5. Action runs `bun run lint` (checks for remaining errors)
6. **If errors remain**: Workflow fails ❌
7. **If branch protection enabled**: PR cannot be merged
8. Agent must fix errors and push again

### Scenario 2: Developer commits locally

1. Developer makes changes
2. Developer runs `git commit`
3. **Pre-commit hook runs automatically**
4. Hook runs `bun run lint:fix` (auto-fixes what it can)
5. **If errors remain**: Commit is blocked ❌
6. Developer fixes errors and commits again
7. Developer pushes (GitHub Action also runs as backup)

### Scenario 3: All issues are auto-fixable

1. Code has formatting issues (fixable)
2. Pre-commit hook or GitHub Action runs `bun run lint:fix`
3. Issues are auto-fixed ✅
4. Files are staged/committed automatically
5. Everything proceeds normally

## Setting Up Branch Protection (Recommended)

To make the GitHub Action **truly unbypassable**, enable branch protection:

1. Go to GitHub repository → Settings → Branches
2. Add a branch protection rule for `main` (and `cursor/**` if desired)
3. Enable "Require status checks to pass before merging"
4. Select "Biome Lint & Fix" workflow
5. Save

**Result**: PRs with linting errors **cannot be merged**, even by repository admins.

## For AI Agents

**MANDATORY WORKFLOW**:

```bash
# 1. Make your changes
# ... edit files ...

# 2. ALWAYS run lint:fix before committing
bun run lint:fix

# 3. Verify no errors remain
bun run lint

# 4. Commit (hook will run as backup)
git add .
git commit -m "your message"

# 5. Push (GitHub Action will run as final check)
git push
```

**Rules**:
1. ✅ **ALWAYS** run `bun run lint:fix` after making changes
2. ❌ **NEVER** use `git commit --no-verify`
3. ❌ **NEVER** push code with linting errors (GitHub Action will fail anyway)

## Troubleshooting

### GitHub Action is failing

1. Check the workflow logs in GitHub Actions tab
2. Look for the specific linting errors
3. Run `bun run lint` locally to see the same errors
4. Run `bun run lint:fix` to auto-fix what you can
5. Fix any remaining errors manually
6. Commit and push the fixes

### Pre-commit hook not running

1. Check `git config --get core.hooksPath` (should output `.husky`)
2. Check `.husky/pre-commit` is executable (`chmod +x .husky/pre-commit`)
3. Run `bun install` to ensure Husky is set up

### Both hooks failing

This means you have **unfixable linting errors**. You must:
1. Read the error messages
2. Fix the errors manually
3. Run `bun run lint:fix` again
4. Verify with `bun run lint` that all errors are fixed

## Summary

- **GitHub Action**: Primary enforcement, cannot be bypassed, blocks merging
- **Pre-commit hook**: Local safeguard, catches issues early
- **Manual commands**: Developer responsibility, fastest feedback

**Result**: Code with linting errors **cannot** be merged into the repository, even if hooks are bypassed locally.
