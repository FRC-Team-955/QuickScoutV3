import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Todo from "@/components/Todo";
import { teamStats, type Session } from "@/lib/model";

export default function Analytics({ session }: { session: Session }) {
  const stats = teamStats(session.reports);
  return <div className="space-y-5">
    <div><h2>Team analytics</h2><p className="text-muted-foreground">Reports on this device only · fuel counts, not total game points</p></div>
    <div className="grid gap-3 sm:grid-cols-3">{(["objective", "subjective", "pit"] as const).map(mode =>
      <Card key={mode}><CardHeader><p className="eyebrow">{mode} reports</p>
        <CardTitle>{session.reports.filter(report => report.mode === mode).length}</CardTitle></CardHeader></Card>)}</div>
    <Card><CardHeader><CardTitle>Average fuel by team</CardTitle></CardHeader><CardContent>
      {stats.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats}>
        <CartesianGrid stroke="#334155" vertical={false} /><XAxis dataKey="team" /><YAxis />
        <Tooltip contentStyle={{ background: "#111827", borderColor: "#334155" }} />
        <Bar dataKey="auto" name="Auto fuel" stackId="fuel" fill="#38bdf8" />
        <Bar dataKey="teleop" name="Teleop fuel" stackId="fuel" fill="#fb7185" />
      </BarChart></ResponsiveContainer></div> : <p className="empty">Save an objective report to see team averages.</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Saved reports</CardTitle></CardHeader><CardContent>
      {session.reports.length ? <div className="space-y-3">{[...session.reports].reverse().map(report => <details key={report.id} className="report">
        <summary>Team {report.team} · {report.mode} · {report.scoutName}<span className="text-muted-foreground"> · Saved locally</span></summary>
        <dl className="mt-3 grid gap-2">{Object.entries(report.values).map(([key, value]) =>
          <div key={key} className="flex flex-wrap justify-between gap-2"><dt>{key}</dt><dd className="whitespace-pre-wrap">{value}</dd></div>)}</dl>
      </details>)}</div> : <p className="empty">No reports yet.</p>}
    </CardContent></Card>
    <Todo title="Shared analytics">Download event reports, flag overlapping coverage, and add V2's OPR and scout leaderboard.</Todo>
  </div>;
}
