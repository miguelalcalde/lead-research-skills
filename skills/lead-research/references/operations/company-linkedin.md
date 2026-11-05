# Operation: `linkedin`

Input: company/brand name; optional region and known website. Output: the exact **official organization LinkedIn `/company/` page URL** for the intended entity, if evidenced. Do not return a person profile, group, post, search URL or guessed slug.

Search: Exa general web search (no `category`), `type: auto`, `numResults: 5`, `includeDomains: ['linkedin.com/company']`, short highlights; include name and region/domain in query. Check displayed organization name and employer/domain or independently retrieved official link for identity. A plausible LinkedIn result alone may refer to a parent or namesake. If the returned URL doesn't identify the right entity, use `ambiguous` or `not_found`. Cite the exact retrieved organization page; a social icon on another page is not proof that its linked page was retrieved.
