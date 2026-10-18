import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  calculateRankingMetrics,
  evaluateJsonlLines,
  INPUT_SCHEMA_VERSION,
  PipelineError,
  temporalSplit,
} from "../scripts/recommendations/evaluate.mjs";

function makeRow(index, overrides = {}) {
  const day = String(index + 1).padStart(2, "0");
  return {
    schemaVersion: INPUT_SCHEMA_VERSION,
    dataset: {
      datasetId: "baseline-v1",
      dataClass: "observed",
      provenanceSource: "first_party_consented",
      consentStatus: "granted",
      eligibleForEvaluation: true,
    },
    queryId: `q-${index}`,
    actorId: `actor-${index % 3}`,
    observedAt: `2025-01-${day}T12:00:00Z`,
    rankingAt: `2025-01-${day}T11:59:00Z`,
    candidates: [
      { entityId: `entity-${index}-a`, rank: 1, relevance: 2, labelStatus: "confirmed", labelSource: "human-review" },
      { entityId: `entity-${index}-b`, rank: 2, relevance: 1, labelStatus: "authored", labelSource: "review-panel" },
    ],
    ...overrides,
  };
}

function asJsonl(rows) {
  return rows.map((row) => JSON.stringify(row));
}

test("known toy rankings produce expected NDCG, precision, recall, and coverage", () => {
  const rows = [
    { candidates: [
      { entityId: "a", rank: 1, relevance: 2 },
      { entityId: "b", rank: 2, relevance: 1 },
    ] },
    { candidates: [
      { entityId: "c", rank: 1, relevance: 1 },
      { entityId: "d", rank: 2, relevance: 2 },
    ] },
  ];
  const metrics = calculateRankingMetrics(rows, 2);
  const idealDcg = 3 + 1 / Math.log2(3);
  const reversedDcg = 1 + 3 / Math.log2(3);
  assert.ok(Math.abs(metrics.ndcgAtK - ((1 + reversedDcg / idealDcg) / 2)) < 1e-12);
  assert.equal(metrics.precisionAtK, 1);
  assert.equal(metrics.recallAtK, 1);
  assert.equal(metrics.coverageAtK, 1);
  assert.equal(metrics.queryCount, 2);
});

test("corrupt and malformed rows are quarantined with explicit reasons", () => {
  const badCandidate = makeRow(2);
  badCandidate.candidates[0].relevance = undefined;
  const report = evaluateJsonlLines([
    "{not-json",
    JSON.stringify(badCandidate),
    ...asJsonl([makeRow(0), makeRow(1), makeRow(3), makeRow(4), makeRow(5)]),
  ]);
  assert.equal(report.counts.quarantinedRows, 2);
  assert.deepEqual(report.quarantine.map((item) => item.reasons[0]), ["malformed_json", "candidate_relevance_invalid"]);
  assert.equal(report.dataQuality.quarantineReasonCounts.malformed_json, 1);
  assert.equal(report.dataQuality.quarantineReasonCounts.candidate_relevance_invalid, 1);
  assert.equal(report.privacy.personalContentIncluded, false);
  assert.equal(JSON.stringify(report).includes("actor-"), false);
  assert.equal(JSON.stringify(report).includes("entity-"), false);
});

test("production evaluation refuses synthetic and demo datasets", () => {
  const rows = Array.from({ length: 6 }, (_, index) => makeRow(index, {
    dataset: { ...makeRow(index).dataset, dataClass: "synthetic" },
  }));
  assert.throws(
    () => evaluateJsonlLines(asJsonl(rows)),
    (error) => error instanceof PipelineError && error.code === "SYNTHETIC_DATASET_REFUSED",
  );
  assert.equal(evaluateJsonlLines(asJsonl(rows), { mode: "exploratory" }).evaluation.mode, "exploratory");
});

test("consent and eligibility are mandatory and click-derived labels are rejected", () => {
  const unconsented = makeRow(1);
  unconsented.dataset.consentStatus = "revoked";
  const ineligible = makeRow(2);
  ineligible.dataset.eligibleForEvaluation = false;
  const clickLabeled = makeRow(3);
  clickLabeled.candidates[0].labelSource = "click-derived";
  const report = evaluateJsonlLines([
    ...asJsonl([unconsented, ineligible, clickLabeled, makeRow(0), makeRow(4), makeRow(5), makeRow(6), makeRow(7)]),
  ]);
  assert.equal(report.dataQuality.quarantineReasonCounts.dataset_consent_not_granted, 1);
  assert.equal(report.dataQuality.quarantineReasonCounts.dataset_not_eligible_for_evaluation, 1);
  assert.equal(report.dataQuality.quarantineReasonCounts.candidate_label_source_invalid, 1);
});

test("temporal split is deterministic and keeps timestamp ties together", () => {
  const rows = [makeRow(0), makeRow(1), makeRow(2), makeRow(3), makeRow(4), makeRow(5)];
  rows[1].observedAt = rows[0].observedAt;
  const first = temporalSplit(rows, 0.5);
  const second = temporalSplit([...rows].reverse(), 0.5);
  assert.deepEqual(first.train.map((row) => row.queryId), second.train.map((row) => row.queryId));
  assert.deepEqual(first.test.map((row) => row.queryId), second.test.map((row) => row.queryId));
  assert.ok(Date.parse(first.train.at(-1).observedAt) < Date.parse(first.test[0].observedAt));
  assert.ok(first.train.some((row) => row.queryId === "q-0") && first.train.some((row) => row.queryId === "q-1"));
});

test("ranking timestamps after observation are quarantined as future leakage", () => {
  const rows = Array.from({ length: 7 }, (_, index) => makeRow(index));
  rows[2].rankingAt = "2025-01-03T12:01:00Z";
  const report = evaluateJsonlLines(asJsonl(rows));
  assert.equal(report.dataQuality.quarantineReasonCounts.ranking_time_after_query, 1);
  assert.equal(report.counts.validRows, 6);
  assert.equal(report.split.leakageGuardPassed, true);
});

test("empty and tiny datasets fail rather than emit baseline metrics", () => {
  assert.throws(
    () => evaluateJsonlLines([]),
    (error) => error instanceof PipelineError && error.code === "EMPTY_OR_TINY_DATASET",
  );
  assert.throws(
    () => evaluateJsonlLines(asJsonl([makeRow(0), makeRow(1), makeRow(2)])),
    (error) => error instanceof PipelineError && error.code === "EMPTY_OR_TINY_DATASET",
  );
});

test("duplicate query IDs, duplicate candidate IDs, and invalid calendar timestamps are rejected", () => {
  const duplicateEntity = makeRow(2);
  duplicateEntity.candidates[1].entityId = duplicateEntity.candidates[0].entityId;
  const invalidTimestamp = makeRow(3);
  invalidTimestamp.observedAt = "2025-02-30T12:00:00Z";
  const rows = [makeRow(0), makeRow(1), duplicateEntity, invalidTimestamp, makeRow(4), makeRow(5), makeRow(6)];
  rows[6].queryId = "q-0";
  const report = evaluateJsonlLines(asJsonl(rows));
  assert.equal(report.dataQuality.quarantineReasonCounts.duplicate_entity_id, 1);
  assert.equal(report.dataQuality.quarantineReasonCounts.observed_at_invalid, 1);
  assert.equal(report.dataQuality.quarantineReasonCounts.duplicate_query_id, 1);
});

test("sparse ranks are rejected instead of being compressed into top-k positions", () => {
  const sparseRanking = makeRow(2);
  sparseRanking.candidates[0].rank = 2;
  sparseRanking.candidates[1].rank = 4;
  const report = evaluateJsonlLines(asJsonl([
    makeRow(0), makeRow(1), sparseRanking, makeRow(3), makeRow(4), makeRow(5), makeRow(6),
  ]));
  assert.equal(report.dataQuality.quarantineReasonCounts.candidate_ranks_not_contiguous, 1);
});

test("CLI exposes help and returns distinct nonzero status for too-small input", async () => {
  const cliPath = path.resolve("scripts/recommendations/evaluate.mjs");
  const help = spawnSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);

  const folder = path.resolve(`.recommendation-pipeline-test-${process.pid}`);
  await mkdir(folder, { recursive: true });
  try {
    const input = path.join(folder, "tiny.jsonl");
    await writeFile(input, `${asJsonl([makeRow(0), makeRow(1), makeRow(2)]).join("\n")}\n`);
    const result = spawnSync(process.execPath, [cliPath, "--input", input], { encoding: "utf8" });
    assert.equal(result.status, 3);
    assert.match(result.stderr, /EMPTY_OR_TINY_DATASET/);
    assert.equal((await readFile(input, "utf8")).includes("actor-0"), true);

    const validInput = path.join(folder, "valid.jsonl");
    const reportPath = path.join(folder, "report.json");
    const quarantinePath = path.join(folder, "quarantine.jsonl");
    await writeFile(validInput, `${asJsonl(Array.from({ length: 6 }, (_, index) => makeRow(index))).join("\n")}\n`);
    const success = spawnSync(process.execPath, [
      cliPath, "--input", validInput, "--output", reportPath, "--quarantine", quarantinePath,
    ], { encoding: "utf8" });
    assert.equal(success.status, 0, success.stderr);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(report.status, "evaluated");
    assert.equal(report.split.leakageGuardPassed, true);
    assert.equal(await readFile(quarantinePath, "utf8"), "");
    assert.equal(JSON.stringify(report).includes("actor-"), false);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
