import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProposal, operations } from './validate.mjs';

const evidence = ['https://example.com/', 'https://www.linkedin.com/company/example/', 'https://example.com/about'];

test('nine independent operations are available', () => {
  assert.deepEqual(operations, ['website', 'official-name', 'linkedin', 'hq', 'business-model', 'operating-margin', 'news', 'people-candidates', 'ownership']);
});
test('found website matches exact retrieved URL', () => {
  const p = { operation: 'website', status: 'found', value: evidence[0], sources: [evidence[0]] };
  assert.equal(validateProposal(p, evidence), p);
  assert.throws(() => validateProposal({ ...p, value: 'https://guessed.example/' }, evidence), /exact retrieved/);
});
test('found official name and HQ need sources but not an invented confidence', () => {
  for (const operation of ['official-name', 'hq']) {
    assert.equal(validateProposal({ operation, status: 'found', value: 'Example Ltd', sources: [evidence[2]] }, evidence).confidence, undefined);
  }
});
test('company LinkedIn only, not personal profiles or posts', () => {
  const p = { operation: 'linkedin', status: 'found', value: evidence[1], sources: [evidence[1]] };
  assert.equal(validateProposal(p, evidence), p);
  assert.throws(() => validateProposal({ ...p, value: 'https://www.linkedin.com/in/example/' }, [p.value, 'https://www.linkedin.com/in/example/']), /organization/);
});
test('ambiguous and missing outcomes cannot carry a value', () => {
  assert.equal(validateProposal({ operation: 'website', status: 'not_found', value: null, sources: [] }, evidence).status, 'not_found');
  assert.throws(() => validateProposal({ operation: 'website', status: 'ambiguous', value: evidence[0], sources: [evidence[0]] }, evidence), /null/);
  assert.throws(() => validateProposal({ operation: 'website', status: 'ambiguous', value: null, sources: [] }, evidence), /explanation/);
});
test('business model requires a source but no fabricated confidence', () => {
  const p = { operation: 'business-model', status: 'found', value: 'Direct product sales', sources: [evidence[2]] };
  assert.equal(validateProposal(p, evidence), p);
  assert.throws(() => validateProposal({ ...p, value: '' }, evidence), /string/);
});
test('operating margin has scope and verifies calculated arithmetic', () => {
  const p = { operation: 'operating-margin', status: 'found', value: {
    percentage: 20, period: 'FY 2025', entity: 'Example plc', basis: 'calculated', operatingIncome: 20, revenue: 100,
  }, sources: [evidence[2]] };
  assert.equal(validateProposal(p, evidence), p);
  assert.throws(() => validateProposal({ ...p, value: { ...p.value, percentage: 40 } }, evidence), /Calculated margin/);
  assert.throws(() => validateProposal({ ...p, value: { percentage: 20, basis: 'reported' } }, evidence), /Margin requires/);
  assert.throws(() => validateProposal({ ...p, value: { ...p.value, unexpectedPrivateField: 'do not export' } }, evidence), /Margin requires/);
});
test('news needs a real dated retrieved page', () => {
  const p = { operation: 'news', status: 'found', value: [{ title: 'Example release', url: evidence[2], publishedAt: '2025-10-01', summary: 'A product launched.' }], sources: [evidence[2]] };
  assert.equal(validateProposal(p, evidence), p);
  assert.throws(() => validateProposal({ ...p, value: [{ ...p.value[0], url: 'https://invented.example/' }] }, evidence), /News requires/);
});
test('people candidates require exact profile URLs, entity scope and no contacts', () => {
  const p = { operation: 'people-candidates', status: 'found', value: [{ name: 'Alex Example', title: 'CTO', employer: 'Example plc', role: 'economic_buyer_candidate', profileUrl: null, sources: [evidence[2]], caveat: 'Budget authority and advocacy unconfirmed.' }], sources: [evidence[2]] };
  assert.equal(validateProposal(p, evidence), p);
  assert.throws(() => validateProposal({ ...p, value: [{ ...p.value[0], name: 'alex@example.com' }] }, evidence), /People require/);
  assert.throws(() => validateProposal({ ...p, value: [{ ...p.value[0], name: 'Alex B.' }] }, evidence), /People require/);
  assert.throws(() => validateProposal({ ...p, value: [{ ...p.value[0], profileUrl: evidence[1] }] }, evidence), /People require/);
});
test('ownership supports a sourced controller without an invented percentage', () => {
  const p = { operation: 'ownership', status: 'found', value: [{ name: 'Example Fund II', ownerType: 'fund',
    relationship: 'controller', stakePercent: null, percentageType: null, asOf: null,
    sources: [evidence[2]], note: 'An official filing identifies the controller but does not state a percentage.' }], sources: [evidence[2]] };
  assert.equal(validateProposal(p, evidence), p);
  assert.throws(() => validateProposal({ ...p, value: [{ ...p.value[0], stakePercent: 100 }] }, evidence), /Ownership requires/);
});
test('ownership stake percentages require a type, as-of date and exact source', () => {
  const owner = { name: 'Example Holdings', ownerType: 'company', relationship: 'direct_parent',
    stakePercent: 75, percentageType: 'equity', asOf: '2025-12-31', sources: [evidence[2]], note: 'Filing states 75% of ordinary shares.' };
  const p = { operation: 'ownership', status: 'found', value: [owner], sources: [evidence[2]] };
  assert.equal(validateProposal(p, evidence), p);
  for (const change of [{ percentageType: null }, { asOf: null }, { asOf: '2025-02-30' }, { stakePercent: 101 }, { sources: ['https://invented.example/'] }]) {
    assert.throws(() => validateProposal({ ...p, value: [{ ...owner, ...change }] }, evidence), /Ownership requires/);
  }
  assert.throws(() => validateProposal({ ...p, value: [owner, owner] }, evidence), /Ownership requires/);
});
test('source provenance, parent evidence and endpoint confidence metadata required', () => {
  const p = { operation: 'official-name', status: 'found', value: 'Example', sources: [evidence[2]],
    parentCompany: { name: 'Example Holdings', sources: [evidence[2]] },
    confidence: { source: 'example endpoint', meaning: 'endpoint-provided match score', value: 0.8 } };
  assert.equal(validateProposal(p, evidence), p);
  assert.throws(() => validateProposal({ ...p, sources: ['https://invented.example/'] }, evidence), /exact retrieved/);
  assert.throws(() => validateProposal({ ...p, parentCompany: { name: 'Guess', sources: [] } }, evidence), /Parent/);
  assert.throws(() => validateProposal({ ...p, confidence: 0.9 }, evidence), /endpoint/);
});
