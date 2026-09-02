# Mood Wheel

A private, accessible feelings-wheel check-in that uses GitHub only to verify the owner and writes directly to the existing Daily Mood Log Notion database.

## Architecture

The source lives in your GitHub repository and is deployed through a Cloudflare Worker connected to that repository. The Worker serves the static interface and provides the same-origin server boundary for GitHub OAuth and the Notion API token.

This is deliberate: GitHub Pages can host a static UI, but it cannot safely hold the GitHub client secret, a signed session secret, or the Notion integration token.

Browser → GitHub OAuth → Cloudflare Worker → private Notion Daily Mood Log

The function reads its encrypted environment secrets only on the server.

GitHub is used only to identify the approved owner (read:user scope). The GitHub access token is discarded after the identity check. Mood entries and dashboard views stay in Notion.

## Existing Notion model

The app matches the existing Daily Mood Log data source:

- Core Emotion — the first selected core feeling, retained for existing views
- Core Emotions — multi-select of every selected core feeling
- Specific Emotion(s) — multi-select
- Intensity (1–10)
- Date
- Notes
- Trigger / Context
- What I Needed
- What Helped

The Notion page already contains the circular Emotion Wheel — Circular and Intensity Over Time visualizations. Signed-in users can open that dashboard from the app.

On the first save after this version is deployed, the Worker adds the `Core Emotions` multi-select property if it is not already present. This preserves the existing `Core Emotion` select and lets new Notion views filter or group by all selected feelings.

## Configure deployment

1. Connect this GitHub repository to a Cloudflare Worker named `mood-wheel`. Its deploy command is `npx wrangler deploy --keep-vars`.
2. In GitHub, register an OAuth app. Set its callback URL to:

       https://YOUR-WORKER.workers.dev/api/auth/callback

   The app requests only the read:user scope.
3. Create a Notion internal integration, give it read and write content capabilities, then share the Daily Mood Log database with that integration.
4. In the Cloudflare Worker’s Settings → Variables and Secrets, add these encrypted production secrets:

   | Name | Value |
   | --- | --- |
   | GITHUB_CLIENT_ID | GitHub OAuth app client ID |
   | GITHUB_CLIENT_SECRET | GitHub OAuth app client secret |
   | ALLOWED_GITHUB_LOGIN | Your GitHub login, exactly once |
   | NOTION_TOKEN | Notion internal integration secret |
   | NOTION_DATA_SOURCE_ID | The Daily Mood Log data source ID |
   | NOTION_DASHBOARD_URL | The private Mood Tracker Notion page URL |
   | SESSION_SECRET | A high-entropy random secret |

5. Keep the linked Worker deploy command as `npx wrangler deploy --keep-vars`. The included `wrangler.toml` declares both the Worker entry point and the static assets directory.

The single-login allowlist is intentional: the current Notion database has no per-user ownership field, so allowing several GitHub accounts would make a shared journal.

## Local development

Copy .dev.vars.example to .dev.vars, fill in your own values, then run:

    npx wrangler dev

## Tests

    node --test

The tests cover the wheel’s Notion-aligned data model, entry validation, Notion property mapping, and signed-session helpers.

## Schema note

The database has a Hurt core emotion but no orange matching specific-emotion options. The UI conservatively uses existing Notion options (betrayed, rejected, humiliated, and disappointed) for that branch rather than silently changing the database schema.
