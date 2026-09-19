import { useEffect, useState } from "react";

/**
 * Link state as HQ experiences it.
 *
 * The thresholds are a demo shape, not a documented SLA — no public source
 * gives Bharati's link uptime or latency at any date. What IS documented is
 * that the link can go fully dark for days: 7-12 October 2013, five days,
 * administrative cause (the Station Leader cut power to the NRSC-run ground
 * station during a personnel dispute). That event is why this exists.
 */
const LAGGING_AFTER_MS = 2 * 60 * 60 * 1000; // 2 h
const DARK_AFTER_MS = 12 * 60 * 60 * 1000; // 12 h

export function classifySync(ageMs) {
  if (ageMs >= DARK_AFTER_MS) return "dark";
  if (ageMs >= LAGGING_AFTER_MS) return "lagging";
  return "live";
}

/** 0 = fresh, 1 = fully dark. Drives how uncertain the twin looks. */
export function stalenessOf(ageMs) {
  return Math.min(1, Math.max(0, ageMs / DARK_AFTER_MS));
}

function formatAge(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h ago`;
}

export function useSyncState(lastSyncAt) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const ageMs = Math.max(0, now - lastSyncAt);

  return {
    ageMs,
    state: classifySync(ageMs),
    staleness: stalenessOf(ageMs),
    label: formatAge(ageMs),
  };
}
