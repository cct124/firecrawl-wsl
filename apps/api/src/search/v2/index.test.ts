import { jest } from "@jest/globals";

const mockBraveSearch: any = jest.fn();
const mockGetBraveSearchLimitedDate: any = jest.fn();
const mockSetBraveSearchLimitedDate: any = jest.fn();
const mockDdgSearch: any = jest.fn();
const mockFireEngineSearch: any = jest.fn();
const mockSearxngSearch: any = jest.fn();
const actualBraveSearchLimit = jest.requireActual(
  "./brave-search-limit",
) as typeof import("./brave-search-limit");

jest.mock("./brave-search", () => {
  class MockBraveSearchQuotaExceededError extends Error {
    constructor(message = "Brave Search API free quota exceeded") {
      super(message);
      this.name = "BraveSearchQuotaExceededError";
    }
  }

  class MockBraveSearchRateLimitedError extends Error {
    constructor(message = "Brave Search API rate limit exceeded") {
      super(message);
      this.name = "BraveSearchRateLimitedError";
    }
  }

  return {
    braveSearch: (...args: unknown[]) => mockBraveSearch(...args),
    BraveSearchQuotaExceededError: MockBraveSearchQuotaExceededError,
    BraveSearchRateLimitedError: MockBraveSearchRateLimitedError,
  };
});

jest.mock("./brave-search-limit", () => ({
  createBraveQuotaLimitState: actualBraveSearchLimit.createBraveQuotaLimitState,
  getBraveSearchLimitState: () => mockGetBraveSearchLimitedDate(),
  setBraveSearchLimitState: (state: unknown) =>
    mockSetBraveSearchLimitedDate(state),
  shouldAttemptBraveSearch: actualBraveSearchLimit.shouldAttemptBraveSearch,
}));

jest.mock("./ddgsearch", () => ({
  ddgSearch: (...args: unknown[]) => mockDdgSearch(...args),
}));

jest.mock("./fireEngine-v2", () => ({
  fire_engine_search_v2: (...args: unknown[]) => mockFireEngineSearch(...args),
}));

jest.mock("./searxng", () => ({
  searxng_search: (...args: unknown[]) => mockSearxngSearch(...args),
}));

import { config } from "../../config";
import { search } from "./index";
import {
  BraveSearchQuotaExceededError,
  BraveSearchRateLimitedError,
} from "./brave-search";

describe("search/v2 provider selection", () => {
  const originalBraveSearchApiKey = config.BRAVE_SEARCH_API_KEY;
  const originalFireEngineUrl = config.FIRE_ENGINE_BETA_URL;
  const originalSearxngEndpoint = config.SEARXNG_ENDPOINT;

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-31T08:00:00.000Z"));
    config.BRAVE_SEARCH_API_KEY = "brave-test-key";
    config.FIRE_ENGINE_BETA_URL = "https://fire-engine.local";
    config.SEARXNG_ENDPOINT = "https://searxng.local";
    mockGetBraveSearchLimitedDate.mockResolvedValue(null);
    mockSetBraveSearchLimitedDate.mockResolvedValue(undefined);
    mockDdgSearch.mockResolvedValue({
      web: [
        {
          url: "https://example.com",
          title: "Example",
          description: "fallback result",
        },
      ],
    });
    mockFireEngineSearch.mockResolvedValue({
      web: [
        {
          url: "https://fire.example.com",
          title: "Fire",
          description: "fire engine result",
        },
      ],
    });
    mockSearxngSearch.mockResolvedValue({ web: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
    config.BRAVE_SEARCH_API_KEY = originalBraveSearchApiKey;
    config.FIRE_ENGINE_BETA_URL = originalFireEngineUrl;
    config.SEARXNG_ENDPOINT = originalSearxngEndpoint;
  });

  it("falls back directly to DuckDuckGo while a Brave quota block is still active", async () => {
    mockGetBraveSearchLimitedDate.mockResolvedValue({
      reason: "quota_exhausted",
      observedAt: "2026-03-31T08:00:00.000Z",
      blockedUntil: "2026-03-31T14:00:00.000Z",
    });

    const result = await search({
      query: "firecrawl",
      logger,
    });

    expect(mockBraveSearch).not.toHaveBeenCalled();
    expect(mockFireEngineSearch).not.toHaveBeenCalled();
    expect(mockSearxngSearch).not.toHaveBeenCalled();
    expect(mockDdgSearch).toHaveBeenCalledTimes(1);
    expect(result.warning).toContain(
      "Skipping Brave until 2026-03-31T14:00:00.000Z",
    );
    expect(result.response.web?.[0]?.url).toBe("https://example.com");
  });

  it("stores a blockedUntil state and falls back to DuckDuckGo when Brave returns a quota error", async () => {
    mockBraveSearch.mockRejectedValue(new BraveSearchQuotaExceededError());

    const result = await search({
      query: "firecrawl",
      logger,
    });

    expect(mockBraveSearch).toHaveBeenCalledTimes(1);
    expect(mockSetBraveSearchLimitedDate).toHaveBeenCalledWith({
      reason: "quota_exhausted",
      observedAt: "2026-03-31T08:00:00.000Z",
      blockedUntil: "2026-03-31T14:00:00.000Z",
    });
    expect(mockFireEngineSearch).not.toHaveBeenCalled();
    expect(mockDdgSearch).toHaveBeenCalledTimes(1);
    expect(result.warning).toContain("2026-03-31T14:00:00.000Z");
  });

  it("falls back without storing a daily block when Brave only hits a rate limit", async () => {
    mockBraveSearch.mockRejectedValue(new BraveSearchRateLimitedError());

    const result = await search({
      query: "firecrawl",
      logger,
    });

    expect(mockSetBraveSearchLimitedDate).not.toHaveBeenCalled();
    expect(mockDdgSearch).toHaveBeenCalledTimes(1);
    expect(result.warning).toBeUndefined();
  });

  it("skips Brave when enterprise privacy mode is requested and keeps the existing provider chain", async () => {
    const result = await search({
      query: "firecrawl",
      logger,
      enterprise: ["zdr"],
    });

    expect(mockBraveSearch).not.toHaveBeenCalled();
    expect(mockFireEngineSearch).toHaveBeenCalledTimes(1);
    expect(mockDdgSearch).not.toHaveBeenCalled();
    expect(result.response.web?.[0]?.url).toBe("https://fire.example.com");
  });
});
