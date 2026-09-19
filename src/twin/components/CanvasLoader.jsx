import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Asset-load progress for the scene. A DOM overlay rather than a drei <Html>
 * loader: it renders before the WebGL context is warm and stays out of the
 * render loop. Fades itself out so a stalled loader can never hide the scene.
 */
export default function CanvasLoader({ label = "Loading station geometry" }) {
  const { active, progress } = useProgress();
  const [visible, setVisible] = useState(true);
  const [wasActive, setWasActive] = useState(active);

  // Re-show synchronously when a new load starts, so a floor switch never
  // flashes an empty viewport before the overlay catches up.
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setVisible(true);
  }

  useEffect(() => {
    if (active) return;
    const id = setTimeout(() => setVisible(false), 320);
    return () => clearTimeout(id);
  }, [active]);

  if (!visible) return null;

  const pct = Math.min(100, Math.round(progress));

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "absolute inset-0 z-30 flex items-center justify-center bg-viewport transition-opacity duration-300",
        active ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="flex w-52 flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground text-xs">{label}</span>
          <span className="font-medium text-foreground text-xs" data-numeric="">
            {pct}%
          </span>
        </div>
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-input">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
