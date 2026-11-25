# Operation: `person-identification`

Input: partial clues for a public professional (e.g., first name, approximate or phonetic company name, role, sector, location) plus any candidates already rejected by the user. Do not require a verified company name, seller offering, or buying motion, and do not assign buyer roles (`champion_candidate`, `economic_buyer_candidate`, `influencer_candidate`).

Search: use the skill's Gateway Exa Search route (`category: people`, `type: auto`, up to 5 results) starting with the strongest clues (name, role, region). Run at most one focused follow-up search to resolve an approximate/phonetic company name, nearby municipality, or title gap. Do not silently switch away from Gateway Exa if access is missing; report the blocker using [getting started](../getting-started.md).

Matching and caveats:

- Treat remembered clues as hypotheses; preserve approximate spellings and geographic variants rather than forcing a fit.
- Exclude candidates the user already rejected.
- Distinguish a sourced public profile from confirmation that it is the person the user met; preserve conflicting role, employer, or date evidence.
- Prefer an exact retrieved personal LinkedIn `/in/` URL when returned; never guess slugs or collect private contact details.

Output: return concise chat-ready results with `status` (`found`, `ambiguous`, or `not_found`), exact retrieved source-page URLs, and up to 3 sourced candidates (`{ name, title, employer, location, profileUrl, sources, matchNote }`). For `found`, one candidate clearly matches the clues while still noting that user confirmation is needed; for `ambiguous`, still list the shortlisted candidates (up to 3), name the remaining gap or conflict, and ask for one discriminating clue; for `not_found`, list no candidates and state the searches tried. Do not pass `person-identification` to the nine-operation batch `scripts/validate.mjs` or `scripts/render.mjs` formatter.
