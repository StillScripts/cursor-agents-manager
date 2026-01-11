import { expect, test } from "@playwright/test"

/**
 * Full User Journey Test
 *
 * This test covers the complete user flow:
 * 1. Landing page visit
 * 2. Sign up with password validation
 * 3. Dashboard navigation and API key prompt
 * 4. Settings configuration (repositories)
 * 5. Sign out and sign in with error handling
 * 6. Navigation through main pages
 * 7. Account deletion
 */
// test("Full user journey flow", async ({ page }) => {
//   // ==================== LANDING PAGE ====================
//   // Visit the landing page and verify key elements
//   await page.goto("http://localhost:3000/")
//   await expect(page.getByRole("main")).toContainText("Open Source & Free")
//   await expect(page.locator("h1")).toContainText(
//     "Your AI Agents,In Your Pocket"
//   )
//   await expect(
//     page.getByRole("link", { name: "Cursor Agents Manager Cursor" })
//   ).toBeVisible()
//   await expect(page.getByRole("banner")).toContainText("Get Started")

//   // ==================== SIGN UP FLOW ====================
//   // Verify "Get Started" button is visible before clicking
//   const getStartedButton = page.getByRole("button", { name: "Get Started" })
//   await expect(getStartedButton).toBeVisible({ timeout: 5000 })

//   // Click "Get Started" button and wait for new tab/popup (it uses target="_blank")
//   const newPagePromise = page.context().waitForEvent("page")
//   await getStartedButton.click()
//   const page1 = await newPagePromise

//   // Wait for the signup page to load - wait for both URL and network idle
//   await page1.waitForURL("**/signup", { timeout: 10000 })
//   await page1.waitForLoadState("domcontentloaded")

//   await expect(
//     page1.getByRole("button", { name: "Create Account" })
//   ).toBeVisible()

//   // Also verify form elements are ready - use specific selectors to avoid ambiguity
//   await expect(page1.getByRole("textbox", { name: "Name" })).toBeVisible({
//     timeout: 5000,
//   })

//   // Fill in sign up form - use specific selectors to avoid multiple matches
//   // Use getByRole for text inputs, and locator for password fields
//   await page1.getByRole("textbox", { name: "Name" }).fill("Playwright")
//   await page1
//     .getByRole("textbox", { name: "Email" })
//     .fill("playwright@example.com")
//   await page1
//     .locator('input[type="password"][name="password"]')
//     .fill("Testing!")
//   await page1
//     .locator('input[type="password"][name="confirmPassword"]')
//     .fill("Testing!")

//   await expect(
//     page1.getByRole("button", { name: "Create Account" })
//   ).toBeEnabled()

//   // Wait for navigation after clicking submit
//   await Promise.all([
//     page1.waitForURL("**/agents", { timeout: 10000 }),
//     page1.getByRole("button", { name: "Create Account" }).click(),
//   ])

//   // ==================== DASHBOARD & API KEY PROMPT ====================
//   // Verify successful sign up - user lands on agents page
//   await expect(page1.getByRole("heading")).toContainText("Your Agents")

//   // Verify API key prompt appears (simulation mode)
//   await expect(page1.getByText("You need a cursor key to use")).toBeVisible()
//   await expect(page1.getByRole("paragraph")).toContainText(
//     "You need a cursor key to use this feature."
//   )
//   await expect(
//     page1.getByRole("button", { name: "Go to Account Settings" })
//   ).toBeVisible()

//   // Verify navigation links are visible
//   await expect(page1.getByRole("link", { name: "Agents" })).toBeVisible()
//   await expect(page1.getByRole("link", { name: "Tasks" })).toBeVisible()

//   // ==================== NAVIGATION TEST ====================
//   // Test navigation between pages
//   await page1.getByRole("link", { name: "New" }).click()
//   await page1.getByRole("link", { name: "Agents" }).click()

//   // ==================== SETTINGS CONFIGURATION ====================
//   // Navigate to account settings
//   await page1.getByRole("button", { name: "Go to Account Settings" }).click()
//   await expect(page1.getByRole("main")).toContainText("Playwright")

//   // Go to settings page
//   await page1
//     .getByRole("link", { name: "Settings App preferences and" })
//     .click()

//   // Add a GitHub repository
//   await page1
//     .getByRole("textbox", { name: "Paste GitHub URL..." })
//     .fill("https://github.com/StillScripts/cursor-agents-manager")
//   await page1.getByRole("button", { name: "Add", exact: true }).click()

//   // Verify repository was added
//   await expect(page1.locator('[id="_r_l_"]')).toContainText(
//     "cursor-agents-manager"
//   )
//   await expect(page1.locator('[id="_r_l_"]')).toContainText("StillScripts")

//   // Save repositories and verify success
//   await page1.getByRole("button", { name: "Save Repositories" }).click()
//   await expect(page1.getByRole("heading", { name: "Settings" })).toBeVisible()

//   // ==================== SIGN OUT ====================
//   // Open user menu and sign out
//   await page1
//     .locator("header")
//     .filter({ hasText: "Settings" })
//     .getByRole("button")
//     .click()
//   await page1.getByRole("button", { name: "Sign Out" }).click()

//   // ==================== SIGN IN WITH ERRORS ====================
//   // Attempt sign in with wrong password - use specific selectors
//   await page1
//     .getByRole("textbox", { name: "Email" })
//     .fill("playwright@example.com")
//   await page1
//     .locator('input[type="password"][name="password"]')
//     .fill("fyhrebfredfrf")
//   await page1.getByRole("button", { name: "Sign In" }).click()

//   // Verify error message appears
//   await expect(page1.getByText("Error")).toBeVisible()
//   await expect(page1.locator('[id="_r_t_"]')).toContainText(
//     "Invalid email or password"
//   )

//   // Sign in with correct password
//   await page1
//     .locator('input[type="password"][name="password"]')
//     .fill("Testing!")
//   await page1.getByRole("button", { name: "Sign In" }).click()

//   // ==================== POST-LOGIN NAVIGATION ====================
//   // Navigate to Tasks page
//   await page1.getByRole("link", { name: "Tasks" }).click()
//   await expect(page1.getByRole("heading")).toContainText("Track New Task")

//   // Navigate to Launch Agent page
//   await page1.getByRole("link", { name: "New" }).click()
//   await expect(
//     page1.getByRole("heading", { name: "Launch Agent" })
//   ).toBeVisible()

//   // ==================== ACCOUNT DELETION ====================
//   // Navigate to Account page
//   await page1.getByRole("link", { name: "Account" }).click()

//   // Initiate account deletion
//   await page1.getByRole("button", { name: "Delete Account" }).click()
//   await expect(
//     page1.getByRole("heading", { name: "Delete Account?" })
//   ).toBeVisible()

//   // Confirm deletion by typing "DELETE"
//   await page1
//     .getByRole("textbox", { name: 'Type "DELETE" to confirm' })
//     .fill("DELETE")
//   await page1.getByRole("button", { name: "Delete Account" }).click()

//   // Verify redirect to sign in page after deletion
//   await expect(
//     page1.locator("div").filter({ hasText: /^Sign In$/ })
//   ).toBeVisible()
//   await expect(page1.locator("body")).toContainText("Sign In")
// })

test("Full user journey flow", async ({ page }) => {
  await page.goto("http://localhost:3000/")
  await expect(page.getByRole("main")).toContainText("Open Source & Free")
  const page1Promise = page.waitForEvent("popup")
  await page.getByRole("button", { name: "Get Started" }).click()
  const page1 = await page1Promise
  await page1.getByText("Name").click()
  await page1.getByRole("textbox", { name: "Name" }).fill("Playwright")
  await page1.getByRole("textbox", { name: "Name" }).press("Tab")
  await page1
    .getByRole("textbox", { name: "Email" })
    .fill("playwright@example.com")
  await page1.getByRole("textbox", { name: "Email" }).press("Tab")
  await page1
    .getByRole("textbox", { name: "Password", exact: true })
    .fill("Testing1")
  await page1
    .getByRole("textbox", { name: "Password", exact: true })
    .press("Tab")
  await page1
    .getByRole("textbox", { name: "Confirm Password" })
    .fill("Testing2")
  await page1.getByRole("button", { name: "Create Account" }).click()
  await expect(page1.locator("form")).toContainText("Passwords do not match")
  await page1.getByRole("textbox", { name: "Confirm Password" }).click()
  await page1
    .getByRole("textbox", { name: "Confirm Password" })
    .fill("Testing1")
  await page1.getByRole("button", { name: "Create Account" }).click()
  await expect(page1.getByRole("heading")).toContainText("Your Agents")
  await expect(page1.getByRole("paragraph")).toContainText(
    "You need a cursor key to use this feature."
  )
  await page1.getByRole("button", { name: "Go to Account Settings" }).click()
  await expect(page1.getByRole("main")).toContainText("Playwright")
  await expect(page1.getByRole("main")).toContainText("playwright@example.com")
  await expect(page1.getByRole("main")).toContainText(
    "Unlock AI-Powered Features"
  )
  await page1
    .getByRole("link", { name: "Settings App preferences and" })
    .click()
  await page1.getByRole("button", { name: "Add Branch" }).click()
  await page1.locator('input[name="branches[1].name"]').click()
  await page1.locator('input[name="branches[1].name"]').fill("main")
  await page1.getByRole("button", { name: "Add Branch" }).click()
  await page1.locator('input[name="branches[2].name"]').click()
  await page1.locator('input[name="branches[2].name"]').fill("develop")
  await page1.getByRole("button", { name: "Save Branches" }).click()
  await page1.getByRole("link", { name: "New" }).click()
  await page1.getByText("Select branch...▼").click()
  await page1.getByText("develop").click()
  await page1.getByRole("link", { name: "Account" }).click()
  await page1.getByRole("button", { name: "Delete Account" }).click()
  await page1.getByRole("button", { name: "Cancel" }).click()
  await page1.getByRole("button", { name: "Sign Out" }).click()
  await expect(page1.locator("body")).toContainText("Sign In")
  await expect(page1.locator("body")).toContainText(
    "Sign in to your Cursor Agent Manager account"
  )
  await page1.getByRole("textbox", { name: "Email" }).click()
  await page1.getByRole("textbox", { name: "Email" }).fill("")
  await page1.locator("div").nth(1).click()
  await page1.getByText("Sign in to your Cursor Agent").click()
  await page1.getByText("Email").click()
  await page1
    .getByRole("textbox", { name: "Email" })
    .fill("playwright@example.com")
  await page1.getByRole("textbox", { name: "Email" }).press("Tab")
  await page1.getByRole("textbox", { name: "Password" }).fill("Testing1")
  await page1.getByRole("button", { name: "Sign In" }).click()
  await page1.getByRole("button", { name: "Go to Account Settings" }).click()
  await page1.getByRole("button", { name: "Delete Account" }).click()
  await page1
    .getByRole("textbox", { name: 'Type "DELETE" to confirm' })
    .fill("DELETE")
  await page1.getByRole("button", { name: "Delete Account" }).click()
  await page1.getByText("[CONVEX M(users:deleteAccount").click()
  await page1.getByText("[CONVEX M(users:deleteAccount").click()
  await page1.getByText("[CONVEX M(users:deleteAccount").click()
  await page1.getByText("Failed to delete account").click()
  await page1.getByText("[CONVEX M(users:deleteAccount").dblclick()
  await page1.locator(".data-open\\:animate-in").first().click()
})
