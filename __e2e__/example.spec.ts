import { expect, test } from "@playwright/test"

test("landing page has correct title", async ({ page }) => {
  await page.goto("/")

  // Expect the landing page heading to be visible
  // The heading is "Your AI Agents, In Your Pocket" split across lines
  await expect(
    page.getByRole("heading", { name: /Your AI Agents/i })
  ).toBeVisible()

  // Also verify the subtitle text is present
  await expect(page.getByText(/Launch Cursor background agents/i)).toBeVisible()
})
