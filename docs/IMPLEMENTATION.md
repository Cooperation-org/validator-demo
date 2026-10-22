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
- `api/lambda/*.ts`: HTTP endpoints, routed under `/api`. The frontend imports them via `@api/*`.
- `api/_lib/`: server-only helpers, not routed.
- Config: `.env` (copy `.env.example`). Never imported by `src/`.

| Endpoint                    | Does                                                                            | Reuses                                             |
| --------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------- |
| `GET /api/candidate?email=` | All LinkedClaims about `mailto:<email>`, including identities linked by SAME_AS | trust_claim_backend `GET /api/claims/subject/:uri` |
