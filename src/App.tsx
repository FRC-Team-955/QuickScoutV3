import { lazy, Suspense, useEffect, useState } from "react";
import { Wifi, WifiOff, ArrowDownToLine, RefreshCw } from "lucide-react";
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
import { onAuthStateChanged, reload } from "firebase/auth";
import { auth } from "./lib/firebase";
import type { User } from "firebase/auth";
import { signOut, sendEmailVerification } from "firebase/auth";
import AuthPanel from "./components/AuthPanel";
const Analytics = lazy(() => import("./pages/Analytics"));
const tabs = [
  { id: "dashboard", label: "Overview" },
  { id: "scouting", label: "Scouting" },
  { id: "pit", label: "Pit scouting" },
  { id: "matches", label: "Match schedule" },
  { id: "analytics", label: "Analytics" },
  { id: "opr", label: "OPR" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "pit-display", label: "Pit display" },
  { id: "lead", label: "Lead desk" },
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
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const source = useEvent(session, change, network);
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    console.log(
      currentUser ? `Signed in as ${currentUser.email}` : "Signed out"
    );
    setUser(currentUser);
    setEmailVerified(currentUser?.emailVerified ?? false);
    setMessage("");
  });

  return unsubscribe;
}, []);
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

  async function handleSignOut() {
    setVerificationBusy(true);
    try {
      await signOut(auth);
      setMessage("");
    } catch {
      setMessage("Could not sign out. Try again.");
    } finally {
      setVerificationBusy(false);
    }
  }

  if (user === undefined) {
    return <p>Checking sign-in…</p>;
  }

  if (user === null) {
    return <AuthPanel />;
  }

  if (!/^[^@]+@student[.]csd509j[.]net$/.test(user.email ?? "")) {
    return (
      <main className="mx-auto max-w-sm p-6 space-y-4">
        <h1>Use your school account</h1>
        <p>Sign in with your @student.csd509j.net email to use QuickScout.</p>
        <Button disabled={verificationBusy} onClick={() => void handleSignOut()}>
          Use a different account
        </Button>
        <p role="status">{message}</p>
      </main>
    );
  }

  if (!emailVerified) {
    return (
      <main className="mx-auto max-w-lg p-6 space-y-4">
        <h1>Verify your school email</h1>
        <p>We need to confirm that you own {user.email}.</p>


        <div className="flex flex-wrap gap-3">
        <Button
          disabled={verificationBusy}
          onClick={async () => {
            setVerificationBusy(true);
            setMessage("Sending verification email…");
            try {
              await sendEmailVerification(user);
              setMessage("Verification email sent. Check your inbox.");
            } catch {
              setMessage("Could not send the email. Try again.");
            } finally {
              setVerificationBusy(false);
            }
          }}
        >
          Send verification email
        </Button>
        <Button
          disabled={verificationBusy}
          onClick={async () => {
            setVerificationBusy(true);
            setMessage("Checking verification…");
            try {
              await reload(user);
              await user.getIdToken(true);
              setEmailVerified(user.emailVerified);
              setMessage(user.emailVerified ? "" : "Email is not verified yet.");
            } catch {
              setMessage("Could not check verification. Try again.");
            } finally {
              setVerificationBusy(false);
            }
          }}
        >
          I've verified
        </Button>
        <Button
          disabled={verificationBusy}
          onClick={() => void handleSignOut()}
        >
          Cancel
        </Button>


        </div>

        <p role="status">{message}</p>
      </main>
    );
  }

  if (!session)
    return (
      <main className="shell py-12">
        <h1>QuickScout V3</h1>
        <p role={error ? "alert" : "status"}>
          {error || "Opening local storage…"}
        </p>
      </main>
    );
  const page = tab.split(":")[0];
  const navigate = (page: string) => {
    window.location.hash = page;
  };
  const event = source.event;
  return (
    <div className="app-frame">
      <header className="app-nav">
        <a href="#dashboard" className="brand">
          QuickScout <span>V3</span>
        </a>
        <nav aria-label="Main navigation">
          {tabs.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={page === item.id ? "page" : undefined}
            >
              {item.label}
              {item.id === "scouting" && session.draft && (
                <i aria-label="Draft in progress" />
              )}
            </a>
          ))}
        </nav>
      </header>
      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="eyebrow">
              Team {session.homeTeam} · {session.eventKey}
            </p>
            <h1>{event?.name ?? "Demo event"}</h1>
          </div>

          <div>
           <p className="eyebrow">{user.displayName ?? user.email}</p>
          <Button
          variant="outline"
          disabled={verificationBusy}
          onClick={() => void handleSignOut()}
        >
          Sign out
        </Button>
        </div>

        </header>
        <div className="status-strip">
          <div className="shell status-content">
            <span className={network ? "text-sky-300" : "text-amber-300"}>
              {network ? <Wifi size={15} /> : <WifiOff size={15} />}
              {network ? "Network available" : "No network"}
            </span>
            <span>Firebase: not connected</span>
            <span>
              Last sync:{" "}
              {session.lastSync
                ? new Date(session.lastSync).toLocaleString()
                : "never"}
            </span>
            <span className="pending-count">
              {session.outbox.length} pending
            </span>
            <strong
              className={
                session.offline ? "text-amber-300" : "text-muted-foreground"
              }
            >
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
                source.loading ||
                saving ||
                session.offline ||
                !network ||
                session.eventKey === "demo"
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
            {page === "dashboard" && (
              <Dashboard session={session} navigate={navigate} />
            )}
            {page === "scouting" && (
              <Scouting session={session} change={change} saving={saving} />
            )}
            {page === "pit" && (
              <Scouting
                key="pit"
                session={session}
                change={change}
                saving={saving}
                pit
              />
            )}
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
            {page === "pit-display" && (
              <PitDisplay session={session} change={change} network={network} />
            )}
            {page === "lead" && (
              <Lead
                session={session}
                change={change}
                source={source}
                network={network}
                saving={saving}
              />
            )}
          </Suspense>
          <section className="backup-strip">
            <div>
              <strong>Local reports</strong>
              <p>
                {saving ? "Saving changes…" : "Local storage ready"} ·{" "}
                {session.reports.length} reports on this device
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!session.reports.length || saving}
                onClick={() => {
                  download(
                    `quickscout-${session.scoutId.slice(0, 8)}.json`,
                    JSON.stringify(
                      { schemaVersion: 1, reports: session.reports },
                      null,
                      2,
                    ),
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
                onClick={() =>
                  setMessage(
                    "Firebase upload is TODO. Your reports remain queued locally.",
                  )
                }
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
              Sign-in, report batches, retry acknowledgments, and server
              permissions.
            </Todo>
            <Todo title="Offline app startup">
              Cache the app shell and apply updates between scouting sessions.
            </Todo>
          </div>
          <footer className="app-footer">
            <span>QuickScout V3</span>
            <span>Prototype · saved on this device</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
