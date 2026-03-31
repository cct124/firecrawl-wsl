import { jest } from "@jest/globals";

const mockRedisGet = jest.fn<(key: string) => Promise<string | null>>();
const mockRedisSet = jest.fn<(key: string, value: string) => Promise<void>>();
const mockRedisDel = jest.fn<(key: string) => Promise<void>>();

jest.mock("../../services/redis", () => ({
  redisEvictConnection: {
    get: (key: string) => mockRedisGet(key),
    set: (key: string, value: string) => mockRedisSet(key, value),
    del: (key: string) => mockRedisDel(key),
  },
}));

import {
  createBraveQuotaLimitState,
  getBraveSearchLimitState,
  getBraveSearchLimitStateKey,
  isBraveSearchLimitStateActive,
  resetBraveSearchLimitStateCache,
  setBraveSearchLimitState,
  shouldAttemptBraveSearch,
} from "./brave-search-limit";

describe("brave-search-limit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetBraveSearchLimitStateCache();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisDel.mockResolvedValue(undefined);
  });

  it("reads the stored state from Redis only once and then serves from memory", async () => {
    const state = {
      reason: "quota_exhausted" as const,
      observedAt: "2026-03-31T08:00:00.000Z",
      blockedUntil: "2026-03-31T14:00:00.000Z",
    };
    mockRedisGet.mockResolvedValue(JSON.stringify(state));

    const now = new Date("2026-03-31T09:00:00.000Z");
    const first = await getBraveSearchLimitState(now);
    const second = await getBraveSearchLimitState(now);

    expect(first).toEqual(state);
    expect(second).toEqual(state);
    expect(mockRedisGet).toHaveBeenCalledTimes(1);
    expect(mockRedisGet).toHaveBeenCalledWith(getBraveSearchLimitStateKey());
  });

  it("writes state to Redis and updates the in-memory cache", async () => {
    const state = {
      reason: "quota_exhausted" as const,
      observedAt: "2026-03-31T08:00:00.000Z",
      blockedUntil: "2026-03-31T14:00:00.000Z",
    };

    await setBraveSearchLimitState(state);

    const cached = await getBraveSearchLimitState(
      new Date("2026-03-31T09:00:00.000Z"),
    );

    expect(mockRedisSet).toHaveBeenCalledWith(
      getBraveSearchLimitStateKey(),
      JSON.stringify(state),
    );
    expect(cached).toEqual(state);
    expect(mockRedisGet).not.toHaveBeenCalled();
  });

  it("treats blockedUntil as the cutoff for whether Brave should be attempted", () => {
    const activeState = {
      reason: "quota_exhausted" as const,
      observedAt: "2026-03-31T08:00:00.000Z",
      blockedUntil: "2026-03-31T14:00:00.000Z",
    };
    const now = new Date("2026-03-31T09:00:00.000Z");
    const expired = new Date("2026-03-31T15:00:00.000Z");

    expect(isBraveSearchLimitStateActive(activeState, now)).toBe(true);
    expect(shouldAttemptBraveSearch(activeState, now)).toBe(false);
    expect(isBraveSearchLimitStateActive(activeState, expired)).toBe(false);
    expect(shouldAttemptBraveSearch(activeState, expired)).toBe(true);
    expect(shouldAttemptBraveSearch(null, now)).toBe(true);
  });

  it("clears expired state from Redis when it is read", async () => {
    const expiredState = {
      reason: "quota_exhausted" as const,
      observedAt: "2026-03-31T08:00:00.000Z",
      blockedUntil: "2026-03-31T09:00:00.000Z",
    };
    mockRedisGet.mockResolvedValue(JSON.stringify(expiredState));

    const state = await getBraveSearchLimitState(
      new Date("2026-03-31T10:00:00.000Z"),
    );

    expect(state).toBeNull();
    expect(mockRedisDel).toHaveBeenCalledWith(getBraveSearchLimitStateKey());
  });

  it("creates a quota state using the configured backoff window", () => {
    const state = createBraveQuotaLimitState(
      new Date("2026-03-31T08:00:00.000Z"),
      3600,
    );

    expect(state.reason).toBe("quota_exhausted");
    expect(state.observedAt).toBe("2026-03-31T08:00:00.000Z");
    expect(state.blockedUntil).toBe("2026-03-31T09:00:00.000Z");
  });
});
