// OWNER: Dev B
// ProgressBar — 4-6px trough bar. Tone is semantic, never decorative: orange
// only ever means "act on this", so a bar is orange only when the thing it
// measures needs an operator.

interface ProgressBarProps {
  value: number;
  max: number;
  tone?: 'ok' | 'watch' | 'act' | 'neutral' | 'sim';
  height?: number;
  /** Renders diagonal hatching — used for "cannot compute from stale input". */
  hatched?: boolean;
  label?: string;
  className?: string;
}

const TONE_COLOR: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  ok: 'var(--ok)',
  watch: 'var(--watch)',
  act: 'var(--act)',
  neutral: 'var(--unknown)',
  sim: 'var(--sim)',
};

export function ProgressBar({
  value, max, tone = 'ok', height = 5, hatched = false, label, className = '',
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const color = TONE_COLOR[tone];

  return (
    <div
      className={'w-full overflow-hidden ' + className}
      style={{ backgroundColor: 'var(--track)', height, borderRadius: 'var(--r-pill)' }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(safeMax)}
      aria-label={label}
    >
      <div
        style={{
          width: pct + '%',
          height: '100%',
          borderRadius: 'var(--r-pill)',
          backgroundColor: hatched ? 'transparent' : color,
          backgroundImage: hatched
            ? `repeating-linear-gradient(45deg, ${color} 0 3px, transparent 3px 6px)`
            : undefined,
          transition: 'width 220ms ease',
        }}
      />
    </div>
  );
}
