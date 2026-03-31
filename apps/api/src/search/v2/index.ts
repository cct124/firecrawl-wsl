import { SearchV2Response, SearchResultType } from "../../lib/entities";
import { config } from "../../config";
import { fire_engine_search_v2 } from "./fireEngine-v2";
import { searxng_search } from "./searxng";
import { ddgSearch } from "./ddgsearch";
import { Logger } from "winston";
import {
  braveSearch,
  BraveSearchQuotaExceededError,
  BraveSearchRateLimitedError,
} from "./brave-search";
import {
  createBraveQuotaLimitState,
  getBraveSearchLimitState,
  setBraveSearchLimitState,
  shouldAttemptBraveSearch,
  type BraveSearchLimitState,
} from "./brave-search-limit";

export interface SearchProviderResult {
  response: SearchV2Response;
  warning?: string;
}

function getBraveQuotaWarning(date: string): string {
  return `Brave Search API free quota hit on ${date}. Downgraded to DuckDuckGo.`;
}

function getBraveLimitStateWarning(state: BraveSearchLimitState): string {
  return `Brave Search API quota exhausted. Skipping Brave until ${state.blockedUntil} and downgrading to DuckDuckGo.`;
}

export async function search({
  query,
  logger,
  advanced = false,
  num_results = 5,
  tbs = undefined,
  filter = undefined,
  lang = "en",
  country = "us",
  location = undefined,
  proxy = undefined,
  sleep_interval = 0,
  timeout = 5000,
  type = undefined,
  enterprise = undefined,
}: {
  query: string;
  logger: Logger;
  advanced?: boolean;
  num_results?: number;
  tbs?: string;
  filter?: string;
  lang?: string;
  country?: string;
  location?: string;
  proxy?: string;
  sleep_interval?: number;
  timeout?: number;
  type?: SearchResultType | SearchResultType[];
  enterprise?: ("default" | "anon" | "zdr")[];
}): Promise<SearchProviderResult> {
  let warning: string | undefined;

  try {
    const requiresProviderPrivacy =
      enterprise?.includes("anon") || enterprise?.includes("zdr");

    if (config.BRAVE_SEARCH_API_KEY && !requiresProviderPrivacy) {
      const limitState = await getBraveSearchLimitState();

      if (shouldAttemptBraveSearch(limitState)) {
        try {
          logger.info("Using Brave search");
          return {
            response: await braveSearch(query, {
              num_results,
              lang,
              country,
              type,
            }),
          };
        } catch (error) {
          if (error instanceof BraveSearchQuotaExceededError) {
            const nextLimitState = createBraveQuotaLimitState();
            await setBraveSearchLimitState(nextLimitState);
            warning = getBraveLimitStateWarning(nextLimitState);
            logger.warn(warning, { nextLimitState });
          } else if (error instanceof BraveSearchRateLimitedError) {
            logger.warn(
              "Brave Search API rate limit hit for this request. Falling back to DuckDuckGo without setting a daily block.",
            );
          } else {
            logger.warn("Brave search failed, falling back to DuckDuckGo", {
              error,
            });
          }
        }
      } else {
        warning = getBraveLimitStateWarning(limitState!);
        logger.warn(warning, { limitState });
      }

      logger.info("Using DuckDuckGo search");
      const ddgResults = await ddgSearch(query, num_results, {
        tbs,
        lang,
        country,
        proxy,
        timeout,
      });

      if (ddgResults.web && ddgResults.web.length > 0) {
        return { response: ddgResults, warning };
      }

      return { response: {}, warning };
    }

    if (config.BRAVE_SEARCH_API_KEY && requiresProviderPrivacy) {
      logger.info(
        "Skipping Brave search because enterprise privacy mode is requested",
      );
    }

    if (config.FIRE_ENGINE_BETA_URL) {
      logger.info("Using fire engine search");
      const results = await fire_engine_search_v2(query, {
        numResults: num_results,
        tbs,
        filter,
        lang,
        country,
        location,
        type,
        enterprise,
      });

      return { response: results, warning };
    }

    if (config.SEARXNG_ENDPOINT) {
      logger.info("Using searxng search");
      const results = await searxng_search(query, {
        num_results,
        tbs,
        filter,
        lang,
        country,
        location,
      });
      if (results.web && results.web.length > 0) {
        return { response: results, warning };
      }
    }

    logger.info("Using DuckDuckGo search");
    const ddgResults = await ddgSearch(query, num_results, {
      tbs,
      lang,
      country,
      proxy,
      timeout,
    });
    if (ddgResults.web && ddgResults.web.length > 0) {
      return { response: ddgResults, warning };
    }

    // Fallback to empty response
    return { response: {}, warning };
  } catch (error) {
    logger.error(`Error in search function`, { error });
    return { response: {}, warning };
  }
}
