# San Martín 2026 Election Trends Dashboard

## Objective
Publish a GitHub Pages dashboard that presents the official ONPE regional-election count for San Martín, Peru, clearly distinguishing reported results from forecasts.

## Problem and rationale
The official results portal is authoritative but not optimized for a focused, readable view of regional trends. The dashboard will expose the candidate ranking, processed-acta progress, and a transparent data timestamp/source.

## Scope
- Static web application suitable for GitHub Pages.
- Spanish public UI focused on the San Martín regional race.
- ONPE-backed processed-acta progress, refresh state, and a link to the official source.
- The candidate ranking is intentionally unavailable until ONPE exposes a verifiable candidate-results payload; it must not show estimates or placeholders as results.
- Graceful unavailable-data state; no scraping of protected content, no predictions, and no voter profiling.

## Constraints
- Source provenance must visibly identify ONPE and the last successful refresh.
- Browser CORS for ONPE is unverified. A scheduled GitHub Actions fetch will write a same-origin JSON snapshot from the verified map-progress endpoint, avoiding a public proxy.
- GitHub Pages deployment requires a new repository/remote, a commit, and an authenticated push. Those delivery actions await explicit confirmation at the publication boundary.
- Delivery strategy: ask-on-risk. Forecast: approximately 250 authored lines excluding generated files.

## Acceptance criteria
- [ ] The dashboard displays validated ONPE-derived San Martín count-progress metrics and visibly states that candidate totals are unavailable from the source.
- [ ] It clearly labels the results as an official count, includes timestamp/provenance, and links to ONPE.
- [ ] It supports loading, unavailable-data, and manual-refresh states accessibly.
- [ ] It builds as a static site and has a GitHub Pages deployment configuration.
- [ ] Focused checks and production build are recorded with their observed outcomes.

## Tasks

### T1 — Validate data integration and scaffold the static app
- Status: done
- Route: delegated (`gentle-ai-explore`, `gentle-ai-worker`).
- Outcome: created a dependency-free static scaffold, an atomic ONPE map-progress snapshot collector, fixture contract validation, and documentation. The collector accepts only numeric UBIGEO `210000` and preserves a valid snapshot on bad upstream data.
- Evidence: `npm run check` passed (Node syntax plus fixture/data-contract checks). Live fetch was deliberately not included in focused validation; it remains an external runtime dependency.

### T2 — Implement data adapter and electoral dashboard
- Status: done
- Route: delegated writer and independent verifier.
- Outcome: responsive same-origin dashboard with accessible loading, unavailable-data, manual-refresh, progress, provenance, and no-candidate-result states.
- Evidence: deterministic RED→GREEN provenance regression test; final independent verification passed `npm test` (3/3) and `npm run check`. The client accepts only HTTPS snapshots whose parsed hostname exactly equals `resultadoelectoral.onpe.gob.pe`.
- Known limit: no live-browser or assistive-technology session was run; direct source inspection verified the accessible semantics.

### T3 — Add GitHub Pages deployment and validate the production build
- Status: done
- Route: delegated writer and independent verifier.
- Outcome: dependency-free static build creates a clean allowlisted `dist/`; GitHub Pages workflow collects the ONPE snapshot server-side, tests, checks, builds, uploads, and deploys it on default-branch pushes, manual runs, and a bounded schedule.
- Evidence: independent verification passed `npm test` (3/3), `npm run check`, `npm run build`, workflow YAML parsing, and output allowlist assertions.
- Known limits: no local snapshot existed for build-time validation; no remote collection or Pages deployment was run. All project files remain untracked, so Git cannot provide a T3-specific diff. Native review was declined for this uncommitted initial candidate; the independent verifier still passed the full local test, check, build, YAML, and artifact checks.

### T4 — Commit and publish the site
- Status: pending user authorization
- Route: user-authorized delivery only.
- Preconditions: explicit approval to create the initial commit and push, a GitHub repository/remote, GitHub authentication, and setting Pages source to GitHub Actions after the first push.
- Scope: Pages workflow/configuration and deployment documentation.
- Checks: production build; workflow syntax and static-path validation.

### T4 — Create repository, commit, push, and publish
- Status: pending; blocked on explicit user approval and GitHub authentication.
- Route: parent-controlled delivery boundary.
- Scope: initialize/attach repository, create work-unit commit(s), push to GitHub, enable Pages, and report public URL.
- Checks: remote and deployed URL verification.

## Progress and evidence
- 2026-10-05: User selected GitHub Pages and, after the candidate endpoint failed server-side, authorized an official count-progress-only release. Confirmed ONPE map-progress response: San Martín UBIGEO `210000`; 476 processed actas (18.851%) at the observed source timestamp. Candidate totals remain unavailable and will not be inferred.
- 2026-10-05: T1 completed. The local snapshot contract and syntax checks pass; no live fetch was claimed.
- 2026-10-05: T2 completed after independent verification. `npm test` passed 3/3 and `npm run check` passed. ONPE provenance is restricted to the exact official hostname over HTTPS.
- 2026-10-05: T3 completed after independent verification. `npm test` (3/3), `npm run check`, `npm run build`, workflow YAML parsing, and `dist/` allowlist assertions passed. Remote collection/deployment was not run.

## Next step
Request explicit authorization to create the initial commit and publish to a user-provided GitHub repository. After the initial push, set the repository Pages source to GitHub Actions.
