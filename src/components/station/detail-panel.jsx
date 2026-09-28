import { MousePointerClick, Radio, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PROVENANCE } from "@/twin/evidence";
import { FactList } from "./fact-list";
import { Label, SectionTitle, StatusDot } from "./primitives";

const TIER_VARIANT = {
  success: "success",
  info: "info",
  warning: "warning",
  muted: "secondary",
};

function PanelShell({ children }) {
  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l bg-surface">
      {children}
    </aside>
  );
}

function PanelHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3.5">
      <Label>{eyebrow}</Label>
      <h2 className="font-semibold text-foreground text-lg leading-tight tracking-tight">
        {title}
      </h2>
      {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
    </div>
  );
}

export function DetailPanelSkeleton() {
  return (
    <PanelShell>
      <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Separator />
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="flex flex-col gap-1.5" key={i}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function StationOverview({ onEnterControlRoom }) {
  return (
    <>
      <PanelHeader
        eyebrow="Station"
        subtitle="Larsemann Hills · 69°24.25′S 76°11.42′E"
        title="Bharati"
      />
      <Separator />

      <div className="flex flex-col gap-5 p-4">
        <div>
          <SectionTitle>What this twin shows</SectionTitle>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Every figure carries an evidence class. One feed is live — the
            Bharati automatic weather station. Everything else is documented
            but not streamed, and the twin says so rather than inventing a
            number.
          </p>
        </div>

        <div>
          <SectionTitle>Live feed</SectionTitle>
          <div className="flex items-start gap-2 rounded-lg border bg-surface-raised p-3">
            <Radio className="mt-0.5 size-4 shrink-0 text-success-foreground" />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                Bharati AWS
                <StatusDot pulse tone="online" />
              </span>
              <span className="text-caption text-muted-foreground leading-relaxed">
                IMD-owned, served by NCPOR. 1-minute temperature, pressure,
                wind and humidity. No authentication, 100,000-row cap, −999.0
                sentinel.
              </span>
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>Not connected</SectionTitle>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Generator telemetry, fuel burn and levels, water and waste
            metering, spare-part stock, crew rosters and link statistics all
            exist as station operations and none are published. That gap is
            the problem this platform exists to close.
          </p>
        </div>

        <div>
          <SectionTitle>Reading the badges</SectionTitle>
          <div className="flex flex-col gap-2">
            {[
              PROVENANCE.LIVE,
              PROVENANCE.MODELED,
              PROVENANCE.SYNTHETIC,
              PROVENANCE.BOUNDARY,
            ].map((tier) => (
              <div className="flex items-start gap-2.5" key={tier.id}>
                <Badge
                  className="mt-px shrink-0"
                  size="sm"
                  variant={TIER_VARIANT[tier.tone]}
                >
                  {tier.label}
                </Badge>
                <span className="text-caption text-muted-foreground leading-relaxed">
                  {tier.description}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-caption text-muted-foreground leading-relaxed">
            Hover any badge for the underlying evidence class and its source.
          </p>
        </div>

        <Button className="w-full" onClick={onEnterControlRoom} variant="outline">
          Open control room
        </Button>
      </div>

      <div className="mt-auto flex items-center justify-between border-t px-4 py-3">
        <Label>Evidence base</Label>
        <span className="text-muted-foreground text-xs">
          SIH PS 26060 dossier
        </span>
      </div>
    </>
  );
}

const ZONE_TONE = {
  ok: { label: "Nominal", variant: "success" },
  watch: { label: "Watch", variant: "warning" },
  risk: { label: "At risk", variant: "error" },
  unknown: { label: "Unknown", variant: "secondary" },
};

function ZoneStatusRow({ zone, detail }) {
  const tone = ZONE_TONE[detail?.value ?? "unknown"] ?? ZONE_TONE.unknown;

  return (
    <div className="flex flex-col gap-2 border-b px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <Label>{zone} zone</Label>
        <Badge size="sm" variant={tone.variant}>
          {tone.label}
        </Badge>
      </div>
      {detail?.note && (
        <p className="text-caption text-muted-foreground leading-relaxed">
          {detail.note}
        </p>
      )}
    </div>
  );
}

function ModuleView({ asset, onClear, zoneDetail }) {
  return (
    <>
      <PanelHeader
        eyebrow={asset.floorId === "exterior" ? "Selected asset" : "Selected room"}
        subtitle={`${asset.category} · ${asset.floor}`}
        title={asset.name}
      />

      {asset.live && (
        <div className="px-4 pb-4">
          <Badge variant="success">
            <StatusDot pulse tone="online" />
            Live feed
          </Badge>
        </div>
      )}

      {asset.zone && (
        <ZoneStatusRow detail={zoneDetail?.[asset.zone]} zone={asset.zone} />
      )}

      {asset.summary && (
        <>
          <p className="px-4 py-3.5 text-muted-foreground text-xs leading-relaxed">
            {asset.summary}
          </p>
        </>
      )}

      <Separator />

      <div className="p-4">
        <SectionTitle>Evidence</SectionTitle>
        <FactList facts={asset.facts} />

        <div className="mt-5">
          <Button className="w-full" onClick={onClear} variant="ghost">
            <X />
            Clear selection
          </Button>
        </div>
      </div>
    </>
  );
}

export function DetailPanel({
  asset,
  onClear,
  onEnterControlRoom,
  zoneDetail,
  emptyOnExterior = false,
}) {
  if (asset) {
    return (
      <PanelShell>
        <ModuleView asset={asset} onClear={onClear} zoneDetail={zoneDetail} />
      </PanelShell>
    );
  }

  if (emptyOnExterior) {
    return (
      <PanelShell>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MousePointerClick />
            </EmptyMedia>
            <EmptyTitle>Nothing selected</EmptyTitle>
            <EmptyDescription>
              Click any module in the viewport to see what the evidence base
              actually supports for it.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <StationOverview onEnterControlRoom={onEnterControlRoom} />
    </PanelShell>
  );
}
