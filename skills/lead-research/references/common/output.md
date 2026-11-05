# CSV-first output and local formatting

The skill researches facts; the host harness controls record access, optional file output and publication. For a requested local handoff, default to **CSV plus Markdown**. JSON is optional for systems that want the full validated proposal bundle. These are proposed research results, not a database sync or a promise of factual approval.

## Local files

- `accounts.csv`: one row per host-supplied `account_id`, original input name, `brief_path`, scalar proposed facts and each field's research status, review status and primary source. Ownership, news and people show operation status and count here. Unrequested operations have `not_requested` in CSV only; that is not a model/research status.
- `ownership.csv`: one row per disclosed direct parent, controller or material stake, including owner type, percentage or blank (unknown), percentage type, as-of date, primary source and review status.
- `people.csv`: one row per public professional candidate with employer/title, role hypothesis, evidenced profile when available, caveat, source and review status. No contact details.
- `news.csv`: one row per dated article with source URL and factual summary. News is not purchase intent.
- `briefs/<account_id>.md`: notes, conflicts, all source URLs, entity and period scope, and full ownership/people/news lists. A CSV's single primary source is not the entire evidentiary basis; use the brief for every cited page.
- `results.json` only on request: the same validated input proposals and source URL lists, not full Exa snippets or credential material.

Every column containing model research says `proposed_value` rather than silently presenting it as accepted fact. `found` / `ambiguous` / `not_found` is a **research** status; `unreviewed` / `needs_review` / `accepted` / `rejected` is a separate **host-supplied review** status. Omitted review state defaults to `unreviewed`; the formatter never calls a model or declares approval. A known weak but structurally valid claim can be marked `needs_review`; a structurally invalid proposal blocks export until it is corrected or omitted. Blank value with `not_found` differs from `not_requested`. The host may map accepted ownership to a relation, but the skill never creates one.

## Input to the optional dependency-free formatter

Pass a JSON object containing a nonempty `accounts` array. Each account has a host-assigned stable `id` (safe slug, never sent to public search), original `name`, and an `operations` object keyed by requested operation. Each operation entry has `proposal` (the [evidence contract](evidence.md)), `evidenceUrls` (exact retrieved result-page URLs for provenance validation), optional `reviewStatus`, and optional `reviewNote`. Unrequested operations are omitted. The formatter checks the bundle **before** writing and rejects extra fields, invalid URLs, unsupported stakes or partial person names. This only checks structure/provenance, not factual entailment or current employment.

Run from the installed skill directory (the one containing `SKILL.md`):

```sh
node scripts/render.mjs examples/proposals.json /path/to/new-or-empty-output-directory
# Add --json to also export results.json.
```

The output directory must be new or empty; the helper refuses overwrite and never makes model/search or external-service calls. It uses Node.js standard library only. CSV quotes values, handles commas/newlines and neutralizes leading spreadsheet formula characters. Keep real inputs/outputs in private, access-controlled storage; do not add customer research, contact details, keys or reviewed results to the shared skill. [Synthetic input](../../examples/proposals.json) and its [generated example](../../examples/sample-output/accounts.csv) demonstrate the layout without live calls.
