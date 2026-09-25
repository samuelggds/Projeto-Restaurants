# Production confidence gates

This document separates repository validation from infrastructure/provider validation. CI must never describe a skipped external check as a real sandbox or production test.

## Pull-request gates

`CI` remains the merge-blocking workflow through the repository rule set. Its `Full Root CI Validation` job requires architecture checks, lint, typecheck, clean-database migrations, unit/integration tests, tenant isolation, PostgreSQL RLS, critical Chromium E2E, dependency audit and production builds to pass.

Additional pull-request workflows now provide:

- `Security Hardening`: secret detection, CodeQL JavaScript/TypeScript analysis, Docker image build and Trivy HIGH/CRITICAL scans. Third-party actions are pinned to commit SHAs.
- `Isolated Stack Smoke`: builds and starts disposable Postgres + backend + worker + frontend from the PR source, waits for health, verifies backend readiness/frontend delivery and preserves logs. Nothing is deployed or published.
- `README Screenshots`: actions are pinned by commit SHA and failed Playwright diagnostics are preserved.

The active `main-reviewed-and-tested` repository rule set requires `Full Root CI Validation`, requires a pull request and requires review threads to be resolved before merge.

## Scheduled slower validation

`Deep Validation` is intentionally outside the fast PR path. Twice weekly (and on manual dispatch) it:

- applies every migration to a clean PostgreSQL database, creates a disposable fixture, performs `pg_dump`, restores into a second database and verifies both fixture and Prisma migration history;
- runs payment/refund/billing contract tests without creating external payments/messages;
- reports which provider sandbox credentials are absent instead of pretending sandbox validation ran;
- runs critical Playwright journeys across Chromium, Firefox and WebKit and uploads traces/screenshots/results on failure.

## Provider sandbox status

The repository can validate webhook/idempotency/refund/expiry business rules without external charges. A real Mercado Pago, Open Finance Mercado Pago, Asaas or Pagar.me homologation run requires explicit provider credentials configured in repository/environment secrets. The scheduled workflow only reports credential presence; it deliberately does **not** create a Pix charge, refund, webhook or message by itself.

A real provider sandbox exercise must use dedicated sandbox accounts and test fixtures and must record the provider response/evidence separately. Missing credentials are an external validation gap, not a passing provider test.

## Immutable image promotion gap

CI builds and scans Docker images from the exact source commit and records their immutable Docker image IDs. The current Lightsail deployment architecture does not have a configured container registry/promotion channel: `scripts/deploy-production.sh` checks out the CI-approved main SHA and rebuilds images on the target host.

Therefore source immutability is enforced today, but **registry digest promotion of the exact CI-built image is not claimed as implemented**. Completing that control requires an authorized registry (for example ECR/GHCR), publish credentials and a production change to consume image digests. Those infrastructure credentials and that production mutation are intentionally outside this PR.

## Rollback and migration safety

Production deployment already creates a pre-deploy PostgreSQL backup when the database service is running and applies migrations before replacing application services. CI additionally validates forward migration and disposable restore. Schema changes in this work are additive; destructive rollback migrations are not introduced.

No workflow in this change merges, deploys to production, sends customer messages, or creates real provider charges.
