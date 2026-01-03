# Linting Setup & Pre-Commit Hook Guide

This document explains how the linting and pre-commit hook system works, and how to ensure it's properly configured.

## Overview

The project uses:
- **Biome** for linting and formatting
- **Husky** for Git hooks
- **Pre-commit hook** that automatically runs `bun run lint:fix` before every commit

## How It Works

### Pre-Commit Hook (`.husky/pre-commit`)

The pre-commit hook:
1. Runs `bun run lint:fix` which auto-fixes linting issues
2. **Fails the commit** if there are unfixable linting errors
3. Stages any files that were auto-fixed

### What Happens When You Commit

1. **If all issues are fixable**: Hook auto-fixes them, stages the changes, commit proceeds
2. **If unfixable errors exist**: Hook blocks the commit with an error message
3. **If you bypass the hook** (`--no-verify`): You can commit, but this is **STRICTLY FORBIDDEN** for AI agents

## Setup Verification

### 1. Check Husky is Configured

```bash
# Should output: .husky
git config --get core.hooksPath
```

If it doesn't output `.husky`, run:
```bash
git config core.hooksPath .husky
```

### 2. Check Hook is Executable

```bash
ls -la .husky/pre-commit
# Should show: -rwxr-xr-x (executable)
```

If not executable, run:
```bash
chmod +x .husky/pre-commit
```

### 3. Verify Hook Content

The hook should:
- Run `bun run lint:fix`
- Check the exit code
- Fail if linting errors remain
- Stage auto-fixed files

Current hook (`.husky/pre-commit`):
```bash
#!/usr/bin/env sh

# Run linting with auto-fix
# This will auto-fix what it can and exit with non-zero if errors remain
if ! bun run lint:fix; then
  echo ""
  echo "❌ Linting failed! Please fix the errors above before committing."
  echo "   Run 'bun run lint' to see the errors."
  exit 1
fi

# Stage any files that were auto-fixed
git add -u
```

### 4. Test the Hook

Create a test file with linting errors:
```bash
echo "const x=1" > test-lint.ts
git add test-lint.ts
git commit -m "test"
```

The hook should:
- Auto-fix the formatting (add spaces)
- Stage the fixed file
- Allow the commit to proceed

Then test with an unfixable error (you'd need to create a real error for this).

## For AI Agents (Cursor, Claude, etc.)

### ⚠️ CRITICAL RULES

1. **ALWAYS run `bun run lint:fix` after making code changes**
2. **NEVER use `git commit --no-verify`** - this bypasses the hook
3. **NEVER commit code with linting errors** - the hook will block it anyway

### Workflow

```bash
# 1. Make your code changes
# ... edit files ...

# 2. Run lint:fix to catch and fix issues early
bun run lint:fix

# 3. Verify no errors remain
bun run lint

# 4. Commit (hook will run automatically)
git add .
git commit -m "your message"
```

### If Commit is Blocked

If the pre-commit hook blocks your commit:

1. Read the error message
2. Run `bun run lint` to see all errors
3. Fix the errors manually
4. Run `bun run lint:fix` again
5. Try committing again

## Troubleshooting

### Hook Not Running

1. Check `git config --get core.hooksPath` outputs `.husky`
2. Check `.husky/pre-commit` is executable (`chmod +x .husky/pre-commit`)
3. Verify Husky is installed: `bun install` (runs `prepare` script)

### Hook Runs But Doesn't Fail

The hook should fail if `bun run lint:fix` exits with non-zero. Verify:
- Biome is configured correctly (`biome.json`)
- `bun run lint:fix` actually fails on errors (test it)

### Bypassing the Hook

**DO NOT BYPASS THE HOOK**. If you use `--no-verify`, you're committing code that may have linting errors, which defeats the purpose of the entire system.

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
- **Pre-commit hook**: `.husky/pre-commit` - runs before commits
- **Package scripts**: `package.json` - defines `lint` and `lint:fix` commands

## Why This Matters

1. **Code Quality**: Ensures consistent formatting and catches errors
2. **CI/CD**: Prevents broken code from entering the repository
3. **Team Collaboration**: Everyone follows the same code style
4. **Automation**: Catches issues before they're committed

## Additional Safeguards

Consider adding:
- **CI/CD checks** that run `bun run lint` and fail if errors exist
- **GitHub branch protection** that requires CI to pass
- **Pre-push hook** (optional) that runs linting before pushing
