import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { XMLValidator } from "fast-xml-parser";

describe("release structures", () => {
  it("ships well-formed Blogger XML with required Blogger elements", async () => {
    const xml = await readFile("packages/cms-editions/blogger/mediamatrix-blogger.xml", "utf8"); expect(XMLValidator.validate(xml)).toBe(true);
    for (const token of ["<b:skin>", "<b:section", "<b:widget", "data-api-base", "mm-search"]) expect(xml).toContain(token);
  });
  it("includes every Prisma model, field, and enum in the authored initial migration", async () => {
    const schema = await readFile("packages/database/prisma/schema.prisma", "utf8"); const sql = await readFile("packages/database/prisma/migrations/202611030001_initial/migration.sql", "utf8");
    const modelNames = new Set([...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((match) => match[1]!));
    for (const match of schema.matchAll(/^model\s+(\w+)\s*\{([^}]+)\}/gm)) {
      const [, model, body] = match; expect(sql).toContain(`CREATE TABLE "${model}"`);
      for (const line of body!.split("\n")) {
        const field = line.trim().match(/^(\w+)\s+[\w[\]?]+/); if (!field || line.trim().startsWith("@@")) continue;
        const name = field[1]!; const definition = line.trim(); const fieldType = definition.split(/\s+/)[1]?.replace(/[?[\]]/g, "") || "";
        if (definition.includes("@relation") || modelNames.has(fieldType)) continue;
        expect(sql, `${model}.${name} missing from migration`).toContain(`"${name}"`);
      }
    }
    for (const match of schema.matchAll(/^enum\s+(\w+)\s*\{/gm)) expect(sql).toContain(`CREATE TYPE "${match[1]}"`);
  });
  it("keeps secrets and runtime artifacts out of distribution sources", async () => {
    const ignore = await readFile(".gitignore", "utf8"); expect(ignore).toContain(".env"); expect(ignore).toContain("node_modules/"); expect(ignore).toContain("*.dump");
  });
});
