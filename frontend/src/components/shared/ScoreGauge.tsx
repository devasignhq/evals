import type { DimensionKey } from "../../../../shared/types";
import { scoreColor, scoreTier } from "../../utils/scores";

interface Props {
  score: number;
  dimension: DimensionKey | "overall";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const SIZES = {
  sm: { w: 64, stroke: 6, font: 14 },
  md: { w: 96, stroke: 8, font: 22 },
  lg: { w: 144, stroke: 10, font: 36 },
};

export function ScoreGauge({ score, dimension, size = "md", showLabel = true }: Props) {
  const { w, stroke, font } = SIZES[size];
  const max = dimension === "overall" ? 100 : 10;
  const pct = Math.max(0, Math.min(1, score / max));
  const r = (w - stroke) / 2;
  const cx = w / 2;
  const cy = w / 2;
  // 270deg arc, starting at 135deg
  const startAngle = 135;
  const endAngle = 405;
  const totalArc = endAngle - startAngle;
  const filledEnd = startAngle + totalArc * pct;

  const polar = (cx: number, cy: number, r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };

  const arcPath = (from: number, to: number) => {
    const [x1, y1] = polar(cx, cy, r, from);
    const [x2, y2] = polar(cx, cy, r, to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const tier = scoreTier(score, dimension);
  const color = scoreColor(tier);
  const display = dimension === "overall" ? Math.round(score) : score.toFixed(1);

  return (
    <div className="inline-flex flex-col items-center">
      <svg width={w} height={w}>
        <path
          d={arcPath(startAngle, endAngle)}
          stroke="#2e2e2e"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={arcPath(startAngle, filledEnd)}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
          />
        )}
        <text
          x={cx}
          y={cy + font / 3}
          textAnchor="middle"
          fontFamily="Ubuntu Mono, monospace"
          fontWeight={700}
          fontSize={font}
          fill={color}
        >
          {display}
        </text>
      </svg>
      {showLabel && (
        <div className="mt-1 text-xs uppercase tracking-wider text-text-secondary font-sans">
          {dimension === "overall" ? "Overall" : dimension}
        </div>
      )}
    </div>
  );
}
