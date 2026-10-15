import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSensitive, protectionSummary } from '../src/sensitive-data.js';
import { normaliseTable, transformTable } from '../src/upload-data.js';

const table = (headers, row, count = 6) => normaliseTable([headers, ...Array.from({length: count}, () => row)]);

test('English/Malay headings and patterns suggest explicit rules with evidence', () => {
  const data = table(['Nama', 'EmailAddress', 'Telefon', 'Alamat', 'NRIC', 'Tarikh Lahir', 'Umur', 'Kata Laluan', 'Catatan'], ['Ali', 'ali@example.com', '+60 12-345 6789', '10 Jalan Aman', '900101-14-1234', '1990-01-01', '34', 'secret', 'Follow up']);
  const found = detectSensitive(data);
  assert.equal(found.length, 9);
  const byHeader = Object.fromEntries(found.map(d => [d.header, d]));
  assert.equal(byHeader.EmailAddress.confidence, 95);
  assert.equal(byHeader.Telefon.rule, 'phone');
  assert.equal(byHeader.NRIC.rule, 'redact');
  assert.equal(byHeader.Nama.rule, 'id');
  assert.equal(byHeader.Alamat.rule, 'remove');
  assert.equal(byHeader.Catatan.needsReview, true);
  assert.match(byHeader.EmailAddress.reason, /6\/6/);
});

test('ambiguous numbers require review and business references avoid false positives', () => {
  const data = table(['Value', 'Order ID', 'Product Name', 'Passport', 'Blank'], ['0123456789', '123456789012', 'Widget', '12345678', '']);
  const found = detectSensitive(data);
  assert.deepEqual(found.map(d => d.header).sort(), ['Passport', 'Value']);
  assert.equal(found.find(d => d.header === 'Value').needsReview, true);
  assert.equal(found.find(d => d.header === 'Passport').type, 'id');
});

test('small samples are capped, sparse samples ignore blanks, mixed ages require review', () => {
  const sparse = normaliseTable([['Email', 'Age'], ['x@example.com', '30'], ['', 'unknown']]);
  const found = detectSensitive(sparse);
  assert.equal(found.find(d => d.type === 'email').confidence, 85);
  assert.equal(found.find(d => d.type === 'email').sampleCount, 1);
  assert.equal(found.find(d => d.type === 'age').needsReview, true);
  const large = table(['Email'], ['x@example.com'], 10000);
  assert.equal(detectSensitive(large)[0].sampleCount, 200);
});

test('coverage scores actual output, includes all rows, and distinguishes partial masking', () => {
  const data = table(['Name', 'Email', 'Phone', 'Product'], ['Alice', 'alice@example.com', '0123456789', 'Widget']);
  const detections = detectSensitive(data);
  const score = rules => protectionSummary(data, transformTable(data, rules), rules, detections);
  assert.equal(score({}).score, 0);
  const partial = score({0: 'id', 1: 'email', 2: 'phone'});
  assert.equal(partial.score, 67);
  assert.equal(partial.full, 6);
  assert.equal(partial.partial, 12);
  assert.equal(partial.unclassified, 1);
  assert.equal(score({0: 'remove', 1: 'redact', 2: 'id'}).score, 100);
  // Merely selecting a masking rule cannot score unchanged output.
  assert.equal(protectionSummary(data, data.rows, {0: 'id', 1: 'redact', 2: 'remove'}, detections).score, 0);
  // An email rule on a phone column is an incompatible rule, even if output changes.
  assert.equal(score({2: 'email'}).score, 0);
});

test('no detections returns no score rather than a false 100% safety result', () => {
  const data = table(['Product', 'Quantity'], ['Widget', '12']);
  assert.equal(protectionSummary(data, data.rows, {}, detectSensitive(data)).score, null);
});

test('unseen values beyond detection sample still count toward output coverage', () => {
  const data = table(['Email'], ['alice@example.com'], 1000);
  data.rows[999][0] = '';
  const rules = {0: 'email'};
  const report = protectionSummary(data, transformTable(data, rules), rules, detectSensitive(data));
  assert.equal(report.total, 999);
  assert.equal(report.partial, 999);
  assert.equal(report.score, 50);
});
