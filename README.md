# Lead research skill

A standalone, storage-agnostic skill for manual prospecting and identifying a public professional from partial clues. The host harness selects company facts or person-identification lookups and handles reading and writing records. This is **not** a lead-research agent or a Notion integration.

## Features

- **Ten independent operations:** nine batch/prospecting operations—official [website](skills/lead-research/references/operations/company-website.md), [operating-company name](skills/lead-research/references/operations/company-official-name.md), [LinkedIn organization page](skills/lead-research/references/operations/company-linkedin.md), [headquarters](skills/lead-research/references/operations/company-hq.md), [ownership and disclosed fund stakes](skills/lead-research/references/operations/company-ownership.md), [business model](skills/lead-research/references/operations/company-business-model.md), [reported operating margin](skills/lead-research/references/operations/company-operating-margin.md), [recent news](skills/lead-research/references/operations/company-news.md), and [potential people to engage](skills/lead-research/references/operations/people-candidates.md)—plus standalone [person identification from partial clues](skills/lead-research/references/operations/person-identification.md), or any requested combination. No domain, verified company name, or earlier step is required to start.
- **Evidence-first proposals:** each requested fact is `found`, `ambiguous`, or `not_found`, with exact retrieved source URLs (never guessed profile slugs). An optional sourced `parentCompany` identifies a separate parent; the harness decides whether to store it as a relation or text. Confidence appears only if an endpoint returns a defined confidence value—never as a model guess.
- **Bounded research:** per-operation Exa Search settings through AI Gateway and shared entity/evidence rules; `openai/gpt-6-luna` through AI Gateway is the default interpretation model. Standalone `person-identification` uses Gateway Exa `category: people` (up to 5 results plus at most one focused follow-up), preserves approximate clues and conflicting evidence, excludes user-rejected candidates, requires no buying motion or buyer-role assignment, and reports missing Gateway access instead of silently switching providers. Inputs and web pages are untrusted, and the skill does not overwrite records or publish findings.
- **Batch CSV handoff vs. standalone chat output:** for the nine batch operations, the default local handoff is CSV-first (`accounts.csv`, `ownership.csv`, `people.csv`, `news.csv`, and linked Markdown briefs; optional JSON for structured proposals). [Output contract](skills/lead-research/references/common/output.md) separates research status from review status, so a proposed `found` is not silently approved, and the [dependency-free renderer](skills/lead-research/scripts/render.mjs) and [validator](skills/lead-research/scripts/validate.mjs) cover those nine batch operations without making search/model calls. Standalone `person-identification` returns concise chat-ready results instead (`status`, exact retrieved source URLs, up to 3 sourced candidates, and confirmation caveats—keeping shortlisted candidates visible on `ambiguous`) and is not passed to the nine-operation batch validator/formatter.
- **Portable packaging:** one installable skill with references, synthetic examples, and dependency-free offline validators/formatters. No npm package, paid-search executable, storage connector, or automatic outreach. Margin keeps the reporting entity and period explicit; ownership percentages require a dated source and a type, while people are hypotheses, never confirmed champions or buyers.

## Install and set up

With Node.js 22.20+, run from the project where you want the skill:

```sh
npx skills add miguelalcalde/lead-research-skills --skill lead-research
```

For a local checkout, use `npx skills add /path/to/lead-research-skills --skill lead-research`. The installable unit is [skills/lead-research/SKILL.md](skills/lead-research/SKILL.md); [getting started](skills/lead-research/references/getting-started.md) covers Gateway credentials and model/search availability. If the host lacks Gateway tools, it points to AI SDK/Gateway setup **in the host**, not a bundled npm dependency. [Synthetic records](skills/lead-research/examples/records.json) and a [synthetic proposal bundle](skills/lead-research/examples/proposals.json) illustrate inputs without prescribing a database schema or using real prospects. Browse the [generated sample accounts CSV](skills/lead-research/examples/sample-output/accounts.csv) and its [Markdown brief](skills/lead-research/examples/sample-output/briefs/example-works.md) to see the default handoff. From the installed skill directory, `node scripts/render.mjs examples/proposals.json /path/to/new-output-directory` regenerates the sample locally; add `--json` for optional `results.json`.

## Offline checks

From the repository root:

```sh
cd skills/lead-research
command node --test scripts/validate.test.mjs scripts/render.test.mjs
command node --check scripts/validate.mjs
command node --check scripts/render.mjs
```

These checks make no Gateway calls and test the nine-operation batch validator and CSV/Markdown formatter. A separate read-only, three-company live pilot tested the original eight operations; ownership, standalone `person-identification`, and the formatter have only synthetic/offline checks and scenario definitions (`skills/lead-research/evals/evals.json`). That private pilot found source-quality issues and two person records that fail the tightened validator. This is not a skill-triggering benchmark or published account enrichment; nothing was written to external records.

## License

Released under the [MIT License](LICENSE).
