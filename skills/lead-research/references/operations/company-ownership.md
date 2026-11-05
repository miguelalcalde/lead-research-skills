# Operation: `ownership`

Input: company/brand or operating-entity name; optional official website, region and known legal name. Run this operation independently when asked who owns an account; do not require official-name or any other step first.

Find the **direct legal parent or controller** and material publicly disclosed stakes. A fund may be a controlling owner, a minority investor, or merely a shareholder. Distinguish the fund's legal entity from its manager, and direct holdings from indirect or ultimate control. Do not promise a complete cap table or infer 100% ownership from an acquisition headline. For a widely held public issuer with no supported controller, return `not_found` or `ambiguous` with an explanation, rather than manufacturing a parent.

Search: Exa company search first (`type: auto`, up to five short results), then one targeted general search of official investor/filing, shareholder, acquisition or regulatory pages if needed. Dated official filings and transaction releases outrank directory profiles. Cite only exact returned pages that establish the specific relationship. Resolve entity/brand and jurisdiction before merging multiple claims. Conflicting dates, voting versus economic rights, and announced versus completed transactions are material caveats. Never extrapolate an undisclosed stake percentage or sum partial disclosure to 100%.

For `found`, `value` is an array of 1–10 owners, each with:

```json
{
  "name": "Example Holdings Ltd",
  "ownerType": "company",
  "relationship": "direct_parent",
  "stakePercent": 75,
  "percentageType": "equity",
  "asOf": "2025-12-31",
  "sources": ["https://example.com/filing"],
  "note": "The filing states 75% of ordinary shares."
}
```

`ownerType` is `company`, `fund`, `individual`, `state` or `other`; `relationship` is `direct_parent`, `controller` or `material_stake`; `percentageType` is `equity`, `voting`, `indirect_equity`, `indirect_voting` or `other`. If no source states a percentage, set both `stakePercent` and `percentageType` to `null`—the relationship may still be sourced. If a percentage **is** stated, require its type, an actual `asOf` date (`YYYY-MM-DD`) and an exact source page for that owner. If the source is dated but the stake is unknown, `asOf` may still be recorded. Every owner requires source URLs; `sources` on the enclosing proposal is their union. Do not store personal contact information. A storage relation, if available, is resolved by the host after identity review, not created by this skill.
