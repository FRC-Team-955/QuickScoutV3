import { useEffect, useState } from "react";
import { BarChart3, Bot, ClipboardList, Radio, Wifi, WifiOff } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import Todo from "./components/Todo";
import Scouting from "./pages/Scouting";
import Analytics from "./pages/Analytics";
import Lead from "./pages/Lead";
import { useSession } from "./lib/use-session";

const tabs = [
  { id: "scouting", label: "Scouting", icon: ClipboardList },
  { id: "pit", label: "Pit scouting", icon: Bot },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "lead", label: "Lead desk", icon: Radio },
];

export default function App() {
  const { session, change, error, saving } = useSession();
  const [tab, setTab] = useState("scouting");
  const [network, setNetwork] = useState(navigator.onLine);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const update = () => setNetwork(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  if (!session) return <main className="shell py-12"><h1>QuickScout V3</h1>
    <p role={error ? "alert" : "status"}>{error || "Opening local storage…"}</p></main>;

  function exportBatch() {
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, reports: session!.reports }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `quickscout-${session!.scoutId.slice(0, 8)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    setMessage("Backup exported. Reports remain saved locally and pending upload.");
  }

  return <div className="min-h-screen">
    <header className="border-b border-border bg-card"><div className="shell flex flex-wrap items-center justify-between gap-4 py-5">
      <div><p className="eyebrow">Team 955 · Demo event</p><h1>QuickScout <span className="text-primary">V3</span></h1></div>
      <label className="flex items-center gap-3 text-sm">Scout name<Input className="w-40" placeholder="Your name" defaultValue={session.name}
        onChange={event => {
          const name = event.target.value;
          void change(current => ({ ...current, name }));
        }} /></label>
    </div></header>
    <div className="status-strip"><div className="shell flex flex-wrap items-center gap-x-5 gap-y-2 py-3 text-sm">
      <span className={network ? "text-sky-300" : "text-amber-300"}>{network ? <Wifi size={16} /> : <WifiOff size={16} />}
        {network ? "Network available" : "No network"}</span>
      <span>Server: not connected</span><span>Last sync: {session.lastSync ? new Date(session.lastSync).toLocaleString() : "never"}</span>
      <span>{session.outbox.length} pending</span><strong className="text-amber-300">{session.offline ? "Offline collection" : "Automatic sync · TODO"}</strong>
    </div></div>
    <main className="shell space-y-6 py-6">
      <nav aria-label="Main navigation" className="flex flex-wrap gap-2">{tabs.map(item => <Button key={item.id}
        variant={tab === item.id ? "default" : "outline"} aria-current={tab === item.id ? "page" : undefined}
        onClick={() => setTab(item.id)}><item.icon />{item.label}</Button>)}</nav>
      {error && <div role="alert" className="notice border-red-400 text-red-300">{error}</div>}
      {tab === "scouting" && <Scouting session={session} change={change} saving={saving} />}
      {tab === "pit" && <Scouting key="pit" session={session} change={change} saving={saving} pit />}
      {tab === "analytics" && <Analytics session={session} />}
      {tab === "lead" && <Lead session={session} change={change} />}
      <section className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button variant="outline" disabled={!session.reports.length || saving} onClick={exportBatch}>Export local backup</Button>
        <Button variant="outline" disabled={!session.outbox.length} onClick={() => setMessage("Upload is not implemented yet. Your reports remain safely queued locally.")}>Sync pending reports</Button>
        <span className="text-sm text-muted-foreground" role="status">{message || (saving ? "Saving…" : "Local storage ready")}</span>
      </section>
      <Todo title="Firebase sync & sign-in">Retry batches, acknowledge report IDs, and verify roles. No live Firebase writes.</Todo>
      <Todo title="Offline app startup">Cache the app shell; apply updates between scouting sessions.</Todo>
    </main>
  </div>;
}
