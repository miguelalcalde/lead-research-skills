# Operation: `news`

Input: company/brand name, optional domain/region and an explicit or default lookback. Output: **up to three relevant, independently sourced company developments**, not a general relevance score or an assertion of buying intent. Use a six-month lookback unless the user specifies otherwise.

Search: Exa `category: news`, `type: auto`, at most five results, `startPublishedDate` set to the lookback start. Check that each result concerns the intended operating company rather than a namesake; avoid syndicated duplicates and undated/stale items. Source dates are required for inclusion; if no dated relevant result is verified, return `not_found`. A company announcement may be corroborated by a news result but do not treat a press release as independent journalism. Cite the exact returned article page for each item.

For `found`, `value` is an array of 1–3 `{ title, url, publishedAt, summary }` items. The `url` must be an exact retrieved result URL and also appear in `sources`. `publishedAt` is an actual date from the source (`YYYY-MM-DD`), not an invented recency estimate. Keep summaries factual and short, flag material conflicts in `note`, and never imply the news proves an active purchase process.
