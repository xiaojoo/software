# Software Finder

Static frontend built with native HTML, CSS, JavaScript modules, and Web Components. Cloudflare Pages Functions provide the API layer, and Cloudflare D1 stores reviews and aggregate activity counts.

## Software sources

The catalog tracks releases from `xiaojoo/book`, `video`, `music`, `wallpaper`, `phone-camera`, and `SmartClip`. `/api/software` fetches each repository's latest published GitHub Release and asset download counts. GitHub responses are cached at the edge for 15 minutes. The checked-in values in `src/data/software.js` are fallbacks for API outages. SmartClip currently has no published GitHub Release, so its profile links to the repository.

## Local development

```sh
npm install
npm run dev
```

`npm run dev` first copies the current site sources and the admin interface into `dist`, then starts Cloudflare Pages locally.

For local D1 data, create a local database using the binding in `wrangler.toml`, then apply migrations:

```sh
npm run db:migrate:local
```

Create a local `.dev.vars` file for the admin credentials and session signing secret (this file is ignored by Git):

```dotenv
ADMIN_USERNAME=your-admin-name
ADMIN_PASSWORD=use-a-long-unique-password
ADMIN_SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters-long
```

Wrangler uses a local R2 simulation for development. Local uploads are separate from production; create the `yuanji-hub-screenshots` bucket in Cloudflare before deploying screenshot storage.

## Cloudflare setup

The production project is already bound to the free D1 database `software-finder-db` as `DB`. Its initial migration has been applied. To set up a separate Cloudflare account or environment, create a database:

```sh
npm run db:create
```

Add the generated `database_id` to both the top-level and production `d1_databases` blocks in `wrangler.toml` (the binding name must be `DB`), then apply the schema and seed rows:

```sh
npm run db:migrate:remote
```

Deploy with Wrangler so Cloudflare compiles the root-level `functions/` directory:

```sh
npm run deploy
```

### Admin login and screenshot storage

Create the R2 bucket named `yuanji-hub-screenshots` in Cloudflare. The `SCREENSHOTS` binding is declared in both the local and production Wrangler configurations. For another bucket name, update both `r2_buckets` entries in `wrangler.toml`.

Set production login credentials as Worker secrets; use a unique password and a cryptographically random session secret:

```sh
npx wrangler pages secret put ADMIN_USERNAME --project-name yuanji-hub
npx wrangler pages secret put ADMIN_PASSWORD --project-name yuanji-hub
npx wrangler pages secret put ADMIN_SESSION_SECRET --project-name yuanji-hub
```

Apply migrations to the production D1 database before deploying the new Functions:

```sh
npm run db:migrate:remote
npm run deploy
```

Open `/admin/` on the deployed site to manage reviews and software screenshots. Uploaded PNG, JPEG, or WebP images are limited to 10 MiB each. The public product page displays screenshots vertically in the saved order; products without screenshots have no screenshot section.

Cloudflare Dashboard drag-and-drop deployment does not compile Pages Functions; use Wrangler for deployments containing the `functions/` directory.

## Data recorded

- Software profile views and download clicks are aggregate counters in D1. No raw IP address or visitor identifier is stored. A download click is recorded immediately before redirecting to the public GitHub asset; it does not claim to measure a completed file transfer.
- Reviews store a 1–5 rating, plain text plus a limited formatting tree (bold, italics, lists, quotes), and submission time. Formatting is rendered from an allowlisted node structure; submitted HTML is never interpreted.

The API is same-origin. Review submissions remain immediately public and can be hidden or deleted in `/admin/`; add a separate anti-spam measure before opening review submission to a large public audience.
