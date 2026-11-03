import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

export interface RemoteUrlOptions { allowPrivateNetwork?: boolean }

export function validateRemoteUrlSyntax(value: string, options: RemoteUrlOptions = {}): URL {
  if (value.length > 2048) throw new Error("Source URL is too long.");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) sources are allowed.");
  if (url.username || url.password) throw new Error("Credentials embedded in source URLs are not accepted.");
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!options.allowPrivateNetwork && (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal"))) throw new Error("Local and private network sources are blocked.");
  if (isIpAddress(hostname) && !options.allowPrivateNetwork && !isPublicIp(hostname)) throw new Error("Private, reserved, or non-routable source addresses are blocked.");
  return url;
}

export async function assertSafeRemoteUrl(value: string, options: RemoteUrlOptions = {}): Promise<URL> {
  const url = validateRemoteUrlSyntax(value, options);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIpAddress(hostname)) return url;
  let addresses;
  try { addresses = await lookup(hostname, { all: true, verbatim: true }); }
  catch { throw new Error("The source hostname could not be resolved."); }
  if (!addresses.length) throw new Error("The source hostname did not resolve to an address.");
  if (!options.allowPrivateNetwork && addresses.some(({ address }) => !isPublicIp(address))) throw new Error("The source hostname resolves to a private or non-routable address.");
  return url;
}

export function isPublicIp(value: string): boolean {
  try {
    let address = ipaddr.parse(value);
    if (address.kind() === "ipv6" && (address as ipaddr.IPv6).isIPv4MappedAddress()) address = (address as ipaddr.IPv6).toIPv4Address();
    return address.range() === "unicast";
  } catch { return false; }
}

export function isIpAddress(value: string): boolean { return ipaddr.isValid(value); }

export function hasSensitiveUrlParameters(value: string): boolean {
  const url = new URL(value);
  const sensitive = /^(access_?token|api_?key|auth|authorization|key|password|passwd|pwd|session|sig|signature|token|username|user|expires|hdnts|hdnea)$/i;
  return [...url.searchParams.keys()].some((key) => sensitive.test(key));
}
