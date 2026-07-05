# Trade Legacy Box

A small standalone story box for preserving short trade lessons before they disappear.

## Run locally

Run the included server:

```bash
node server.js
```

Then open `http://127.0.0.1:4177/`.

Set an admin password before using this outside a private local test:

```bash
BALLOT_BOX_ADMIN_PASSWORD="use-a-real-password" node server.js
```

## Data behavior

The MVP stores public submissions in `data/submissions.json` through the local server:

- Questions are seeded from a master list.
- Each browser gets a randomized personal question sequence.
- Answered question IDs are stored locally and are not shown again.
- Submissions are posted to `/api/submissions`.
- Admin review, search, delete, and CSV export require login.

Admin authentication is included. No Torch, Jack, Live Brain, or website integration is required.

## Admin access

- Public users can only view the landing page, answer the prompt, submit, and see the thank-you confirmation.
- `/admin.html`, `/admin.js`, `/api/admin/submissions`, `/api/admin/export`, and moderation routes require an admin session.
- Direct admin access redirects to `/login.html`.
- The default development password is `change-this-password`; override it with `BALLOT_BOX_ADMIN_PASSWORD`.

## Files

- `index.html`: one-question capture flow
- `app.js`: local question rotation and answered-question tracking
- `admin.html`: simple review/export page
- `admin.js`: authenticated saved story review, search, moderation, CSV export
- `server.js`: public submission API, admin auth, protected admin APIs
