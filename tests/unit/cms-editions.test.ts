import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertSafeEntries } from "../../packages/cms-editions/src";

const root = path.resolve(__dirname, "../..");

describe("CMS presentation clients", () => {
  it("allow Next.js catch-all routes while rejecting actual archive traversal", () => {
    expect(() => assertSafeEntries(["./apps/web/app/api/auth/[...nextauth]/route.ts"])).not.toThrow();
    expect(() => assertSafeEntries(["../secret"])).toThrow(/Unsafe archive entry/);
    expect(() => assertSafeEntries(["safe/../../secret"])).toThrow(/Unsafe archive entry/);
    expect(() => assertSafeEntries(["safe\\..\\secret"])).toThrow(/Unsafe archive entry/);
    expect(() => assertSafeEntries(["/etc/passwd"])).toThrow(/Unsafe archive entry/);
    expect(() => assertSafeEntries(["node_modules\\secret"])).toThrow(/Forbidden archive entry/);
  });
  it("consume the public normalized availability.offers contract", async () => {
    const wordpress = await readFile(path.join(root, "packages/cms-editions/wordpress/mediamatrix/assets/app.js"), "utf8");
    const blogger = await readFile(path.join(root, "packages/cms-editions/blogger/mediamatrix-blogger.xml"), "utf8");
    for (const source of [wordpress, blogger]) {
      expect(source).toContain("availability.offers");
      expect(source).toContain("offer.providerName");
      expect(source).not.toContain("availability.services");
    }
  });

  it("keep CMS provider links on explicit HTTP(S) URLs with opener isolation", async () => {
    const wordpress = await readFile(path.join(root, "packages/cms-editions/wordpress/mediamatrix/assets/app.js"), "utf8");
    const blogger = await readFile(path.join(root, "packages/cms-editions/blogger/mediamatrix-blogger.xml"), "utf8");
    for (const source of [wordpress, blogger]) {
      expect(source).toContain("offer.url");
      expect(source).toContain("noopener noreferrer");
      expect(source).toMatch(/url\.protocol\s*!==\s*'https:'/);
      expect(source).toMatch(/url\.protocol\s*!==\s*'http:'/);
    }
  });
});
