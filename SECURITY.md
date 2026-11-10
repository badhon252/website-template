# Security review — 10 November 2026

This review covers this Next.js frontend template and its dependency lockfile.
It does not certify the separate backend, hosting account, or production data.

## Trust boundaries and assets

| Boundary | Assets / abuse case | Controls |
| --- | --- | --- |
| Browser → NextAuth | Credentials; forged identity or admin claims | Bounded credential validation, framework CSRF protection, client updates cannot overwrite signed claims |
| NextAuth → configured backend | Passwords, access and refresh tokens; redirects or malformed responses | HTTPS in production, redirects rejected, 10-second timeout, no-store, Zod response validation, generic authentication failure |
| Signed session → browser | Refresh-token disclosure; expired token reuse | Refresh token remains in encrypted httpOnly cookie; production Secure cookies; failed refresh exposes no access token |
| Browser → Axios backend | Bearer token sent to another host | Configured-origin restriction before session lookup, bounded timeout; server-side redirects disabled |
| Document → executable content | Injected scripts, frames, resource exfiltration | Per-request script nonce, restrictive CSP, frame denial, nosniff, referrer and permission policies |
| Package registry → installation | Malicious lifecycle scripts or dependency drift | Frozen npm lockfile, pinned manager, blocked install scripts, signature verification, CI checks |
| Repository → collaborators | Leaked secrets or saved account data | Environment ignore rules, blank secret example, removed Postman collection |

No database, payments, upload handler, or LLM integration is implemented here.
The proxy protects dashboard navigation; the backend must independently authorize
all protected data and actions. Proxy checks cannot replace backend authorization.

## Dependency changes

Next.js 16.4.6, React 19.3.1, NextAuth 4.24.15, Axios 1.21.1, Zod 4.6.7,
and the other retained direct packages were checked against npm's stable dist-tags.
Compatibility exceptions:

- TypeScript 6.0.3: TypeScript 7.0.2 is unsupported by the current typescript-eslint toolchain.
- ESLint 9.39.5: Next's current React/import/accessibility plugins do not declare ESLint 10 support. ESLint 9 is deprecated upstream; revisit when these plugin peer ranges support 10.
- Node type declarations 22.20.5 match the supported Node 22 runtime instead of advertising Node 26 APIs.

The existing Node 22 environment is pinned to 22.22.2 with npm 10.9.7.
The shadcn generator is development-only. Redundant jsPDF types and unused ts-jest
were removed; Next/Jest uses SWC. Production dependency count fell from 566 to 224
in the full lockfile audit metadata; this is not a measured bundle-size reduction.

Targeted overrides address advisories that parent packages have not yet incorporated:

- glob 9–14.0.1 → 14.0.4 (AbortSignal traversal cancellation).
- minimatch 7–11.0.0 → 11.0.5 (globparts amplification).
- postcss-selector-parser below 6.1.5 → 6.1.6 (selector parsing complexity).

Jest, lint, types, and the production build are checked with these overrides.
Review and remove overrides once upstream dependency ranges include patched versions.

## Remaining advisory

The full npm audit reports **7 low, 0 moderate, 0 high, 0 critical** entries.
These seven entries trace to one advisory in deepmerge 4.3.1,
[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4),
propagated through Jest/configuration and shadcn's development tooling.
At review time the latest deepmerge release is affected; there is no patched
latest release. No downgrade or blanket forced audit fix was applied.

This dependency is development-only; production dependencies audit cleanly.
The residual risk is processing attacker-controlled configuration/registry data
in developer tooling. Run generators only against reviewed registries and review
repository changes before running tests. Owner: project maintainers.
Review by **24 November 2026**, or sooner when upstream publishes a fix.
CI fails for moderate-or-higher findings; this low finding remains visible.

## Installation and verification

Use `nvm use`, then `npm ci --ignore-scripts`. `.npmrc` also blocks lifecycle
scripts by default. No dependency install scripts are approved. The lockfile
marks install scripts for @parcel/watcher and core-js; they remain blocked.
The clean install and build work without enabling them.
`npm run prepare` explicitly installs the reviewed local Husky hooks if wanted.

The verification workflow uses read-only GitHub permissions, disables persisted
checkout credentials, pins actions to release commits, uses the frozen lockfile,
and runs native audit/signatures, types, lint, tests, and build. It has been
prepared locally; it has not been executed on GitHub in this session.

Native audits identify known advisories, not every possible malicious package.
Signature verification reports no invalid or missing signatures; it does not mean
every package has provenance attestations or prove code is safe.

## Completed local verification

- `npm ci --ignore-scripts --no-audit`: clean install passed.
- `npm run type-check` and `npm run lint`: passed.
- `npm test -- --runInBand`: 24 tests passed across 4 suites, including regression cases that failed before the fixes.
- `npm run build`: passed with Next.js 16.4.6 and the locked toolchain.
- `npm audit --json`: 7 low findings; 0 moderate/high/critical.
- `npm audit --omit=dev --json`: 0 findings.
- `npm audit signatures --json`: exit 0, `invalid: []`, `missing: []`.
- `npm outdated --json`: only the three compatibility exceptions above remain.
- Chrome DevTools: production home page loaded, scripts had nonces, all observed requests returned 200, and no console warnings/errors were reported. The 390px mobile view had no horizontal overflow. Response headers included CSP, HSTS, frame denial, and nosniff.
- Current tracked-file scan found no JWT literals, private-key blocks, configured auth secrets, or recognized GitHub/AWS key patterns. Pattern scanning is limited and is not proof that no secret exists.

The Postman collection was sanitized during the review, then removed externally.
The user confirmed that deletion was intentional; it remains removed.

## Required deployment follow-up

1. **Rotate the committed NEXTAUTH_SECRET** anywhere it was used. Revoke exposed
   Postman bearer tokens and change any real example passwords. These values
   remain in existing Git history. Removing them from current files does not
   revoke credentials. Rotation and any coordinated history cleanup require
   access to the owning systems and were not performed here.
2. Configure your own HTTPS `NEXTAUTH_URL` and `NEXT_PUBLIC_API_URL`. Generate a
   unique secret per environment. Never reuse example credentials.
3. Verify backend login throttling, account lockout policy, server authorization,
   input limits, credential hashing, refresh-token revocation, database access,
   and CORS in the separate backend/infrastructure. This repository cannot prove
   or enforce these controls. No live credentials or real backend writes were used.
4. Confirm the backend login response supplies the existing user/id/role/token
   contract and refresh responses use `status: true`. The inherited one-hour
   access-token lifetime remains a configuration assumption; align it with the
   issuing backend before deployment. Authentication tests use mocked responses.
5. Keep the origin behind HTTPS and recheck security headers after deployment.
   HSTS is production-only, with no preload or subdomain-wide commitment.

## CSP and performance tradeoffs

The nonce policy follows the [Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy).
It requires dynamic document rendering and prevents static HTML/CDN caching;
immutable framework assets remain cacheable. Inline **styles** are retained for
Radix/motion compatibility. Production scripts permit neither unsafe-inline nor
unsafe-eval. Only local development permits eval and WebSocket connections.
The existing three image hosts are HTTPS-only and optimizer redirects are disabled.
Additional resource origins must be explicitly reviewed before integration.

No production deployment, real backend login, load test, or penetration test was
performed. The application is hardened within the inspected scope, not certified
"fully secure" or universally optimized.
