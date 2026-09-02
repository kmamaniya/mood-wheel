import assert from 'node:assert/strict';
import test from 'node:test';

import { createNotionEntry, fromNotionPage, toNotionProperties } from '../functions/_lib/notion.js';

const entry = {
  coreEmotion: 'Joyful',
  coreEmotions: ['Joyful', 'Safe'],
  specificEmotions: ['curious', 'alive'],
  intensity: 7,
  date: '2026-09-01',
  notes: 'I made room to explore.',
  trigger: 'An open afternoon',
  need: 'Time',
  helped: 'A walk',
};

test('Notion writes retain a primary feeling and store every selected core feeling', () => {
  const properties = toNotionProperties(entry, true);

  assert.deepEqual(properties['Core Emotion'], { select: { name: 'Joyful' } });
  assert.deepEqual(properties['Core Emotions'], {
    multi_select: [{ name: 'Joyful' }, { name: 'Safe' }],
  });
  assert.deepEqual(properties['Specific Emotion(s)'], {
    multi_select: [{ name: 'curious' }, { name: 'alive' }],
  });
  assert.deepEqual(properties['Intensity (1–10)'], { number: 7 });
  assert.deepEqual(properties.Date, { date: { start: '2026-09-01' } });
  assert.equal(properties.Entry.title[0].text.content, 'Joyful + Safe: curious, alive');
  assert.equal(properties.Notes.rich_text[0].text.content, 'I made room to explore.');
});

test('Notion pages are reduced to the data the UI needs', () => {
  const result = fromNotionPage({
    id: 'page-id',
    properties: {
      'Core Emotion': { select: { name: 'Safe' } },
      'Core Emotions': { multi_select: [{ name: 'Safe' }, { name: 'Joyful' }] },
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
    coreEmotions: ['Safe', 'Joyful'],
    specificEmotions: ['calm', 'accepted'],
    intensity: 4,
    date: '2026-09-01',
    notes: 'Quiet morning.',
    trigger: 'Slow start.',
    need: 'Space.',
    helped: 'Tea.',
  });
});

test('the first multi-core save provisions the additive Notion property', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (options.method === 'GET') {
      return Response.json({ properties: {} });
    }
    if (options.method === 'PATCH') {
      return Response.json({ properties: {} });
    }
    return Response.json({ id: 'new-page' });
  };

  try {
    const page = await createNotionEntry(entry, {
      NOTION_DATA_SOURCE_ID: 'data-source-id',
      NOTION_TOKEN: 'notion-token',
    });
    assert.equal(page.id, 'new-page');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(calls.map((call) => call.options.method), ['GET', 'PATCH', 'POST']);
  const patchBody = JSON.parse(calls[1].options.body);
  assert.deepEqual(
    patchBody.properties['Core Emotions'].multi_select.options.map((option) => option.name),
    ['Powerful', 'Safe', 'Joyful', 'Angry', 'Hurt', 'Scared', 'Sad'],
  );
  const pageBody = JSON.parse(calls[2].options.body);
  assert.deepEqual(pageBody.properties['Core Emotions'], {
    multi_select: [{ name: 'Joyful' }, { name: 'Safe' }],
  });
});
