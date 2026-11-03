export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function integer(value: string | string[] | undefined, fallback: number, min = 1, max = 500): number {
  const parsed = Number.parseInt(single(value), 10);
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
}

export function optionalInteger(value: string | string[] | undefined, min = 0, max = 9999): number | undefined {
  const raw = single(value);
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, min), max) : undefined;
}

export function safeText(value: string | string[] | undefined, maxLength = 120): string {
  return single(value).trim().slice(0, maxLength);
}
