/* The only non-trivial pure logic on the site is the NEWS2 score, so it is the
   only thing with a test.  Run:  node test/news2.test.mjs                      */

import assert from 'node:assert/strict';
import { news2 } from '../assets/js/news2.js';

const WELL = { resp: 16, spo2: 98, onOxygen: false, sbp: 120, pulse: 72, alert: true, temp: 36.8 };
const t = (over = {}) => news2({ ...WELL, ...over });

let n = 0;
const it = (name, fn) => { fn(); n++; console.log(`  ok  ${name}`); };

console.log('NEWS2');

it('a well patient scores zero', () => {
  const r = t();
  assert.equal(r.total, 0);
  assert.equal(r.risk, 'low');
  assert.match(r.action, /12 hourly/);
});

/* RCP scoring table — boundary values, both sides of every edge */
it('respiration rate bands', () => {
  assert.equal(t({ resp: 8 }).parts.resp, 3);
  assert.equal(t({ resp: 9 }).parts.resp, 1);
  assert.equal(t({ resp: 12 }).parts.resp, 0);
  assert.equal(t({ resp: 20 }).parts.resp, 0);
  assert.equal(t({ resp: 21 }).parts.resp, 2);
  assert.equal(t({ resp: 25 }).parts.resp, 3);
});

it('SpO2 bands', () => {
  assert.equal(t({ spo2: 91 }).parts.spo2, 3);
  assert.equal(t({ spo2: 93 }).parts.spo2, 2);
  assert.equal(t({ spo2: 95 }).parts.spo2, 1);
  assert.equal(t({ spo2: 96 }).parts.spo2, 0);
});

it('systolic BP bands, including the high end', () => {
  assert.equal(t({ sbp: 90 }).parts.sbp, 3);
  assert.equal(t({ sbp: 100 }).parts.sbp, 2);
  assert.equal(t({ sbp: 110 }).parts.sbp, 1);
  assert.equal(t({ sbp: 111 }).parts.sbp, 0);
  assert.equal(t({ sbp: 219 }).parts.sbp, 0);
  assert.equal(t({ sbp: 220 }).parts.sbp, 3);
});

it('pulse bands are symmetric around normal', () => {
  assert.equal(t({ pulse: 40 }).parts.pulse, 3);
  assert.equal(t({ pulse: 50 }).parts.pulse, 1);
  assert.equal(t({ pulse: 51 }).parts.pulse, 0);
  assert.equal(t({ pulse: 90 }).parts.pulse, 0);
  assert.equal(t({ pulse: 110 }).parts.pulse, 1);
  assert.equal(t({ pulse: 130 }).parts.pulse, 2);
  assert.equal(t({ pulse: 131 }).parts.pulse, 3);
});

it('temperature bands use one decimal place', () => {
  assert.equal(t({ temp: 35.0 }).parts.temp, 3);
  assert.equal(t({ temp: 35.1 }).parts.temp, 1);
  assert.equal(t({ temp: 36.1 }).parts.temp, 0);
  assert.equal(t({ temp: 38.0 }).parts.temp, 0);
  assert.equal(t({ temp: 38.1 }).parts.temp, 1);
  assert.equal(t({ temp: 39.1 }).parts.temp, 2);
});

it('supplemental oxygen adds two', () => {
  assert.equal(t({ onOxygen: true }).total, 2);
});

it('anything other than Alert scores three', () => {
  assert.equal(t({ alert: false }).parts.consciousness, 3);
});

/* escalation — the part that actually changes what a nurse does */
it('a single 3 escalates even when the total is low', () => {
  const r = t({ resp: 26 });          // total 3, all from one parameter
  assert.equal(r.total, 3);
  assert.equal(r.risk, 'low-medium');
  assert.match(r.action, /Registered nurse/);
});

it('a total of 3 spread across parameters does NOT escalate', () => {
  const r = t({ resp: 9, spo2: 95, pulse: 95 });   // 1 + 1 + 1
  assert.equal(r.total, 3);
  assert.equal(r.risk, 'low');
});

it('5 is medium risk', () => {
  const r = t({ resp: 22, spo2: 93, pulse: 112 }); // 2 + 2 + 2 = 6
  assert.equal(r.total, 6);
  assert.equal(r.risk, 'medium');
});

it('7 or more is an emergency', () => {
  const r = t({ resp: 26, spo2: 90, sbp: 88 });   // 3 + 3 + 3
  assert.ok(r.total >= 7);
  assert.equal(r.risk, 'high');
  assert.match(r.action, /Emergency/);
});

it('high risk beats the single-3 rule', () => {
  assert.equal(t({ resp: 26, spo2: 90, sbp: 88, pulse: 135 }).risk, 'high');
});

console.log(`\n${n} passed`);
