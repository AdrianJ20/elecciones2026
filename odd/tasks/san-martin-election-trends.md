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

## Publication recovery
- Initial commit `7eb3882feb623c88a113dd40a7be038f67542f8f` was pushed to `AdrianJ20/elecciones2026` on `main` with explicit user authorization.
- GitHub Pages is configured for GitHub Actions. Run `37269364595` failed collecting ONPE data (HTTP 302); a local endpoint request returned HTTP 403.
- User explicitly authorized decoupling publication from unavailable ONPE data, with commit and push to the same repository. No bypasses or fabricated data are allowed.

### T5 — Publish safely when official data is unavailable
- Status: independently verified locally; authorized commit/push and remote verification next.
- Branch: `fix/pages-unavailable-data`; no commit or push performed by the implementation writer.
- Scope: deployment workflow, unavailable-data UI, regression tests, and documentation.
- Outcome: only ONPE collection uses `continue-on-error`; its failed `outcome` produces an Actions warning and summary, not a success claim. Scheduled/manual collection remains enabled. Tests, structural checks, build, and upload remain mandatory before deployment.
- UI: absent/unreadable/invalid local data displays “Datos oficiales temporalmente no disponibles”, hides and clears metrics/timestamp/progress, retains the exact official ONPE link, and re-enables refresh. Successful verified data restores the metrics. All browser data requests remain same-origin.
- RED: `npm test` observed 5 intended failures (missing snapshot, network/invalid data, failed refresh, static fallback, and workflow recovery); the original 3 validation/formatting tests passed.
- GREEN: `npm test` passed 8/8 after implementation; a subsequent run also passed 8/8 with alternate provenance/region cases and stale state/link cleanup assertions.
- Check: `npm run check` passed syntax and deterministic snapshot fixture/data-contract checks. Workflow edit diagnostics reported YAML clean; workflow contract regression runs in the existing `npm test` target.
- Independent verification: tests 8/8, check, build without snapshot, exact three-file byte-identical artifact, and PyYAML workflow parsing passed. Isolated malformed JSON, missing provenance, and nonofficial-source snapshots each failed build with exit 1.
- Chrome smoke: unavailable state, cleared metrics/timestamp, official link, real refresh, two same-origin app fetches, no runtime exceptions, and no ONPE requests passed. Initial test-harness syntax/routing assertions failed; a whole-page origin assertion exposed Kaspersky-injected traffic. Final isolated browser blocked that environment script only; antivirus/system settings were not changed.
- Native review: four lenses approved `review-67950ed750ef17f7`; exact acknowledgement completed and authority burned.
- Limits: live ONPE data, remote Actions recovery, public deployment, and assistive-technology verification remain unverified. Clean runners do not retain a previous run’s snapshot; successful collection is required to publish actual metrics.

## Next step
Parent: independently verify/review T5 and run the production-build checks, then commit and push the authorized recovery and verify the remote Actions result and deployed site. Remote publication remains unverified.
