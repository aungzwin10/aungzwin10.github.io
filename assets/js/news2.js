/* NEWS2 — Royal College of Physicians National Early Warning Score 2.
   The real scoring table. Used by the Hospital E-book demo to decide how
   loudly the chart should shout.  Pure function, no DOM: see
   /test/news2.test.mjs for the check that keeps it honest. */

const band = (v, table) => {
  for (const [lo, hi, score] of table) if (v >= lo && v <= hi) return score;
  return 3;
};

export const RESP  = [[-Infinity, 8, 3], [9, 11, 1], [12, 20, 0], [21, 24, 2], [25, Infinity, 3]];
export const SPO2  = [[-Infinity, 91, 3], [92, 93, 2], [94, 95, 1], [96, Infinity, 0]];
export const SBP   = [[-Infinity, 90, 3], [91, 100, 2], [101, 110, 1], [111, 219, 0], [220, Infinity, 3]];
export const PULSE = [[-Infinity, 40, 3], [41, 50, 1], [51, 90, 0], [91, 110, 1], [111, 130, 2], [131, Infinity, 3]];
export const TEMP  = [[-Infinity, 35.0, 3], [35.1, 36.0, 1], [36.1, 38.0, 0], [38.1, 39.0, 1], [39.1, Infinity, 2]];

/**
 * @param {{resp:number, spo2:number, onOxygen:boolean, sbp:number,
 *          pulse:number, alert:boolean, temp:number}} v
 * @returns {{total:number, parts:object, risk:'low'|'low-medium'|'medium'|'high', action:string}}
 */
export function news2(v) {
  const parts = {
    resp:  band(v.resp,  RESP),
    spo2:  band(v.spo2,  SPO2),
    oxygen: v.onOxygen ? 2 : 0,
    sbp:   band(v.sbp,   SBP),
    pulse: band(v.pulse, PULSE),
    consciousness: v.alert ? 0 : 3,
    temp:  band(v.temp,  TEMP),
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  const anyThree = Object.values(parts).some((p) => p === 3);

  // RCP escalation table — order matters, high wins
  let risk, action;
  if (total >= 7)                { risk = 'high';       action = 'Emergency response · continuous monitoring'; }
  else if (total >= 5)           { risk = 'medium';     action = 'Urgent clinical review · hourly obs'; }
  else if (anyThree)             { risk = 'low-medium'; action = 'Registered nurse review · hourly obs'; }
  else if (total >= 1)           { risk = 'low';        action = 'Routine · 4–6 hourly obs'; }
  else                           { risk = 'low';        action = 'Routine · 12 hourly obs'; }

  return { total, parts, risk, action };
}
