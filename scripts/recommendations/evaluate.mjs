#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const INPUT_SCHEMA_VERSION = "recommendation-eval/v1";
export const REPORT_VERSION = "recommendation-evaluation-report/v1";
export const INPUT_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: INPUT_SCHEMA_VERSION,
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "dataset", "queryId", "actorId", "observedAt", "rankingAt", "candidates"],
  properties: {
    schemaVersion: { const: INPUT_SCHEMA_VERSION },
    dataset: {
      type: "object",
      additionalProperties: false,
      required: ["datasetId", "dataClass", "provenanceSource", "consentStatus", "eligibleForEvaluation"],
      properties: {
        datasetId: { type: "string", minLength: 1, maxLength: 100 },
        dataClass: { enum: ["observed", "curated", "synthetic", "demo"] },
        provenanceSource: { enum: ["first_party_consented", "licensed", "research_consent"] },
        consentStatus: { const: "granted" },
        eligibleForEvaluation: { const: true },
      },
    },
    queryId: { type: "string", minLength: 1, maxLength: 100 },
    actorId: { type: "string", minLength: 1, maxLength: 100 },
    observedAt: { type: "string", format: "date-time" },
    rankingAt: { type: "string", format: "date-time" },
    candidates: {
      type: "array",
      minItems: 1,
      maxItems: 500,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["entityId", "rank", "relevance", "labelStatus", "labelSource"],
        properties: {
          entityId: { type: "string", minLength: 1, maxLength: 100 },
          rank: { type: "integer", minimum: 1 },
          relevance: { type: "integer", minimum: 0, maximum: 3 },
          labelStatus: { enum: ["authored", "confirmed"] },
          labelSource: { type: "string", minLength: 1, maxLength: 100 },
        },
      },
    },
  },
});

const ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;
const TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?Z$/;
const DATA_CLASSES = new Set(["observed", "curated", "synthetic", "demo"]);
const PROVENANCE_SOURCES = new Set(["first_party_consented", "licensed", "research_consent"]);
const LABEL_STATUSES = new Set(["authored", "confirmed"]);
const DISALLOWED_LABEL_SOURCES = new Set(["click", "impression", "no_click", "no_impression", "absence", "missing"]);
const ALLOWED_ROW_KEYS = new Set(["schemaVersion", "dataset", "queryId", "actorId", "observedAt", "rankingAt", "candidates"]);
const ALLOWED_DATASET_KEYS = new Set(["datasetId", "dataClass", "provenanceSource", "consentStatus", "eligibleForEvaluation"]);
const ALLOWED_CANDIDATE_KEYS = new Set(["entityId", "rank", "relevance", "labelStatus", "labelSource"]);

export const LIMITS = Object.freeze({
  maxFileBytes: 64 * 1024 * 1024,
  maxLineBytes: 128 * 1024,
  maxRows: 20_000,
  maxCandidatesPerQuery: 500,
  minRows: 4,
  minTestRows: 2,
});

export class PipelineError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "PipelineError";
    this.code = code;
    this.details = details;
  }
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function hashIdentifier(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isValidTimestamp(value) {
  if (typeof value !== "string") return false;
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (year < 1000 || month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const dayCheck = new Date(Date.UTC(year, month - 1, day));
  return dayCheck.getUTCFullYear() === year
    && dayCheck.getUTCMonth() === month - 1
    && dayCheck.getUTCDate() === day
    && Number.isFinite(Date.parse(value));
}

function hasOnlyKeys(object, allowed, prefix, reasons) {
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) reasons.push(`${prefix}unknown_field`);
  }
}

function missingnessForRow(row, counters) {
  const count = (name, object, key) => {
    const counter = counters[name];
    counter.observed += 1;
    if (!object || !hasOwn(object, key) || object[key] === null || object[key] === "") counter.missing += 1;
  };
  count("schemaVersion", row, "schemaVersion");
  count("dataset", row, "dataset");
  count("queryId", row, "queryId");
  count("actorId", row, "actorId");
  count("observedAt", row, "observedAt");
  count("rankingAt", row, "rankingAt");
  count("candidates", row, "candidates");
  if (Array.isArray(row?.candidates)) {
    for (const candidate of row.candidates) {
      count("candidate.entityId", candidate, "entityId");
      count("candidate.rank", candidate, "rank");
      count("candidate.relevance", candidate, "relevance");
      count("candidate.labelStatus", candidate, "labelStatus");
      count("candidate.labelSource", candidate, "labelSource");
    }
  }
}

function newMissingnessCounters() {
  return Object.fromEntries([
    "schemaVersion", "dataset", "queryId", "actorId", "observedAt", "rankingAt", "candidates",
    "candidate.entityId", "candidate.rank", "candidate.relevance", "candidate.labelStatus", "candidate.labelSource",
  ].map((key) => [key, { missing: 0, observed: 0 }]));
}

function validateRow(row) {
  const reasons = [];
  if (!row || typeof row !== "object" || Array.isArray(row)) return ["row_not_object"];
  hasOnlyKeys(row, ALLOWED_ROW_KEYS, "row.", reasons);
  if (row.schemaVersion !== INPUT_SCHEMA_VERSION) reasons.push("unsupported_schema_version");

  const dataset = row.dataset;
  if (!dataset || typeof dataset !== "object" || Array.isArray(dataset)) {
    reasons.push("dataset_metadata_missing_or_invalid");
  } else {
    hasOnlyKeys(dataset, ALLOWED_DATASET_KEYS, "dataset.", reasons);
    if (typeof dataset.datasetId !== "string" || !ID_PATTERN.test(dataset.datasetId)) reasons.push("dataset_id_invalid");
    if (!DATA_CLASSES.has(dataset.dataClass)) reasons.push("dataset_class_invalid");
    if (!PROVENANCE_SOURCES.has(dataset.provenanceSource)) reasons.push("dataset_provenance_invalid");
    if (dataset.consentStatus !== "granted") reasons.push("dataset_consent_not_granted");
    if (dataset.eligibleForEvaluation !== true) reasons.push("dataset_not_eligible_for_evaluation");
  }

  if (typeof row.queryId !== "string" || !ID_PATTERN.test(row.queryId)) reasons.push("query_id_invalid");
  if (typeof row.actorId !== "string" || !ID_PATTERN.test(row.actorId)) reasons.push("actor_id_invalid");
  if (!isValidTimestamp(row.observedAt)) reasons.push("observed_at_invalid");
  if (!isValidTimestamp(row.rankingAt)) reasons.push("ranking_at_invalid");
  if (isValidTimestamp(row.observedAt) && isValidTimestamp(row.rankingAt)
    && Date.parse(row.rankingAt) > Date.parse(row.observedAt)) reasons.push("ranking_time_after_query");

  if (!Array.isArray(row.candidates) || row.candidates.length === 0) {
    reasons.push("candidates_missing_or_empty");
  } else {
    if (row.candidates.length > LIMITS.maxCandidatesPerQuery) reasons.push("too_many_candidates");
    const entities = new Set();
    const ranks = new Set();
    for (const candidate of row.candidates) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        reasons.push("candidate_not_object");
        continue;
      }
      hasOnlyKeys(candidate, ALLOWED_CANDIDATE_KEYS, "candidate.", reasons);
      if (typeof candidate.entityId !== "string" || !ID_PATTERN.test(candidate.entityId)) {
        reasons.push("candidate_entity_id_invalid");
      } else if (entities.has(candidate.entityId)) {
        reasons.push("duplicate_entity_id");
      } else {
        entities.add(candidate.entityId);
      }
      if (!Number.isSafeInteger(candidate.rank) || candidate.rank < 1) {
        reasons.push("candidate_rank_invalid");
      } else if (ranks.has(candidate.rank)) {
        reasons.push("duplicate_candidate_rank");
      } else {
        ranks.add(candidate.rank);
      }
      if (!Number.isSafeInteger(candidate.relevance) || candidate.relevance < 0 || candidate.relevance > 3) {
        reasons.push("candidate_relevance_invalid");
      }
      if (!LABEL_STATUSES.has(candidate.labelStatus)) reasons.push("candidate_label_status_invalid");
      if (typeof candidate.labelSource !== "string" || candidate.labelSource.trim().length === 0
        || candidate.labelSource.length > 100 || DISALLOWED_LABEL_SOURCES.has(candidate.labelSource.toLowerCase().trim())
        || /(click|impression|absence|missing|no[_ -]?show)/i.test(candidate.labelSource)) {
        reasons.push("candidate_label_source_invalid");
      }
    }
    if (ranks.size === row.candidates.length
      && [...ranks].sort((left, right) => left - right).some((rank, index) => rank !== index + 1)) {
      reasons.push("candidate_ranks_not_contiguous");
    }
  }
  return [...new Set(reasons)];
}

function datasetFingerprint(dataset) {
  return JSON.stringify({
    datasetId: dataset.datasetId,
    dataClass: dataset.dataClass,
    provenanceSource: dataset.provenanceSource,
    consentStatus: dataset.consentStatus,
    eligibleForEvaluation: dataset.eligibleForEvaluation,
  });
}

export function temporalSplit(rows, trainFraction = 0.7) {
  if (!Number.isFinite(trainFraction) || trainFraction <= 0 || trainFraction >= 1) {
    throw new PipelineError("INVALID_CONFIG", "trainFraction must be greater than 0 and less than 1.");
  }
  const ordered = [...rows].sort((left, right) => Date.parse(left.observedAt) - Date.parse(right.observedAt)
    || left.queryId.localeCompare(right.queryId));
  const timestamps = [...new Set(ordered.map((row) => row.observedAt))].sort((left, right) => Date.parse(left) - Date.parse(right));
  if (timestamps.length < 2) {
    throw new PipelineError("EMPTY_OR_TINY_DATASET", "A temporal split requires at least two distinct observation timestamps.");
  }
  const cutIndex = Math.min(timestamps.length - 1, Math.max(1, Math.floor(timestamps.length * trainFraction)));
  const cutoff = timestamps[cutIndex];
  const train = ordered.filter((row) => Date.parse(row.observedAt) < Date.parse(cutoff));
  const test = ordered.filter((row) => Date.parse(row.observedAt) >= Date.parse(cutoff));
  if (train.length === 0 || test.length < LIMITS.minTestRows) {
    throw new PipelineError("EMPTY_OR_TINY_DATASET", `Temporal split must contain at least 1 train row and ${LIMITS.minTestRows} test rows.`);
  }
  const trainMax = Math.max(...train.map((row) => Date.parse(row.observedAt)));
  const testMin = Math.min(...test.map((row) => Date.parse(row.observedAt)));
  if (trainMax >= testMin) {
    throw new PipelineError("TEMPORAL_LEAKAGE_GUARD", "Temporal split is not strictly ordered.");
  }
  return { train, test, cutoff };
}

export function calculateRankingMetrics(rows, k = 5) {
  if (!Number.isSafeInteger(k) || k < 1 || k > LIMITS.maxCandidatesPerQuery) {
    throw new PipelineError("INVALID_CONFIG", `k must be an integer from 1 to ${LIMITS.maxCandidatesPerQuery}.`);
  }
  if (rows.length === 0) throw new PipelineError("EMPTY_OR_TINY_DATASET", "Metrics require at least one test query.");

  let ndcgTotal = 0;
  let precisionTotal = 0;
  let recallTotal = 0;
  const recommendedEntities = new Set();
  const candidateEntities = new Set();
  for (const row of rows) {
    const ranked = [...row.candidates].sort((left, right) => left.rank - right.rank);
    const top = ranked.slice(0, k);
    const ideal = [...ranked].sort((left, right) => right.relevance - left.relevance || left.rank - right.rank).slice(0, k);
    const dcg = top.reduce((sum, item, index) => sum + ((2 ** item.relevance - 1) / Math.log2(index + 2)), 0);
    const idcg = ideal.reduce((sum, item, index) => sum + ((2 ** item.relevance - 1) / Math.log2(index + 2)), 0);
    const relevantTotal = ranked.filter((candidate) => candidate.relevance > 0).length;
    const relevantRetrieved = top.filter((candidate) => candidate.relevance > 0).length;
    ndcgTotal += idcg === 0 ? 0 : dcg / idcg;
    precisionTotal += relevantRetrieved / k;
    recallTotal += relevantTotal === 0 ? 0 : relevantRetrieved / relevantTotal;
    for (const candidate of ranked) candidateEntities.add(candidate.entityId);
    for (const candidate of top) recommendedEntities.add(candidate.entityId);
  }
  return {
    ndcgAtK: ndcgTotal / rows.length,
    precisionAtK: precisionTotal / rows.length,
    recallAtK: recallTotal / rows.length,
    coverageAtK: candidateEntities.size === 0 ? 0 : recommendedEntities.size / candidateEntities.size,
    queryCount: rows.length,
  };
}

export function evaluateJsonlLines(lines, options = {}) {
  const mode = options.mode ?? "production";
  const k = options.k ?? 5;
  const trainFraction = options.trainFraction ?? 0.7;
  const seed = options.seed ?? "recommendation-eval-v1";
  if (!["production", "exploratory"].includes(mode)) {
    throw new PipelineError("INVALID_CONFIG", "mode must be production or exploratory.");
  }
  if (typeof seed !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(seed)) {
    throw new PipelineError("INVALID_CONFIG", "seed must contain 1–64 letters, numbers, dots, underscores, or hyphens.");
  }
  if (!Number.isSafeInteger(k) || k < 1 || k > LIMITS.maxCandidatesPerQuery) {
    throw new PipelineError("INVALID_CONFIG", `k must be an integer from 1 to ${LIMITS.maxCandidatesPerQuery}.`);
  }
  if (!Number.isFinite(trainFraction) || trainFraction <= 0 || trainFraction >= 1) {
    throw new PipelineError("INVALID_CONFIG", "trainFraction must be greater than 0 and less than 1.");
  }

  const quarantine = [];
  const reasonCounts = {};
  const missingness = newMissingnessCounters();
  const rows = [];
  const queryIds = new Set();
  let expectedDatasetFingerprint;
  let dataset;
  let prohibitedProductionClass;
  let nonEmptyRows = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index];
    if (typeof line !== "string" || Buffer.byteLength(line, "utf8") > LIMITS.maxLineBytes) {
      quarantine.push({ lineNumber, reasons: ["line_too_large_or_invalid"] });
      reasonCounts.line_too_large_or_invalid = (reasonCounts.line_too_large_or_invalid ?? 0) + 1;
      continue;
    }
    if (line.trim() === "") continue;
    nonEmptyRows += 1;
    if (nonEmptyRows > LIMITS.maxRows) {
      throw new PipelineError("INPUT_LIMIT_EXCEEDED", `Input exceeds the maximum of ${LIMITS.maxRows} non-empty rows.`, {
        quarantinedRows: quarantine.length,
        reasonCounts,
      });
    }
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      quarantine.push({ lineNumber, reasons: ["malformed_json"] });
      reasonCounts.malformed_json = (reasonCounts.malformed_json ?? 0) + 1;
      continue;
    }
    missingnessForRow(row, missingness);
    let reasons = validateRow(row);
    if (reasons.length === 0) {
      if (["synthetic", "demo"].includes(row.dataset.dataClass)) prohibitedProductionClass = row.dataset.dataClass;
      const currentFingerprint = datasetFingerprint(row.dataset);
      if (expectedDatasetFingerprint && expectedDatasetFingerprint !== currentFingerprint) {
        reasons.push("inconsistent_dataset_metadata");
      } else {
        expectedDatasetFingerprint = currentFingerprint;
        dataset = row.dataset;
      }
    }
    if (reasons.length === 0 && queryIds.has(row.queryId)) reasons.push("duplicate_query_id");
    if (reasons.length > 0) {
      reasons = [...new Set(reasons)].sort();
      quarantine.push({ lineNumber, reasons });
      for (const reason of reasons) reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
      continue;
    }
    queryIds.add(row.queryId);
    rows.push(row);
  }

  if (mode === "production" && prohibitedProductionClass) {
    throw new PipelineError("SYNTHETIC_DATASET_REFUSED", "Synthetic/demo datasets are not permitted for production evaluation.", {
      dataClass: prohibitedProductionClass,
      quarantinedRows: quarantine.length,
      reasonCounts,
      quarantine,
    });
  }
  if (!dataset || rows.length === 0) {
    throw new PipelineError("EMPTY_OR_TINY_DATASET", "No valid labeled query rows remain after validation.", {
      validRows: rows.length,
      inputRows: nonEmptyRows,
      quarantinedRows: quarantine.length,
      reasonCounts,
      missingness,
      quarantine,
    });
  }
  if (rows.length < LIMITS.minRows) {
    throw new PipelineError("EMPTY_OR_TINY_DATASET", `At least ${LIMITS.minRows} valid rows are required; found ${rows.length}.`, {
      validRows: rows.length,
      quarantinedRows: quarantine.length,
      reasonCounts,
      quarantine,
    });
  }

  let split;
  try {
    split = temporalSplit(rows, trainFraction);
  } catch (error) {
    if (error instanceof PipelineError) {
      error.details = { ...error.details, validRows: rows.length, quarantinedRows: quarantine.length, reasonCounts, quarantine };
    }
    throw error;
  }
  const metrics = calculateRankingMetrics(split.test, k);
  const allEntities = new Set();
  const actors = new Set();
  const labelDistribution = { "0": 0, "1": 0, "2": 0, "3": 0 };
  for (const row of rows) {
    actors.add(row.actorId);
    for (const candidate of row.candidates) {
      allEntities.add(candidate.entityId);
      labelDistribution[String(candidate.relevance)] += 1;
    }
  }
  const testActors = new Set(split.test.map((row) => row.actorId));
  const testEntities = new Set(split.test.flatMap((row) => row.candidates.map((candidate) => candidate.entityId)));
  const times = rows.map((row) => Date.parse(row.observedAt));
  return {
    reportVersion: REPORT_VERSION,
    status: "evaluated",
    evaluation: {
      type: "offline_baseline",
      system: "provided_candidate_rankings",
      mode,
      rankingMetrics: metrics,
      labels: {
        relevanceScale: "0=not relevant, 1=low, 2=medium, 3=high",
        distribution: labelDistribution,
        requirement: "Each candidate has an authored or confirmed relevance label; clicks and missing impressions are not labels.",
      },
    },
    dataset: {
      idSha256: hashIdentifier(dataset.datasetId),
      inputSchemaVersion: INPUT_SCHEMA_VERSION,
      dataClass: dataset.dataClass,
      provenanceSource: dataset.provenanceSource,
      consentGranted: dataset.consentStatus === "granted",
      eligibleForEvaluation: dataset.eligibleForEvaluation,
      temporalCoverage: {
        from: new Date(Math.min(...times)).toISOString(),
        through: new Date(Math.max(...times)).toISOString(),
      },
    },
    split: {
      method: "strict_chronological_timestamp_groups",
      trainFraction,
      cutoff: split.cutoff,
      trainRows: split.train.length,
      testRows: split.test.length,
      trainThrough: split.train.at(-1).observedAt,
      testFrom: split.test[0].observedAt,
      leakageGuardPassed: Date.parse(split.train.at(-1).observedAt) < Date.parse(split.test[0].observedAt)
        && split.test.every((row) => Date.parse(row.rankingAt) <= Date.parse(row.observedAt)),
    },
    counts: {
      inputRows: nonEmptyRows,
      validRows: rows.length,
      quarantinedRows: quarantine.length,
      uniqueActors: actors.size,
      uniqueEntities: allEntities.size,
      testUniqueActors: testActors.size,
      testUniqueEntities: testEntities.size,
    },
    dataQuality: {
      missingness: Object.fromEntries(Object.entries(missingness).map(([field, count]) => [
        field,
        { missing: count.missing, observed: count.observed, rate: count.observed === 0 ? 0 : count.missing / count.observed },
      ])),
      quarantineReasonCounts: Object.fromEntries(Object.entries(reasonCounts).sort(([left], [right]) => left.localeCompare(right))),
    },
    reproducibility: {
      seed,
      config: { k, trainFraction, mode, minRows: LIMITS.minRows, minTestRows: LIMITS.minTestRows },
      note: "The temporal split is deterministic and does not consume randomness; seed is recorded for run identification.",
    },
    privacy: {
      rawActorIdsIncluded: false,
      rawEntityIdsIncluded: false,
      rawQueryIdsIncluded: false,
      personalContentIncluded: false,
    },
    quarantine: quarantine.sort((left, right) => left.lineNumber - right.lineNumber),
  };
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (!["--input", "--output", "--quarantine", "--mode", "--seed", "--k", "--train-fraction"].includes(arg)) {
      throw new PipelineError("USAGE_ERROR", `Unknown argument: ${arg}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new PipelineError("USAGE_ERROR", `Missing value for ${arg}`);
    options[arg.slice(2).replaceAll("-", "")] = value;
    index += 1;
  }
  if (!options.input) throw new PipelineError("USAGE_ERROR", "--input is required.");
  options.k = options.k === undefined ? 5 : Number(options.k);
  options.trainfraction = options.trainfraction === undefined ? 0.7 : Number(options.trainfraction);
  options.mode ??= "production";
  options.seed ??= "recommendation-eval-v1";
  if (!Number.isSafeInteger(options.k) || !Number.isFinite(options.trainfraction)) {
    throw new PipelineError("USAGE_ERROR", "--k and --train-fraction must be numeric.");
  }
  return options;
}

export function formatCliError(error) {
  return {
    status: "rejected",
    error: {
      code: error.code ?? "UNEXPECTED_ERROR",
      message: error.message,
      ...(error.details && Object.keys(error.details).length > 0 ? { details: error.details } : {}),
    },
  };
}

export function helpText() {
  return [
    "Offline recommendation baseline evaluator",
    "",
    "Usage:",
    "  node scripts/recommendations/evaluate.mjs --input FILE [options]",
    "",
    "Options:",
    "  --input FILE             Versioned JSONL input (required)",
    "  --output FILE            Write report JSON to FILE (default: stdout)",
    "  --quarantine FILE        Write sanitized line-number/reason JSONL",
    "  --mode production|exploratory   Default: production",
    "  --k INTEGER              Ranking cutoff, 1–500 (default: 5)",
    "  --train-fraction NUMBER  Temporal train fraction, exclusive range (0,1), default: 0.7",
    "  --seed VALUE             Reproducibility label, default: recommendation-eval-v1",
    "  --help                   Show this help",
    "",
    "Exit codes: 0 evaluated; 2 invalid input/policy/configuration; 3 empty or too-small dataset; 4 file I/O failure.",
  ].join("\n");
}

async function runCli(argv) {
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    process.stderr.write(`${JSON.stringify(formatCliError(error))}\n`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(`${helpText()}\n`);
    return;
  }

  try {
    const inputPath = path.resolve(options.input);
    const outputPath = options.output ? path.resolve(options.output) : undefined;
    const quarantinePath = options.quarantine ? path.resolve(options.quarantine) : undefined;
    if (outputPath && outputPath === inputPath) throw new PipelineError("USAGE_ERROR", "Report output cannot overwrite the input file.");
    if (quarantinePath && (quarantinePath === inputPath || quarantinePath === outputPath)) {
      throw new PipelineError("USAGE_ERROR", "Quarantine output must be a different path from input and report.");
    }
    const inputStats = await stat(inputPath);
    if (!inputStats.isFile()) throw new PipelineError("INPUT_IO_ERROR", "Input path must refer to a regular file.");
    if (inputStats.size > LIMITS.maxFileBytes) {
      throw new PipelineError("INPUT_LIMIT_EXCEEDED", `Input exceeds the ${LIMITS.maxFileBytes}-byte file limit.`);
    }
    const input = await readFile(inputPath);
    const text = input.toString("utf8");
    const lines = text.split(/\r?\n/);
    const report = evaluateJsonlLines(lines, {
      mode: options.mode,
      k: options.k,
      trainFraction: options.trainfraction,
      seed: options.seed,
    });
    const reportText = `${JSON.stringify(report, null, 2)}\n`;
    if (outputPath) {
      await writeFile(outputPath, reportText, "utf8");
    } else {
      process.stdout.write(reportText);
    }
    if (quarantinePath) {
      await writeFile(quarantinePath, report.quarantine.map((item) => JSON.stringify(item)).join("\n")
        + (report.quarantine.length ? "\n" : ""), "utf8");
    }
    process.exitCode = 0;
  } catch (error) {
    const formatted = formatCliError(error);
    if (options.quarantine && Array.isArray(error.details?.quarantine)) {
      try {
        const quarantinePath = path.resolve(options.quarantine);
        await writeFile(quarantinePath, error.details.quarantine.map((item) => JSON.stringify(item)).join("\n"), "utf8");
      } catch {
        // Preserve the primary failure and avoid exposing input data in diagnostics.
      }
    }
    process.stderr.write(`${JSON.stringify(formatted)}\n`);
    process.exitCode = error.code === "EMPTY_OR_TINY_DATASET" ? 3
      : error.code === "INPUT_IO_ERROR" || ["ENOENT", "EACCES", "EISDIR", "ENOTDIR", "EPERM", "EMFILE", "ENFILE", "EIO", "ENOSPC"].includes(error.code) ? 4 : 2;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${JSON.stringify(formatCliError(error))}\n`);
    process.exitCode = 4;
  });
}
