import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

export const operations = ['website', 'official-name', 'linkedin', 'hq', 'business-model', 'operating-margin', 'news', 'people-candidates', 'ownership'];
const statuses = ['found', 'ambiguous', 'not_found'];
const isUrl = value => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};
const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

/** Structural and exact-result-URL validation only; human review establishes factual support. */
export function validateProposal(proposal, retrievedUrls) {
  if (!proposal || !operations.includes(proposal.operation) || !statuses.includes(proposal.status))
    throw new Error('Invalid operation or status');
  if (!Array.isArray(retrievedUrls) || retrievedUrls.some(url => !isUrl(url)))
    throw new Error('Invalid retrieved URLs');
  const seen = new Set(retrievedUrls);
  if (!Array.isArray(proposal.sources) || proposal.sources.some(url => !isUrl(url) || !seen.has(url)))
    throw new Error('Every source must be an exact retrieved result-page URL');
  if (proposal.status === 'found') {
    if (proposal.sources.length === 0) throw new Error('Found requires a source');
    if (['website', 'official-name', 'linkedin', 'hq', 'business-model'].includes(proposal.operation)
        && (typeof proposal.value !== 'string' || !proposal.value.trim()))
      throw new Error('Found requires a nonempty string value');
    if (proposal.operation === 'operating-margin') {
      const m = proposal.value;
      if (!m || typeof m !== 'object' || Array.isArray(m)
          || Object.keys(m).some(k => !['percentage', 'period', 'entity', 'basis', 'operatingIncome', 'revenue'].includes(k))
          || !Number.isFinite(m.percentage)
          || typeof m.entity !== 'string' || !m.entity.trim()
          || typeof m.period !== 'string' || !m.period.trim()
          || !['reported', 'calculated'].includes(m.basis))
        throw new Error('Margin requires percentage, entity, period and basis');
      if (m.basis === 'calculated' && (!Number.isFinite(m.operatingIncome) || !Number.isFinite(m.revenue)
          || m.revenue === 0 || Math.abs(m.percentage - 100 * m.operatingIncome / m.revenue) > 0.05))
        throw new Error('Calculated margin must match operating income / revenue');
    }
    if (proposal.operation === 'news') {
      if (!Array.isArray(proposal.value) || !proposal.value.length || proposal.value.length > 3
          || proposal.value.some(n => !n || typeof n.title !== 'string' || !n.title.trim()
            || typeof n.summary !== 'string' || !n.summary.trim()
            || !seen.has(n.url) || !proposal.sources.includes(n.url)
            || !isDate(n.publishedAt)))
        throw new Error('News requires up to three dated, sourced results');
    }
    if (proposal.operation === 'ownership') {
      const owners = proposal.value;
      if (!Array.isArray(owners) || !owners.length || owners.length > 10
          || owners.some(o => !o || typeof o.name !== 'string' || !o.name.trim()
            || !['company', 'fund', 'individual', 'state', 'other'].includes(o.ownerType)
            || !['direct_parent', 'controller', 'material_stake'].includes(o.relationship)
            || !Array.isArray(o.sources) || !o.sources.length
            || o.sources.some(url => !seen.has(url) || !proposal.sources.includes(url))
            || typeof o.note !== 'string' || !o.note.trim()
            || (o.asOf !== null && !isDate(o.asOf))
            || (o.stakePercent === null
              ? o.percentageType !== null
              : !Number.isFinite(o.stakePercent) || o.stakePercent <= 0 || o.stakePercent > 100
                || !['equity', 'voting', 'indirect_equity', 'indirect_voting', 'other'].includes(o.percentageType)
                || !isDate(o.asOf)))
          || new Set(owners.map(o => [o.name.toLowerCase(), o.relationship, o.percentageType].join('|'))).size !== owners.length)
        throw new Error('Ownership requires distinct sourced owners and dated typed percentages when disclosed');
    }
    if (proposal.operation === 'people-candidates') {
      if (!Array.isArray(proposal.value) || !proposal.value.length || proposal.value.length > 5
          || new Set(proposal.value.map(p => p?.name?.toLowerCase())).size !== proposal.value.length
          || proposal.value.some(p => !p || ['name', 'title', 'employer', 'caveat'].some(k => typeof p[k] !== 'string' || !p[k].trim())
            || p.name.trim().split(/\s+/).length < 2 || /^[\p{L}]\.$/u.test(p.name.trim().split(/\s+/).at(-1))
            || !['champion_candidate', 'economic_buyer_candidate', 'influencer_candidate'].includes(p.role)
            || !Array.isArray(p.sources) || !p.sources.length
            || p.sources.some(url => !seen.has(url) || !proposal.sources.includes(url))
            || (p.profileUrl !== null && (!isUrl(p.profileUrl) || !seen.has(p.profileUrl)
              || !/(^|\.)linkedin\.com$/i.test(new URL(p.profileUrl).hostname)
              || !new URL(p.profileUrl).pathname.startsWith('/in/') || !p.sources.includes(p.profileUrl)
              || !proposal.sources.includes(p.profileUrl)))
            || /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/.test(JSON.stringify(p))))
        throw new Error('People require distinct sourced professional candidates without contact data');
    }
  } else if (proposal.value !== null) throw new Error('Non-found results require a null value');
  if (proposal.status === 'ambiguous' && (!proposal.note || typeof proposal.note !== 'string'))
    throw new Error('Ambiguity needs an explanation');
  if (proposal.note !== undefined && typeof proposal.note !== 'string') throw new Error('Invalid note');
  if (proposal.status === 'found' && ['website', 'linkedin'].includes(proposal.operation)) {
    if (!isUrl(proposal.value) || !seen.has(proposal.value))
      throw new Error('Identity URL must be an exact retrieved result-page URL');
    if (proposal.operation === 'linkedin') {
      const url = new URL(proposal.value);
      if (!/(^|\.)linkedin\.com$/i.test(url.hostname) || !url.pathname.startsWith('/company/'))
        throw new Error('LinkedIn must be an organization page');
    }
  }
  if (proposal.parentCompany !== undefined) {
    const parent = proposal.parentCompany;
    if (!parent || typeof parent.name !== 'string' || !parent.name.trim()
        || !Array.isArray(parent.sources) || parent.sources.length === 0
        || parent.sources.some(url => !seen.has(url)))
      throw new Error('Parent company requires a name and retrieved supporting URLs');
  }
  if (proposal.confidence !== undefined) {
    const c = proposal.confidence;
    if (!c || typeof c.source !== 'string' || !c.source.trim()
        || typeof c.meaning !== 'string' || !c.meaning.trim()
        || typeof c.value !== 'number' || !Number.isFinite(c.value))
      throw new Error('Confidence requires a numeric endpoint value, source and documented meaning');
  }
  return proposal;
}

if (process.argv[1] && process.argv[1] !== '-' && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
  const [proposalPath, evidencePath] = process.argv.slice(2);
  if (!proposalPath || !evidencePath) {
    console.error('Usage: node scripts/validate.mjs <proposal.json> <retrieved-urls.json>');
    process.exitCode = 2;
  } else {
    try {
      const proposal = JSON.parse(await readFile(proposalPath, 'utf8'));
      const urls = JSON.parse(await readFile(evidencePath, 'utf8'));
      for (const item of Array.isArray(proposal) ? proposal : [proposal]) validateProposal(item, urls);
      console.log('Structural and URL checks passed; factual review remains required.');
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
