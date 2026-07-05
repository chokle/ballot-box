# Trade Legacy Box

A small public story intake page for preserving short trade lessons before they disappear.

## Deploy

This version is built for Netlify.

- Branch: `main`
- Build command: leave blank
- Publish directory: `.`
- Forms directory: handled by Netlify Forms

## Data Behavior

- The public page shows one rotating question.
- Each browser tracks answered questions locally with `localStorage`.
- Public visitors can submit a story without login.
- Submissions are sent to Netlify Forms under `trade-legacy-stories`.
- Review, search, moderation, and CSV export happen in the private Netlify dashboard.

## Admin Review

In Netlify, open the deployed site, then go to:

`Forms` -> `trade-legacy-stories`

From there you can review submissions and export them.

## Files

- `index.html`: public intake page and Netlify form
- `app.js`: question rotation, answered-question tracking, Netlify form submit
- `styles.css`: page styling
- `netlify.toml`: publish settings and redirects for removed local admin routes
