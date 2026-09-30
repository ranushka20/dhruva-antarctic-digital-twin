import { CloudOff, PlugZap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FEED_COVERAGE } from "@/twin/stationData";
import { Label } from "./primitives";

function LocationCard() {
  return (
    <div className="mt-auto overflow-hidden rounded-lg border bg-surface-raised">
      <div aria-hidden="true" className="relative h-20 overflow-hidden">
        {/* Grid lines, ice-sheet outline, station pin — three flat layers
            rather than one gradient, so it stays legible in both themes. */}
        <div className="absolute inset-0 opacity-50 [background:repeating-linear-gradient(28deg,transparent_0_13px,var(--color-border)_13px_14px)]" />
        <div className="absolute inset-x-1/4 inset-y-1/4 rounded-full bg-primary/10 blur-xl" />
        <div className="absolute inset-x-6 inset-y-3.5 rounded-[55%_40%_50%_38%] border border-border" />
        <span className="absolute top-[42%] left-[57%] size-1.5 rounded-full bg-primary ring-4 ring-primary/20" />
      </div>
      <div className="flex flex-col gap-1 border-t px-3 py-2.5">
        <span className="font-medium text-foreground text-xs">
          Larsemann Hills
        </span>
        <span className="text-muted-foreground text-caption" data-numeric="">
          69.41° S, 76.11° E
        </span>
      </div>
    </div>
  );
}

export function StationSidebar({
  items,
  activeId,
  onSelect,
  syncState = "live",
  onSimulateOutage,
  onRestoreLink,
}) {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1 border-r bg-surface p-3">
      <Label className="px-2 pt-1 pb-2">Station systems</Label>

      <nav className="flex flex-col gap-0.5">
        {items.map(({ id, label, icon: Icon, badge, disabled }) => {
          const active = activeId === id;
          return (
            <button
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left text-readout outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                active
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                disabled && "cursor-not-allowed opacity-45 hover:bg-transparent",
              )}
              disabled={disabled}
              key={id}
              onClick={() => onSelect(id)}
              type="button"
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                />
              )}
              <Icon className="size-4 shrink-0 opacity-80" />
              <span className="truncate">{label}</span>
              {badge != null && (
                <Badge className="ml-auto" size="sm" variant="warning">
                  {badge}
                </Badge>
              )}
              {disabled && (
                <span className="ml-auto text-caption text-muted-foreground">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <LocationCard />

      {/* "Telemetry: Live" was a claim the station cannot support. One feed
          exists and it is the weather station. */}
      <div className="mt-2.5 flex flex-col gap-1.5 border-t pt-2.5">
        <div className="flex items-center justify-between px-2">
          <span className="text-caption text-muted-foreground">Connected</span>
          <span className="text-caption text-muted-foreground" data-numeric="">
            {FEED_COVERAGE.live} of {FEED_COVERAGE.total}
          </span>
        </div>
        <div className="flex items-center justify-between px-2">
          <span className="text-caption text-muted-foreground">
            Integration boundaries
          </span>
          <span className="text-caption text-muted-foreground" data-numeric="">
            {FEED_COVERAGE.boundaries}
          </span>
        </div>

        {/* The outage scenario. Replays the shape of a documented event
            rather than an invented one: Bharati lost its satellite link for
            five days in October 2013. */}
        <Button
          className="mt-1.5 w-full"
          onClick={syncState === "live" ? onSimulateOutage : onRestoreLink}
          size="sm"
          variant="outline"
        >
          {syncState === "live" ? (
            <>
              <CloudOff />
              Simulate outage
            </>
          ) : (
            <>
              <PlugZap />
              Restore link
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
