import { PlugZap } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenceChip } from "./evidence-chip";
import { Label } from "./primitives";

function FactRow({ fact }) {
  return (
    <div className="flex flex-col gap-1 py-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-muted-foreground text-xs leading-snug">
          {fact.label}
        </span>
        <EvidenceChip cls={fact.cls} live={fact.live} source={fact.source} />
      </div>
      <span
        className={cn(
          "text-readout leading-snug",
          fact.cls === "S" ? "text-warning-foreground" : "text-foreground",
        )}
        data-numeric=""
      >
        {fact.value}
      </span>
      {fact.note && (
        <span className="text-[0.6875rem] text-muted-foreground leading-snug">
          {fact.note}
        </span>
      )}
    </div>
  );
}

/**
 * A documented capability with no feed behind it. Rendered deliberately —
 * naming the gap is the point of the project, so these are not hidden.
 */
function BoundaryRow({ fact }) {
  return (
    <div className="flex items-start gap-2 py-2">
      <PlugZap className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-70" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-muted-foreground text-xs leading-snug line-through decoration-muted-foreground/40">
          {fact.label}
        </span>
        {fact.source && (
          <span className="text-[0.6875rem] text-muted-foreground leading-snug">
            {fact.source}
          </span>
        )}
      </div>
    </div>
  );
}

export function FactList({ facts = [] }) {
  const known = facts.filter((f) => f.value != null);
  const boundaries = facts.filter((f) => f.value == null);

  if (!known.length && !boundaries.length) {
    return (
      <p className="text-muted-foreground text-xs leading-relaxed">
        No sourced facts. The dossier is silent on this space, so the twin
        attaches nothing to it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {known.length > 0 && (
        <div className="divide-y divide-border">
          {known.map((f) => (
            <FactRow fact={f} key={f.label} />
          ))}
        </div>
      )}

      {boundaries.length > 0 && (
        <div>
          <Label className="mb-1 block">Not connected</Label>
          <p className="mb-1 text-[0.6875rem] text-muted-foreground leading-relaxed">
            Real, documented, and carrying no public feed. Each is an
            integration boundary this platform would close.
          </p>
          <div className="divide-y divide-border">
            {boundaries.map((f) => (
              <BoundaryRow fact={f} key={f.label} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
