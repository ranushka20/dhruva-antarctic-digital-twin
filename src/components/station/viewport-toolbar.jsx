import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

/** Breadcrumb: Station › Floor › Room. Replaces the all-caps H1 + suffix. */
export function ViewportBreadcrumb({ segments }) {
  return (
    <nav aria-label="Viewport context" className="flex min-w-0 items-center gap-1">
      {segments.map((segment, i) => {
        const last = i === segments.length - 1;
        return (
          <span className="flex min-w-0 items-center gap-1" key={segment}>
            {i > 0 && (
              <ChevronRight
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground opacity-60"
              />
            )}
            <span
              aria-current={last ? "page" : undefined}
              className={cn(
                "truncate text-readout",
                last
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {segment}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Segmented control for the three view modes. Base UI's ToggleGroup gives
 * roving focus and arrow-key navigation for free.
 */
export function ViewModeSwitch({ value, onChange, options }) {
  return (
    <ToggleGroup
      aria-label="Viewport mode"
      className="shrink-0"
      onValueChange={(next) => next?.[0] && onChange(next[0])}
      size="sm"
      value={[value]}
      variant="outline"
    >
      {options.map(({ id, label, icon: Icon, hint }) => (
        <Tooltip key={id}>
          <TooltipTrigger
            render={
              <ToggleGroupItem
                aria-label={label}
                className="px-2.5"
                value={id}
              >
                <Icon />
                <span className="hidden text-xs xl:inline">{label}</span>
              </ToggleGroupItem>
            }
          />
          <TooltipPopup>{hint ?? label}</TooltipPopup>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}

/** Floating floor selector, anchored bottom-centre over the canvas. */
export function FloorSwitch({ value, onChange, options, disabled }) {
  return (
    <div className="-translate-x-1/2 absolute bottom-4 left-1/2 z-20">
      <ToggleGroup
        aria-label="Floor"
        className="rounded-lg bg-popover/92 p-0.5 shadow-lg backdrop-blur-sm"
        disabled={disabled}
        onValueChange={(next) => next?.[0] && onChange(next[0])}
        size="sm"
        value={[value]}
      >
        {options.map(({ id, label }) => (
          <ToggleGroupItem className="px-3 text-xs" key={id} value={id}>
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
