import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import type { Draft } from "@/lib/model";

type Field = { key: string; label: string; options?: string[]; count?: boolean };
const fields: Record<Draft["mode"], Field[]> = {
  objective: [
    { key: "autoFuel", label: "Autonomous fuel", count: true },
    { key: "autoClimb", label: "Auto climb", options: ["No", "Yes"] },
    { key: "teleopFuel", label: "Teleop fuel", count: true },
    { key: "climb", label: "Teleop climb", options: ["None", "L1", "L2", "L3"] },
    { key: "defense", label: "Defense", options: ["None", "Poor", "Fair", "Good", "Excellent"] },
    { key: "shootingOnMove", label: "Shooting on the move", options: ["No", "Yes"] },
    { key: "tipped", label: "Robot tipped", options: ["No", "Yes"] },
  ],
  subjective: [
    { key: "auto", label: "Autonomous effectiveness" },
    { key: "cycle", label: "Fuel per cycle / estimated BPS" },
    { key: "strategy", label: "Scoring, passing, and defense" },
    { key: "cooperation", label: "Alliance cooperation" },
    { key: "reliability", label: "Reliability and penalties" },
    { key: "strengths", label: "Strengths" },
    { key: "weaknesses", label: "Weaknesses" },
  ],
  pit: [
    { key: "climb", label: "Climb capability", options: ["None", "L1", "L2", "L3"] },
    { key: "shooter", label: "Shooter type / BPS" },
    { key: "hopper", label: "Approximate fuel capacity" },
    { key: "mobility", label: "Trench and bump capability" },
    { key: "autos", label: "Autos and starting locations" },
    { key: "strengths", label: "Strengths" },
    { key: "weaknesses", label: "Weaknesses" },
  ],
};

export default function ReportForm({ draft, update }: {
  draft: Draft;
  update: (key: string, value: string | number | ((current: number) => number)) => void;
}) {
  return <div className="space-y-6">
    {fields[draft.mode].map(field => <div key={field.key} className="space-y-2">
      <Label htmlFor={field.key}>{field.label}</Label>
      {field.count ? <div className="flex flex-wrap items-center gap-2">
        <Input id={field.key} className="w-24 text-xl font-mono" type="number" min={0}
          value={draft.values[field.key] ?? 0}
          onChange={event => update(field.key, Math.max(0, Number(event.target.value)))} />
        {[-1, 1, 3, 5, 10].map(amount => <Button key={amount} variant="outline" type="button"
          aria-label={`${field.label} ${amount > 0 ? "plus" : "minus"} ${Math.abs(amount)}`}
          onClick={() => update(field.key, current => Math.max(0, current + amount))}>
          {amount > 0 ? "+" : ""}{amount}
        </Button>)}
      </div> : field.options ? <select id={field.key} className="field"
        value={draft.values[field.key] ?? ""} onChange={event => update(field.key, event.target.value)}>
        <option value="">Choose…</option>
        {field.options.map(option => <option key={option}>{option}</option>)}
      </select> : <Input id={field.key} defaultValue={draft.values[field.key] ?? ""}
        onChange={event => update(field.key, event.target.value)} />}
    </div>)}
    <div className="space-y-2"><Label htmlFor="notes">Notes</Label>
      <Textarea id="notes" placeholder="Anything else worth knowing?" defaultValue={draft.values.notes ?? ""}
        onChange={event => update("notes", event.target.value)} />
    </div>
  </div>;
}
