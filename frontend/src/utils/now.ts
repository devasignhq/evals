// Stable "now" reference. In mock-data mode, every consumer of "current time"
// — mock data generation, date-range filters, heatmap day list, relative time —
// uses this fixed timestamp so the dataset is identical across sessions and
// devices. In live mode, it falls through to Date.now().

const MOCK_NOW_ISO = "2026-04-29T12:00:00.000Z";
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === "true";
const MOCK_NOW_MS = new Date(MOCK_NOW_ISO).getTime();

export function now(): number {
  return USE_MOCK ? MOCK_NOW_MS : Date.now();
}
