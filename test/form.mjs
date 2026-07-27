/* The contact form is the only place on this site that takes input from a
   stranger and sends it somewhere, so its sanitising is the one bit of logic
   worth pinning down. These are the rules the form relies on:

     - control characters never survive into a name or a mail subject, because
       that is how header injection is attempted
     - newlines survive in the message body and nowhere else
     - every field is length-capped even if the DOM maxlength is tampered with
     - the enquiry type can only ever be one of the options actually offered

   Dev-only.  node test/form.mjs                                              */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'assets/js/site.js'), 'utf8');

let n = 0;
const it = (name, fn) => { fn(); n++; console.log(`  ok  ${name}`); };

console.log('contact form');

/* Lift the two cleaners straight out of the module so the test exercises the
   shipped source rather than a copy that can drift away from it. */
const grab = (re, label) => {
  const m = src.match(re);
  assert.ok(m, `could not find ${label} in site.js — did it get renamed?`);
  return m[1];
};
const oneLine  = eval(grab(/const oneLine = (\(s, max\) =>[^\n]+?);\n/, 'oneLine'));
const bodyText = eval(grab(/const bodyText = (\(s, max\) => s\.replace[\s\S]*?slice\(0, max\));\n/, 'bodyText'));

it('strips control characters from single-line fields', () => {
  assert.equal(oneLine('Jane\u0000Okafor', 80), 'Jane Okafor');
  assert.equal(oneLine('JaneOkafor', 80), 'Jane Okafor');
});

it('a newline cannot survive into a subject line', () => {
  // the classic header-injection attempt
  const attack = 'Jane\r\nBcc: victim@example.com';
  const out = oneLine(attack, 80);
  assert.ok(!out.includes('\n') && !out.includes('\r'), 'newline survived into a single-line field');
  assert.equal(out, 'Jane Bcc: victim@example.com');
});

it('keeps newlines in the message body, drops everything else', () => {
  assert.equal(bodyText('line one\nline two', 4000), 'line one\nline two');
  assert.equal(bodyText('line one\r\nline two', 4000), 'line one\nline two');
  assert.equal(bodyText('bad\u0000char', 4000), 'bad char');
  assert.equal(bodyText('tab\there', 4000), 'tab here');
});

it('caps length regardless of what the DOM says', () => {
  assert.equal(oneLine('x'.repeat(500), 80).length, 80);
  assert.equal(bodyText('y'.repeat(9000), 4000).length, 4000);
});

it('collapses a run of control characters rather than leaving a gap each', () => {
  assert.equal(oneLine('a\u0000\u0001\u0002b', 80), 'a b');
});

/* Guards that live in the submit handler rather than in a helper — assert on
   the source, so deleting one is a failing test and not a silent regression. */
it('forwards botcheck to Web3Forms instead of deleting it', () => {
  assert.ok(!/delete\s+data\.botcheck/.test(src),
    'botcheck is being stripped again — Web3Forms server-side honeypot needs it');
  assert.match(src, /botcheck:\s*trap/);
});

it('validates the enquiry type against the offered options', () => {
  assert.match(src, /KINDS\.includes\(kindRaw\)\s*\?\s*kindRaw\s*:\s*KINDS\[0\]/);
});

it('keeps the honeypot and timing traps', () => {
  assert.match(src, /#f-company/);
  assert.match(src, /loadedAt\s*<\s*3000/);
});

it('throttles per browser', () => {
  assert.match(src, /HOURLY_CAP/);
  assert.match(src, /GAP_MS/);
});

it('guards against re-entrant submits', () => {
  assert.match(src, /if \(sending\) return;/);
});

console.log(`\n${n} passed`);
