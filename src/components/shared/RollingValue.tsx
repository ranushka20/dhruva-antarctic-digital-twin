// OWNER: Dev B
// RollingValue — renders a value so that only the characters that changed
// re-enter (a short rise + unblur), odometer-style. On first mount the whole
// value assembles left-to-right. Screen readers get the plain value.

interface RollingValueProps {
  value: string | number | null;
  fallback?: string;
  className?: string;
}

export function RollingValue({ value, fallback = '—', className = '' }: RollingValueProps) {
  const text = value === null || value === undefined ? fallback : String(value);
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {Array.from(text).map((ch, i) => (
        <span
          // Keyed on position + character: an unchanged character keeps its
          // node (no animation), a changed one remounts and animates in.
          key={i + ':' + ch}
          aria-hidden
          className="m-digit"
          style={{ animationDelay: `${Math.min(i, 8) * 22}ms`, whiteSpace: 'pre' }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
