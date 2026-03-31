import * as undici from "undici";
import { config } from "../../config";
import {
  SearchResultType,
  SearchV2Response,
  WebSearchResult,
} from "../../lib/entities";
import { getSecureDispatcher } from "../../scraper/scrapeURL/engines/utils/safeFetch";

const BRAVE_SEARCH_BASE_URL = "https://api.search.brave.com/res/v1";

type BraveWebResponse = {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
      profile?: {
        img?: string;
      };
    }>;
  };
};

type BraveImageResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    thumbnail?: {
      src?: string;
    };
    properties?: {
      url?: string;
    };
  }>;
};

type BraveNewsResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    description?: string;
    age?: string;
    thumbnail?: {
      src?: string;
    };
    meta_url?: {
      favicon?: string;
    };
  }>;
};

export class BraveSearchQuotaExceededError extends Error {
  constructor(message = "Brave Search API free quota exceeded") {
    super(message);
    this.name = "BraveSearchQuotaExceededError";
  }
}

export class BraveSearchRateLimitedError extends Error {
  constructor(message = "Brave Search API rate limit exceeded") {
    super(message);
    this.name = "BraveSearchRateLimitedError";
  }
}

function normalizeSearchTypes(
  type?: SearchResultType | SearchResultType[],
): SearchResultType[] {
  if (!type) return ["web"];
  return Array.isArray(type) ? type : [type];
}

function stripHtml(value?: string): string | undefined {
  if (!value) return value;
  return value.replace(/<[^>]+>/g, "").trim();
}

function buildBraveParams(query: string, options: BraveSearchOptions) {
  const params = new URLSearchParams({
    q: query,
    count: String(options.num_results),
    country: (options.country ?? "us").toLowerCase(),
    search_lang: (options.lang ?? "en").toLowerCase(),
  });

  return params;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function classifyBraveError(
  status: number,
  bodyText: string,
): "rate_limit" | "quota" | "other" {
  let parsedBody: any = null;

  try {
    parsedBody = JSON.parse(bodyText);
  } catch {
    parsedBody = null;
  }

  const detail = String(parsedBody?.error?.detail ?? bodyText).toLowerCase();
  const meta = parsedBody?.error?.meta ?? {};

  if (
    status === 429 &&
    (detail.includes("rate limit") || meta.component === "rate_limiter")
  ) {
    return "rate_limit";
  }

  if (
    status === 402 ||
    detail.includes("quota") ||
    detail.includes("free credit") ||
    detail.includes("monthly limit") ||
    detail.includes("payment required")
  ) {
    return "quota";
  }

  return "other";
}

async function fetchBrave<T>(
  path: string,
  query: string,
  options: BraveSearchOptions,
): Promise<T> {
  const params = buildBraveParams(query, options);
  const response = await undici.fetch(
    `${BRAVE_SEARCH_BASE_URL}${path}?${params.toString()}`,
    {
      dispatcher: getSecureDispatcher(false),
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": config.BRAVE_SEARCH_API_KEY!,
      },
    },
  );

  const bodyText = await response.text();
  if (!response.ok) {
    const errorKind = classifyBraveError(response.status, bodyText);

    if (errorKind === "quota") {
      throw new BraveSearchQuotaExceededError();
    }

    if (errorKind === "rate_limit") {
      throw new BraveSearchRateLimitedError();
    }

    throw new Error(
      `Brave Search API request failed with status ${response.status}`,
    );
  }

  return JSON.parse(bodyText) as T;
}

function mapWebResults(response: BraveWebResponse): WebSearchResult[] {
  return (
    response.web?.results
      ?.filter(result => result.url && result.title)
      .map((result, index) => ({
        url: result.url!,
        title: result.title!,
        description: stripHtml(result.description) ?? "",
        position: index + 1,
        category: "web",
        metadata: result.profile?.img
          ? { favicon: result.profile.img }
          : undefined,
      })) ?? []
  );
}

function mapImageResults(response: BraveImageResponse) {
  return (
    response.results
      ?.filter(result => result.url || result.properties?.url)
      .map((result, index) => ({
        title: result.title,
        imageUrl: result.properties?.url ?? result.thumbnail?.src,
        url: result.url,
        position: index + 1,
      })) ?? []
  );
}

function mapNewsResults(response: BraveNewsResponse) {
  return (
    response.results
      ?.filter(result => result.url && result.title)
      .map((result, index) => ({
        title: result.title,
        url: result.url,
        snippet: stripHtml(result.description),
        date: result.age,
        imageUrl: result.thumbnail?.src,
        position: index + 1,
        category: "news",
        metadata: result.meta_url?.favicon
          ? { favicon: result.meta_url.favicon }
          : undefined,
      })) ?? []
  );
}

type BraveSearchOptions = {
  num_results: number;
  lang?: string;
  country?: string;
  type?: SearchResultType | SearchResultType[];
};

export async function braveSearch(
  query: string,
  options: BraveSearchOptions,
): Promise<SearchV2Response> {
  const searchTypes = normalizeSearchTypes(options.type);
  const response: SearchV2Response = {};

  for (const [index, searchType] of searchTypes.entries()) {
    if (index > 0) {
      // Brave free plan can be limited to 1 QPS, so stagger multi-source requests.
      await sleep(1100);
    }

    switch (searchType) {
      case "images": {
        const imageResponse = await fetchBrave<BraveImageResponse>(
          "/images/search",
          query,
          options,
        );
        response.images = mapImageResults(imageResponse);
        break;
      }
      case "news": {
        const newsResponse = await fetchBrave<BraveNewsResponse>(
          "/news/search",
          query,
          options,
        );
        response.news = mapNewsResults(newsResponse);
        break;
      }
      case "web":
      default: {
        const webResponse = await fetchBrave<BraveWebResponse>(
          "/web/search",
          query,
          options,
        );
        response.web = mapWebResults(webResponse);
      }
    }
  }

  return response;
}
