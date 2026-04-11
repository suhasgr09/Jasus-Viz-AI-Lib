// ── Analytics / Event Logging ───────────────────────────────────────────────
// All events are stored in localStorage so the Usage Report page can read them
// without requiring any backend.

export type EventType = 'page_view' | 'ai_analysis' | 'file_upload' | 'button_click';

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  /** Human-readable label, e.g. "📊 Bar Chart", "Gemini Analysis" */
  label: string;
  /** Top-level section grouping, e.g. "Charts", "AI Providers", "Upload" */
  section: string;
  timestamp: number;
  metadata?: Record<string, string | number | boolean>;
}

const STORAGE_KEY = 'jasus_analytics_events';
const MAX_EVENTS = 2000;

/** Append a new event.  Trims oldest entries when the cap is reached. */
export function logEvent(
  type: EventType,
  label: string,
  section: string,
  metadata?: Record<string, string | number | boolean>,
): void {
  const events = getEvents();
  events.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label,
    section,
    timestamp: Date.now(),
    metadata,
  });
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // localStorage quota exceeded — silently ignore
  }
}

export function getEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AnalyticsEvent[];
  } catch {
    return [];
  }
}

export function clearEvents(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Returns a map of label → count, sorted descending by count */
export function countByLabel(events: AnalyticsEvent[]): Array<{ label: string; count: number }> {
  const map: Record<string, number> = {};
  for (const e of events) {
    map[e.label] = (map[e.label] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** Returns a map of section → count */
export function countBySection(events: AnalyticsEvent[]): Array<{ section: string; count: number }> {
  const map: Record<string, number> = {};
  for (const e of events) {
    map[e.section] = (map[e.section] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([section, count]) => ({ section, count }))
    .sort((a, b) => b.count - a.count);
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}
