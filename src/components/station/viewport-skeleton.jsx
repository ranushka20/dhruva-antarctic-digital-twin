import { PixelLoader } from "@/components/shared/Loading";

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
      <PixelLoader label="Initialising viewport" />
    </div>
  );
}
