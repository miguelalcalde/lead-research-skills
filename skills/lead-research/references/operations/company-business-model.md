# Operation: `business-model`

Input: company or brand name; optionally website, region and intended operating entity. Output: a concise description of **how that entity earns revenue** (for example, subscriptions, product sales, transaction commissions, advertising, services or a supported mix). Do not infer its model merely from its industry or a parent's model.

Search: Exa `category: company`, `type: auto`, at most five results, short excerpts. Query the company and concrete product/revenue terms. Prefer official product, pricing, annual-report or investor pages. If those only establish what the company does, not how it charges, one targeted general search may clarify; otherwise mark `not_found` or `ambiguous`. Distinguish evidenced revenue mechanisms from speculative sales-fit hypotheses. Cite exact retrieved pages that actually support the proposed model. Return the usual proposal contract with a string `value`; do not invent revenue shares or confidence.
