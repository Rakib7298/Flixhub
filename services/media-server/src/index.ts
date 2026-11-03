import { assertSafeRemoteUrl } from "@mediamatrix/playlist-manager";

export interface MediaServerItem { id: string; name: string; type: string; overview: string; year: number | null; runtimeTicks: number | null; communityRating: number | null; container: string | null }
export interface MediaServerLibrary { id: string; name: string; collectionType: string | null }
export interface MediaServerAdapter { libraries(): Promise<MediaServerLibrary[]>; items(parentId?: string): Promise<MediaServerItem[]> }

export interface JellyfinOptions { serverUrl: string; apiKey: string; userId: string; allowPrivateNetwork?: boolean; fetchImpl?: typeof fetch; timeoutMs?: number }

export class JellyfinClient implements MediaServerAdapter {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  constructor(private readonly options: JellyfinOptions) {
    this.baseUrl = options.serverUrl.replace(/\/$/, "");
    if (!options.apiKey || !options.userId) throw new Error("Jellyfin API key and user ID are required.");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async libraries(): Promise<MediaServerLibrary[]> {
    const data = await this.request<{ Items?: Array<Record<string, unknown>> }>(`/Users/${encodeURIComponent(this.options.userId)}/Views`);
    return (data.Items ?? []).map((item) => ({ id: String(item.Id || ""), name: String(item.Name || ""), collectionType: typeof item.CollectionType === "string" ? item.CollectionType : null })).filter((item) => item.id && item.name);
  }

  async items(parentId?: string): Promise<MediaServerItem[]> {
    const query = new URLSearchParams({ Recursive: "true", IncludeItemTypes: "Movie,Series", Fields: "Overview,ProductionYear,RunTimeTicks,CommunityRating,Container", SortBy: "SortName", SortOrder: "Ascending", Limit: "200" });
    if (parentId) query.set("ParentId", parentId);
    const data = await this.request<{ Items?: Array<Record<string, unknown>> }>(`/Users/${encodeURIComponent(this.options.userId)}/Items?${query}`);
    return (data.Items ?? []).map((item) => ({ id: String(item.Id || ""), name: String(item.Name || ""), type: String(item.Type || ""), overview: String(item.Overview || ""), year: typeof item.ProductionYear === "number" ? item.ProductionYear : null, runtimeTicks: typeof item.RunTimeTicks === "number" ? item.RunTimeTicks : null, communityRating: typeof item.CommunityRating === "number" ? item.CommunityRating : null, container: typeof item.Container === "string" ? item.Container.split(",")[0] ?? null : null })).filter((item) => item.id && item.name);
  }

  async openStream(itemId: string, range?: string | null): Promise<Response> {
    if (!/^[a-zA-Z0-9]{8,128}$/.test(itemId)) throw new Error("Invalid Jellyfin item identifier.");
    const query = new URLSearchParams({ static: "true" });
    return this.requestRaw(`/Videos/${encodeURIComponent(itemId)}/stream?${query}`, { ...(range ? { Range: range } : {}) }, 120_000);
  }

  private async request<T>(path: string): Promise<T> {
    const response = await this.requestRaw(path);
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Jellyfin returned HTTP ${response.status}.`); }
    return response.json() as Promise<T>;
  }

  private async requestRaw(path: string, headers: Record<string, string> = {}, timeoutMs = this.timeoutMs): Promise<Response> {
    const url = await assertSafeRemoteUrl(`${this.baseUrl}${path}`, { allowPrivateNetwork: this.options.allowPrivateNetwork ?? false });
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await this.fetchImpl(url, { headers: { Accept: "application/json", "X-Emby-Token": this.options.apiKey, ...headers }, signal: controller.signal, redirect: "error", cache: "no-store" });
      if (response.status === 401 || response.status === 403) { await response.body?.cancel(); throw new Error("Jellyfin rejected the configured credentials."); }
      return response;
    } finally { clearTimeout(timeout); }
  }
}
