import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { EVIDENCE } from "@/twin/evidence";

const BY_ID = Object.fromEntries(
  Object.values(EVIDENCE).map((e) => [e.id, e]),
);

const VARIANT = {
  success: "success",
  info: "info",
  warning: "warning",
  muted: "secondary",
};

/**
 * Every displayed value carries one of these. The chip is the contract:
 * if a field cannot name its provenance, it does not get rendered.
 */
export function EvidenceChip({ cls, className }) {
  const meta = BY_ID[cls];
  if (!meta) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            className={cn("shrink-0 font-mono text-[0.625rem]", className)}
            size="sm"
            variant={VARIANT[meta.tone] ?? "secondary"}
          >
            {meta.id}
          </Badge>
        }
      />
      <TooltipPopup className="max-w-64">
        <span className="block py-0.5">
          <span className="font-medium">{meta.label}</span>
          <span className="mt-0.5 block text-muted-foreground">
            {meta.description}
          </span>
        </span>
      </TooltipPopup>
    </Tooltip>
  );
}
