import "server-only";

const ALLOWED_HOSTS: Record<string, string> = {
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "m.youtube.com": "YouTube",
  "music.youtube.com": "YouTube",
  "tiktok.com": "TikTok",
  "vm.tiktok.com": "TikTok",
  "twitch.tv": "Twitch",
  "vimeo.com": "Vimeo",
  "dailymotion.com": "Dailymotion",
  "bilibili.tv": "Bilibili",
  "kick.com": "Kick",
};

const USER_AGENT =
  "Mozilla/5.0 (compatible; CatalogoDiscovery/1.0; +https://example.invalid)";
const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 500_000;

export type VideoMeta =
  | {
      ok: true;
      source: "oembed" | "opengraph";
      platform: string;
      title: string;
      description: string | null;
      author: string | null;
      authorUrl: string | null;
      thumbnail: string | null;
      pageUrl: string;
      transcriptAvailable: false;
      visualAnalysis: false;
      notes: string;
    }
  | {
      ok: false;
      error: string;
      pageUrl: string;
      visualAnalysis: false;
    };

export function classifyVideoUrl(raw: string):
  | { host: string; platform: string; pageUrl: string }
  | { error: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { error: "O link informado não é uma URL válida." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Apenas URLs http(s) são aceitas." };
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const platform = ALLOWED_HOSTS[host];
  if (!platform) {
    return {
      error: `Domínio "${host}" não está na lista de plataformas suportadas.`,
    };
  }
  url.hash = "";
  return { host, platform, pageUrl: url.toString() };
}

async function fetchLimited(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/json, text/html, */*;q=0.8",
      },
    });
    if (!response.ok) {
      throw new Error(`Resposta HTTP ${response.status}`);
    }
    const reader = response.body?.getReader();
    if (!reader) {
      return (await response.text()).slice(0, MAX_BYTES);
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      chunks.push(value);
      if (total >= MAX_BYTES) break;
    }
    const merged = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    return merged.toString("utf8").slice(0, MAX_BYTES);
  } finally {
    clearTimeout(timer);
  }
}

function metaTag(html: string, property: string): string | null {
  const escaped = (property + "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]);
  }
  return null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function pageTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeEntities(match[1].trim()) : null;
}

async function tryOEmbed(
  pageUrl: string,
  platform: string
): Promise<{ okp: boolean; meta?: VideoMeta }> {
  let oembedUrl: string | null = null;
  if (platform === "YouTube") {
    oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(pageUrl)}&format=json`;
  } else if (platform === "TikTok") {
    oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(pageUrl)}`;
  } else if (platform === "Vimeo") {
    oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(pageUrl)}`;
  } else if (platform === "Dailymotion") {
    oembedUrl = `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(pageUrl)}`;
  }
  if (!oembedUrl) return { okp: false };

  try {
    const text = await fetchLimited(oembedUrl);
    const data = JSON.parse(text) as Record<string, unknown>;
    const title = String(data.title ?? "").trim();
    if (!title) return { okp: false };
    return {
      okp: true,
      meta: {
        ok: true,
        source: "oembed",
        platform,
        title,
        description:
          data.description && String(data.description).trim()
            ? String(data.description).trim()
            : null,
        author: data.author_name ? String(data.author_name) : null,
        authorUrl: data.author_url ? String(data.author_url) : null,
        thumbnail: data.thumbnail_url ? String(data.thumbnail_url) : null,
        pageUrl,
        transcriptAvailable: false,
        visualAnalysis: false,
        notes:
          "Informações públicas do vídeo (título, autor e miniatura quando fornecido pelo oEmbed).",
      },
    };
  } catch {
    return { okp: false };
  }
}

async function tryOpenGraph(
  pageUrl: string,
  platform: string
): Promise<VideoMeta | null> {
  try {
    const html = await fetchLimited(pageUrl);
    const title =
      metaTag(html, "og:title") ||
      metaTag(html, "twitter:title") ||
      pageTitle(html);
    if (!title) return null;
    return {
      ok: true,
      source: "opengraph",
      platform,
      title,
      description:
        metaTag(html, "og:description") || metaTag(html, "twitter:description"),
      author: metaTag(html, "og:site_name"),
      authorUrl: null,
      thumbnail: metaTag(html, "og:image"),
      pageUrl,
      transcriptAvailable: false,
      visualAnalysis: false,
      notes:
        "Informações públicas da página (título, descrição e miniatura via tags abertas).",
    };
  } catch {
    return null;
  }
}

export async function fetchVideoMeta(raw: string): Promise<VideoMeta> {
  const classified = classifyVideoUrl(raw);
  if ("error" in classified) {
    return {
      ok: false,
      error: classified.error,
      pageUrl: raw,
      visualAnalysis: false,
    };
  }

  const oembed = await tryOEmbed(classified.pageUrl, classified.platform);
  if (oembed.okp && oembed.meta) return oembed.meta;

  const og = await tryOpenGraph(classified.pageUrl, classified.platform);
  if (og) return og;

  return {
    ok: false,
    error:
      "Não foi possível ler metadados públicos desse vídeo (oEmbed e página indisponíveis).",
    pageUrl: raw,
    visualAnalysis: false,
  };
}

export function deriveVideoEmbedUrl(pageUrl: string, platform: string): string | null {
  try {
    const url = new URL(pageUrl);
    if (platform === "YouTube") {
      const host = url.hostname.toLowerCase();
      let id: string | null = null;
      if (host === "youtu.be") {
        id = url.pathname.split("/").filter(Boolean)[0] ?? null;
      } else if (url.hostname.toLowerCase().endsWith("youtube.com")) {
        if (url.pathname.startsWith("/shorts/")) {
          id = url.pathname.split("/")[2] ?? null;
        } else {
          id = url.searchParams.get("v");
        }
      }
      if (!id) return null;
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    }
    if (platform === "Vimeo") {
      const segments = url.pathname.split("/").filter(Boolean);
      const last = segments[segments.length - 1];
      if (last && /^\d+$/.test(last)) {
        return `https://player.vimeo.com/video/${last}`;
      }
      return null;
    }
    if (platform === "Dailymotion") {
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments[0] === "video" && segments[1]) {
        return `https://www.dailymotion.com/embed/video/${encodeURIComponent(segments[1])}`;
      }
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

export type ExternalItem = {
  title: string;
  url: string;
  snippet: string;
  source: string;
};

const EXTERNAL_SEARCH_ENABLED_FLAG = "DISCOVERY_EXTERNAL_SEARCH";

export function externalSearchEnabled(): boolean {
  return process.env[EXTERNAL_SEARCH_ENABLED_FLAG] === "1";
}

export async function externalSearch(
  query: string,
  limit = 6
): Promise<{ items: ExternalItem[] } | { error: string }> {
  if (!externalSearchEnabled()) {
    return { error: "Pesquisa externa não configurada neste servidor." };
  }
  try {
    const html = await fetchLimited(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    );
    const re =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>|<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    const links: { url: string; title: string; snippet: string }[] = [];
    let match: RegExpExecArray | null;
    let pendingUrl: string | null = null;
    let pendingTitle: string | null = null;
    while ((match = re.exec(html)) !== null) {
      if (match[1]) {
        pendingUrl = decodeEntities(match[1]);
        pendingTitle = (match[2] ?? "").replace(/<[^>]+>/g, "").trim();
      } else if (match[3] && pendingUrl && pendingTitle) {
        links.push({
          url: pendingUrl,
          title: pendingTitle,
          snippet: (match[3] ?? "").replace(/<[^>]+>/g, "").trim(),
        });
        pendingUrl = null;
        pendingTitle = null;
      }
    }
    return {
      items: links.slice(0, limit).map((link) => ({
        title: link.title,
        url: link.url,
        snippet: link.snippet,
        source: "DuckDuckGo (HTML)",
      })),
    };
  } catch {
    return { error: "Não foi possível consultar a pesquisa externa agora." };
  }
}