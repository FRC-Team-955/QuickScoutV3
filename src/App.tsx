import { lazy, Suspense, useEffect, useState } from "react";
import {
  BarChart3,
  Bot,
  ClipboardList,
  Radio,
  Wifi,
  WifiOff,
  LayoutDashboard,
  CalendarDays,
  Trophy,
  MonitorPlay,
  Zap,
  ArrowDownToLine,
  RefreshCw,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import Todo from "./components/Todo";
import Scouting from "./pages/Scouting";
import Dashboard from "./pages/Dashboard";
import Matches from "./pages/Matches";
import Lead from "./pages/Lead";
import OPR from "./pages/OPR";
import Leaderboard from "./pages/Leaderboard";
import PitDisplay from "./pages/PitDisplay";
import { useSession } from "./lib/use-session";
import { useEvent } from "./lib/use-event";
import { download } from "./lib/transfer";
const Analytics = lazy(() => import("./pages/Analytics"));
const tabs = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "scouting", label: "Scouting", icon: ClipboardList },
  { id: "pit", label: "Pit scouting", icon: Bot },
  { id: "matches", label: "Match schedule", icon: CalendarDays },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "opr", label: "OPR", icon: Zap },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "pit-display", label: "Pit display", icon: MonitorPlay },
  { id: "lead", label: "Lead desk", icon: Radio },
];
const route = () => {
  const hash = window.location.hash.slice(1);
  return tabs.some((tab) => tab.id === hash.split(":")[0]) ? hash : "scouting";
};
export default function App() {
  const { session, change, error, saving } = useSession();
  const [tab, setTab] = useState(route);
  const [network, setNetwork] = useState(navigator.onLine);
  const [message, setMessage] = useState("");
  const source = useEvent(session, change, network);
  useEffect(() => {
    const update = () => setNetwork(navigator.onLine);
    const navigate = () => setTab(route());
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("hashchange", navigate);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("hashchange", navigate);
    };
  }, []);
  if (!session)
    return (
      <main className="shell py-12">
        <h1>QuickScout V3</h1>
        <p role={error ? "alert" : "status"}>{error || "Opening local storage…"}</p>
      </main>
    );
  const page = tab.split(":")[0];
  const navigate = (page: string) => {
    window.location.hash = page;
  };
  const event = source.event;
  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <a href="#dashboard" className="brand">
          <span className="brand-mark">
            <Bot size={24} />
          </span>
          <div>
            <strong>
              QuickScout<span>V3</span>
            </strong>
            <small>SCOUT · LEARN · COMPETE</small>
          </div>
        </a>
        <p className="sidebar-label">Workspace</p>
        <nav aria-label="Main navigation">
          {tabs.map((item) => (
            <a key={item.id} href={`#${item.id}`} aria-current={page === item.id ? "page" : undefined}>
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === "scouting" && session.draft && <i />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="pill">LOCAL FIRST PROTOTYPE</span>
          <p>Reports stay on this device until the sync layer is connected.</p>
          <small>
            Team {session.homeTeam} · {session.eventKey}
          </small>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="eyebrow">
              Team {session.homeTeam} · {session.eventKey}
            </p>
            <h1>
              {event?.name ?? "Demo event"}
              <span className="header-version">QuickScout V3</span>
            </h1>
          </div>
          <label className="scout-identity">
            <span className="identity-avatar">{session.name.slice(0, 1).toUpperCase() || "?"}</span>
            <div>
              <small>Scout name</small>
              <Input
                aria-label="Scout name"
                placeholder="Your name"
                defaultValue={session.name}
                onChange={(event) => {
                  const name = event.target.value;
                  void change((current) => ({ ...current, name }));
                }}
              />
            </div>
          </label>
        </header>
        <div className="status-strip">
          <div className="shell status-content">
            <span className={network ? "text-sky-300" : "text-amber-300"}>
              {network ? <Wifi size={15} /> : <WifiOff size={15} />}
              {network ? "Network available" : "No network"}
            </span>
            <span>Firebase: not connected</span>
            <span>Last sync: {session.lastSync ? new Date(session.lastSync).toLocaleString() : "never"}</span>
            <span className="pending-count">{session.outbox.length} pending</span>
            <strong className={session.offline ? "text-amber-300" : "text-muted-foreground"}>
              {session.offline ? "Offline collection" : "Online collection"}
            </strong>
          </div>
        </div>
        <main className="shell app-content">
          <div className="event-freshness">
            <span>
              {event?.updatedAt
                ? `TBA cache updated ${new Date(event.updatedAt).toLocaleString()}`
                : "Demo schedule · load a real event in Lead desk"}
              {event?.warnings.map((warning) => ` · ${warning}`)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={
                source.loading || saving || session.offline || !network || session.eventKey === "demo"
              }
              onClick={() => void source.refresh()}
            >
              <RefreshCw size={14} />
              {source.loading ? "Refreshing…" : "Refresh TBA"}
            </Button>
          </div>
          {error && (
            <div role="alert" className="notice border-red-400 text-red-300">
              {error}
            </div>
          )}
          {source.error && page !== "lead" && (
            <div role="alert" className="notice text-amber-300">
              {source.error}
            </div>
          )}
          <Suspense fallback={<p className="empty">Opening analytics…</p>}>
            {page === "dashboard" && <Dashboard session={session} navigate={navigate} />}
            {page === "scouting" && <Scouting session={session} change={change} saving={saving} />}
            {page === "pit" && <Scouting key="pit" session={session} change={change} saving={saving} pit />}
            {page === "matches" && <Matches session={session} />}
            {page === "analytics" && (
              <Analytics
                key={tab}
                session={session}
                change={change}
                saving={saving}
                initialTeam={tab.split(":")[1] ?? ""}
              />
            )}
            {page === "opr" && <OPR session={session} change={change} />}
            {page === "leaderboard" && <Leaderboard session={session} />}
            {page === "pit-display" && <PitDisplay session={session} change={change} network={network} />}
            {page === "lead" && (
              <Lead session={session} change={change} source={source} network={network} saving={saving} />
            )}
          </Suspense>
          <section className="backup-strip">
            <div>
              <strong>Keep a copy with you.</strong>
              <p>
                {saving ? "Saving changes…" : "Local storage ready"} · {session.reports.length} reports on
                this device
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!session.reports.length || saving}
                onClick={() => {
                  download(
                    `quickscout-${session.scoutId.slice(0, 8)}.json`,
                    JSON.stringify({ schemaVersion: 1, reports: session.reports }, null, 2),
                  );
                  setMessage("Backup exported. Upload status is unchanged.");
                }}
              >
                <ArrowDownToLine />
                Export local backup
              </Button>
              <Button
                variant="outline"
                disabled={!session.outbox.length}
                onClick={() => setMessage("Firebase upload is TODO. Your reports remain queued locally.")}
              >
                Sync pending reports
              </Button>
            </div>
            {message && (
              <p className="w-full" role="status">
                {message}
              </p>
            )}
          </section>
          <div className="grid gap-3 lg:grid-cols-2">
            <Todo title="Firebase auth & durable sync">
              Sign-in, report batches, retry acknowledgments, and server permissions.
            </Todo>
            <Todo title="Offline app startup">
              Cache the app shell and apply updates between scouting sessions.
            </Todo>
          </div>
          <footer className="app-footer">
            <span>QuickScout V3</span>
            <span>Built for the stands. Designed around local data.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
