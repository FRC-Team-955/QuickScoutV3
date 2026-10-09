# QuickScout V3

React + TypeScript, with one local IndexedDB store and a future Firebase sync layer.

```sh
npm ci
npm run dev
npm run build
npm test
```

Open http://localhost:8083. Set your scout name. In Lead desk, load a TBA event (for example `2026joh`). Successful API responses stay cached; failed refreshes keep the old data. Offline collection stops API refreshes and streams. Reports and drafts survive reloads.

V3 has its own installed dependencies and npm lockfile. Read-only TBA/Nexus keys were reused locally from V2 in the ignored `.env.local`; a fresh checkout needs keys from `.env.example`. `VITE_` keys are visible to browser clients. Firebase is not configured.

Working V2 features:

- Dashboard: team/pit coverage, top teams, alliance scores, upcoming matches.
- Matches: rounds, results, team search, played/upcoming filters.
- Objective and subjective scouting: full prompts, counters, local drafts, manual fallback.
- Pit scouting: V2 questions, multiple autos, six languages, unscouted team list.
- Analytics: event/team/scout filters, trends, team averages, bubble chart, pit/subjective reports, JSON view, CSV export, local removal.
- OPR: cached official ratings, local calculation, absent-robot marks.
- Leaderboard: all three scouting modes, event filter, scout totals.
- Pit display: nearby matches, clock, optional webcast, manually refreshed Nexus queue snapshot.
- Lead desk: event setup, local queue defaults, coverage, manual schedule entries.
- Transfers: V3 JSON backup/import and V2 Firebase JSON import. Repeated report IDs are deduplicated; conflicts are rejected. Imported copies are not queued for upload.

Overlapping observers are preserved. Analytics averages observers within a team/match before averaging matches. Scout identities remain separate even when names match. V2 imports with no event key use the event selected during import.

Intentional TODOs: Firebase sign-in/roles/shared data, exclusive Ready claims, event-wide collection mode and scout status, durable batch sync/acknowledgments, QR/nearby transfer, offline app installation, and storage recovery. Use one tab per device until multi-tab coordination is implemented. Loading the app without a network still needs the app-shell TODO completed.

Reuse: V2 UI components, theme, pit questions/translations, match prompts, TBA/webcast/Nexus clients, and OPR approach. V2 pages were adapted to a single report model rather than copying their Firebase-dependent page trees. V1 informs the QR fallback. Seasonal effects and login-gated decorative UI were omitted.

API references: [TBA v3](https://www.thebluealliance.com/apidocs/v3), [Nexus](https://frc.nexus/en/api).
