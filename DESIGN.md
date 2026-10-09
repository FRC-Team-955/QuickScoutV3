# QuickScout V3 — working design

Status: initial proposal for discussion. No implementation or technology stack selected.

## Requirements

- Remain useful through very spotty internet.
- Retain V2's objective match scouting, subjective match scouting, pit scouting, and analytics.
- Develop the design collaboratively before writing code.

## Proposed reliability contract

- Once provisioned for an event, a device can open the app and record scouting without internet.
- Save each accepted edit to a durable local database; indicate storage failures explicitly.
- Submission first creates a durable local report and a pending upload. Distinguish saved locally from synced.
- Retry pending uploads after reconnection, without creating duplicate reports.
- Keep local reports until confirmed by the server and covered by an explicit retention policy.
- Keep drafts separate from submitted reports. Corrections create a revision rather than silently overwriting another scout's work.
- Keep cached event schedules, assignments, and downloaded reports available offline, showing freshness.
- Treat live queue coordination as dependent on connectivity. Provide an explicit offline assignment workflow.
- Support a deliberate device-to-device transfer fallback; format and method remain undecided.

These are intended guarantees, subject to browser storage limits, device failure, and users clearing site data. Storage persistence, recovery, and backup behavior need design before implementation.

## Proposed boundaries

1. App interface: screens and input controls.
2. Scouting rules and report model: validation, workflow, revisions, stable identifiers.
3. Local repository: durable drafts, reports, downloaded event data, and pending uploads.
4. Sync service: retries, acknowledgments, deduplication, and conflict handling.
5. Shared backend: accounts, permissions, published assignments, and confirmed reports.
6. Analytics: shared calculation rules over locally available reports, with coverage and freshness indicators.

The interface should work through the repository instead of calling the backend directly. Queue coordination and report collection have different connectivity requirements.

## Data model direction

- Stable event, official match, team, scout, assignment, and report IDs.
- Separate official matches from scouting sessions and assignments.
- Objective, subjective, and pit reports share a common identity and revision envelope, with mode-specific payloads.
- Assignments and submitted reports use consistent maps keyed by IDs.
- Store event identity explicitly rather than deriving it from submission dates.
- Version game-specific report schemas so historical data remains interpretable.

## Decisions to make together

- Devices and browsers used by scouts and leads; whether they are shared between people.
- Whether devices can reach a shared local network when venue internet fails.
- Duration of disconnected operation to support.
- Event provisioning and sign-in behavior before and during an outage.
- Assignment strategy during outages: cached station schedules, manual assignment, or another workflow.
- Transfer fallback: QR, files, or a local collector.
- Analytics required offline and acceptable delays in receiving other devices' reports.
- Scope beyond V2's core modes: pit display, official schedule, OPR, scout leaderboard.
- Backend and frontend choices, after reliability and workflow requirements are agreed.

## Next discussion

Establish the event-day device and network setup. Use it to choose the offline assignment and transfer workflows before selecting frameworks or backend services.
