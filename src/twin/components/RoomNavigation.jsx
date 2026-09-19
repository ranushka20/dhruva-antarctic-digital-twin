import { ChevronLeft, ChevronRight, CornerUpLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataRow } from "@/components/station/primitives";

function StepButton({ room, direction, onSelect }) {
  if (!room) return null;
  const isPrev = direction === "prev";

  return (
    <Button
      className="max-w-48 justify-start gap-2"
      onClick={() => onSelect(room)}
      variant="outline"
    >
      {isPrev && <ChevronLeft />}
      <span className="flex min-w-0 flex-col items-start leading-none">
        <span className="text-[0.625rem] text-muted-foreground">
          {isPrev ? "Previous" : "Next"}
        </span>
        <span className="mt-0.5 max-w-36 truncate text-xs">{room.name}</span>
      </span>
      {!isPrev && <ChevronRight />}
    </Button>
  );
}

/**
 * Interior HUD. Lives over the canvas, so it stays visually quiet: one
 * translucent surface per cluster, no glow, no competing accents.
 */
export default function RoomNavigation({
  activeRoom,
  floorRooms = [],
  onSelectRoom,
  onExitRoom,
}) {
  if (!activeRoom) return null;

  const facts = activeRoom.facts ?? [];
  const verified = facts.filter((f) => f.value != null).length;
  const boundaries = facts.length - verified;

  const index = floorRooms.findIndex((r) => r.id === activeRoom.id);
  const prevRoom =
    index > 0 ? floorRooms[index - 1] : floorRooms[floorRooms.length - 1];
  const nextRoom =
    index < floorRooms.length - 1 ? floorRooms[index + 1] : floorRooms[0];

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4">
      {/* The toolbar breadcrumb already names station, floor and room, so the
          only thing this row owes the viewer is the way out. */}
      <div className="pointer-events-auto flex items-center justify-end">
        <Button
          className="bg-popover/92 backdrop-blur-sm"
          onClick={onExitRoom}
          variant="outline"
        >
          <CornerUpLeft />
          Exit to floor
        </Button>
      </div>

      {/* Room stepper + local telemetry */}
      <div className="pointer-events-auto flex items-end justify-between gap-3">
        <StepButton direction="prev" onSelect={onSelectRoom} room={prevRoom} />

        {/* No telemetry pill here: the station publishes no per-room feed.
            What this space can honestly show is how well evidenced the room
            you are standing in actually is. */}
        <div className="flex min-w-52 flex-col gap-1 rounded-lg border bg-popover/92 px-3 py-2 shadow-sm backdrop-blur-sm">
          <DataRow label="Category" value={activeRoom.category} />
          <DataRow label="Sourced facts" value={verified} />
          <DataRow label="Missing feeds" value={boundaries} />
        </div>

        <StepButton direction="next" onSelect={onSelectRoom} room={nextRoom} />
      </div>
    </div>
  );
}
