import { cn } from "@/lib/utils";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { Label, StatusDot } from "./primitives";

const STATE = {
  live: {
    label: "Live",
    tone: "online",
    note: "HQ's view of the station is current.",
  },
  lagging: {
    label: "Lagging",
    tone: "warning",
    note: "HQ is behind. What you are seeing is the last state that reached the mainland, not the station now.",
  },
  dark: {
    label: "Dark",
    tone: "offline",
    note: "No contact. The station keeps operating and journalling locally; this view is a memory. Bharati went dark for five days in October 2013.",
  },
};

export function SyncIndicator({ state, label, className }) {
  const meta = STATE[state] ?? STATE.live;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "flex cursor-help items-center gap-2 rounded-md border bg-surface-raised px-2 py-1.5",
              className,
            )}
          >
            <StatusDot pulse={state === "live"} tone={meta.tone} />
            <div className="flex flex-col leading-none">
              <span
                className={cn(
                  "font-medium text-xs",
                  state === "live" && "text-success-foreground",
                  state === "lagging" && "text-warning-foreground",
                  state === "dark" && "text-destructive-foreground",
                )}
              >
                {meta.label}
              </span>
            </div>
            <span className="text-[0.6875rem] text-muted-foreground" data-numeric="">
              {label}
            </span>
          </div>
        }
      />
      <TooltipPopup className="max-w-72">
        <span className="block space-y-1 py-1">
          <span className="block font-medium">Sync {meta.label.toLowerCase()}</span>
          <span className="block text-muted-foreground">{meta.note}</span>
        </span>
      </TooltipPopup>
    </Tooltip>
  );
}

/** Shown over the viewport once the link has been down long enough to matter. */
export function StalenessBanner({ state, label }) {
  if (state === "live") return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3">
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-1.5 shadow-sm backdrop-blur-sm",
          state === "dark"
            ? "border-destructive/40 bg-destructive/10"
            : "border-warning/40 bg-warning/10",
        )}
      >
        <StatusDot tone={state === "dark" ? "offline" : "warning"} />
        <Label className="text-foreground">
          {state === "dark" ? "No contact" : "HQ behind"} · last sync {label}
        </Label>
      </div>
    </div>
  );
}
