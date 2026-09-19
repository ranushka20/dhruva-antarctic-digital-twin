/**
 * Shown while the 3D chunk itself is still downloading. Deliberately free of
 * any three.js/drei import — pulling those in here would defeat the split.
 */
export function ViewportSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="absolute inset-0 z-20 grid place-items-center bg-viewport"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="size-7 animate-spin rounded-full border-2 border-input border-t-primary" />
        <span className="text-muted-foreground text-xs">
          Initialising viewport
        </span>
      </div>
    </div>
  );
}
