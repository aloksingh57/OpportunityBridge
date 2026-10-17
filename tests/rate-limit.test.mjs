import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { consumeRateLimit } from "../src/lib/rate-limit.ts";

test("rate limits stop requests until the fixed window expires", () => {
  const key = `rate-limit-test:${randomUUID()}`;
  assert.deepEqual(consumeRateLimit(key, 2, 1_000, 5_000), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(consumeRateLimit(key, 2, 1_000, 5_100), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(consumeRateLimit(key, 2, 1_000, 5_200), { allowed: false, retryAfterSeconds: 1 });
  assert.deepEqual(consumeRateLimit(key, 2, 1_000, 6_000), { allowed: true, retryAfterSeconds: 0 });
});
