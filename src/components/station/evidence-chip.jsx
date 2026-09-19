import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { EVIDENCE, tierFor } from "@/twin/evidence";

const BY_CLASS = Object.fromEntries(
  Object.values(EVIDENCE).map((e) => [e.id, e]),
);

const VARIANT = {
  success: "success",
  info: "info",
  warning: "warning",
  muted: "secondary",
};

/**
 * The badge carries the tier an operator reads at a glance; the tooltip
 * carries the evidence class a judge will ask about. Both, or neither —
 * a value with no provenance does not get rendered at all.
 */
export function EvidenceChip({ cls, live = false, source, className }) {
  const tier = tierFor(cls, live);
  const evidence = BY_CLASS[cls];

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            className={cn("shrink-0 cursor-help", className)}
            size="sm"
            variant={VARIANT[tier.tone] ?? "secondary"}
          >
            {tier.label}
          </Badge>
        }
      />
      <TooltipPopup className="max-w-72">
        <span className="block space-y-1.5 py-1">
          <span className="block">
            <span className="font-medium">{tier.label}</span>
            <span className="mt-0.5 block text-muted-foreground">
              {tier.description}
            </span>
          </span>
          {evidence && (
            <span className="block border-t pt-1.5">
              <span className="font-medium">
                Class {evidence.id} · {evidence.label}
              </span>
              <span className="mt-0.5 block text-muted-foreground">
                {evidence.description}
              </span>
            </span>
          )}
          {source && (
            <span className="block border-t pt-1.5 text-muted-foreground">
              {source}
            </span>
          )}
        </span>
      </TooltipPopup>
    </Tooltip>
  );
}
