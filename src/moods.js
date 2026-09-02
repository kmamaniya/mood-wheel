/**
 * The UI model mirrors the existing Daily Mood Log data source in Notion.
 * Names intentionally match the select and multi-select options exactly.
 *
 * The source database has no orange specific-emotion options for Hurt. Its
 * four choices below reuse existing options rather than changing the user's
 * Notion schema from the application.
 */
export const CORE_EMOTIONS = Object.freeze([
  {
    id: 'powerful',
    name: 'Powerful',
    color: '#B690E8',
    description: 'Confident, capable, or positively energized.',
    specificEmotions: Object.freeze([
      'confident', 'energetic', 'respected', 'appreciative', 'proud',
      'successful', 'valued', 'nurturing', 'worthwhile', 'thankful',
    ]),
  },
  {
    id: 'safe',
    name: 'Safe',
    color: '#79B7E3',
    description: 'Secure, connected, or at ease.',
    specificEmotions: Object.freeze([
      'secure', 'loved', 'open', 'relaxed', 'calm', 'peaceful',
      'thoughtful', 'protected', 'content', 'accepted', 'understood',
      'warm', 'quiet',
    ]),
  },
  {
    id: 'joyful',
    name: 'Joyful',
    color: '#F3CA51',
    description: 'Playful, curious, or alive.',
    specificEmotions: Object.freeze([
      'playful', 'stimulating', 'daring', 'creative', 'curious',
      'affectionate', 'friendly', 'alive',
    ]),
  },
  {
    id: 'angry',
    name: 'Angry',
    color: '#E96B68',
    description: 'Activated by a boundary, friction, or unfairness.',
    specificEmotions: Object.freeze([
      'irritated', 'furious', 'frustrated', 'hostile', 'hateful',
      'critical', 'resentful', 'disgusted', 'betrayed', 'bitter',
    ]),
  },
  {
    id: 'hurt',
    name: 'Hurt',
    color: '#EEA15B',
    description: 'Tender, wounded, or affected by a loss of connection.',
    specificEmotions: Object.freeze([
      'betrayed', 'rejected', 'humiliated', 'disappointed',
    ]),
  },
  {
    id: 'scared',
    name: 'Scared',
    color: '#AF8F72',
    description: 'Protective, uneasy, or faced with uncertainty.',
    specificEmotions: Object.freeze([
      'helpless', 'anxious', 'shocked', 'abandoned', 'numb', 'worried',
      'overwhelmed', 'vulnerable', 'terrified',
    ]),
  },
  {
    id: 'sad',
    name: 'Sad',
    color: '#9C9DA2',
    description: 'Low, grieving, disappointed, or disconnected.',
    specificEmotions: Object.freeze([
      'ashamed', 'disappointed', 'guilty', 'bored', 'depressed',
      'disconnected', 'cold', 'despairing', 'humiliated', 'rejected',
      'hopeless',
    ]),
  },
]);

export const MAX_ENTRY_TEXT_LENGTH = 2000;

function normalizeId(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmotionList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(normalizeId).filter(Boolean))];
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(value + 'T12:00:00');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function getCoreEmotion(id) {
  const normalizedId = normalizeId(id);
  return CORE_EMOTIONS.find((emotion) => emotion.id === normalizedId);
}

export function getSpecificEmotions(coreEmotionId) {
  return getCoreEmotion(coreEmotionId)?.specificEmotions ?? Object.freeze([]);
}

function selectedCoreEmotionIds(selection) {
  if (Array.isArray(selection?.coreEmotions)) {
    return normalizeEmotionList(selection.coreEmotions);
  }
  return normalizeEmotionList([selection?.coreEmotion]);
}

export function resolveMoodSelection(selection) {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) {
    return null;
  }

  const coreEmotionIds = selectedCoreEmotionIds(selection);
  const coreEmotions = coreEmotionIds.map(getCoreEmotion);
  if (coreEmotions.length === 0 || coreEmotions.some((emotion) => !emotion)) {
    return null;
  }

  const specificEmotions = normalizeEmotionList(selection.specificEmotions);
  const allowedSpecificEmotions = new Set(
    coreEmotions.flatMap((emotion) => emotion.specificEmotions),
  );
  if (specificEmotions.some((emotion) => !allowedSpecificEmotions.has(emotion))) {
    return null;
  }

  return { coreEmotions, specificEmotions };
}

function validateTextField(value, key, label, errors) {
  if (value != null && typeof value !== 'string') {
    errors[key] = label + ' must be text.';
    return '';
  }

  const text = normalizeText(value);
  if (text.length > MAX_ENTRY_TEXT_LENGTH) {
    errors[key] = label + ' must be ' + MAX_ENTRY_TEXT_LENGTH + ' characters or fewer.';
  }
  return text;
}

/**
 * Validates the exact entry shape sent to the app API and returns a normalized,
 * Notion-ready representation without mutating the input.
 */
export function validateMoodEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return { valid: false, errors: { entry: 'Enter a check-in before saving.' }, value: null };
  }

  const errors = {};
  const moodSelection = resolveMoodSelection(entry);
  if (selectedCoreEmotionIds(entry).length === 0
    || selectedCoreEmotionIds(entry).some((id) => !getCoreEmotion(id))) {
    errors.coreEmotion = 'Choose a core feeling before saving.';
  } else if (!moodSelection) {
    errors.specificEmotions = 'Choose specific emotions from one of the selected branches.';
  }

  const intensity = Number(entry.intensity);
  if (!Number.isInteger(intensity) || intensity < 1 || intensity > 10) {
    errors.intensity = 'Choose an intensity from 1 to 10.';
  }

  if (!isValidDate(entry.date)) {
    errors.date = 'Choose a valid date.';
  }

  const notes = validateTextField(entry.notes, 'notes', 'Notes', errors);
  const trigger = validateTextField(entry.trigger, 'trigger', 'Trigger or context', errors);
  const need = validateTextField(entry.need, 'need', 'What you needed', errors);
  const helped = validateTextField(entry.helped, 'helped', 'What helped', errors);

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    value: valid
      ? {
          // Keep a primary core feeling for existing clients and Notion views,
          // while also preserving every selected core feeling.
          coreEmotion: moodSelection.coreEmotions[0].name,
          coreEmotions: moodSelection.coreEmotions.map((emotion) => emotion.name),
          specificEmotions: moodSelection.specificEmotions,
          intensity,
          date: entry.date,
          notes,
          trigger,
          need,
          helped,
        }
      : null,
  };
}
