// Adapted from V2's Nexus client. Refresh is explicit; collection mode blocks requests.
export type NexusStatus = {
  eventKey: string;
  dataAsOfTime?: number;
  nowQueuing: string | null;
  matches: {
    label: string;
    status?: string;
    redTeams?: string[];
    blueTeams?: string[];
    times?: { estimatedQueueTime?: number | null };
  }[];
};
export async function fetchNexus(eventKey: string, signal: AbortSignal): Promise<NexusStatus> {
  const apiKey = import.meta.env.VITE_NEXUS_API_KEY;
  if (!apiKey) throw new Error("Nexus API key is not configured.");
  const response = await fetch(`https://frc.nexus/api/v1/event/${encodeURIComponent(eventKey)}`, {
    headers: { "Nexus-Api-Key": apiKey },
    signal,
  });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "No live Nexus data for this event. It may have ended or may not use Nexus."
        : `Nexus returned ${response.status}.`,
    );
  return response.json();
}
export function formatCountdown(time: number, now: number) {
  const milliseconds = time < 10000000000 ? time * 1000 : time;
  const seconds = Math.max(0, Math.ceil((milliseconds - now) / 1000));
  return seconds ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : "Queue time reached";
}
