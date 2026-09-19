import { Html } from "@react-three/drei";
import { cn } from "@/lib/utils";

/**
 * Floating room marker. Kept to a single small DOM node per room — these live
 * inside the render loop, so anything heavier shows up as dropped frames.
 */
export default function RoomLabel({ room, selected, onSelect }) {
  if (!room) return null;

  return (
    <Html
      center
      distanceFactor={12}
      position={[room.x, 2.55, room.z]}
      zIndexRange={[10, 50]}
    >
      <button
        className={cn(
          "flex cursor-pointer select-none flex-col items-start gap-0.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-left",
          "bg-popover/92 backdrop-blur-[2px] transition-colors duration-150",
          selected
            ? "border-primary/70 ring-1 ring-primary/30"
            : "border-border hover:border-primary/40",
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(room);
        }}
        type="button"
      >
        <span className="flex items-center gap-1.5 font-medium text-[13px] text-popover-foreground leading-none">
          <span
            className={cn(
              "size-1.5 rounded-full",
              selected ? "bg-primary" : "bg-success",
            )}
          />
          {room.name}
        </span>
        <span className="text-[11px] text-muted-foreground leading-none">
          {room.category || room.type}
        </span>
      </button>
    </Html>
  );
}
