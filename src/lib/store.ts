import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedStore } from "@/lib/demo-seed";
import { OpportunityBridgeStoreSchema } from "@/lib/validation";
import type { OpportunityBridgeStore } from "@/types/opportunity-bridge";

const storeFile = path.join(process.cwd(), ".data", "opportunitybridge.json");
type StoreRuntime = typeof globalThis & { __opportunityBridgeWriteQueue?: Promise<void> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function persist(store: OpportunityBridgeStore): Promise<void> {
  const directory = path.dirname(storeFile);
  await mkdir(directory, { recursive: true });
  const temporaryFile = `${storeFile}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temporaryFile, storeFile);
}

export async function readStore(): Promise<OpportunityBridgeStore> {
  try {
    const content = await readFile(storeFile, "utf8");
    const original: unknown = JSON.parse(content);
    const parsed = OpportunityBridgeStoreSchema.safeParse(original);
    if (!parsed.success) {
      throw new Error("The local demo data file is invalid. Remove .data/opportunitybridge.json to reseed.");
    }
    const legacyUsers = isRecord(original) && Array.isArray(original.users) ? original.users : [];
    const hasLegacyProfiles = legacyUsers.some((user) => isRecord(user) && !Array.isArray(user.roles));
    const hasLegacyCollections = !isRecord(original)
      || !["mentoringSessions", "userBlocks", "reports", "startups", "sessionDocuments"].every((field) => Array.isArray(original[field]));
    if (isRecord(original) && !Array.isArray(original.startups)) {
      parsed.data.startups = structuredClone(seedStore.startups);
    }
    if (hasLegacyProfiles || hasLegacyCollections) await persist(parsed.data);
    return parsed.data;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      const initial = structuredClone(seedStore);
      await persist(initial);
      return initial;
    }
    throw error;
  }
}

export async function updateStore<T>(
  update: (store: OpportunityBridgeStore) => T | Promise<T>,
): Promise<T> {
  const runtime = globalThis as StoreRuntime;
  const operation = (runtime.__opportunityBridgeWriteQueue ?? Promise.resolve()).then(async () => {
    const store = await readStore();
    const result = await update(store);
    await persist(store);
    return result;
  });
  runtime.__opportunityBridgeWriteQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
