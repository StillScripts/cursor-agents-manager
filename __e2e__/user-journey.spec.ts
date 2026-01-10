import { expect, test } from "@playwright/test"

// This test contains a full user journey from signing up to deleting account
// Eventually it will be broken up into separate PRs
test("Full user journey flow", async ({ page }) => {
  await page.goto("http://localhost:3000/")
  await expect(page.getByRole("main")).toContainText("Open Source & Free")
  await expect(page.locator("h1")).toContainText(
    "Your AI Agents,In Your Pocket"
  )
  await expect(
    page.getByRole("link", { name: "Cursor Agents Manager Cursor" })
  ).toBeVisible()
  await expect(page.getByRole("banner")).toContainText("Get Started")
  const page1Promise = page.waitForEvent("popup")
  await page.getByRole("button", { name: "Get Started" }).click()
  const page1 = await page1Promise
  await page1.getByRole("textbox", { name: "Name" }).click()
  await page1.getByRole("textbox", { name: "Name" }).fill("Playwright")
  await page1.getByRole("textbox", { name: "Name" }).press("Tab")
  await page1
    .getByRole("textbox", { name: "Email" })
    .fill("playwright@example.com")
  await page1.getByRole("textbox", { name: "Email" }).press("Tab")
  await page1
    .getByRole("textbox", { name: "Password", exact: true })
    .fill("Testing")
  await page1
    .getByRole("textbox", { name: "Password", exact: true })
    .press("Tab")
  await page1.getByRole("textbox", { name: "Confirm Password" }).fill("Testing")
  await page1.getByRole("textbox", { name: "Confirm Password" }).press("Tab")
  await page1.getByRole("button", { name: "Create Account" }).press("Enter")
  await page1.getByRole("button", { name: "Create Account" }).press("Enter")
  await page1.getByRole("button", { name: "Create Account" }).click()
  await expect(page1.getByText("Password must be at least 8")).toBeVisible()
  await page1.getByText("Password must be at least 8").click()
  await expect(page1.locator("form")).toContainText(
    "Password must be at least 8 characters"
  )
  await page1.getByRole("textbox", { name: "Password", exact: true }).click()
  await page1
    .getByRole("textbox", { name: "Password", exact: true })
    .fill("Testing!")
  await page1.getByRole("textbox", { name: "Confirm Password" }).click()
  await page1
    .getByRole("textbox", { name: "Confirm Password" })
    .fill("Testing!")
  await page1.getByRole("button", { name: "Create Account" }).click()
  await expect(page1.getByRole("heading")).toContainText("Your Agents")
  await page1.getByText("You need a cursor key to use").click()
  await expect(page1.getByText("You need a cursor key to use")).toBeVisible()
  await expect(page1.getByRole("paragraph")).toContainText(
    "You need a cursor key to use this feature."
  )
  await expect(
    page1.getByRole("button", { name: "Go to Account Settings" })
  ).toBeVisible()
  await expect(page1.getByRole("link", { name: "Agents" })).toBeVisible()
  await expect(page1.getByRole("link", { name: "Tasks" })).toBeVisible()
  await page1.getByRole("link", { name: "New" }).click()
  await page1.getByRole("link", { name: "Agents" }).click()
  await page1.getByRole("button", { name: "Go to Account Settings" }).click()
  await expect(page1.getByRole("main")).toContainText("Playwright")
  await page1.getByText("playwright@example.com").click()
  await page1
    .getByRole("link", { name: "Settings App preferences and" })
    .click()
  await page1.getByRole("textbox", { name: "Paste GitHub URL..." }).click()
  await page1
    .getByRole("textbox", { name: "Paste GitHub URL..." })
    .fill("https://github.com/StillScripts/cursor-agents-manager")
  await page1
    .getByText(
      "Paste GitHub URLs to quickly add repositories for agent launches.Add"
    )
    .click()
  await page1.getByRole("button", { name: "Add", exact: true }).click()
  await expect(page1.locator('[id="_r_l_"]')).toContainText(
    "cursor-agents-manager"
  )
  await expect(page1.getByText("StillScripts")).toBeVisible()
  await expect(page1.locator('[id="_r_l_"]')).toContainText("StillScripts")
  await page1.getByRole("button", { name: "Save Repositories" }).click()
  await expect(page1.getByRole("heading", { name: "Settings" })).toBeVisible()
  await expect(page1.getByRole("heading")).toContainText("Settings")
  await page1
    .locator("header")
    .filter({ hasText: "Settings" })
    .getByRole("button")
    .click()
  await page1.getByRole("button", { name: "Sign Out" }).click()
  await page1.getByRole("textbox", { name: "Email" }).click()
  await page1
    .getByRole("textbox", { name: "Email" })
    .fill("playwright@example.com")
  await page1.getByRole("textbox", { name: "Password" }).click()
  await page1.getByRole("textbox", { name: "Password" }).fill("fyhrebfredfrf")
  await page1.getByRole("button", { name: "Sign In" }).click()
  await expect(page1.getByText("Error")).toBeVisible()
  await expect(page1.locator('[id="_r_t_"]')).toContainText("Error")
  await expect(page1.getByText("Invalid email or password")).toBeVisible()
  await expect(page1.locator('[id="_r_t_"]')).toContainText(
    "Invalid email or password"
  )
  await page1.getByRole("textbox", { name: "Password" }).click()
  await page1.getByRole("textbox", { name: "Password" }).fill("Password!")
  await page1.getByRole("button", { name: "Sign In" }).click()
  await page1.getByRole("textbox", { name: "Password" }).click()
  await page1.getByRole("textbox", { name: "Password" }).fill("Password!!!")
  await page1.getByRole("button", { name: "Sign In" }).click()
  await page1.getByRole("textbox", { name: "Password" }).click()
  await page1.getByRole("textbox", { name: "Password" }).click()
  await page1.getByRole("textbox", { name: "Password" }).fill("Testing!")
  await page1.getByRole("button", { name: "Sign In" }).click()
  await page1.getByRole("link", { name: "Tasks" }).click()
  await page1.getByRole("heading", { name: "Track New Task" }).click()
  await expect(page1.getByRole("heading")).toContainText("Track New Task")
  await page1.getByRole("link", { name: "New" }).click()
  await expect(
    page1.getByRole("heading", { name: "Launch Agent" })
  ).toBeVisible()
  await page1.getByRole("heading", { name: "Launch Agent" }).click()
  await page1.getByRole("link", { name: "Account" }).click()
  await page1.getByRole("button", { name: "Delete Account" }).click()
  await expect(
    page1.getByRole("heading", { name: "Delete Account?" })
  ).toBeVisible()
  await expect(page1.locator("#base-ui-_r_k_")).toContainText("Delete Account?")
  await page1.getByRole("textbox", { name: 'Type "DELETE" to confirm' }).click()
  await page1
    .getByRole("textbox", { name: 'Type "DELETE" to confirm' })
    .fill("DELETE")
  await page1.getByRole("button", { name: "Delete Account" }).click()
  await expect(
    page1.locator("div").filter({ hasText: /^Sign In$/ })
  ).toBeVisible()
  await expect(page1.locator("body")).toContainText("Sign In")
})
