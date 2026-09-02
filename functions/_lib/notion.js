import { CORE_EMOTIONS } from '../../src/moods.js';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2026-03-11';
const CORE_EMOTIONS_PROPERTY = 'Core Emotions';

function richText(content) {
  return content ? [{ type: 'text', text: { content } }] : [];
}

function propertyText(property) {
  const items = property?.rich_text || property?.title || [];
  return items.map((item) => item.plain_text || item.text?.content || '').join('');
}

function entryCoreEmotions(entry) {
  const coreEmotions = Array.isArray(entry.coreEmotions)
    ? entry.coreEmotions.filter((emotion) => typeof emotion === 'string' && emotion)
    : [];
  return coreEmotions.length > 0 ? coreEmotions : [entry.coreEmotion].filter(Boolean);
}

function entryTitle(entry) {
  const coreEmotions = entryCoreEmotions(entry);
  const details = entry.specificEmotions.length ? ': ' + entry.specificEmotions.join(', ') : '';
  return coreEmotions.join(' + ') + details;
}

function notionHeaders(token) {
  return {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

async function notionRequest(url, options, env) {
  if (!env.NOTION_TOKEN || !env.NOTION_DATA_SOURCE_ID) {
    throw new Error('Notion connection is not configured.');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...notionHeaders(env.NOTION_TOKEN),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error('Notion request failed with status ' + response.status + '.');
  }
  return response.json();
}

export function toNotionProperties(entry, includeCoreEmotions = false) {
  const coreEmotions = entryCoreEmotions(entry);
  const properties = {
    Entry: { title: richText(entryTitle(entry)) },
    // Keep this original select as a primary feeling so existing Notion views
    // remain useful after multi-core entries are introduced.
    'Core Emotion': { select: { name: coreEmotions[0] } },
    'Specific Emotion(s)': {
      multi_select: entry.specificEmotions.map((name) => ({ name })),
    },
    'Intensity (1–10)': { number: entry.intensity },
    Date: { date: { start: entry.date } },
    Notes: { rich_text: richText(entry.notes) },
    'Trigger / Context': { rich_text: richText(entry.trigger) },
    'What I Needed': { rich_text: richText(entry.need) },
    'What Helped': { rich_text: richText(entry.helped) },
  };

  if (includeCoreEmotions) {
    properties[CORE_EMOTIONS_PROPERTY] = {
      multi_select: coreEmotions.map((name) => ({ name })),
    };
  }

  return properties;
}

async function ensureCoreEmotionsProperty(env) {
  const dataSource = await notionRequest(
    NOTION_API + '/data_sources/' + env.NOTION_DATA_SOURCE_ID,
    { method: 'GET' },
    env,
  );
  const property = dataSource.properties?.[CORE_EMOTIONS_PROPERTY];
  if (property?.type === 'multi_select') {
    return true;
  }
  if (property) {
    throw new Error(CORE_EMOTIONS_PROPERTY + ' must be a multi-select property.');
  }

  await notionRequest(
    NOTION_API + '/data_sources/' + env.NOTION_DATA_SOURCE_ID,
    {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          [CORE_EMOTIONS_PROPERTY]: {
            multi_select: {
              options: CORE_EMOTIONS.map((emotion) => ({ name: emotion.name })),
            },
          },
        },
      }),
    },
    env,
  );
  return true;
}

export async function createNotionEntry(entry, env) {
  const includeCoreEmotions = await ensureCoreEmotionsProperty(env);
  return notionRequest(
    NOTION_API + '/pages',
    {
      method: 'POST',
      body: JSON.stringify({
        parent: {
          type: 'data_source_id',
          data_source_id: env.NOTION_DATA_SOURCE_ID,
        },
        properties: toNotionProperties(entry, includeCoreEmotions),
      }),
    },
    env,
  );
}

export function fromNotionPage(page) {
  const properties = page.properties || {};
  const coreEmotions = (properties[CORE_EMOTIONS_PROPERTY]?.multi_select || []).map((item) => item.name);
  const primaryCoreEmotion = properties['Core Emotion']?.select?.name || coreEmotions[0] || '';
  return {
    id: page.id,
    coreEmotion: primaryCoreEmotion,
    coreEmotions: coreEmotions.length > 0 ? coreEmotions : [primaryCoreEmotion].filter(Boolean),
    specificEmotions: (properties['Specific Emotion(s)']?.multi_select || []).map((item) => item.name),
    intensity: properties['Intensity (1–10)']?.number || null,
    date: properties.Date?.date?.start || '',
    notes: propertyText(properties.Notes),
    trigger: propertyText(properties['Trigger / Context']),
    need: propertyText(properties['What I Needed']),
    helped: propertyText(properties['What Helped']),
  };
}

export async function getNotionEntries(env) {
  const result = await notionRequest(
    NOTION_API + '/data_sources/' + env.NOTION_DATA_SOURCE_ID + '/query',
    {
      method: 'POST',
      body: JSON.stringify({
        page_size: 50,
        result_type: 'page',
        sorts: [{ property: 'Date', direction: 'descending' }],
      }),
    },
    env,
  );
  return (result.results || []).map(fromNotionPage);
}
