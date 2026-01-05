# Component Testing

This directory contains tests for React UI components using Bun's test runner and React Testing Library.

## Setup

The component testing setup uses:
- **Bun Test** - Fast native test runner
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Additional DOM matchers
- **happy-dom** - Lightweight DOM implementation

## Installation

Install the required dependencies:

```bash
bun add -d @testing-library/react @testing-library/jest-dom happy-dom
```

## Running Tests

Run all component tests:

```bash
bun test components
# or
bun run test:components
```

Run tests in watch mode:

```bash
bun test --watch components
```

Run a specific test file:

```bash
bun test components/ui/__tests__/card.test.tsx
```

## Test Structure

Each component should have a corresponding test file in its `__tests__` directory:

```
components/
└── ui/
    ├── card.tsx
    └── __tests__/
        ├── setup.ts          # Test environment setup
        ├── test-utils.tsx    # Testing utilities and helpers
        └── card.test.tsx     # Component tests
```

## Writing Tests

### Basic Test Example

```tsx
import { describe, expect, it } from "bun:test"
import { renderWithProviders } from "./test-utils"
import { Card } from "../card"

describe("Card", () => {
  it("renders with content", () => {
    const { container } = renderWithProviders(<Card>Test</Card>)
    expect(container).toHaveTextContent("Test")
  })
})
```

### Using Test Utilities

The `renderWithProviders` function from `test-utils.tsx` wraps components with any necessary providers (ThemeProvider, QueryClient, etc.) and provides all testing-library utilities.

### Available Matchers

Thanks to `@testing-library/jest-dom`, you have access to additional matchers:

- `toBeInTheDocument()`
- `toHaveTextContent()`
- `toHaveClass()`
- `toHaveAttribute()`
- `toBeVisible()`
- And more...

See the [jest-dom documentation](https://github.com/testing-library/jest-dom) for the full list.

## Test Coverage

Aim for comprehensive test coverage including:
- ✅ Basic rendering
- ✅ Props handling (defaults, custom values)
- ✅ Custom className merging
- ✅ Accessibility attributes
- ✅ Component composition
- ✅ Edge cases and error states

## Best Practices

1. **Test behavior, not implementation** - Focus on what the component does, not how it's implemented
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Keep tests isolated** - Each test should be independent
4. **Clean up** - The setup file automatically cleans up after each test
5. **Test user interactions** - Use `fireEvent` or `userEvent` for interaction testing

## Example: Complete Component Test

See `card.test.tsx` for a comprehensive example covering:
- Basic rendering
- Props (size, className)
- All sub-components
- Component composition
- HTML attributes
