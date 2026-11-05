# Operation: `hq`

Input: company/brand name; optional region and known website. Output: the **publicly evidenced headquarters location of the intended operating entity**. Use a street address only when an official source explicitly identifies it as HQ; otherwise return a supported city/region/country. A registered office, mailing address, branch and parent HQ are not interchangeable.

Search: Exa `category: company`, `type: auto`, `numResults: 5`, short highlights. Check official About/contact pages, legal pages and company profiles for what the address represents. One targeted general web search may resolve a conflicting location. Return `ambiguous` if several plausible HQs remain or `not_found` if sources only give unlabelled offices. Cite the page text naming the location and its HQ status; an address in a footer alone does not prove headquarters.
