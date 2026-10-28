# Implementation Notes

## Stage 1: Client-only verification form

- Uses the project's existing Modern.js convention route, `src/routes/page.tsx`.
- Uses `src/routes/page.data.ts` for a route `loader` (method metadata) and a route `action` (demo submission).
- The page uses `useLoaderData` and `useFetcher` from `@modern-js/runtime/router`.
- SSR remains disabled: loaders and actions run in the browser. They are **not** security boundaries and must not hold secrets.
- Form uses React state and native HTML validation; action also validates submitted values defensively.
- Both verification methods are simulated. No actual calls to validator-service occur in Stage 1.

## How to apply

Copy the contents of this overlay into the root of the existing `validator-demo` checkout, preserving directory paths. Do **not** replace your package.json, modern.config.ts, or existing Tailwind CSS import.

Run:

```sh
npm run check
npm run build
npm run dev
```

Expected: page displays claimant fields and two selectable verification methods. Submitting valid fields results in a clearly marked demo confirmation, **not** a verified state.

## Next stage

Implement a dedicated API module with native fetch for `POST /api/v0/validate`, `POST /api/v0/add-statement`, and `POST /api/v0/send-validation-requests`. Send reference emails only against controlled test recipients. Preserve the distinction between user-info ID and claim ID and ensure the validator confirms the **exact claimant email**.

## Framework documentation

Per generated root `AGENTS.md`, check `node_modules/@modern-js/app-tools/docs/llms.txt` and its version-matched data-loader/data-action pages before adjusting framework integrations. The implementation here follows the public Modern.js 3 Data Fetching and Data Writing conventions; the installed local docs should take precedence.

## Backend (Modern.js BFF)

- `@modern-js/plugin-bff` enabled in `modern.config.ts`. Same app, same `npm run dev` / `build` / `serve`; one Node process.
- `api/lambda/*.ts`: HTTP endpoints under `/api`. Pages import them via `@api/*`.
- `api/_lib/`: server-only helpers, not routed.
- Config: `.env` (copy `.env.example`). Never imported by `src/`.

### Modes

- `LINKEDTRUST_CLAIMS` and `LINKEDTRUST_INVITES`, each `api` (calls `LINKEDTRUST_API_URL`) or `mock` (JSON files in `DATA_DIR`, same fields as trust_claim_backend).
- Claims: dev.linkedtrust.us accepts `POST /api/claims` without credentials. With `LINKEDTRUST_CLIENT_ID`/`SECRET` set they are sent and the backend records this app as issuer. dev's build drops `author`; the lookup page reads the endorser's name from the start of the statement.
- Invites (testimonial requests): `api` needs the client ID and secret. dev.linkedtrust.us predates testimonial requests, so with dev they stay `mock`.
- `EMAIL_MODE=smtp` sends; `EMAIL_MODE=log` prints each email, link included, to the server log.

### Endpoints

| Endpoint                                            | Does                                                                                                                                                                                                                                                                     | Reuses                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `POST /api/org-email`                               | Emails a single-use link (24 h) to an address at the organization domain                                                                                                                                                                                                 | Token scheme from trust_claim_backend testimonial requests; pending links are this app's own records in `DATA_DIR` |
| `GET /api/org-email/:token`, `POST .../confirm`     | Uses the link once; writes `RELATED_TO` / `relationship:same-as` claim from `mailto:<candidate>` to `mailto:<org email>`                                                                                                                                                 | LinkedTrust identity-link claim shape                                                                              |
| `POST /api/endorsements`                            | Creates a testimonial request about `mailto:<candidate>`, emails the reference a link to `/endorse/:token`                                                                                                                                                               | trust_claim_backend `POST /api/testimonial-requests`                                                               |
| `GET /api/endorsements/:token`, `POST .../response` | Reference answers two yes/no questions (exact email, role). Yes to both writes an `is_vouched_for` claim (author = name as typed, `sourceURI` = `mailto:<reference email>`, the address the link went to) and marks the request responded; otherwise nothing is recorded | trust_claim_backend `GET /api/testimonial-requests/:token`, `POST /api/claims`, `POST .../responded`               |
| `GET /api/candidate?email=`                         | All claims about `mailto:<email>`                                                                                                                                                                                                                                        | trust_claim_backend `GET /api/claims/subject/:uri`                                                                 |

### Pages

- `/`: candidate form, both methods.
- `/verify/:token`: organization-email confirmation (a button, so mail scanners opening the link do not use it).
- `/endorse/:token`: reference answer page.
- `/lookup?email=`: what is recorded for a candidate email.

## Deploy (demos.linkedtrust.us/validator-demo/)

Runs on the shared dev VM from `/opt/shared/repos/validator-demo`, port 3060.

```sh
cd /opt/shared/repos/validator-demo && git pull && npm ci
set -a && . ./.env && set +a && npm run build   # .env sets APP_BASE_PATH=/validator-demo
sudo systemctl restart tmp-validator-demo
```

- `deploy/tmp-validator-demo.service`: systemd unit (`modern serve`, `.env` as EnvironmentFile).
- `deploy/nginx-validator-demo.conf`: goes to `/etc/nginx/app-proxies/validator-demo.conf`. Under a prefix the app serves pages and assets at `<prefix>/`, but its API at `/api/`; nginx maps `<prefix>/api/` to it. `APP_BASE_PATH` must be set at serve time too (the unit reads `.env`). The browser adds the prefix to API calls (`src/bff-client.ts`).
