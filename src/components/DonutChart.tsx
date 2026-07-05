export interface DonutSegment {
  label: string;
  value: number;
  color: string; // hex
}

/** Lightweight SVG donut. Renders nothing meaningful when total is 0. */
export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 160,
  thickness = 22,
}: {
  segments: DonutSegment[];
  centerValue: string | number;
  centerLabel: string;
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const fraction = total > 0 ? s.value / total : 0;
      const dash = fraction * circumference;
      const arc = {
        color: s.color,
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: -offset,
        label: s.label,
      };
      offset += dash;
      return arc;
    });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${centerLabel}: ${centerValue}`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={thickness}
      />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={arc.color}
          strokeWidth={thickness}
          strokeDasharray={arc.dashArray}
          strokeDashoffset={arc.dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ))}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        className="fill-foreground text-2xl font-bold"
      >
        {centerValue}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px] uppercase tracking-wide"
      >
        {centerLabel}
      </text>
    </svg>
  );
}
