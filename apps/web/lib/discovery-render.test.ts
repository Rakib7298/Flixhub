import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MediaSummary } from "@mediamatrix/shared";
import Loading from "@/app/loading";
import { MediaGrid } from "@/components/media-grid";
import { Pagination } from "@/components/pagination";

const media: MediaSummary = {
  id: 238,
  type: "movie",
  title: "Render test fixture",
  originalTitle: "Render test fixture",
  overview: "Fixture only",
  posterPath: null,
  backdropPath: null,
  releaseDate: "2026-01-01",
  rating: 8.1,
  voteCount: 100,
  genreIds: [18],
  popularity: 50,
};

describe("discovery render states", () => {
  it("renders linked media and an honest missing-poster state", () => {
    const html = renderToStaticMarkup(createElement(MediaGrid, { items: [media] }));
    expect(html).toContain("Render test fixture");
    expect(html).toContain("href=\"/movie/238\"");
    expect(html).toContain("Poster unavailable");
    expect(html).toContain("aria-label=\"Render test fixture (2026)\"");
  });

  it("renders an actionable empty state instead of a blank grid", () => {
    const html = renderToStaticMarkup(createElement(MediaGrid, { items: [], emptyTitle: "No matching titles", emptyDescription: "Try fewer filters." }));
    expect(html).toContain("No matching titles");
    expect(html).toContain("Try fewer filters.");
    expect(html).not.toContain("<article");
  });

  it("marks the previous page disabled without adding it to keyboard order", () => {
    const html = renderToStaticMarkup(createElement(Pagination, { page: 1, totalPages: 3, pathname: "/movies", query: { sort: "popularity.desc" } }));
    expect(html).toContain("aria-label=\"Pagination\"");
    expect(html).toContain("aria-disabled=\"true\"");
    expect(html).toContain("tabindex=\"-1\"");
    expect(html).toContain("Page <strong class=\"text-white\">1</strong> of 3");
    expect(html).toContain("page=2");
  });

  it("announces the global loading state while decorative skeletons stay hidden", () => {
    const html = renderToStaticMarkup(createElement(Loading));
    expect(html).toContain("role=\"status\"");
    expect(html).toContain("aria-live=\"polite\"");
    expect(html).toContain("Loading content…");
    expect(html).toContain("aria-hidden=\"true\"");
  });
});
