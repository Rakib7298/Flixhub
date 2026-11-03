import { expect, test } from "@playwright/test";

test("home renders an honest unconfigured state with security headers", async ({ page }) => {
  const response = await page.goto("/"); expect(response?.ok()).toBeTruthy();
  await expect(page.getByLabel("MediaMatrix home")).toBeVisible();
  await expect(page.getByText("Connect TMDB to load real content")).toBeVisible();
  await expect(page.getByText(/honest empty state rather than sample data/)).toBeVisible();
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("public discovery API exposes no credentials and fails honestly without TMDB", async ({ request }) => {
  const response = await request.get("/api/public/discover?type=movie&page=1"); expect(response.status()).toBe(503);
  const body = await response.json(); expect(body.error.code).toBe("DISCOVERY_UNAVAILABLE"); expect(JSON.stringify(body)).not.toContain("TMDB_ACCESS_TOKEN");
  expect(response.headers()["access-control-allow-origin"]).toBe("*");
});

test("mobile navigation and search remain usable", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-specific assertion");
  await page.goto("/"); await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByLabel("Open search").click(); await page.getByLabel("Search movies and TV").fill("arrival"); await page.getByLabel("Search movies and TV").press("Enter");
  await expect(page).toHaveURL(/\/search\?q=arrival/); await expect(page.getByRole("heading", { name: "Search the matrix" })).toBeVisible();
});
