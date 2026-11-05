import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { renderBundle, csv } from './render.mjs';

const fixturePath = new URL('../examples/proposals.json', import.meta.url);
const fixture = () => JSON.parse(readFileSync(fixturePath, 'utf8'));

test('default export is CSV-first with linked Markdown briefs, not JSON', () => {
  const files = renderBundle(fixture());
  assert.deepEqual([...files.keys()].sort(), ['accounts.csv', 'briefs/example-works.md', 'briefs/sample-retail.md', 'news.csv', 'ownership.csv', 'people.csv']);
  assert.match(files.get('accounts.csv'), /"example-works","Example Works","briefs\/example-works.md"/);
  assert.match(files.get('accounts.csv'), /"not_requested"/);
  assert.match(files.get('accounts.csv'), /"not_found"/);
  assert.match(files.get('accounts.csv'), /"needs_review"/);
  assert.match(files.get('accounts.csv'), /"operating_margin_period"/);
  assert.match(files.get('ownership.csv'), /"Example Holdings","company","direct_parent","75","equity","2025-12-31"/);
  assert.match(files.get('ownership.csv'), /"Sample Growth Fund II","fund","material_stake","","","2025-12-31"/);
  assert.match(files.get('people.csv'), /"example-works","Alex Example","CTO"/);
  assert.match(files.get('news.csv'), /"example-works","2026-10-01"/);
  assert.match(files.get('briefs/example-works.md'), /Check the operating entity and parent scope/);
  assert.match(files.get('briefs/example-works.md'), /\[https:\/\/example.com\/\]\(<https:\/\/example.com\/>\)/);
  assert.match(files.get('briefs/example-works.md'), /2025-12-31/);
  assert.match(files.get('briefs/example-works.md'), /\[source\]\(<https:\/\/example.com\/filing>\)/);
});

test('checked-in synthetic sample matches the formatter exactly', () => {
  for (const [name, content] of renderBundle(fixture())) {
    assert.equal(readFileSync(new URL(`../examples/sample-output/${name}`, import.meta.url), 'utf8'), content, name);
  }
});

test('ownership is independently selectable without website research', () => {
  const bundle = fixture();
  bundle.accounts[0].operations = { ownership: bundle.accounts[0].operations.ownership };
  bundle.accounts = bundle.accounts.slice(0, 1);
  const files = renderBundle(bundle);
  assert.match(files.get('accounts.csv'), /"example-works","Example Works","briefs\/example-works.md","not_requested"/);
  assert.match(files.get('ownership.csv'), /"Example Holdings"/);
  assert.equal(files.get('news.csv').split('\r\n').filter(Boolean).length, 1);
});

test('optional JSON retains structured proposals and account IDs', () => {
  const files = renderBundle(fixture(), { includeJson: true });
  assert.equal(files.size, 7);
  assert.deepEqual(JSON.parse(files.get('results.json')), fixture());
});

test('CSV quotes commas, quotes and newlines, and neutralizes spreadsheet formulas', () => {
  const output = csv([['name','note'], ['=IMPORTDATA("https://example.com")', 'Alice, "quoted"\nnext line'], [' -SUM(1,2)', '+cmd']]);
  assert.match(output, /"'=IMPORTDATA\(""https:\/\/example.com""\)"/);
  assert.match(output, /"Alice, ""quoted""\nnext line"/);
  assert.match(output, /"' -SUM\(1,2\)"/);
  assert.match(output, /"'\+cmd"/);
  assert.equal(output.endsWith('\r\n'), true);
});

test('unrequested differs from not_found; no invented approval', () => {
  const files = renderBundle(fixture());
  const header = files.get('accounts.csv').split('\r\n')[0];
  const sample = files.get('accounts.csv').split('\r\n')[2];
  assert.match(header, /"linkedin_status"/);
  assert.match(sample, /"not_requested"/);
  assert.match(sample, /"not_found"/);
  assert.match(sample, /"unreviewed"/);
  assert.doesNotMatch(sample, /"accepted"/);
});

test('fail closed on invalid input, wrong URLs, IDs or review decisions', () => {
  const wrongUrl = fixture();
  wrongUrl.accounts[0].operations.website.evidenceUrls = ['https://unrelated.example/'];
  assert.throws(() => renderBundle(wrongUrl), /exact retrieved/);
  const wrongOwner = fixture();
  wrongOwner.accounts[0].operations.ownership.proposal.value[0].percentageType = null;
  assert.throws(() => renderBundle(wrongOwner), /Ownership requires/);
  const privateMargin = fixture();
  privateMargin.accounts[0].operations['operating-margin'] = {
    proposal: { operation: 'operating-margin', status: 'found',
      value: { percentage: 20, period: 'FY 2025', entity: 'Example Works', basis: 'reported', unexpectedPrivateField: 'do not export' },
      sources: ['https://example.com/report'] }, evidenceUrls: ['https://example.com/report'],
  };
  assert.throws(() => renderBundle(privateMargin, { includeJson: true }), /Margin requires/);
  const unsafeId = fixture();
  unsafeId.accounts[0].id = '../outside';
  assert.throws(() => renderBundle(unsafeId), /safe slugs/);
  const duplicate = fixture();
  duplicate.accounts[1].id = 'EXAMPLE-WORKS';
  assert.throws(() => renderBundle(duplicate), /unique safe slugs/);
  const badReview = fixture();
  badReview.accounts[0].operations.website.reviewStatus = 'approved_by_model';
  assert.throws(() => renderBundle(badReview), /Invalid review status/);
  const unexpected = fixture();
  unexpected.accounts[0].secret = 'do not export';
  assert.throws(() => renderBundle(unexpected), /Unexpected fields/);
  const contactField = fixture();
  contactField.accounts[0].operations['people-candidates'].proposal.value[0].phone = '555-123-4567';
  assert.throws(() => renderBundle(contactField), /Unexpected fields/);
});

test('stdin ESM can import renderer and validator without invoking either CLI', () => {
  const code = `import { renderBundle } from ${JSON.stringify(new URL('./render.mjs', import.meta.url).href)};\n`
    + `import { validateProposal } from ${JSON.stringify(new URL('./validate.mjs', import.meta.url).href)};\n`
    + `console.log(typeof renderBundle + ',' + typeof validateProposal);\n`;
  const run = spawnSync(process.execPath, ['--input-type=module', '-'], { input: code, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout.trim(), 'function,function');
});

test('CLI writes only into an empty local directory and never overwrites', () => {
  const root = mkdtempSync(join(process.platform === 'darwin' ? '/tmp' : tmpdir(), 'lead-research-render-'));
  try {
    const dest = join(root, 'export');
    const args = [new URL('./render.mjs', import.meta.url).pathname, fixturePath.pathname, dest, '--json'];
    const first = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(first.status, 0, first.stderr);
    assert.equal(existsSync(join(dest, 'accounts.csv')), true);
    assert.equal(existsSync(join(dest, 'briefs', 'example-works.md')), true);
    assert.equal(existsSync(join(dest, 'results.json')), true);
    const second = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(second.status, 1);
    assert.match(second.stderr, /Output directory must be empty/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
