# Subscribe Email List Setup

Jam Tracks Hub uses a Cloudflare Worker API plus Cloudflare D1 to store newsletter or new-track notification signups.

## Runtime Pieces

- Frontend form: `index.html`
- Worker entrypoint: `worker.js`
- Subscribe handler: `functions/api/subscribe.js`
- CSV export handler: `functions/api/subscribers.csv.js`
- Optional D1 schema reference: `migrations/0001_create_subscribers.sql`

## Cloudflare Setup

1. Create a D1 database in Cloudflare.
   Suggested name: `jamtrackshub_subscribers`

2. Deploy the site with the Worker entrypoint.
   The `wrangler.jsonc` file must include `main: "./worker.js"`, the static asset binding, and the D1 binding.

3. Keep this D1 binding in `wrangler.jsonc` so future deployments do not remove it:
   - Variable name: `SUBSCRIBERS_DB`
   - D1 database: `jamtrackshub_subscribers`
   - D1 database ID: `9fbeaf79-817b-47fa-afc2-15f37712df46`

4. Add a private export token in Cloudflare.
   Open `Workers & Pages` -> `jamtrackshub` -> `Settings` -> `Variables and secrets`, then add:
   - Name: `SUBSCRIBERS_ADMIN_TOKEN`
   - Value: a long random private string

5. Redeploy the site after the binding and secret are saved.

The subscribe endpoint creates the `subscribers` table automatically on first use.

## How To Export Emails

Open this URL after replacing the token:

```text
https://jamtrackshub.com/api/subscribers.csv?token=YOUR_PRIVATE_TOKEN
```

This downloads a CSV with:

- `email`
- `subscribed_at`
- `source`
- `page`

Do not share the export token publicly.

## Notes

- Subscriber emails are stored in Cloudflare D1, not in GitHub.
- The CSV export endpoint is protected by `SUBSCRIBERS_ADMIN_TOKEN`.
- If the database binding disappears after a redeploy, check `wrangler.jsonc` first. Cloudflare deployments can treat this file as the source of truth for Worker bindings.
- If Cloudflare says bindings cannot be added to a static-only Worker, push and deploy the `worker.js` and `wrangler.jsonc` changes first.
- A future upgrade can add unsubscribe links, double opt-in, and automatic email delivery.
