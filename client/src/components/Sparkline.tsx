/**
 * Sparkline — minimal inline SVG trend chart for analytics widgets.
 * No external chart lib. Renders a polyline + an area fill, color-coded
 * by trend direction (positive vs negative delta).
 */
interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
  positiveColor?: string;   // default: emerald
  negativeColor?: string;   // default: red
  neutralColor?: string;    // default: muted-foreground
  showArea?: boolean;       // default true
}

export default function Sparkline({
  values,
  width = 100,
  height = 32,
  strokeWidth = 1.5,
  className,
  positiveColor = '#10b981',
  negativeColor = '#ef4444',
  neutralColor = '#71717a',
  showArea = true,
}: SparklineProps) {
  if (!values || values.length < 2) {
    return (
      <div
        className={className}
        style={{ width, height }}
        aria-label="no data"
      />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const dx = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * dx;
    const y = height - ((v - min) / range) * height;
    return [x, y] as const;
  });

  const polyline = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const areaPath =
    `M0,${height} ` +
    points.map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(' ') +
    ` L${width},${height} Z`;

  const trend = values[values.length - 1] - values[0];
  const stroke = trend > 0 ? positiveColor : trend < 0 ? negativeColor : neutralColor;
  const fill = trend > 0 ? positiveColor : trend < 0 ? negativeColor : neutralColor;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width={width}
      height={height}
      className={className}
      aria-label={`sparkline trend ${trend >= 0 ? 'up' : 'down'}`}
    >
      {showArea && (
        <path d={areaPath} fill={fill} fillOpacity={0.12} stroke="none" />
      )}
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyline}
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={1.5}
        fill={stroke}
      />
    </svg>
  );
}
