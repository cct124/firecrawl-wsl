import { config } from "../../config";
import { redisEvictConnection } from "../../services/redis";

const BRAVE_SEARCH_LIMIT_STATE_KEY = "search:brave:limit-state";

export type BraveSearchLimitReason = "quota_exhausted";

export interface BraveSearchLimitState {
  reason: BraveSearchLimitReason;
  observedAt: string;
  blockedUntil: string;
}

let cachedLimitState: BraveSearchLimitState | null | undefined;

export function getBraveSearchLimitStateKey(): string {
  return BRAVE_SEARCH_LIMIT_STATE_KEY;
}

export function isBraveSearchLimitStateActive(
  state: BraveSearchLimitState | null,
  now = new Date(),
): boolean {
  if (!state) return false;
  return new Date(state.blockedUntil).getTime() > now.getTime();
}

export function shouldAttemptBraveSearch(
  state: BraveSearchLimitState | null,
  now = new Date(),
): boolean {
  return !isBraveSearchLimitStateActive(state, now);
}

export function createBraveQuotaLimitState(
  now = new Date(),
  blockSeconds = config.BRAVE_SEARCH_QUOTA_BLOCK_SECONDS,
): BraveSearchLimitState {
  return {
    reason: "quota_exhausted",
    observedAt: now.toISOString(),
    blockedUntil: new Date(now.getTime() + blockSeconds * 1000).toISOString(),
  };
}

function parseLegacyDateState(raw: string): BraveSearchLimitState | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }

  const observedAt = `${raw}T00:00:00.000Z`;
  const blockedUntil = new Date(
    new Date(observedAt).getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  return {
    reason: "quota_exhausted",
    observedAt,
    blockedUntil,
  };
}

function parseLimitState(raw: string | null): BraveSearchLimitState | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<BraveSearchLimitState>;
    if (
      parsed.reason === "quota_exhausted" &&
      typeof parsed.observedAt === "string" &&
      typeof parsed.blockedUntil === "string"
    ) {
      return {
        reason: parsed.reason,
        observedAt: parsed.observedAt,
        blockedUntil: parsed.blockedUntil,
      };
    }
  } catch {
    return parseLegacyDateState(raw);
  }

  return null;
}

async function clearPersistedLimitState(): Promise<void> {
  cachedLimitState = null;
  await redisEvictConnection.del(BRAVE_SEARCH_LIMIT_STATE_KEY);
}

export async function getBraveSearchLimitState(
  now = new Date(),
): Promise<BraveSearchLimitState | null> {
  if (cachedLimitState !== undefined) {
    if (!isBraveSearchLimitStateActive(cachedLimitState, now)) {
      if (cachedLimitState) {
        await clearPersistedLimitState();
      }
      return null;
    }

    return cachedLimitState;
  }

  cachedLimitState = parseLimitState(
    await redisEvictConnection.get(BRAVE_SEARCH_LIMIT_STATE_KEY),
  );

  if (!isBraveSearchLimitStateActive(cachedLimitState, now)) {
    if (cachedLimitState) {
      await clearPersistedLimitState();
    } else {
      cachedLimitState = null;
    }
    return null;
  }

  return cachedLimitState;
}

export async function setBraveSearchLimitState(
  state: BraveSearchLimitState,
): Promise<void> {
  cachedLimitState = state;
  await redisEvictConnection.set(
    BRAVE_SEARCH_LIMIT_STATE_KEY,
    JSON.stringify(state),
  );
}

export function resetBraveSearchLimitStateCache(): void {
  cachedLimitState = undefined;
}
