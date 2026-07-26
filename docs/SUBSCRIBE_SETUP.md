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
   The `wrangler.jsonc` file must include `main: "./worker.js"` and the static asset binding.

3. Bind the D1 database to the deployed site.
   In Cloudflare, open `Workers & Pages` -> `jamtrackshub` -> `Bindings`.

4. Add this binding:
   - Variable name: `SUBSCRIBERS_DB`
   - D1 database: `jamtrackshub_subscribers`

5. Add a private export token.
   In the same project settings, add an environment variable or secret:
   - Name: `SUBSCRIBERS_ADMIN_TOKEN`
   - Value: a long random private string

6. Redeploy the site after the bindings are saved.

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
- If the database binding is missing, the website form will show a temporary setup error.
- If Cloudflare says bindings cannot be added to a static-only Worker, push and deploy the `worker.js` and `wrangler.jsonc` changes first.
- A future upgrade can add unsubscribe links, double opt-in, and automatic email delivery.
