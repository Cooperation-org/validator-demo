# Validator Demo — Product & Technical Specification

**Status:** Draft v0.3 (aligned with current scaffold)  
**Date:** 2026-10-20  
**Scope:** Minimal proof of concept (not a production identity-verification system)

## 1. Purpose

Build a small, approachable web app that demonstrates how someone claiming to administer a nonprofit can request verification of their connection to that organization. Use [Cooperation-org/validator-service](https://github.com/Cooperation-org/validator-service) as the existing claim and endorsement backend, without rewriting it.

Example: Jane (`jane@gmail.com`) claims she is an administrator of `nonprofit.com`. The intended experience offers two paths:

1. **Organization email / staff contact:** verify control of an email at the organization's domain (e.g. `jane@nonprofit.com`) through an email link.
2. **Third-party reference:** when Jane lacks an organization-domain address, ask a credible contact (e.g. `joe@knownfunder.com`) to explicitly attest that **`jane@gmail.com` belongs to Jane** and that Jane is authorized to represent the named nonprofit.

**Critical distinction:** The current validator-service exposes a reference/validator workflow, but **does not expose a dedicated organization-domain magic-link issuance/consumption API** in its inspected public routes. The organization-email path is an *intended feature requiring additional backend work*. For this demo, its API and screens may use clearly labeled placeholders.

## 2. Stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Application framework | **Modern.js 3** (React 19 + TypeScript) | File-based routing and application conventions, using Rsbuild/Rspack internally |
| Rendering | **Client-side SPA; SSR disabled** | Simpler demo with an independent Express backend |
| Build tooling | **Rsbuild / Rspack via Modern.js** | Fast builds without a separate `rsbuild.config.ts` |
| Styling | **Tailwind CSS v4** via `@rsbuild/plugin-tailwindcss` | Modern utility-first CSS, with CSS-first setup |
| Forms | React state + native HTML validation | No extra form dependency needed for MVP |
| Network | **Native browser `fetch`** + small typed functions | Avoid Axios dependency; explicit response/error handling |
| Backend | Existing validator-service (Express + Prisma + PostgreSQL) | Reuse its claim and endorsement endpoints |
| Package manager | **npm**, with committed `package-lock.json` | Matches actual scaffold and workflow |
| Local Node runtime | **Node.js 24 LTS**, matching the package engine range | Already installed; no extra Node version required |
| Tooling | Rstack CLI (`rs check`, `rs lint`, `rs fmt`) | Use generated scripts rather than adding redundant tooling |

The actual scaffold has `@modern-js/app-tools` 3.10.1 and Modern.js runtime 3.10.1, with React 19 and Tailwind CSS 4. Keep framework configuration in `modern.config.ts` and use its `builderPlugins` option for the Tailwind Rsbuild plugin. The project explicitly sets `server.ssr: false`. Node compatibility is governed by `package.json` (`^22.18.0 || >=24.3.0`); Node 24 must satisfy this range.

**Browser requirement:** Tailwind v4 targets modern browsers. Revisit the styling choice if supporting older browsers becomes a hard requirement.

## 3. User journeys

### A. Claimant: initiate verification

1. Enter claimant name, **exact email to be verified**, organization name, organization website/domain, Candid entity identifier, and nonprofit profile URL (the latter two are required by the current backend).
2. Choose a verification method: **Organization email** or **Reference endorsement**.
3. Review two required checkboxes: authorization statement and acceptance of demo terms; enter optional admin notes (max 500 characters).
4. If **Reference endorsement** is selected, add at least one reference name and email. A short explanation tells the user the reference must confirm the claimant's exact email, identity, and affiliation.
5. Submit and view a confirmation state. A successful API submission means a request was created or dispatched, **not** that the claimant was verified.

### B. Organization-domain email (placeholder flow in MVP)

1. Select “Organization email.”
2. Enter an address under the nonprofit's verified domain.
3. Provide a **clearly labeled demo/placeholder action** for requesting a magic link. The UI may show a sample confirmation or placeholder verification screen, but must not claim that a real email was sent or that the user is verified.
4. Keep the placeholder logic behind a typed API interface, so it can be replaced with real endpoints later.

This path becomes operational only after separate server endpoints for token issuance, expiry, single-use consumption, domain ownership policy, and verification state are implemented. Placeholder data is strictly local/demo-only.

### C. Reference endorsement (functional integration target)

1. Create claimant record via `POST /api/v0/validate`.
2. Use the returned `data.claimId` as the **user-info identifier** for `POST /api/v0/add-statement` (`id`).
3. Extract the **actual claim identifier** from `add-statement` response (`data.claim.id`) and pass it with named references to `POST /api/v0/send-validation-requests`.
4. Backend sends a validation-request email linking the reference to `/validation/{validationId}` at its configured `SERVER_URL`.
5. Reference reviews the claim and explicitly confirms or declines the statement tied to the claimant's **exact email**. For MVP, use the service's existing response flow; any custom reference screen must be checked against its available validation payload.
6. Show submission/pending state; do not imply completion merely because the email request was dispatched.

**Important gap:** Existing `validateClaim` accepts only `statement` and numeric `rating`, then marks the request `COMPLETED`; it does not enforce an affirmative attestation of the candidate's specific email or distinguish approval from rejection as a secure decision. Therefore the demo must not infer an authoritative endorsement from arbitrary ratings. Making explicit email-bound affirmative endorsement reliable requires a backend contract change and ideally server-side storage of the claim details shown to the reference.

## 4. UI / UX

**One-page claimant form**, followed by a confirmation state, with a narrow readable column (approx. 640–720px), white/off-white surface, simple dividers, restrained typography, dark text, and one distinct primary button. Accessible native radio buttons and checkboxes; keyboard navigation and visible focus indicators.

Suggested layout:

```text
Verify your organization connection
A simple demo of nonprofit administrator verification

Your details
  Name                         [             ]
  Your email                   [             ]
  Organization                 [             ]
  Organization website/domain  [             ]
  Candid entity ID             [             ]
  Nonprofit profile URL        [             ]

How would you like to verify?
  ( ) Organization email       [Demo placeholder]
  (x) Reference endorsement    [Supported by validator-service]

Reference contact
  Name                         [             ]
  Email                        [             ]

Terms and conditions
  [ ] I confirm I am authorized to request verification
  [ ] I agree to the demo terms
  Notes (optional)             [             ]

  [Send verification request]
```

**Visual behavior:** implement layout and states using Tailwind CSS utility classes; dynamically reveal only the relevant method fields; show inline field validation, submission progress, a success message with pending status, and actionable errors. On narrow screens use full-width fields. Clearly label any sample/placeholder results. Avoid copying Candid/GuideStar/LinkedTrust logos or claiming official endorsement.

## 5. API inventory (verified from repository source)

All routes below use the `/api/v0` prefix, defined in `src/index.ts`.

| Method | Path | Purpose | Expected input / output |
| --- | --- | --- | --- |
| POST | `/validate` | Create claimant user info | `{email, firstName?, lastName?, profileURL, candid_entity_id}` → HTTP 201, `data.claimId` (actually user-info ID) |
| POST | `/add-statement` | Create administrator claim | `{id, statement}` → HTTP 201, `data.claim.id` |
| POST | `/send-validation-requests` | Request reference endorsements | `{claimId, validators: [{name, email}]}` → HTTP 200, message only |
| GET | `/validation/:validationId` | Retrieve individual request | Validation request object |
| POST | `/validate/:validationId` | Submit validator's response | `{statement, rating}` → HTTP 200 |
| GET | `/user/:claimId` | Retrieve claimant info | Read endpoint; parameter naming is confusing in current implementation |
| GET | `/claim/:claimId` | Retrieve claim | Claim object |
| GET | `/report/:id` | Generate report | Report data; parameter semantics must be verified before UI use |

There are also service-rendered HTML routes (`/`, `/recommend`, `/validation/:validationRequestId`) **outside** `/api/v0`. The server sends validation emails with URLs based on `SERVER_URL`; that environment variable must point to the correct site, not just the API path.

### Placeholder API contract (proposed, not present in validator-service)

The following are **frontend-facing placeholders**, not verified backend routes. Implement them in a mock adapter or stubbed functions for the demo; do not issue network requests to these paths unless corresponding backend endpoints are built:

| Proposed operation | Example request | Placeholder response |
| --- | --- | --- |
| Request organization email link | `requestDomainMagicLink({candidateEmail, organizationDomain, organization
