const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2026-03-11';

function richText(content) {
  return content ? [{ type: 'text', text: { content } }] : [];
}

function propertyText(property) {
  const items = property?.rich_text || property?.title || [];
  return items.map((item) => item.plain_text || item.text?.content || '').join('');
}

function entryTitle(entry) {
  const details = entry.specificEmotions.length ? ': ' + entry.specificEmotions.join(', ') : '';
  return entry.coreEmotion + details;
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

export function toNotionProperties(entry) {
  return {
    Entry: { title: richText(entryTitle(entry)) },
    'Core Emotion': { select: { name: entry.coreEmotion } },
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
}

export async function createNotionEntry(entry, env) {
  return notionRequest(
    NOTION_API + '/pages',
    {
      method: 'POST',
      body: JSON.stringify({
        parent: {
          type: 'data_source_id',
          data_source_id: env.NOTION_DATA_SOURCE_ID,
        },
        properties: toNotionProperties(entry),
      }),
    },
    env,
  );
}

export function fromNotionPage(page) {
  const properties = page.properties || {};
  return {
    id: page.id,
    coreEmotion: properties['Core Emotion']?.select?.name || '',
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
