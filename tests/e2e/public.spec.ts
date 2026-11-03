import { expect, test } from "@playwright/test";

test("home renders an honest unconfigured state with security headers", async ({ page }) => {
  const response = await page.goto("/"); expect(response?.ok()).toBeTruthy();
  await expect(page.getByLabel("MediaMatrix home")).toBeVisible();
  // Several catalog sections can independently render the same honest configuration state.
  await expect(page.getByRole("heading", { name: "Connect TMDB to load real content" }).first()).toBeVisible();
  await expect(page.getByText(/honest empty state rather than sample data/).first()).toBeVisible();
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("public discovery API exposes no credentials and fails honestly without TMDB", async ({ request }) => {
  const response = await request.get("/api/public/discover?type=movie&page=1", { headers: { "x-request-id": "phase2-e2e-discovery" } }); expect(response.status()).toBe(503);
  expect(response.headers()["x-request-id"]).toBe("phase2-e2e-discovery");
  const body = await response.json(); expect(body.error.code).toBe("DISCOVERY_UNAVAILABLE"); expect(JSON.stringify(body)).not.toContain("TMDB_ACCESS_TOKEN");
  expect(response.headers()["access-control-allow-origin"]).toBe("*");
});

test("successful API responses also propagate the validated request ID", async ({ request }) => {
  const response = await request.get("/api/search/suggestions?q=a", { headers: { "x-request-id": "phase2-e2e-success" } });
  expect(response.status()).toBe(200);
  expect(response.headers()["x-request-id"]).toBe("phase2-e2e-success");
  expect(await response.json()).toEqual({ results: [] });
});

test("mobile navigation and search remain usable", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-specific assertion");
  await page.goto("/"); await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByLabel("Open search").click(); await page.getByLabel("Search movies and TV").press("Escape");
  await expect(page.getByLabel("Search movies and TV")).toBeHidden(); await expect(page.getByLabel("Open search")).toBeFocused();
  await page.getByLabel("Open search").click(); await page.getByLabel("Search movies and TV").fill("arrival"); await page.getByLabel("Search movies and TV").press("Enter");
  await expect(page).toHaveURL(/\/search\?q=arrival/); await expect(page.getByRole("heading", { name: "Search the matrix" })).toBeVisible();
});
