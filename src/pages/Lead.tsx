import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Todo from "@/components/Todo";
import type { Session } from "@/lib/model";
import type { ChangeSession } from "@/lib/use-session";

export default function Lead({ session, change }: { session: Session; change: ChangeSession }) {
  const [teams, setTeams] = useState("955, 749, 997, 2471, 1540, 2046");
  const [matchNumber, setMatchNumber] = useState("4");
  const numbers = teams.split(/[,\s]+/).filter(Boolean).map(Number);
  const valid = /^\d+$/.test(matchNumber) && Number(matchNumber) > 0 && numbers.length === 6
    && numbers.every(number => Number.isInteger(number) && number > 0) && new Set(numbers).size === 6;
  return <div className="space-y-5">
    <div><h2>Lead desk</h2><p className="text-muted-foreground">Local preview · role permissions are not connected</p></div>
    <Card><CardHeader><CardTitle>Collection mode</CardTitle></CardHeader><CardContent className="space-y-3">
      <p>{session.offline ? "Offline collection — keep reports on the device." : "Automatic sync selected — sync implementation pending."}</p>
      <Button variant="outline" onClick={() => void change(current => ({ ...current, offline: !current.offline }))}>
        {session.offline ? "Choose automatic sync" : "Switch to offline collection"}
      </Button>
      <p className="text-sm text-muted-foreground">Changes apply to this device only in the prototype.</p>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Master schedule</CardTitle></CardHeader><CardContent className="space-y-4">
      {session.schedule.map(match => <div key={match.id} className="report flex flex-wrap justify-between gap-2">
        <strong>Qual {match.number}</strong><span className="text-muted-foreground">{match.teams.join(" · ")}</span>
      </div>)}
      <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
        <label>Match<Input aria-label="Match number" value={matchNumber} onChange={event => setMatchNumber(event.target.value)} /></label>
        <label>Red 1–3, Blue 1–3<Input aria-label="Six teams" value={teams} onChange={event => setTeams(event.target.value)} /></label>
      </div>
      <Button disabled={!valid || session.schedule.some(match => match.number === Number(matchNumber))}
        onClick={() => void change(current => current.schedule.some(match => match.number === Number(matchNumber))
          ? current : { ...current, schedule: [...current.schedule,
          { id: `demo-qm${matchNumber}`, number: Number(matchNumber), teams: numbers }].sort((a, b) => a.number - b.number) })}>
        Add match locally
      </Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Scout status</CardTitle></CardHeader><CardContent>
      <div className="report flex flex-wrap justify-between gap-3"><strong>{session.name || "Unnamed scout"} · this device</strong>
        <span>{session.draft ? `Scouting ${session.draft.team}` : "Available"} · {session.outbox.length} pending · never synced</span>
      </div>
    </CardContent></Card>
    <Todo title="Event coordination">Publish schedules and offline mode; show each scout's last contact and sync.</Todo>
    <Todo title="Manual assignments & QR transfer">Deliver assignments and import report batches with stable IDs.</Todo>
  </div>;
}
