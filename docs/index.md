# Recall documentation

This index separates current contracts from reports that record an earlier
state. Start at the README for the product and local run instructions. Use this
page to find the right explanation before changing a module.

## Start here

| If you need to understand… | Read |
| --- | --- |
| How this documentation is organized | [This index](index.md) |
| Why Recall exists and the experience the owner intends | [Product brief](product-brief.md) |
| Which ideas were chosen, changed, or rejected—and known implementation gaps | [Product decision record](product-decisions.md) |
| Why similar-looking solve/practice/coverage counts differ | [Domain and data model](data-model.md) |
| How web, API, database, and extension work together | [Architecture](architecture.md) |
| What each code, test, migration, script, and existing document does | [Codebase map](codebase-map.md) |
| Current API routes and security boundary | [HTTP API reference](api.md) |
| Current strength bars, queue rank, stable movement and thresholds | [Pattern progress and strength](retention.md) |
| Exact classification rules and provider-tag priorities | [Provider tag classification](import-classification.md) |
| Set up Supabase/Auth, install the extension, or test account flows | [Account setup](account-setup.md) |
| Deploy to the current Render + Supabase preview | [Deployment runbook](deploy-render.md) |

## Current behavior and policy

These documents describe contracts that are meant to match the code now. When
implementation changes, update the appropriate contract and its tests in the
same feature.

| Document | Scope |
| --- | --- |
| [Architecture](architecture.md) | Runtime modes, trust boundaries, request flow, migrations and operational responsibilities. |
| [Domain and data model](data-model.md) | Problem identity, placements, topics, attempts, imports, coverage credits, practice evidence and count semantics. |
| [HTTP API](api.md) | Public, authenticated, workspace and owner routes, validation, retries and error behavior. |
| [Pattern catalog](pattern-catalog.md) | Category/subpattern inventory, units, placement concepts and current catalog rules. |
| [Provider tag classification](import-classification.md) | Normalization, specialty precedence, curated exceptions, placement/coverage guarantees and reimport behavior. |
| [Pattern classification evidence](pattern-classification-evidence.md) | Which provider gaps require reviewed derived mappings and the reasons behind them. |
| [Pattern progress and strength](retention.md) | The current scoring inputs, formulas, weighted practice blocks, holds, queue release gates and presentation. |
| [Goal policy evidence](goal-policy-evidence.md) | Evidence used to choose goal directions, what is Recall policy, and invariants. |
| [Extension recording](extension-recording.md) | Accepted detection, recording prompt, retries and capture boundaries. |
| [Legacy and recent imports](legacy-import.md) | Resumable import runs, account binding, deduplication, date limits and recovery. |
| [Import reliability](extension-import-reliability.md) | Safe extension-side retries, checkpoints, pause/resume, recovery and update steps. |
| [Import performance](import-performance.md) | Bulk-write change and a controlled before/after measurement; the local measurement is not an SLA for Render. |
| [Website-to-extension login](website-extension-login.md) | Same-profile bridge, short-lived access token, website-owned refresh token and connection behavior. |
| [Accounts and setup](account-setup.md) | Supabase Auth, local/hosted workspaces, browser setup, account separation, test fixtures and deletion. |
| [Render deployment](deploy-render.md) | Render Blueprint settings, Supabase configuration, extension package, health checks and recovery. |
| [Owner dashboard](owner-dashboard.md) | Owner roles/permissions, MFA, telemetry boundaries and owner recovery. |
| [Testing](testing.md) | Current commands, test groups, fixtures, integration requirements and known verification limits. |
| [Public website phases](public-site.md) | Current front-door/launch scope and what still needs live configuration. |
| [Guided onboarding implementation](ux-onboarding-implementation.md) | Changes made to connect, import and repeat-practice flow. |

## Product rationale and research

| Document | Scope |
| --- | --- |
| [Product brief](product-brief.md) | North star, ideal loop, page experience, trust principles, visual direction and non-goals. |
| [Product decisions](product-decisions.md) | User's decision timeline, direction changes, rationale, collaboration preferences and known mismatches. |
| [Retention research](retention-research.md) | Literature reviewed, evidence limits, candidate ideas and measures needed before claiming a calibrated retention probability. This is research/proposal context; use `retention.md` for the adopted current policy. |
| [Design notes](../.21st/DESIGN.md) | Visual reference direction and design-token rationale. |

## Historical audits, snapshots, and phase notes

These files preserve what was reviewed or implemented at a point in time. Their
test counts, screenshots, priorities, routes, or implementation descriptions
may predate current code. Do not treat them as a live specification when they
conflict with the current behavior documents above.

| Document | What it preserves |
| --- | --- |
| [Website/extension audit — 30 Sep 2026](audit-2026-09-30.md) | Initial broad audit and discussion order. |
| [Dashboard audit — 2 Oct 2026](dashboard-audit-2026-10-02.md) | Then-current dashboard/ranking review and follow-up ideas. |
| [Threshold audit — 2 Oct 2026](threshold-audit.md) | A point-in-time audit of threshold behavior and its fixes. |
| [Comprehensive robustness audit — 3 Oct 2026](comprehensive-audit-2026-10-03.md) | Findings/fixes from an earlier code audit; verify code directly now. |
| [Classification count audit — 2 Oct 2026](classification-audit.md) | Snapshot of one workspace/count comparison; not a current user count. |
| [Onboarding audit — 8 Oct 2026](ux-onboarding-audit-2026-10-08.md) | UX findings and recommended phases before later implementation. |
| [Frontend rebuild plan](frontend-rebuild.md) | Earlier UI rebuild phases and selected design direction. |
| [Component inventory](component-inventory.md) | Earlier primitive-library inventory and migration proposal. |
| [Phase 2](phase-2.md) | Earlier database/API walkthrough. |
| [Phase 3](phase-3.md) | Earlier dashboard recording walkthrough. |
| [Phase 4](phase-4.md) | Earlier extension attempt flow. |
| [Phase 5](phase-5.md) | Earlier review queue flow. |
| [Phase 6](phase-6.md) | Earlier Accepted prompt and fixture notes. |
| [App review checklist](app-review.md) | Review checklist; confirm each item against current app. |

## Keep documentation accurate

- Source code is the authority for what the app does; current contract docs
  explain why and summarize the rule. If they disagree, verify and correct the
  docs rather than relying on a dated report.
- User intent is recorded separately in `product-brief.md` and
  `product-decisions.md`. Mark an intention/code mismatch; do not quietly
  redefine intent to match an implementation accident.
- Do not hardcode test counts in evergreen docs. Test counts change; state the
  command and scope. Any historical run count should include its date and
  database/browser scope.
- SQL migration files are immutable once applied. Add a later numbered
  migration, update the data model/API docs, and cover the upgrade path.
- Product numbers are policy unless supported by a cited research result.
  Distinguish Recall's chosen weights from external evidence.
- User secrets and identifying practice records do not belong in committed
  docs, fixtures, output logs, or examples.

