import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _memRateBuckets: Map<string, { count: number; expiresAt: number }> | undefined;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterSec?: number;
  remainingMinute: number;
  remainingHour: number;
  remainingGlobalDay: number;
}

const RPM_IP_LIMIT = Number(process.env.CHAT_RPM_IP_LIMIT || 6); // 6 req / min / IP
const HOURLY_IP_LIMIT = Number(process.env.CHAT_HOURLY_IP_LIMIT || 25); // 25 req / hr / IP
const DAILY_GLOBAL_LIMIT = Number(process.env.CHAT_DAILY_GLOBAL_LIMIT || 120); // 120 req / day total wallet circuit-breaker
const MIN_COOLDOWN_SEC = 3; // 3s minimum gap per IP

function checkMemoryBucket(key: string, limit: number, ttlSec: number): { count: number; retryAfterSec: number } {
  if (!global._memRateBuckets) {
    global._memRateBuckets = new Map();
  }
  const now = Date.now();
  const existing = global._memRateBuckets.get(key);
  if (!existing || existing.expiresAt <= now) {
    global._memRateBuckets.set(key, { count: 1, expiresAt: now + ttlSec * 1000 });
    return { count: 1, retryAfterSec: ttlSec };
  }
  existing.count += 1;
  return {
    count: existing.count,
    retryAfterSec: Math.max(1, Math.ceil((existing.expiresAt - now) / 1000)),
  };
}

export async function enforceChatRateLimit(ip: string): Promise<RateLimitResult> {
  const now = new Date();
  const minuteSlot = Math.floor(now.getTime() / 60000);
  const hourSlot = Math.floor(now.getTime() / 3600000);
  const dayKey = now.toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const cleanIp = (ip || "unknown").split(",")[0].trim().slice(0, 64) || "unknown";

  // Exact sliding 3-second anti-double-click / burst guard
  if (!global._memRateBuckets) {
    global._memRateBuckets = new Map();
  }
  const cdKey = `cd_sliding:${cleanIp}`;
  const prevCd = global._memRateBuckets.get(cdKey);
  if (prevCd && prevCd.expiresAt > now.getTime()) {
    const waitSec = Math.max(1, Math.ceil((prevCd.expiresAt - now.getTime()) / 1000));
    return {
      allowed: false,
      reason: `Please wait ${waitSec}s between Copilot queries.`,
      retryAfterSec: waitSec,
      remainingMinute: 0,
      remainingHour: 0,
      remainingGlobalDay: 0,
    };
  }
  global._memRateBuckets.set(cdKey, {
    count: 1,
    expiresAt: now.getTime() + MIN_COOLDOWN_SEC * 1000,
  });

  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      if (!global._mongoClientPromise) {
        const client = new MongoClient(uri, {
          serverSelectionTimeoutMS: 4000,
          connectTimeoutMS: 4000,
        });
        global._mongoClientPromise = client.connect();
      }
      const client = await global._mongoClientPromise;
      const col = client.db("risa_sponsor_boss").collection("chat_rate_limits");

      // Best-effort TTL index on expiresAt so Mongo auto-cleans expired windows
      col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});

      const minDocKey = `min:${cleanIp}:${minuteSlot}`;
      const hrDocKey = `hr:${cleanIp}:${hourSlot}`;
      const dayDocKey = `day:global:${dayKey}`;

      const [minRes, hrRes, dayRes] = await Promise.all([
        col.findOneAndUpdate(
          { _id: minDocKey as unknown as never },
          {
            $inc: { count: 1 },
            $setOnInsert: { expiresAt: new Date(now.getTime() + 120 * 1000) },
          },
          { upsert: true, returnDocument: "after" }
        ),
        col.findOneAndUpdate(
          { _id: hrDocKey as unknown as never },
          {
            $inc: { count: 1 },
            $setOnInsert: { expiresAt: new Date(now.getTime() + 7200 * 1000) },
          },
          { upsert: true, returnDocument: "after" }
        ),
        col.findOneAndUpdate(
          { _id: dayDocKey as unknown as never },
          {
            $inc: { count: 1 },
            $setOnInsert: { expiresAt: new Date(now.getTime() + 90000 * 1000) },
          },
          { upsert: true, returnDocument: "after" }
        ),
      ]);

      const minCount = Number(minRes?.count ?? 1);
      const hrCount = Number(hrRes?.count ?? 1);
      const dayCount = Number(dayRes?.count ?? 1);

      const remMin = Math.max(0, RPM_IP_LIMIT - minCount);
      const remHr = Math.max(0, HOURLY_IP_LIMIT - hrCount);
      const remDay = Math.max(0, DAILY_GLOBAL_LIMIT - dayCount);

      if (dayCount > DAILY_GLOBAL_LIMIT) {
        return {
          allowed: false,
          reason: `Daily global demo LLM cap (${DAILY_GLOBAL_LIMIT} requests/day) reached to protect API quota. Try again tomorrow.`,
          retryAfterSec: 3600,
          remainingMinute: remMin,
          remainingHour: remHr,
          remainingGlobalDay: 0,
        };
      }

      if (hrCount > HOURLY_IP_LIMIT) {
        return {
          allowed: false,
          reason: `Hourly rate limit (${HOURLY_IP_LIMIT} queries/hour per user) reached. Please wait before sending more queries.`,
          retryAfterSec: 600,
          remainingMinute: remMin,
          remainingHour: 0,
          remainingGlobalDay: remDay,
        };
      }

      if (minCount > RPM_IP_LIMIT) {
        return {
          allowed: false,
          reason: `Per-minute rate limit (${RPM_IP_LIMIT} queries/min) reached. Please wait ~30 seconds.`,
          retryAfterSec: 30,
          remainingMinute: 0,
          remainingHour: remHr,
          remainingGlobalDay: remDay,
        };
      }

      return {
        allowed: true,
        remainingMinute: remMin,
        remainingHour: remHr,
        remainingGlobalDay: remDay,
      };
    } catch (err) {
      console.warn("Mongo rate-limit fallback to memory:", err);
    }
  }

  // Fallback in-memory window checks
  const m = checkMemoryBucket(`min:${cleanIp}:${minuteSlot}`, RPM_IP_LIMIT, 60);
  const h = checkMemoryBucket(`hr:${cleanIp}:${hourSlot}`, HOURLY_IP_LIMIT, 3600);
  const d = checkMemoryBucket(`day:global:${dayKey}`, DAILY_GLOBAL_LIMIT, 86400);

  if (d.count > DAILY_GLOBAL_LIMIT || h.count > HOURLY_IP_LIMIT || m.count > RPM_IP_LIMIT) {
    return {
      allowed: false,
      reason: "Rate limit exceeded to protect Gemini API budget. Please wait a moment and try again.",
      retryAfterSec: m.retryAfterSec,
      remainingMinute: Math.max(0, RPM_IP_LIMIT - m.count),
      remainingHour: Math.max(0, HOURLY_IP_LIMIT - h.count),
      remainingGlobalDay: Math.max(0, DAILY_GLOBAL_LIMIT - d.count),
    };
  }

  return {
    allowed: true,
    remainingMinute: Math.max(0, RPM_IP_LIMIT - m.count),
    remainingHour: Math.max(0, HOURLY_IP_LIMIT - h.count),
    remainingGlobalDay: Math.max(0, DAILY_GLOBAL_LIMIT - d.count),
  };
}
