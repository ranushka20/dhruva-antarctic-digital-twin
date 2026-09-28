import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The single label style for the whole shell. Everything that used to be an
 * 8px / 0.16em uppercase string goes through here instead.
 */
export function Label({ className, ...props }) {
  return (
    <span
      className={cn(
        "font-medium text-label text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}

const TONE = {
  neutral: "bg-muted-foreground",
  online: "bg-success",
  warning: "bg-warning",
  offline: "bg-destructive",
};

export function StatusDot({ tone = "neutral", pulse = false, className }) {
  return (
    <span
      className={cn("relative inline-flex size-1.5 shrink-0", className)}
      aria-hidden="true"
    >
      {pulse && (
        <span
          className={cn(
            "absolute inset-0 animate-breathe rounded-full opacity-60",
            TONE[tone],
          )}
        />
      )}
      <span className={cn("size-1.5 rounded-full", TONE[tone])} />
    </span>
  );
}

/** Label above value, tabular figures so live numbers do not jitter. */
export function Metric({ label, value, tone, loading = false, className }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label>{label}</Label>
      {loading ? (
        <Skeleton className="h-4.5 w-14" />
      ) : (
        <span
          className={cn(
            "flex items-center gap-1.5 font-medium text-title leading-none",
            tone === "online" && "text-success-foreground",
            tone === "warning" && "text-warning-foreground",
            tone === "offline" && "text-destructive-foreground",
          )}
          data-numeric=""
        >
          {tone && <StatusDot pulse tone={tone} />}
          {value}
        </span>
      )}
    </div>
  );
}

/** Key/value row used throughout the detail panel. */
export function DataRow({ label, value, tone, loading = false, mono = false }) {
  return (
    <div className="flex min-h-7 items-baseline justify-between gap-4">
      <span className="shrink-0 text-muted-foreground text-xs">{label}</span>
      {loading ? (
        <Skeleton className="h-3.5 w-20" />
      ) : (
        <span
          className={cn(
            "flex min-w-0 items-center gap-1.5 truncate text-right font-medium text-readout",
            mono && "font-mono text-xs",
            tone === "online" && "text-success-foreground",
            tone === "warning" && "text-warning-foreground",
            tone === "offline" && "text-destructive-foreground",
          )}
          data-numeric=""
          title={typeof value === "string" ? value : undefined}
        >
          {tone && <StatusDot tone={tone} />}
          {value}
        </span>
      )}
    </div>
  );
}

/** Small section heading inside the right panel. */
export function SectionTitle({ children, action }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <Label>{children}</Label>
      {action}
    </div>
  );
}
