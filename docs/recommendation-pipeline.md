# Offline recommendation baseline pipeline

This isolated, Node-built-in-only tool evaluates rankings already supplied in a consented dataset. It is a data-quality gate and offline baseline evaluator, **not** a recommender trainer and not part of the application runtime.

## Run

From the repository root:

```powershell
node scripts/recommendations/evaluate.mjs --help
node scripts/recommendations/evaluate.mjs --input .\data\recommendation-eval.jsonl --output .\recommendation-report.json --quarantine .\recommendation-quarantine.jsonl
node --test tests/recommendation-pipeline.test.mjs
```

Exit codes: `0` evaluated, `2` invalid input/configuration or policy rejection, `3` no usable/too-small dataset, and `4` file I/O failure. The evaluator's default mode is `production`; `--mode exploratory` is required to evaluate explicitly marked synthetic/demo data. Production refuses synthetic or demo data. Both modes still require documented provenance, granted consent, and `eligibleForEvaluation: true`.

Limits are deliberate: a 64 MiB input file, 128 KiB per line, 20,000 non-empty rows, at most 500 candidates per query, at least four valid queries, at least two test queries, and at least two distinct query timestamps. Rows that fail validation are quarantined by line number and stable reason code. The optional quarantine file contains **only** line numbers and reason codes, never raw data. Keep input, report, and quarantine paths separate.

## Input contract: `recommendation-eval/v1`

Input is UTF-8 JSON Lines: one query and its supplied candidate ranking per line. Fields are strict; unknown fields are rejected.

```json
{
  "schemaVersion": "recommendation-eval/v1",
  "dataset": {
    "datasetId": "opaque-dataset-version",
    "dataClass": "observed",
    "provenanceSource": "first_party_consented",
    "consentStatus": "granted",
    "eligibleForEvaluation": true
  },
  "queryId": "q-0001",
  "actorId": "opaque-actor-0001",
  "observedAt": "2025-01-01T12:00:00Z",
  "rankingAt": "2025-01-01T11:59:00Z",
  "candidates": [
    {
      "entityId": "opaque-listing-0001",
      "rank": 1,
      "relevance": 3,
      "labelStatus": "confirmed",
      "labelSource": "human-review"
    }
  ]
}
```

- IDs must be opaque ASCII tokens containing letters, digits, `.`, `_`, `:`, or `-`; do not place names, emails, free text, or other personal information in identifiers.
- `dataClass` is `observed`, `curated`, `synthetic`, or `demo`. `provenanceSource` is `first_party_consented`, `licensed`, or `research_consent`. Consent must be `granted`; eligibility must be `true`. All records in the file must describe the same dataset.
- Timestamps must be valid UTC ISO-8601 instants ending in `Z`. `rankingAt` must be no later than `observedAt`; any later ranking is rejected (`ranking_time_after_query`).
- Every candidate requires a unique entity ID within the query, a unique positive rank, relevance `0`–`3`, `labelStatus` of `authored` or `confirmed`, and a non-empty source for that authored/confirmed judgment. Relevance zero is an explicit human judgment of non-relevance. A click, non-click, or missing impression is never accepted as a label and is never used to infer a negative.
- Candidate ranks must form the complete sequence `1..N` for the supplied ranking; gaps are rejected instead of compressing positions during top-`K` metrics.
- Query IDs must be unique across the dataset. Invalid timestamps, duplicate IDs/ranks, bad labels, malformed JSON, missing required fields, and other schema violations are quarantined with explicit reason codes. Metadata policy violations reject the evaluation rather than silently changing cohorts.

The executable validator is the source of truth for the versioned contract; `INPUT_SCHEMA` in `scripts/recommendations/evaluate.mjs` describes its structural JSON Schema contract, with additional semantic checks (such as ID uniqueness, UTC calendar validity, and chronology) performed by the evaluator.

## Split, metrics, and report

Queries are grouped by observation timestamp and sorted chronologically; equal timestamps stay together. The split is deterministic, with the older portion as train/context and the newer portion as test. A strict boundary check guarantees the newest training observation precedes the earliest test observation. A supplied ranking is checked to predate its query observation. **Only** test rows contribute to metrics. No records are shuffled and the seed is recorded as a run identifier; it does not affect this chronological split.

The JSON report includes input schema and report versions, hashed dataset ID, coarse provenance and consent eligibility, temporal coverage, valid/quarantined counts, unique actor/entity counts, missingness, explicit-label distribution, quarantine reason counts, split boundary, run config and privacy declarations. It deliberately omits raw actor, entity, and query IDs and source text.

Metrics are macro-averaged across test queries:

- **NDCG@K:** graded relevance gain (`2^relevance - 1`) with logarithmic rank discount.
- **Precision@K:** relevant retrieved candidates divided by K (even when fewer than K candidates are supplied).
- **Recall@K:** relevant retrieved divided by all explicitly relevant candidates in that query.
- **Coverage@K:** distinct entities appearing in any top-K test ranking divided by distinct candidates appearing in test rankings.

For an all-zero-label query, NDCG and recall are zero. These are descriptive metrics of the supplied ranking and labels, not a causal estimate or evidence that a production recommender is effective. Empty/tiny cohorts and splits with too few test examples fail without metrics; small valid samples are not extrapolated.

## Boundaries and limitations

- Current application recommendations are deterministic feature-weighted matching over local fictional demo records; there is no live recommendation service or labeled interaction dataset. Demo records are not valid production evaluation evidence.
- This pipeline consumes already-ranked candidates. It does not create rankings, fit parameters, train a model, tune on the test set, infer labels, identify users, or establish fairness, calibration, business impact, or causal lift. A baseline metric is only as trustworthy as the ranking provenance and human label process supplied by the dataset owner.
- Actor/entity IDs are used transiently for counts and joins; reports emit only counts and a hash of the dataset ID. Use opaque IDs in source files, restrict file access, and apply appropriate retention controls to inputs. Hashing identifiers would not make raw input safe to publish.
- A chronological holdout reduces one class of future leakage but cannot detect leakage already embedded in candidate generation or labels, repeat-actor/entity dependence, selection bias, exposure effects, label disagreement, or distribution shift. For high-stakes evaluation, design an actor/entity-aware protocol, retain label provenance, and have an independent reviewer validate it.
- RL and online training remain disabled. The app has no verified sequence of impression, exposure, action, and downstream outcome events with consent, reliable timestamps, attribution, and counterfactual-safe logging. Clicks and missing impressions are biased/ambiguous and cannot stand in for outcomes. Online learning without these controls would risk feedback loops and misleading claims; this offline tool neither enables nor implies such capability.
