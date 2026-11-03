import { expect, test } from "@playwright/test";

const mediaSuggestion = {
  kind: "media",
  media: { id: 238, type: "movie", title: "Playwright fixture movie", posterPath: null, releaseDate: "2026-01-01" },
};
const personSuggestion = {
  kind: "person",
  person: { id: 11, name: "Playwright fixture person", profilePath: null, knownForDepartment: "Acting" },
};

test("search suggestions expose loading, validated results, and keyboard navigation", async ({ page }) => {
  let releaseRoute: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { releaseRoute = () => resolve(); });
  await page.route("**/api/search/suggestions?**", async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results: [mediaSuggestion, personSuggestion, { kind: "media", media: { id: 9, type: "movie", title: 42 } }] }),
    });
  });

  await page.goto("/search");
  const search = page.getByRole("combobox", { name: "Search catalog" });
  await search.fill("fixture");
  await expect(search).toHaveAttribute("aria-busy", "true");
  await expect(page.getByText("Loading search suggestions", { exact: true })).toBeAttached();
  releaseRoute();

  const listbox = page.getByRole("listbox", { name: "Search suggestions" });
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole("option")).toHaveCount(2);
  await expect(search).toHaveAttribute("aria-busy", "false");

  await search.press("Escape");
  await expect(listbox).toBeHidden();
  await search.press("ArrowUp");
  await expect(listbox).toBeVisible();
  await expect(search).toHaveAttribute("aria-activedescendant", "catalog-search-suggestions-option-1");
  await search.press("Escape");
  await expect(listbox).toBeHidden();
  await search.press("ArrowDown");
  await expect(listbox).toBeVisible();
  await expect(search).toHaveAttribute("aria-activedescendant", "catalog-search-suggestions-option-0");
  await expect(listbox.getByRole("option").nth(0)).toHaveAttribute("aria-selected", "true");
  await search.press("ArrowDown");
  await expect(search).toHaveAttribute("aria-activedescendant", "catalog-search-suggestions-option-1");
  await search.press("ArrowUp");
  await expect(search).toHaveAttribute("aria-activedescendant", "catalog-search-suggestions-option-0");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/movie\/238$/);
});

for (const scenario of [
  { name: "empty", status: 200, body: { results: [] }, text: "No suggestions found.", role: "status" as const },
  { name: "error", status: 503, body: { error: { code: "UPSTREAM_UNAVAILABLE" } }, text: "Suggestions are unavailable. Press Enter to run your search.", role: "alert" as const },
]) {
  test(`search suggestions render an honest ${scenario.name} state`, async ({ page }) => {
    await page.route("**/api/search/suggestions?**", (route) => route.fulfill({
      status: scenario.status,
      contentType: "application/json",
      body: JSON.stringify(scenario.body),
    }));
    await page.goto("/search");
    const search = page.getByRole("combobox", { name: "Search catalog" });
    await search.fill("fixture");
    await expect(page.getByRole(scenario.role).filter({ hasText: scenario.text })).toBeVisible();
    await expect(search).toHaveAttribute("aria-expanded", "true");
    await expect(search).toHaveAttribute("aria-busy", "false");
  });
}

test("catalog filters are labelled, preserve related parameters, and reset", async ({ page }) => {
  await page.goto("/movies");
  await expect(page.getByRole("heading", { name: "Movies", exact: true })).toBeVisible();
  const releaseYear = page.getByRole("combobox", { name: "Release year", exact: true });
  await expect(releaseYear).toHaveCount(1);
  await releaseYear.selectOption("2025");
  await expect(page).toHaveURL(/\/movies\?sort=popularity\.desc&year=2025$/);
  const sort = page.getByRole("combobox", { name: "Sort by", exact: true });
  await expect(sort).toHaveCount(1);
  await sort.selectOption("revenue.desc");
  await expect(page).toHaveURL(/year=2025/);
  await expect(page).toHaveURL(/sort=revenue.desc/);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/movies$/);
});

test("keyboard focus is visible and reduced-motion preferences are honored", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();
  await page.keyboard.press("Tab");
  const home = page.getByLabel("MediaMatrix home");
  await expect(home).toBeFocused();
  await expect(home).toHaveCSS("outline-style", "solid");
  await expect(home).toHaveCSS("outline-color", "rgb(244, 63, 94)");

  const transitionSeconds = await page.locator("header").evaluate((element) => {
    const duration = getComputedStyle(element).transitionDuration;
    return duration.endsWith("ms") ? Number.parseFloat(duration) / 1000 : Number.parseFloat(duration);
  });
  expect(transitionSeconds).toBeLessThanOrEqual(0.00001);
});

test("discovery pages do not introduce horizontal document overflow", async ({ page }) => {
  for (const pathname of ["/", "/movies", "/search"]) {
    await page.goto(pathname);
    await expect(page.getByLabel("MediaMatrix home")).toBeVisible();
    const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(dimensions.content, `${pathname} should fit the viewport`).toBeLessThanOrEqual(dimensions.viewport + 1);
  }
});
