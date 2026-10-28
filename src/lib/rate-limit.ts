interface RateBucket {
  count: number;
  resetAt: number;
}

type RateLimitRuntime = typeof globalThis & {
  __opportunityBridgeRateBuckets?: Map<string, RateBucket>;
};

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function consumeRateLimit(
  key: string,
  maximumRequests: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const runtime = globalThis as RateLimitRuntime;
  const buckets = runtime.__opportunityBridgeRateBuckets ??= new Map<string, RateBucket>();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  if (bucket.count >= maximumRequests) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  if (buckets.size > 1000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
