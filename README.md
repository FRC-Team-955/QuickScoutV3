# QuickScout V3 prototype

React + TypeScript. Local reports persist in IndexedDB. Nothing connects to live Firebase.

```sh
npm install
npm run dev
npm run build
npm test
```

Open http://localhost:8083. Enter a scout name, select a match, and tap Ready. Reports and pending uploads survive reloads. Analytics shows reports saved on this device. Lead desk edits the local schedule and collection mode.

This workspace currently links V2's installed dependencies for preview/testing. Run `unlink node_modules` before installing V3's own dependencies. That link is ignored by Git.

TODO blocks mark unfinished Firebase auth/sync, shared claims, QR transfers, schema recovery, and offline app installation. An available network does not mean a server connection. Use Export local backup to download reports; exporting does not mark them synced.

Reused from V2: button/card/input/textarea/label components, CSS theme, Tailwind setup, and class utilities. Fuel counters, scouting prompts, and local analytics adapt V2's workflows. V1's QR fallback and possession workflow inform later work.

The prototype uses one small IndexedDB wrapper without Dexie. It stores one session record; separate indexed tables and migrations are left for the durable sync implementation. Use one tab per device for now.
