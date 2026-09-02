import { authenticatedUser } from '../_lib/auth.js';
import { json, unauthorized, unavailable } from '../_lib/http.js';
import { createNotionEntry, getNotionEntries } from '../_lib/notion.js';
import { validateMoodEntry } from '../../src/moods.js';

function dashboardUrl(env) {
  return typeof env.NOTION_DASHBOARD_URL === 'string' ? env.NOTION_DASHBOARD_URL : '';
}

export async function onRequestGet({ request, env }) {
  if (!await authenticatedUser(request, env)) {
    return unauthorized();
  }

  try {
    const entries = await getNotionEntries(env);
    return json({ entries, dashboardUrl: dashboardUrl(env) });
  } catch (error) {
    console.error(error);
    return unavailable('Your Notion mood log could not be reached.');
  }
}

export async function onRequestPost({ request, env }) {
  if (!await authenticatedUser(request, env)) {
    return unauthorized();
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Send a valid check-in.' }, 400);
  }

  const result = validateMoodEntry(payload);
  if (!result.valid) {
    return json({ error: 'Check the highlighted fields.', fields: result.errors }, 400);
  }

  try {
    const page = await createNotionEntry(result.value, env);
    return json({ entry: { id: page.id, ...result.value }, dashboardUrl: dashboardUrl(env) }, 201);
  } catch (error) {
    console.error(error);
    return unavailable('Your check-in could not be saved to Notion.');
  }
}
