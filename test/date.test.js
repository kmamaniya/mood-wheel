import assert from 'node:assert/strict';
import test from 'node:test';

import { formatMoodDate } from '../src/date.js';

test('mood dates render both date-only and timestamp values', () => {
  assert.equal(formatMoodDate('2026-09-01', 'en-US'), 'Sep 1, 2026');
  assert.notEqual(formatMoodDate('2026-08-27T01:00:00.000Z', 'en-US'), '');
});

test('invalid mood dates do not break recent-entry rendering', () => {
  assert.equal(formatMoodDate('not-a-date', 'en-US'), '');
  assert.equal(formatMoodDate(null, 'en-US'), '');
});
