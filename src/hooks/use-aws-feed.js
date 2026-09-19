import { useEffect, useState } from "react";

/**
 * The Bharati AWS feed, as far as it can honestly be taken.
 *
 * The data is real, public and unauthenticated. What it is NOT is current:
 * the endpoint caps at 100,000 rows with no pagination parameter, so a call
 * for this year returns 1 January onwards and stops roughly 77 days later.
 * Everything after that is structurally unreachable by this route.
 *
 * So this hook reports `reachedTo` — the newest record the feed can give —
 * and leaves it to the UI to be honest about the gap. A twin that printed
 * these values under a green "live" light would be the exact failure this
 * project exists to avoid.
 */
export function useAwsFeed() {
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/aws/bharati");
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error", data: null, error: body.error ?? "unreachable" });
          return;
        }
        setState({ status: "ready", data: body, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({ status: "error", data: null, error: String(error.message ?? error) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** Days between the newest reachable record and now. */
export function reachGapDays(coverageTo, now = Date.now()) {
  if (!coverageTo) return null;
  return Math.floor((now - new Date(coverageTo).getTime()) / 86400000);
}
