import { useState } from "react";
import { Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReportForm from "@/components/ReportForm";
import Todo from "@/components/Todo";
import { suggestTeam, submitDraft, type Mode, type Session } from "@/lib/model";
import type { ChangeSession } from "@/lib/use-session";

export default function Scouting({ session, change, saving, pit = false }: {
  session: Session; change: ChangeSession; saving: boolean; pit?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("objective");
  const [matchId, setMatchId] = useState(session.schedule[0]?.id ?? "");
  const [team, setTeam] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const draft = session.draft;

  function ready() {
    setSubmitted(false);
    void change(current => {
      if (current.draft) return current;
      const match = current.schedule.find(match => match.id === matchId);
      const assigned = pit ? Number(team) : match ? suggestTeam(current, match, mode) : null;
      if (!assigned) throw new Error("No available team. Choose another match.");
      return { ...current, draft: { id: crypto.randomUUID(), mode: pit ? "pit" : mode,
        matchId: pit ? null : matchId, team: assigned, values: {} } };
    });
  }

  if (draft) return <div className="space-y-5">
    <Card><CardHeader><p className="eyebrow">{draft.mode} scouting · {session.schedule.find(match => match.id === draft.matchId)?.number ? `Match ${session.schedule.find(match => match.id === draft.matchId)?.number}` : "Pit"}</p>
      <CardTitle className="text-3xl">Scout Team {draft.team}</CardTitle>
      <p className="text-muted-foreground">{saving ? "Saving on this device…" : "Draft saved on this device"}</p>
    </CardHeader><CardContent className="space-y-6">
      <ReportForm key={draft.id} draft={draft} update={(key, value) => {
        void change(current => current.draft?.id === draft.id
          ? { ...current, draft: { ...current.draft, values: { ...current.draft.values,
            [key]: typeof value === "function" ? value(Number(current.draft.values[key] ?? 0)) : value } } }
          : current);
      }} />
      <Button size="lg" disabled={saving} onClick={() => {
        void change(current => submitDraft(current)).then(saved => { if (saved) setSubmitted(true); });
      }}><Check />Save report for upload</Button>
    </CardContent></Card>
  </div>;

  const match = session.schedule.find(match => match.id === matchId);
  const suggested = match ? suggestTeam(session, match, mode) : null;
  return <div className="space-y-5">
    {submitted && <div role="status" className="notice">Report saved locally. Waiting for upload.</div>}
    <Card><CardHeader><p className="eyebrow">{pit ? "Pit scouting" : "Scouting station"}</p>
      <CardTitle>{pit ? "Meet the robot" : "Ready when you are"}</CardTitle>
      <p className="text-muted-foreground">{pit ? "Choose a team and record its capabilities." : "Choose a match, tap Ready, and receive a team."}</p>
    </CardHeader><CardContent className="space-y-5">
      {!session.name.trim() && <p className="text-amber-300">Set your scout name above to begin.</p>}
      {pit ? <label className="block space-y-2">Team number<Input type="number" min={1} value={team}
        onChange={event => setTeam(event.target.value)} /></label> : <>
        <div className="flex gap-2">{(["objective", "subjective"] as const).map(item =>
          <Button key={item} variant={mode === item ? "default" : "outline"} onClick={() => setMode(item)}>{item}</Button>)}</div>
        <label className="block space-y-2">Match<select className="field" value={matchId} onChange={event => setMatchId(event.target.value)}>
          {session.schedule.map(match => <option key={match.id} value={match.id}>Qualification {match.number}</option>)}
        </select></label>
        <div className="assignment"><span className="text-muted-foreground">Local assignment suggestion</span>
          <strong>{suggested ? `Team ${suggested}` : "All teams covered on this device"}</strong>
          <p className="text-sm text-muted-foreground">Based on your ID and locally saved coverage. Other devices may claim the same team.</p>
        </div>
      </>}
      <Button size="lg" disabled={saving || !session.name.trim() || (pit ? !/^\d+$/.test(team) || Number(team) < 1 : !suggested)}
        onClick={ready}><Play />{pit ? "Start pit scouting" : "Ready · claim team"}</Button>
    </CardContent></Card>
    <Todo title={pit ? "Pit form expansion" : "Shared Ready queue"}>
      {pit ? "Multiple autos and translations from V2." : "Server claims, lead overrides, and assignment delivery."}
    </Todo>
  </div>;
}
