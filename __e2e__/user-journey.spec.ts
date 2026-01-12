import { expect, test } from "@playwright/test"

// Test user credentials - using predetermined email for consistency
const TEST_EMAIL = "playwright-test@example.com"
const TEST_PASSWORD = "Testing1"
const TEST_NAME = "Playwright Test User"

describe("User Journey E2E Tests", () => {
  describe("Authentication", () => {
    test("should sign up a new user with password validation", async ({
      page,
    }) => {
      // Visit the landing page
      await page.goto("http://localhost:3000/")
      await expect(page.getByRole("main")).toContainText("Open Source & Free")

      // Click "Get Started" button and wait for new tab/popup (it uses target="_blank")
      const signupPagePromise = page.waitForEvent("popup")
      await page.getByRole("button", { name: "Get Started" }).click()
      const signupPage = await signupPagePromise

      // Fill in sign up form
      await signupPage.getByRole("textbox", { name: "Name" }).fill(TEST_NAME)
      await signupPage.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL)
      await signupPage
        .getByRole("textbox", { name: "Password", exact: true })
        .fill(TEST_PASSWORD)
      await signupPage
        .getByRole("textbox", { name: "Confirm Password" })
        .fill("Testing2") // Intentionally wrong password to test validation

      // Submit form and verify password mismatch error
      await signupPage.getByRole("button", { name: "Create Account" }).click()
      await expect(signupPage.locator("form")).toContainText(
        "Passwords do not match",
      )

      // Fix password mismatch and resubmit
      // Note: Name field sometimes gets reset, so we refill it
      await signupPage.getByRole("textbox", { name: "Name" }).fill(TEST_NAME)
      await signupPage
        .getByRole("textbox", { name: "Confirm Password" })
        .fill(TEST_PASSWORD)
      await signupPage.getByRole("button", { name: "Create Account" }).click()

      // Verify successful sign up - user lands on agents page
      await expect(signupPage.getByRole("heading")).toContainText("Your Agents")
    })

    test("should sign in with existing credentials", async ({ page }) => {
      // Navigate to login page
      await page.goto("http://localhost:3000/login")

      // Verify sign in page elements
      await expect(page.locator("body")).toContainText("Sign In")
      await expect(page.locator("body")).toContainText(
        "Sign in to your Cursor Agent Manager account",
      )

      // Sign in with the test account credentials
      await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL)
      await page.getByRole("textbox", { name: "Password" }).fill(TEST_PASSWORD)
      await page.getByRole("button", { name: "Sign In" }).click()

      // Verify successful login - redirected to agents page
      await expect(page.getByRole("heading")).toContainText("Your Agents")
    })

    test("should sign out successfully", async ({ page }) => {
      // Sign in first
      await page.goto("http://localhost:3000/login")
      await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL)
      await page.getByRole("textbox", { name: "Password" }).fill(TEST_PASSWORD)
      await page.getByRole("button", { name: "Sign In" }).click()
      await expect(page.getByRole("heading")).toContainText("Your Agents")

      // Navigate to account page and sign out
      await page.getByRole("link", { name: "Account" }).click()
      await page.getByRole("button", { name: "Sign Out" }).click()

      // Verify redirect to sign in page
      await expect(page.locator("body")).toContainText("Sign In")
      await expect(page.locator("body")).toContainText(
        "Sign in to your Cursor Agent Manager account",
      )
    })
  })

  describe("Landing Page", () => {
    test("should display key elements on landing page", async ({ page }) => {
      await page.goto("http://localhost:3000/")
      await expect(page.getByRole("main")).toContainText("Open Source & Free")
    })
  })

  describe("Dashboard", () => {
    test("should display API key prompt after signup", async ({ page }) => {
      // Sign in first
      await page.goto("http://localhost:3000/login")
      await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL)
      await page.getByRole("textbox", { name: "Password" }).fill(TEST_PASSWORD)
      await page.getByRole("button", { name: "Sign In" }).click()

      // Verify agents page displays API key prompt
      await expect(page.getByRole("heading")).toContainText("Your Agents")
      await expect(page.getByRole("paragraph")).toContainText(
        "You need a cursor key to use this feature.",
      )

      // Navigate to account settings and verify user info
      await page.getByRole("button", { name: "Go to Account Settings" }).click()
      await expect(page.getByRole("main")).toContainText(TEST_NAME)
      await expect(page.getByRole("main")).toContainText(TEST_EMAIL)
      await expect(page.getByRole("main")).toContainText(
        "Unlock AI-Powered Features",
      )
    })
  })

  describe("Settings", () => {
    test("should save branches configuration", async ({ page }) => {
      // Sign in first
      await page.goto("http://localhost:3000/login")
      await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL)
      await page.getByRole("textbox", { name: "Password" }).fill(TEST_PASSWORD)
      await page.getByRole("button", { name: "Sign In" }).click()
      await expect(page.getByRole("heading")).toContainText("Your Agents")

      // Navigate to settings page
      await page
        .getByRole("link", { name: "Settings App preferences and" })
        .click()

      // Add branches for testing
      await page.getByRole("button", { name: "Add Branch" }).click()
      await page.locator('input[name="branches[1].name"]').fill("main")
      await page.getByRole("button", { name: "Add Branch" }).click()
      await page.locator('input[name="branches[2].name"]').fill("develop")
      await page.getByRole("button", { name: "Add Branch" }).click()
      await page.locator('input[name="branches[3].name"]').fill("sample")
      await page.getByRole("button", { name: "Save Branches" }).click()

      // Verify branches were saved (by checking they appear in branch selector)
      await page.getByRole("link", { name: "New" }).click()
      await page.getByText("Select branch...▼").click()
      await expect(page.getByText("main")).toBeVisible()
      await expect(page.getByText("develop")).toBeVisible()
      await expect(page.getByText("sample")).toBeVisible()
    })
  })

  describe("Navigation", () => {
    test("should navigate to launch agent page and select branch", async ({
      page,
    }) => {
      // Sign in first
      await page.goto("http://localhost:3000/login")
      await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL)
      await page.getByRole("textbox", { name: "Password" }).fill(TEST_PASSWORD)
      await page.getByRole("button", { name: "Sign In" }).click()
      await expect(page.getByRole("heading")).toContainText("Your Agents")

      // Navigate to Launch Agent page
      await page.getByRole("link", { name: "New" }).click()

      // Verify branch selection works
      await page.getByText("Select branch...▼").click()
      await page.getByText("develop").click()

      // Verify branch was selected (dropdown should close and show selected branch)
      await expect(page.getByText("develop")).toBeVisible()
    })
  })

  describe("Account Management", () => {
    test("should delete account with confirmation", async ({ page }) => {
      // Sign in first
      await page.goto("http://localhost:3000/login")
      await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL)
      await page.getByRole("textbox", { name: "Password" }).fill(TEST_PASSWORD)
      await page.getByRole("button", { name: "Sign In" }).click()
      await expect(page.getByRole("heading")).toContainText("Your Agents")

      // Navigate to account settings
      await page.getByRole("button", { name: "Go to Account Settings" }).click()

      // Delete account
      await page.getByRole("button", { name: "Delete Account" }).click()
      await page
        .getByRole("textbox", { name: 'Type "DELETE" to confirm' })
        .fill("DELETE")
      await page.getByRole("button", { name: "Delete Account" }).click()

      // Verify redirect to home page after deletion
      await expect(page.getByRole("main")).toContainText("Open Source & Free")
    })
  })
})
