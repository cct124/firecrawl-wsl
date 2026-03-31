import { SearchResult } from "../../src/lib/entities";
import { config } from "../config";
import { searxng_search } from "./searxng";
import { fire_engine_search } from "./fireEngine";
import { Logger } from "winston";
import { ddgSearch } from "./v2/ddgsearch";
import {
  braveSearch,
  BraveSearchQuotaExceededError,
  BraveSearchRateLimitedError,
} from "./v2/brave-search";
import {
  createBraveQuotaLimitState,
  getBraveSearchLimitState,
  setBraveSearchLimitState,
  shouldAttemptBraveSearch,
} from "./v2/brave-search-limit";

function mapBraveWebResults(results: Awaited<ReturnType<typeof braveSearch>>) {
  return (
    results.web?.map(
      result => new SearchResult(result.url, result.title, result.description),
    ) || []
  );
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
}): Promise<SearchResult[]> {
  try {
    if (config.BRAVE_SEARCH_API_KEY) {
      const limitState = await getBraveSearchLimitState();

      if (shouldAttemptBraveSearch(limitState)) {
        try {
          logger.info("Using Brave search");
          const braveResults = await braveSearch(query, {
            num_results,
            lang,
            country,
            type: "web",
          });
          return mapBraveWebResults(braveResults);
        } catch (error) {
          if (error instanceof BraveSearchQuotaExceededError) {
            const nextLimitState = createBraveQuotaLimitState();
            await setBraveSearchLimitState(nextLimitState);
            logger.warn(
              `Brave Search API quota exhausted. Skipping Brave until ${nextLimitState.blockedUntil} and downgrading to DuckDuckGo.`,
              { nextLimitState },
            );
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
        logger.warn(
          `Brave Search API quota exhausted. Skipping Brave until ${limitState!.blockedUntil} and downgrading to DuckDuckGo.`,
          { limitState },
        );
      }

      logger.info("Using DuckDuckGo search");
      const ddg = await ddgSearch(query, num_results, {
        tbs,
        lang,
        country,
        proxy,
        timeout,
      });
      return (
        ddg.web?.map(
          result =>
            new SearchResult(result.url, result.title, result.description),
        ) || []
      );
    }

    if (config.FIRE_ENGINE_BETA_URL) {
      logger.info("Using fire engine search");
      const results = await fire_engine_search(query, {
        numResults: num_results,
        tbs,
        filter,
        lang,
        country,
        location,
      });
      return results;
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
      if (results.length > 0) return results;
    }
    logger.info("Using DuckDuckGo search");
    const ddg = await ddgSearch(query, num_results, {
      tbs,
      lang,
      country,
      proxy,
      timeout,
    });
    return (
      ddg.web?.map(
        result =>
          new SearchResult(result.url, result.title, result.description),
      ) || []
    );
  } catch (error) {
    logger.error(`Error in search function`, { error });
    return [];
  }
}
