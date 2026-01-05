# Component Testing Setup

## Quick Start

1. **Install dependencies:**

```bash
bun add -d @testing-library/react @testing-library/jest-dom happy-dom
```

2. **Run tests:**

```bash
bun test components
# or
bun run test:components
```

## What's Included

- ✅ Test setup file (`setup.ts`) - Configures the testing environment
- ✅ Test utilities (`test-utils.tsx`) - Helper functions for rendering components
- ✅ Example test (`card.test.tsx`) - Comprehensive test for the Card component
- ✅ Documentation (`README.md`) - Guide for writing component tests

## Next Steps

1. Install the dependencies above
2. Run the card component tests to verify everything works
3. Use `card.test.tsx` as a template for testing other components

## Troubleshooting

If tests fail with "Cannot find module" errors:
- Make sure all dependencies are installed: `bun install`
- Verify Bun is up to date: `bun --version` (should be 1.1+)

If DOM-related errors occur:
- Ensure `happy-dom` is installed
- Bun should automatically use happy-dom when it's available
