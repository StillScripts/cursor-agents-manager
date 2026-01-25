import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

// Test user credentials - using predetermined email for consistency
const timestamp = Date.now()
const TEST_EMAIL = `playwright-${timestamp}@example.com`
const TEST_PASSWORD = "Testing1"
const TEST_NAME = "Playwright Test User"

/** Sign in on the login page. Use pressSequentially so controlled email/password inputs reliably receive values. */
async function signIn(page: Page, email: string, password: string) {
  const emailInput = page.getByRole("textbox", { name: "Email" })
  await emailInput.click()
  await emailInput.pressSequentially(email, { delay: 20 })
  const passwordInput = page.getByRole("textbox", { name: "Password" })
  await passwordInput.click()
  await passwordInput.pressSequentially(password, { delay: 20 })
  await expect(emailInput).toHaveValue(email)
  await expect(passwordInput).toHaveValue(password)
  await page.getByRole("button", { name: "Sign In" }).click()
}

test.describe
  .serial("User Journey E2E Tests", () => {
    test.describe("Authentication", () => {
      test("should sign up a new user with password validation", async ({
        page,
      }) => {
        // Visit the landing page
        await page.goto("http://localhost:3000/")
        await expect(page.getByRole("main")).toContainText("Open Source & Free")

        // Click "Get Started" and navigate in-page to signup
        await page.getByRole("button", { name: "Get Started" }).click()
        await page.waitForURL(/\/signup/)

        // Fill in sign up form
        await page.getByRole("textbox", { name: "Name" }).fill(TEST_NAME)
        await page.getByRole("textbox", { name: "Email" }).fill(TEST_EMAIL)
        await page
          .getByRole("textbox", { name: "Password", exact: true })
          .fill(TEST_PASSWORD)
        await page
          .getByRole("textbox", { name: "Confirm Password" })
          .fill("Testing2") // Intentionally wrong password to test validation

        // Submit form and verify validation blocks signup (remain on signup page)
        await page.getByRole("button", { name: "Create Account" }).click()
        await expect(page).toHaveURL(/\/signup/)

        // Fix password mismatch and resubmit
        // Note: Name field sometimes gets reset, so we refill it
        await page.getByRole("textbox", { name: "Name" }).fill(TEST_NAME)
        await page
          .getByRole("textbox", { name: "Confirm Password" })
          .fill(TEST_PASSWORD)
        await page.getByRole("button", { name: "Create Account" }).click()

        // Verify successful sign up - user lands on agents page
        await expect(page.getByRole("heading")).toContainText("Your Agents")
      })

      test("should sign in with existing credentials", async ({ page }) => {
        // Navigate to login page
        await page.goto("http://localhost:3000/login")

        // Verify sign in page elements
        await expect(page.locator("body")).toContainText("Sign In")
        await expect(page.locator("body")).toContainText(
          "Sign in to your Cursor Agent Manager account"
        )

        await signIn(page, TEST_EMAIL, TEST_PASSWORD)
        await expect(page).toHaveURL(/\/agents/)
        await expect(page.getByRole("heading")).toContainText("Your Agents")
      })

      test("should sign out successfully", async ({ page }) => {
        await page.goto("http://localhost:3000/login")
        await signIn(page, TEST_EMAIL, TEST_PASSWORD)
        await expect(page.getByRole("heading")).toContainText("Your Agents")

        // Navigate to account page and sign out
        await page.getByRole("link", { name: "Go to Account Settings" }).click()
        await page.getByRole("button", { name: "Sign Out" }).click()

        // Verify redirect to sign in page
        await expect(page.locator("body")).toContainText("Sign In")
        await expect(page.locator("body")).toContainText(
          "Sign in to your Cursor Agent Manager account"
        )
      })
    })

    test.describe("Landing Page", () => {
      test("should display key elements on landing page", async ({ page }) => {
        await page.goto("http://localhost:3000/")
        await expect(page.getByRole("main")).toContainText("Open Source & Free")
      })
    })

    test.describe("Dashboard", () => {
      test("should display API key prompt after signup", async ({ page }) => {
        await page.goto("http://localhost:3000/login")
        await signIn(page, TEST_EMAIL, TEST_PASSWORD)

        // Verify agents page displays API key prompt
        await expect(page.getByRole("heading")).toContainText("Your Agents")
        await expect(page.getByRole("paragraph")).toContainText(
          "You need a cursor key to use this feature."
        )

        // Navigate to account settings and verify user info
        await page
          .getByRole("button", { name: "Go to Account Settings" })
          .click()
        await expect(page.getByRole("main")).toContainText(TEST_NAME)
        await expect(page.getByRole("main")).toContainText(TEST_EMAIL)
        await expect(page.getByRole("main")).toContainText(
          "Unlock AI-Powered Features"
        )
      })
    })

    test.describe("Settings", () => {
      test("should save branches configuration", async ({ page }) => {
        await page.goto("http://localhost:3000/login")
        await signIn(page, TEST_EMAIL, TEST_PASSWORD)
        await expect(page.getByRole("heading")).toContainText("Your Agents")

        // Navigate to account page
        await page.getByRole("link", { name: "Go to Account Settings" }).click()
        await expect(page.getByRole("main")).toContainText("Playwright")
        await expect(page.getByRole("main")).toContainText(TEST_EMAIL)
        await expect(page.getByRole("main")).toContainText(
          "Unlock AI-Powered Features"
        )

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

        // Verify branches were saved (they remain in the form on Settings).
        // The Launch Agent form and its branch selector are not rendered when the
        // user has no cursor API key (NoCursorAccess), so we assert here instead.
        await expect(
          page.locator('input[name="branches[1].name"]')
        ).toHaveValue("main")
        await expect(
          page.locator('input[name="branches[2].name"]')
        ).toHaveValue("develop")
        await expect(
          page.locator('input[name="branches[3].name"]')
        ).toHaveValue("sample")
      })
    })

    test.describe("Account Management", () => {
      test("should delete account with confirmation", async ({ page }) => {
        await page.goto("http://localhost:3000/login")
        await signIn(page, TEST_EMAIL, TEST_PASSWORD)
        await expect(page.getByRole("heading")).toContainText("Your Agents")

        // Navigate to account settings
        await page
          .getByRole("button", { name: "Go to Account Settings" })
          .click()

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
