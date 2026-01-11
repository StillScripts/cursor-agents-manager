import { expect, test } from "@playwright/test"

test("Full user journey flow", async ({ page }) => {
  // ==================== SETUP ====================
  // Generate unique test email with timestamp to avoid conflicts
  const timestamp = Date.now()
  const testEmail = `playwright-${timestamp}@example.com`
  const testPassword = "Testing1"

  // ==================== LANDING PAGE ====================
  // Visit the landing page and verify key elements
  await page.goto("http://localhost:3000/")
  await expect(page.getByRole("main")).toContainText("Open Source & Free")

  // ==================== SIGN UP FLOW ====================
  // Click "Get Started" button and wait for new tab/popup (it uses target="_blank")
  const page1Promise = page.waitForEvent("popup")
  await page.getByRole("button", { name: "Get Started" }).click()
  const page1 = await page1Promise

  // Fill in sign up form
  await page1.getByRole("textbox", { name: "Name" }).fill("Playwright")
  await page1.getByRole("textbox", { name: "Email" }).fill(testEmail)
  await page1
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(testPassword)
  await page1
    .getByRole("textbox", { name: "Confirm Password" })
    .fill("Testing2") // Intentionally wrong password to test validation

  // Submit form and verify password mismatch error
  await page1.getByRole("button", { name: "Create Account" }).click()
  await expect(page1.locator("form")).toContainText("Passwords do not match")

  // Fix password mismatch and resubmit
  // Note: Name field sometimes gets reset, so we refill it
  await page1.getByRole("textbox", { name: "Name" }).fill("Playwright")
  await page1
    .getByRole("textbox", { name: "Confirm Password" })
    .fill(testPassword)
  await page1.getByRole("button", { name: "Create Account" }).click()

  // ==================== DASHBOARD & API KEY PROMPT ====================
  // Verify successful sign up - user lands on agents page
  await expect(page1.getByRole("heading")).toContainText("Your Agents")
  await expect(page1.getByRole("paragraph")).toContainText(
    "You need a cursor key to use this feature."
  )

  // Navigate to account settings
  await page1.getByRole("button", { name: "Go to Account Settings" }).click()
  await expect(page1.getByRole("main")).toContainText("Playwright")
  await expect(page1.getByRole("main")).toContainText(testEmail)
  await expect(page1.getByRole("main")).toContainText(
    "Unlock AI-Powered Features"
  )

  // ==================== SETTINGS CONFIGURATION ====================
  // Navigate to settings page
  await page1
    .getByRole("link", { name: "Settings App preferences and" })
    .click()

  // Add branches for testing
  await page1.getByRole("button", { name: "Add Branch" }).click()
  await page1.locator('input[name="branches[1].name"]').fill("main")
  await page1.getByRole("button", { name: "Add Branch" }).click()
  await page1.locator('input[name="branches[2].name"]').fill("develop")
  await page1.getByRole("button", { name: "Add Branch" }).click()
  await page1.locator('input[name="branches[3].name"]').fill("sample")
  await page1.getByRole("button", { name: "Save Branches" }).click()

  // ==================== NAVIGATION TEST ====================
  // Navigate to Launch Agent page and verify branch selection works
  await page1.getByRole("link", { name: "New" }).click()
  await page1.getByText("Select branch...▼").click()
  await page1.getByText("develop").click()

  // ==================== SIGN OUT ====================
  // Navigate to account page and sign out
  // Note: Test accounts created during E2E tests will remain in the database.
  // They can be manually cleaned up or managed via Better Auth's recommended approach.
  await page1.getByRole("link", { name: "Account" }).click()
  await page1.getByRole("button", { name: "Sign Out" }).click()

  // ==================== SIGN IN FLOW ====================
  // Verify redirect to sign in page
  await expect(page1.locator("body")).toContainText("Sign In")
  await expect(page1.locator("body")).toContainText(
    "Sign in to your Cursor Agent Manager account"
  )

  // Sign in with the test account credentials
  await page1.getByRole("textbox", { name: "Email" }).fill(testEmail)
  await page1.getByRole("textbox", { name: "Password" }).fill(testPassword)
  await page1.getByRole("button", { name: "Sign In" }).click()

  // Logged back in, final action is to delete account...
  await expect(page1.getByRole("heading")).toContainText("Your Agents")
  await page1.getByRole("button", { name: "Go to Account Settings" }).click()
  await page1.getByRole("button", { name: "Delete Account" }).click()
  await page1
    .getByRole("textbox", { name: 'Type "DELETE" to confirm' })
    .fill("DELETE")
  await page1.getByRole("button", { name: "Delete Account" }).click()
  // Back on home page
  await expect(page.getByRole("main")).toContainText("Open Source & Free")
})
