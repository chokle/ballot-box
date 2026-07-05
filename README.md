# Trade Legacy Box

A small public story intake page for preserving short trade lessons before they disappear.

## Deploy

This version is built for Netlify with Netlify Functions and Netlify Database.

- Branch: `main`
- Build command: leave blank
- Publish directory: `.`
- Functions directory: `netlify/functions`

Set this environment variable in Netlify:

`BALLOT_BOX_ADMIN_PASSWORD`

Netlify Database must be enabled/provisioned for the site so the functions can connect through `@netlify/neon`.

## Data Behavior

- The public page shows one rotating question.
- Each browser tracks answered questions locally with `localStorage`.
- Public visitors can submit a story without login.
- Submissions are sent to `/.netlify/functions/submit`.
- Submissions are inserted as one row per story in Netlify Database.
- CSV export is available through the protected export function.

## Admin Review

Open:

`https://YOUR-SITE.netlify.app/.netlify/functions/export?password=YOUR_ADMIN_PASSWORD`

This downloads a CSV export. Keep the admin password private.

## Files

- `index.html`: public intake page and Netlify form
- `app.js`: question rotation, answered-question tracking, Netlify Function submit
- `styles.css`: page styling
- `netlify.toml`: publish and function settings
- `netlify/functions/submit.js`: public submission API
- `netlify/functions/export.js`: password-protected CSV export
