import { Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Metric } from "./primitives";

function FlagMark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-7 shrink-0 flex-col justify-center gap-[3px] rounded-[5px] border border-border bg-surface-raised p-1.5"
    >
      <span className="h-[2.5px] rounded-full bg-[#ef7835]" />
      <span className="h-[2.5px] rounded-full bg-border" />
      <span className="h-[2.5px] rounded-full bg-[#138808]" />
    </span>
  );
}

export function StationHeader({ clock, environment, loading, theme, onToggleTheme }) {
  return (
    <header className="z-40 flex h-14 shrink-0 items-center gap-4 border-b bg-surface px-4">
      <div className="flex shrink-0 items-center gap-2.5">
        <FlagMark />
        <div className="flex flex-col leading-none">
          <span className="font-semibold text-foreground text-sm tracking-tight">
            Bharati
          </span>
          <span className="mt-1 text-[0.6875rem] text-muted-foreground">
            Antarctic Research Station
          </span>
        </div>
      </div>

      <Separator className="h-7" orientation="vertical" />

      {/* Environment strip. Hidden on narrow viewports rather than
          compressed into unreadable type. The AWS feed is not wired up, so
          the strip says so instead of passing demo values off as readings. */}
      <div className="hidden min-w-0 flex-1 items-center gap-6 lg:flex">
        {environment.map((m) => (
          <Metric key={m.label} label={m.label} loading={loading} value={m.value} />
        ))}
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge className="cursor-help self-end" variant="warning">
                Not live
              </Badge>
            }
          />
          <TooltipPopup className="max-w-64">
            <span className="block py-0.5 text-muted-foreground">
              Demo values, taken from the medians measured in the real Bharati
              AWS export. The live feed is not connected yet.
            </span>
          </TooltipPopup>
        </Tooltip>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <div className="hidden flex-col items-end leading-none sm:flex">
          <span className="text-[0.6875rem] text-muted-foreground">
            {clock.date}
          </span>
          <span
            className="mt-1 font-medium text-foreground text-readout"
            data-numeric=""
          >
            {clock.time}{" "}
            <span className="font-normal text-muted-foreground text-xs">IST</span>
          </span>
        </div>

        <Separator className="h-7" orientation="vertical" />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                onClick={onToggleTheme}
                size="icon-sm"
                variant="ghost"
              >
                {theme === "dark" ? <Sun /> : <Moon />}
              </Button>
            }
          />
          <TooltipPopup>
            {theme === "dark" ? "Light theme" : "Dark theme"}
          </TooltipPopup>
        </Tooltip>
      </div>
    </header>
  );
}
