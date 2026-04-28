interface Props {
  coverage: number;
  touched: number;
  total: number;
}

export function CoverageGauge({ coverage, touched, total }: Props) {
  const w = 160;
  const stroke = 12;
  const r = (w - stroke) / 2;
  const cx = w / 2;
  const cy = w / 2;
  const startAngle = 135;
  const endAngle = 405;
  const arc = endAngle - startAngle;
  const filledEnd = startAngle + arc * (coverage / 100);

  const polar = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const path = (from: number, to: number) => {
    const [x1, y1] = polar(from);
    const [x2, y2] = polar(to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const color = coverage >= 80 ? "#22c55e" : coverage >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex items-center gap-6 rounded-lg border border-border bg-surface p-5">
      <svg width={w} height={w}>
        <path d={path(startAngle, endAngle)} stroke="#2e2e2e" strokeWidth={stroke} fill="none" strokeLinecap="round" />
        {coverage > 0 && (
          <path d={path(startAngle, filledEnd)} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        )}
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontFamily="Ubuntu Mono, monospace"
          fontWeight={700}
          fontSize={32}
          fill={color}
        >
          {coverage}%
        </text>
        <text
          x={cx}
          y={cy + 26}
          textAnchor="middle"
          fontFamily="Ubuntu, sans-serif"
          fontSize={11}
          fill="#a3a3a3"
        >
          coverage
        </text>
      </svg>
      <div>
        <div className="text-sm font-medium">Hotspot Coverage</div>
        <div className="mt-1 text-xs text-text-secondary">
          Last 30 days · {touched} of {total} hotspots covered
        </div>
      </div>
    </div>
  );
}
