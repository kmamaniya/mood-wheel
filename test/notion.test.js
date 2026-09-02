import assert from 'node:assert/strict';
import test from 'node:test';

import { fromNotionPage, toNotionProperties } from '../functions/_lib/notion.js';

const entry = {
  coreEmotion: 'Joyful',
  specificEmotions: ['curious', 'alive'],
  intensity: 7,
  date: '2026-09-01',
  notes: 'I made room to explore.',
  trigger: 'An open afternoon',
  need: 'Time',
  helped: 'A walk',
};

test('Notion writes use the existing Daily Mood Log property names and types', () => {
  const properties = toNotionProperties(entry);

  assert.deepEqual(properties['Core Emotion'], { select: { name: 'Joyful' } });
  assert.deepEqual(properties['Specific Emotion(s)'], {
    multi_select: [{ name: 'curious' }, { name: 'alive' }],
  });
  assert.deepEqual(properties['Intensity (1–10)'], { number: 7 });
  assert.deepEqual(properties.Date, { date: { start: '2026-09-01' } });
  assert.equal(properties.Entry.title[0].text.content, 'Joyful: curious, alive');
  assert.equal(properties.Notes.rich_text[0].text.content, 'I made room to explore.');
});

test('Notion pages are reduced to the data the UI needs', () => {
  const result = fromNotionPage({
    id: 'page-id',
    properties: {
      'Core Emotion': { select: { name: 'Safe' } },
      'Specific Emotion(s)': { multi_select: [{ name: 'calm' }, { name: 'accepted' }] },
      'Intensity (1–10)': { number: 4 },
      Date: { date: { start: '2026-09-01' } },
      Notes: { rich_text: [{ plain_text: 'Quiet morning.' }] },
      'Trigger / Context': { rich_text: [{ plain_text: 'Slow start.' }] },
      'What I Needed': { rich_text: [{ plain_text: 'Space.' }] },
      'What Helped': { rich_text: [{ plain_text: 'Tea.' }] },
    },
  });

  assert.deepEqual(result, {
    id: 'page-id',
    coreEmotion: 'Safe',
    specificEmotions: ['calm', 'accepted'],
    intensity: 4,
    date: '2026-09-01',
    notes: 'Quiet morning.',
    trigger: 'Slow start.',
    need: 'Space.',
    helped: 'Tea.',
  });
});
