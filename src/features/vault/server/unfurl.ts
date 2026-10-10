import "server-only";

import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

import { Parser } from "htmlparser2";

/**
 * Fetches a page's title, description, share image and icon. The URL comes from a user,
 * so only public addresses are fetched: every hop's host must resolve to public IPs,
 * redirects are followed by hand, and reads are capped in time and size.
 *
 * Known gap: fetch resolves the host again, so a DNS-rebinding host could answer a
 * private address the second time. Only metadata is returned (never the body), which
 * keeps that to a blind request.
 */

export type LinkMeta = {
  url: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  imageUrl: string | null;
  iconUrl: string | null;
  /** The URL is itself an image. */
  isImage: boolean;
};

const TIMEOUT_MS = 6_000;
const MAX_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 4;

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

function isPublicAddress(address: string) {
  const family = isIP(address);
  if (family === 0) return false;
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (dotted) return !blocked.check(dotted[1]!, "ipv4");
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address);
  if (hex) {
    const [hi, lo] = [Number.parseInt(hex[1]!, 16), Number.parseInt(hex[2]!, 16)];
    return !blocked.check(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`, "ipv4");
  }
  return !blocked.check(address, family === 4 ? "ipv4" : "ipv6");
}

/** Normalizes what the user typed into an http(s) URL, or null. */
export function normalizeUrl(input: string): URL | null {
  const text = input.trim();
  if (!text || /\s/.test(text)) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (!url.hostname.includes(".") && isIP(url.hostname.replace(/^\[|\]$/g, "")) === 0) {
      return null;
    }
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

async function isPublicHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPublicAddress(host);
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return false;
  }
  try {
    const addresses = await lookup(host, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every((a) => isPublicAddress(a.address));
  } catch {
    return false;
  }
}

/** Fetches with redirects followed manually, re-checking every hop. */
async function safeFetch(start: URL, signal: AbortSignal) {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await isPublicHost(url))) return null;
    const response = await fetch(url, {
      redirect: "manual",
      signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; WannaSpaceBot/1.0; +https://wannaspace.app)",
        accept: "text/html,application/xhtml+xml;q=0.9,image/*;q=0.8,*/*;q=0.5",
        "accept-language": "en;q=0.9, *;q=0.5",
      },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      const next = normalizeUrl(new URL(location, url).toString());
      if (!next) return null;
      url = next;
      continue;
    }
    return { response, url };
  }
  return null;
}

/** Reads the start of the document, stopping at `</head>` or the byte cap. */
async function readHead(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const charset = /charset=["']?([\w-]+)/i.exec(response.headers.get("content-type") ?? "")?.[1];
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset ?? "utf-8");
  } catch {
    decoder = new TextDecoder("utf-8");
  }
  let html = "";
  let bytes = 0;
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(html.slice(-value.byteLength - 8))) break;
  }
  await reader.cancel().catch(() => {});
  return html;
}

const clean = (value: string | undefined | null, max: number) => {
  const text = value?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
};

function absolute(value: string | undefined, base: URL) {
  if (!value) return null;
  try {
    const url = new URL(value.trim(), base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Largest declared size of an icon, so the sharpest one wins. */
const iconSize = (sizes: string | undefined) =>
  Math.max(0, ...(sizes ?? "").split(/\s+/).map((s) => Number.parseInt(s, 10) || 0));

function parseHead(html: string, base: URL) {
  const meta = new Map<string, string>();
  const icons: { href: string; rank: number }[] = [];
  let title = "";
  let inTitle = false;
  let baseHref: string | undefined;

  const parser = new Parser(
    {
      onopentag(name, attrs) {
        if (name === "title") inTitle = true;
        if (name === "base" && attrs.href) baseHref ??= attrs.href;
        if (name === "meta") {
          const key = (attrs.property ?? attrs.name ?? attrs.itemprop)?.toLowerCase();
          if (key && attrs.content && !meta.has(key)) meta.set(key, attrs.content);
        }
        if (name === "link" && attrs.href) {
          const rel = (attrs.rel ?? "").toLowerCase().split(/\s+/);
          if (rel.includes("apple-touch-icon") || rel.includes("apple-touch-icon-precomposed")) {
            icons.push({ href: attrs.href, rank: 1000 + iconSize(attrs.sizes || "180x180") });
          } else if (rel.includes("icon")) {
            const svg = attrs.type === "image/svg+xml" || /\.svg(\?|$)/i.test(attrs.href);
            icons.push({ href: attrs.href, rank: svg ? 900 : iconSize(attrs.sizes || "16x16") });
          }
        }
      },
      ontext(text) {
        if (inTitle) title += text;
      },
      onclosetag(name) {
        if (name === "title") inTitle = false;
      },
    },
    { decodeEntities: true },
  );
  parser.write(html);
  parser.end();

  const root = absolute(baseHref, base) ? new URL(absolute(baseHref, base)!) : base;
  icons.sort((a, b) => b.rank - a.rank);

  return {
    title: clean(meta.get("og:title") ?? meta.get("twitter:title") ?? title, 300),
    description: clean(
      meta.get("og:description") ?? meta.get("twitter:description") ?? meta.get("description"),
      600,
    ),
    siteName: clean(meta.get("og:site_name") ?? meta.get("application-name"), 120),
    imageUrl: absolute(
      meta.get("og:image:secure_url") ??
        meta.get("og:image") ??
        meta.get("og:image:url") ??
        meta.get("twitter:image") ??
        meta.get("twitter:image:src"),
      root,
    ),
    iconUrl: absolute(icons[0]?.href, root) ?? new URL("/favicon.ico", base).toString(),
  };
}

/** Best-effort: a failed fetch still returns the URL, so the link is saved regardless. */
export async function unfurl(input: URL): Promise<LinkMeta> {
  const fallback: LinkMeta = {
    url: input.toString(),
    title: null,
    description: null,
    siteName: null,
    imageUrl: null,
    iconUrl: null,
    isImage: false,
  };
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    const result = await safeFetch(input, signal);
    if (!result) return fallback;
    const { response, url } = result;
    const type = response.headers.get("content-type") ?? "";
    const page = { ...fallback, url: url.toString() };

    if (type.startsWith("image/")) {
      await response.body?.cancel();
      return { ...page, imageUrl: page.url, isImage: true };
    }
    if (!response.ok || !/html|xml/i.test(type)) {
      await response.body?.cancel();
      return { ...page, iconUrl: new URL("/favicon.ico", url).toString() };
    }
    return { ...page, ...parseHead(await readHead(response), url) };
  } catch {
    return fallback;
  }
}
