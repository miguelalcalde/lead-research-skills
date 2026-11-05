# Lead research skill

A standalone, storage-agnostic skill for manual prospecting. The host harness selects company facts to research and handles reading and writing records. This is **not** a lead-research agent or a Notion integration.

## Features

- **Independent operations:** find only an official [website](skills/lead-research/references/operations/company-website.md), [operating-company name](skills/lead-research/references/operations/company-official-name.md), [LinkedIn organization page](skills/lead-research/references/operations/company-linkedin.md), [headquarters](skills/lead-research/references/operations/company-hq.md), [ownership and disclosed fund stakes](skills/lead-research/references/operations/company-ownership.md), [business model](skills/lead-research/references/operations/company-business-model.md), [reported operating margin](skills/lead-research/references/operations/company-operating-margin.md), [recent news](skills/lead-research/references/operations/company-news.md), [potential people to engage](skills/lead-research/references/operations/people-candidates.md), or any requested combination. No domain or earlier step is required to start.
- **Evidence-first proposals:** each requested fact is `found`, `ambiguous`, or `not_found`, with exact retrieved source URLs. An optional sourced `parentCompany` identifies a separate parent; the harness decides whether to store it as a relation or text. Confidence appears only if an endpoint returns a defined confidence value—never as a model guess.
- **Bounded research:** per-operation Exa Search settings and shared entity/evidence rules; `openai/gpt-6-luna` through AI Gateway is the default interpretation model. Inputs and web pages are untrusted, and the skill does not overwrite records or publish findings.
- **CSV-first local handoff:** `accounts.csv`, `ownership.csv`, `people.csv`, `news.csv`, and linked Markdown briefs; optional JSON for structured proposals. [Output contract](skills/lead-research/references/common/output.md) separates research status from review status, so a proposed `found` is not silently approved. A [dependency-free renderer](skills/lead-research/scripts/render.mjs) formats existing proposals without making search/model calls.
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

These checks make no Gateway calls. A separate read-only, three-company live pilot tested the original eight operations; ownership and the new formatter have only synthetic/offline checks. That private pilot found source-quality issues and two person records that fail the tightened validator. This is not a skill-triggering benchmark or published account enrichment; nothing was written to external records.
