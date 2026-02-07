import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Parser from "rss-parser";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const OUTPUT_LIMIT = 30;
const OG_IMAGE_LIMIT = 5;
const REQUEST_TIMEOUT_MS = 5000;
const CONCURRENCY = 4;
const PLACEHOLDER_IMAGE = "/public/placeholder-news.svg";

const FEEDS = [
  {
    name: "Soompi",
    url: "https://www.soompi.com/feed",
  },
  {
    name: "Koreaboo",
    url: "https://www.koreaboo.com/feed",
  },
  {
    name: "Korea Herald K-pop",
    url: "https://www.koreaherald.com/rss/kh_Kpop",
  },
];

const KEYWORDS = [
  "k-pop",
  "kpop",
  "k pop",
  "korean pop",
  "idol",
  "comeback",
  "debut",
  "mini album",
  "album",
  "music video",
  "mv",
  "mnet",
  "inkigayo",
  "music bank",
  "m countdown",
  "show champion",
  "genie",
  "melon",
  "gaon",
  "circle chart",
  "billboard",
  "world tour",
  "concert",
  "fan meeting",
  "fanmeeting",
  "bts",
  "blackpink",
  "twice",
  "stray kids",
  "seventeen",
  "newjeans",
  "aespa",
  "ive",
  "le sserafim",
  "nct",
  "exo",
  "red velvet",
  "itzy",
  "nmixx",
  "day6",
  "2pm",
  "riize",
  "shinee",
  "super junior",
  "girls' generation",
  "snsd",
  "boa",
  "tvxq",
];

const EXCLUDE_KEYWORDS = [
  "north korea",
  "south korea election",
  "president",
  "prime minister",
  "policy",
  "economy",
  "inflation",
  "interest rate",
  "stock",
  "semiconductor",
  "shipbuilding",
  "defense",
  "missile",
  "nuclear",
  "trade",
  "tariff",
  "diplomatic",
  "parliament",
];

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["media:group", "mediaGroup"],
    ],
  },
});

function toText(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function scoreText(text, keyword) {
  if (!text) return 0;
  const lowered = text.toLowerCase();
  if (keyword.includes(" ") || keyword.includes("-")) {
    return lowered.includes(keyword) ? 1 : 0;
  }
  const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return regex.test(lowered) ? 1 : 0;
}

function scoreItem(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;
  KEYWORDS.forEach((keyword) => {
    score += scoreText(text, keyword);
  });
  return score;
}

function isExcluded(text) {
  const lowered = text.toLowerCase();
  return EXCLUDE_KEYWORDS.some((keyword) => lowered.includes(keyword));
}

function getSnippet(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function stableId(url) {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
}

function extractImageFromHtml(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=[\"']([^\"']+)[\"']/i);
  return match?.[1] ?? null;
}

function getItemImage(item) {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item.mediaContent?.url) return item.mediaContent.url;
  if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
  if (Array.isArray(item.mediaContent) && item.mediaContent[0]?.url) return item.mediaContent[0].url;
  if (item.mediaThumbnail?.url) return item.mediaThumbnail.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  if (item.mediaGroup?.["media:thumbnail"]?.url) return item.mediaGroup["media:thumbnail"].url;
  const html = item["content:encoded"] || item.content || "";
  const htmlImage = extractImageFromHtml(html);
  return htmlImage;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchOgImage(url) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "kpop-news-bot/1.0 (+https://github.com/)",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const $ = cheerio.load(html);
    const og =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[name="twitter:image:src"]').attr("content");
    return og || null;
  } catch {
    return null;
  }
}

async function mapWithConcurrency(items, limit, iterator) {
  const results = [];
  let index = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const current = items[index++];
      results.push(await iterator(current));
    }
  });
  await Promise.all(workers);
  return results;
}

function detectOutputDir() {
  const cwd = process.cwd();
  const publicDir = path.join(cwd, "public");
  const assetsDir = path.join(cwd, "assets");
  if (fs.existsSync(publicDir)) return publicDir;
  if (fs.existsSync(assetsDir)) return assetsDir;
  fs.mkdirSync(publicDir, { recursive: true });
  return publicDir;
}

async function main() {
  const items = [];

  await mapWithConcurrency(FEEDS, CONCURRENCY, async (feed) => {
    try {
      const response = await fetchWithTimeout(feed.url, {
        headers: {
          "User-Agent": "kpop-news-bot/1.0 (+https://github.com/)",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const xml = await response.text();
      const parsed = await parser.parseString(xml);
      parsed.items.forEach((item) => {
        const title = (item.title || "").trim();
        const url = (item.link || item.guid || "").trim();
        if (!title || !url) return;
        const description = toText(item.contentSnippet || item.content || item.summary || "");
        const score = scoreItem(title, description);
        if (score < 2) return;
        if (isExcluded(`${title} ${description}`) && score < 3) return;

        items.push({
          id: stableId(url),
          title,
          url,
          source: feed.name || parsed.title || new URL(url).hostname,
          publishedAt: item.isoDate ? new Date(item.isoDate).toISOString() : item.pubDate ? new Date(item.pubDate).toISOString() : null,
          snippet: getSnippet(description, 180),
          description: getSnippet(description, 600),
          image: getItemImage(item),
          tags: KEYWORDS.filter((keyword) => scoreText(`${title} ${description}`, keyword)).slice(0, 6),
        });
      });
    } catch (error) {
      console.warn(`Failed to parse feed ${feed.url}:`, error.message);
    }
  });

  const dedupedMap = new Map();
  items.forEach((item) => {
    const key = item.url.toLowerCase();
    if (!dedupedMap.has(key)) {
      dedupedMap.set(key, item);
    }
  });

  const deduped = Array.from(dedupedMap.values());

  const needsOg = deduped.filter((item) => !item.image).slice(0, OG_IMAGE_LIMIT);
  await mapWithConcurrency(needsOg, CONCURRENCY, async (item) => {
    const ogImage = await fetchOgImage(item.url);
    if (ogImage) item.image = ogImage;
  });

  deduped.forEach((item) => {
    if (!item.image) item.image = PLACEHOLDER_IMAGE;
  });

  deduped.sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });

  const output = {
    generatedAt: new Date().toISOString(),
    items: deduped.slice(0, OUTPUT_LIMIT),
  };

  const outputDir = detectOutputDir();
  fs.writeFileSync(path.join(outputDir, "news.json"), JSON.stringify(output, null, 2));
  fs.writeFileSync(path.join(outputDir, "news.generated.txt"), output.generatedAt);

  console.log(`Saved ${output.items.length} items to ${path.join(outputDir, "news.json")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
