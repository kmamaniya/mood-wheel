import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CORE_EMOTIONS,
  MAX_ENTRY_TEXT_LENGTH,
  getCoreEmotion,
  getSpecificEmotions,
  resolveMoodSelection,
  validateMoodEntry,
} from '../src/moods.js';

test('the wheel mirrors the seven Notion core-emotion options', () => {
  assert.deepEqual(
    CORE_EMOTIONS.map((emotion) => emotion.name),
    ['Powerful', 'Safe', 'Joyful', 'Angry', 'Hurt', 'Scared', 'Sad'],
  );
  assert.equal(new Set(CORE_EMOTIONS.map((emotion) => emotion.id)).size, 7);

  for (const emotion of CORE_EMOTIONS) {
    assert.match(emotion.color, /^#[0-9A-F]{6}$/i);
    assert.ok(emotion.specificEmotions.length > 0);
  }
});

test('specific emotions are scoped to the core-emotion branch', () => {
  assert.equal(getCoreEmotion(' SAFE ')?.name, 'Safe');
  assert.ok(getSpecificEmotions('safe').includes('calm'));
  assert.equal(getSpecificEmotions('missing').length, 0);
  assert.equal(
    resolveMoodSelection({ coreEmotion: 'safe', specificEmotions: ['calm', 'accepted'] })?.specificEmotions.length,
    2,
  );
  assert.equal(
    resolveMoodSelection({ coreEmotion: 'safe', specificEmotions: ['furious'] }),
    null,
  );
  assert.deepEqual(
    resolveMoodSelection({
      coreEmotions: ['safe', 'joyful'],
      specificEmotions: ['calm', 'curious'],
    })?.coreEmotions.map((emotion) => emotion.name),
    ['Safe', 'Joyful'],
  );
});

test('Hurt uses existing Notion options without changing the database schema', () => {
  assert.deepEqual(
    getSpecificEmotions('hurt'),
    ['betrayed', 'rejected', 'humiliated', 'disappointed'],
  );
});

test('a valid multi-core, multi-select entry is normalized without changing the input', () => {
  const entry = {
    coreEmotions: [' joyful ', 'safe'],
    specificEmotions: ['curious', 'alive', 'curious'],
    intensity: '7',
    date: '2026-09-01',
    notes: '  I had space to play with an idea. ',
    trigger: '  A quiet afternoon ',
    need: 'More room to explore',
    helped: 'A walk',
  };

  assert.deepEqual(validateMoodEntry(entry), {
    valid: true,
    errors: {},
    value: {
      coreEmotion: 'Joyful',
      coreEmotions: ['Joyful', 'Safe'],
      specificEmotions: ['curious', 'alive'],
      intensity: 7,
      date: '2026-09-01',
      notes: 'I had space to play with an idea.',
      trigger: 'A quiet afternoon',
      need: 'More room to explore',
      helped: 'A walk',
    },
  });
  assert.deepEqual(entry.specificEmotions, ['curious', 'alive', 'curious']);
});

test('validation rejects out-of-branch emotions, invalid intensity, and invalid dates', () => {
  const result = validateMoodEntry({
    coreEmotion: 'sad',
    specificEmotions: ['furious'],
    intensity: 11,
    date: 'not-a-date',
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.specificEmotions, 'Choose specific emotions from one of the selected branches.');
  assert.equal(result.errors.intensity, 'Choose an intensity from 1 to 10.');
  assert.equal(result.errors.date, 'Choose a valid date.');
});

test('validation caps free-text fields at Notion-safe limits', () => {
  const result = validateMoodEntry({
    coreEmotion: 'safe',
    specificEmotions: ['calm'],
    intensity: 3,
    date: '2026-09-01',
    notes: 'x'.repeat(MAX_ENTRY_TEXT_LENGTH + 1),
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.notes, 'Notes must be 2000 characters or fewer.');
});
