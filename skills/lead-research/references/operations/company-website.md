# Operation: `website`

Input: company/brand name; optional region or known parent. No domain required. Output: the **official public website URL for the intended operating entity**, not a directory profile, social account, guessed hostname or unrelated parent site. Preserve the returned official URL; a redirect must be verified before claiming its target.

Search: Exa `category: company`, `type: auto`, `numResults: 5`, short highlights. Query the supplied name, region and “official website”. Prefer the official homepage and corroborating company-profile metadata. If the first results show only aggregators or multiple namesakes, one targeted general web search may clarify; then return `ambiguous` or `not_found` rather than guessing. Cite the exact retrieved homepage and any corroboration. If only a parent site describes the brand, do not label it the subsidiary's own website without explicit support. Never infer a domain from the name.
