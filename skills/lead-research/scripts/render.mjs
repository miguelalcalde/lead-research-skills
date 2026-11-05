import { readFile, mkdir, readdir, lstat, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { operations, validateProposal } from './validate.mjs';

const reviewStates = ['unreviewed', 'needs_review', 'accepted', 'rejected'];
const scalar = ['website', 'official-name', 'linkedin', 'hq', 'business-model', 'operating-margin'];
const lists = ['ownership', 'news', 'people-candidates'];
const empty = value => value === null || value === undefined ? '' : String(value);
const onlyKeys = (item, allowed, label) => {
  if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(k => !allowed.includes(k)))
    throw new Error(`Unexpected fields in ${label}`);
};
const safeId = id => typeof id === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(id);
const csvCell = value => {
  let text = empty(value);
  if (typeof value !== 'number' && /^[\u0000-\u0020]*[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
export const csv = rows => rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
const md = value => empty(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/([\\`*_{}\[\]#|<>])/g, '\\$1');
const linkTarget = url => url.replace(/[<>\r\n]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
const link = url => `[source](<${linkTarget(url)}>)`;
const valueLink = url => `[${md(url)}](<${linkTarget(url)}>)`;
const sourceLinks = urls => urls.length ? urls.map(link).join(', ') : 'None';
const label = operation => operation.replaceAll('-', ' ');

/** A deterministic, dependency-free presentation of already collected proposals. No search or external writes. */
export function renderBundle(bundle, { includeJson = false } = {}) {
  onlyKeys(bundle, ['accounts'], 'bundle');
  if (!Array.isArray(bundle.accounts) || !bundle.accounts.length) throw new Error('Expected nonempty accounts array');
  const ids = new Set();
  for (const account of bundle.accounts) {
    onlyKeys(account, ['id', 'name', 'operations'], 'account');
    if (!safeId(account.id) || ids.has(account.id.toLowerCase())) throw new Error('Account IDs must be unique safe slugs');
    ids.add(account.id.toLowerCase());
    if (typeof account.name !== 'string' || !account.name.trim()) throw new Error('Account name required');
    onlyKeys(account.operations, operations, 'operations');
    for (const [operation, entry] of Object.entries(account.operations)) {
      onlyKeys(entry, ['proposal', 'evidenceUrls', 'reviewStatus', 'reviewNote'], `operation ${operation}`);
      if (!entry.proposal || entry.proposal.operation !== operation) throw new Error('Proposal operation mismatch');
      onlyKeys(entry.proposal, ['operation', 'status', 'value', 'sources', 'note', 'parentCompany', 'confidence'], 'proposal');
      validateProposal(entry.proposal, entry.evidenceUrls);
      if (entry.proposal.parentCompany) onlyKeys(entry.proposal.parentCompany, ['name', 'sources'], 'parent identity hint');
      if (entry.proposal.confidence) onlyKeys(entry.proposal.confidence, ['value', 'source', 'meaning'], 'endpoint confidence');
      if (entry.proposal.status === 'found' && lists.includes(operation)) {
        const fields = operation === 'ownership' ? ['name', 'ownerType', 'relationship', 'stakePercent', 'percentageType', 'asOf', 'sources', 'note']
          : operation === 'news' ? ['title', 'url', 'publishedAt', 'summary']
          : ['name', 'title', 'employer', 'role', 'profileUrl', 'sources', 'caveat'];
        for (const item of entry.proposal.value) onlyKeys(item, fields, `${operation} item`);
      }
      if (entry.reviewStatus !== undefined && !reviewStates.includes(entry.reviewStatus)) throw new Error('Invalid review status');
      if (entry.reviewNote !== undefined && typeof entry.reviewNote !== 'string') throw new Error('Invalid review note');
    }
  }

  const headers = ['account_id', 'input_name', 'brief_path'];
  for (const op of scalar) {
    const prefix = op.replaceAll('-', '_');
    headers.push(`${prefix}_status`, `${prefix}_proposed_value`, `${prefix}_review_status`, `${prefix}_primary_source`);
    if (op === 'operating-margin') headers.push('operating_margin_period', 'operating_margin_entity', 'operating_margin_basis');
  }
  for (const op of lists) {
    const prefix = op.replaceAll('-', '_');
    headers.push(`${prefix}_status`, `${prefix}_count`, `${prefix}_review_status`);
  }
  const accountsCsv = [headers];
  const ownershipCsv = [['account_id','owner_name','owner_type','relationship','stake_percent','percentage_type','as_of','primary_source','review_status','owner_note']];
  const peopleCsv = [['account_id','name','title','employer','role','profile_url','primary_source','caveat','review_status']];
  const newsCsv = [['account_id','published_at','title','article_url','summary','review_status']];
  const files = new Map();

  for (const account of bundle.accounts) {
    const row = [account.id, account.name, `briefs/${account.id}.md`];
    const brief = [`# ${md(account.name)}`, '', `Account ID: \`${account.id}\``, '', '## Proposed facts', '', '| Operation | Research status | Proposed value | Review status | Sources |', '| --- | --- | --- | --- | --- |'];
    const notes = [];
    for (const op of scalar) {
      const entry = account.operations[op];
      if (!entry) {
        row.push('not_requested', '', '', '');
        if (op === 'operating-margin') row.push('', '', '');
        continue;
      }
      const { proposal } = entry;
      const review = entry.reviewStatus ?? 'unreviewed';
      const value = op === 'operating-margin' && proposal.status === 'found'
        ? proposal.value.percentage : proposal.status === 'found' ? proposal.value : '';
      row.push(proposal.status, value, review, proposal.sources[0] ?? '');
      if (op === 'operating-margin') row.push(proposal.value?.period ?? '', proposal.value?.entity ?? '', proposal.value?.basis ?? '');
      const display = op === 'operating-margin' && proposal.status === 'found'
        ? `${proposal.value.percentage}% (${proposal.value.period}; ${proposal.value.entity}; ${proposal.value.basis})`
        : proposal.status === 'found' ? proposal.value : '—';
      const displayedValue = proposal.status === 'found' && ['website', 'linkedin'].includes(op) ? valueLink(display) : md(display);
      brief.push(`| ${md(label(op))} | ${md(label(proposal.status))} | ${displayedValue} | ${md(label(review))} | ${sourceLinks(proposal.sources)} |`);
      if (proposal.note) notes.push(`- ${md(label(op))}: ${md(proposal.note)}`);
      if (entry.reviewNote) notes.push(`- ${md(label(op))} review: ${md(entry.reviewNote)}`);
      if (proposal.parentCompany) notes.push(`- Parent identity hint: ${md(proposal.parentCompany.name)} (${sourceLinks(proposal.parentCompany.sources)}); not an established relation.`);
    }
    accountsCsv.push(row);
    for (const op of lists) {
      const entry = account.operations[op];
      if (!entry) { row.push('not_requested', '', ''); continue; }
      const { proposal } = entry;
      const review = entry.reviewStatus ?? 'unreviewed';
      row.push(proposal.status, proposal.status === 'found' ? proposal.value.length : 0, review);
      if (proposal.note) notes.push(`- ${md(label(op))}: ${md(proposal.note)}`);
      if (entry.reviewNote) notes.push(`- ${md(label(op))} review: ${md(entry.reviewNote)}`);
      if (proposal.status !== 'found') continue;
      if (op === 'ownership') for (const owner of proposal.value) ownershipCsv.push([
        account.id, owner.name, owner.ownerType, owner.relationship, owner.stakePercent,
        owner.percentageType, owner.asOf, owner.sources[0], review, owner.note,
      ]);
      if (op === 'people-candidates') for (const person of proposal.value) peopleCsv.push([
        account.id, person.name, person.title, person.employer, person.role, person.profileUrl,
        person.sources[0], person.caveat, review,
      ]);
      if (op === 'news') for (const article of proposal.value) newsCsv.push([
        account.id, article.publishedAt, article.title, article.url, article.summary, review,
      ]);
    }
    brief.push('', '## Context and caveats', '', ...(notes.length ? notes : ['- None supplied.']));
    for (const op of lists) {
      const entry = account.operations[op];
      if (!entry) continue;
      brief.push('', `## ${md(label(op))}`, '', `Research: ${md(label(entry.proposal.status))}; review: ${md(label(entry.reviewStatus ?? 'unreviewed'))}.`, '');
      if (entry.proposal.status !== 'found') continue;
      for (const item of entry.proposal.value) {
        if (op === 'ownership') brief.push(`- ${md(item.name)} (${md(label(item.relationship))}, ${md(item.ownerType)}): ${item.stakePercent === null ? `stake unknown${item.asOf ? ` as of ${md(item.asOf)}` : ''}` : `${item.stakePercent}% ${md(item.percentageType)} as of ${md(item.asOf)}`}. ${md(item.note)} Sources: ${sourceLinks(item.sources)}.`);
        if (op === 'people-candidates') brief.push(`- ${md(item.name)}, ${md(item.title)} at ${md(item.employer)}: ${md(label(item.role))}. ${md(item.caveat)} Profile: ${item.profileUrl ? link(item.profileUrl) : 'not found'}. Sources: ${sourceLinks(item.sources)}.`);
        if (op === 'news') brief.push(`- ${md(item.publishedAt)}: ${md(item.title)}. ${md(item.summary)} ${link(item.url)}.`);
      }
    }
    files.set(`briefs/${account.id}.md`, brief.join('\n') + '\n');
  }
  files.set('accounts.csv', csv(accountsCsv));
  files.set('ownership.csv', csv(ownershipCsv));
  files.set('people.csv', csv(peopleCsv));
  files.set('news.csv', csv(newsCsv));
  if (includeJson) files.set('results.json', JSON.stringify(bundle, null, 2) + '\n');
  return files;
}

if (process.argv[1] && process.argv[1] !== '-' && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: node scripts/render.mjs <proposals.json> <new-or-empty-output-directory> [--json]');
  } else {
    try {
      if ((args.length !== 2 && args.length !== 3) || (args[2] && args[2] !== '--json')) throw new Error('Expected input, output directory and optional --json');
      const files = renderBundle(JSON.parse(await readFile(args[0], 'utf8')), { includeJson: args[2] === '--json' });
      const dest = resolve(args[1]);
      try {
        const state = await lstat(dest);
        if (!state.isDirectory() || (await readdir(dest)).length) throw new Error('Output directory must be empty and not a symlink');
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await mkdir(dest, { recursive: true });
      for (const [path, content] of files) {
        const target = join(dest, path);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, content, { flag: 'wx', mode: 0o600 });
      }
      console.log(`Wrote ${files.size} local files to ${dest}`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
