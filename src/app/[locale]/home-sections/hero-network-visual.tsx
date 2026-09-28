const SLOTS = [
  { id: "top-left", cx: 155, cy: 70, side: "top" },
  { id: "top-right", cx: 465, cy: 70, side: "top" },
  { id: "bottom-left", cx: 155, cy: 460, side: "bottom" },
  { id: "bottom-right", cx: 465, cy: 460, side: "bottom" },
  { id: "mid-right", cx: 505, cy: 265, side: "right" },
  { id: "mid-left", cx: 115, cy: 265, side: "left" },
] as const;

const SIDE_GAP = 90;

const FONT_SIZE = 12.5;
const CHAR_WIDTH = 7.3;
const BADGE_PADDING = 36;
const LINE_HEIGHT = 14;
const MAX_LINE_CHARS = 24;
const MAX_LINE_CHARS_SIDE = 12;

function wrapLabel(label: string, maxChars: number): string[] {
  if (label.length <= maxChars) return [label];
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function toNode(label: string, slot: (typeof SLOTS)[number]) {
  const isSide = slot.side === "left" || slot.side === "right";
  const lines = wrapLabel(label, isSide ? MAX_LINE_CHARS_SIDE : MAX_LINE_CHARS);
  const longest = Math.max(...lines.map((line) => line.length));
  const w = Math.round(longest * CHAR_WIDTH) + BADGE_PADDING;

  const cx =
    slot.side === "left"
      ? CENTER.cx - CENTER.w / 2 - SIDE_GAP - w / 2
      : slot.side === "right"
        ? CENTER.cx + CENTER.w / 2 + SIDE_GAP + w / 2
        : slot.cx;

  return {
    id: slot.id,
    side: slot.side,
    lines,
    cx,
    cy: slot.cy,
    w,
    h: lines.length > 1 ? 48 : 34,
  };
}

const CENTER = { cx: 310, cy: 265, w: 176, h: 40 };

const ELBOW_Y: Record<"top-left" | "top-right" | "bottom-left" | "bottom-right", number> = {
  "top-left": 150,
  "top-right": 160,
  "bottom-left": 380,
  "bottom-right": 370,
};

function connectorPath(node: Node): string {
  if (node.side === "left" || node.side === "right") {
    const fromX =
      node.side === "left" ? node.cx + node.w / 2 : node.cx - node.w / 2;
    const toX =
      node.side === "left" ? CENTER.cx - CENTER.w / 2 : CENTER.cx + CENTER.w / 2;
    return `M${fromX},${node.cy} L${toX},${node.cy}`;
  }

  const elbowY = ELBOW_Y[node.id as keyof typeof ELBOW_Y];
  const fromY =
    node.side === "top" ? node.cy + node.h / 2 : node.cy - node.h / 2;
  const toY = node.side === "top" ? CENTER.cy - 20 : CENTER.cy + 20;
  return `M${node.cx},${fromY} L${node.cx},${elbowY} L${CENTER.cx},${elbowY} L${CENTER.cx},${toY}`;
}

const DURATIONS: Record<SlotId, number> = {
  "top-left": 2.4,
  "top-right": 3,
  "bottom-left": 2.8,
  "bottom-right": 3.4,
  "mid-left": 1.6,
  "mid-right": 1.8,
};

type SlotId = (typeof SLOTS)[number]["id"];
type Node = ReturnType<typeof toNode>;

function NodeBadge({ node }: { node: Node }) {
  const startY = node.cy - ((node.lines.length - 1) * LINE_HEIGHT) / 2 + 1;
  return (
    <g>
      <rect
        x={node.cx - node.w / 2}
        y={node.cy - node.h / 2}
        width={node.w}
        height={node.h}
        rx={8}
        fill="var(--card)"
        stroke="var(--border)"
      />
      <text
        x={node.cx}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={FONT_SIZE}
        fontWeight={600}
        fill="var(--card-foreground)"
      >
        {node.lines.map((line, i) => (
          <tspan key={line} x={node.cx} y={startY + i * LINE_HEIGHT}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export function HeroNetworkVisual({ labels }: { labels: string[] }) {
  const nodes = SLOTS.slice(0, labels.length).map((slot, i) =>
    toNode(labels[i], slot)
  );

  return (
    <div aria-hidden="true" className="relative w-full">
      <svg viewBox="0 0 620 560" className="relative h-auto w-full" role="img">
        <style>{`
          .hero-net-line { stroke-opacity: 0.35; }
          .dark .hero-net-line { stroke-opacity: 0.7; }
          @media (prefers-reduced-motion: reduce) {
            .hero-net-flow { display: none; }
          }
        `}</style>

        <defs>
          <filter
            id="hero-net-blur"
            filterUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="620"
            height="560"
          >
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        {nodes.map((node) => (
          <g key={node.id}>
            <path
              d={connectorPath(node)}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={1.5}
              className="hero-net-line"
            />
            <path
              d={connectorPath(node)}
              pathLength={100}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="15 85"
              filter="url(#hero-net-blur)"
              className="hero-net-flow"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-100"
                dur={`${DURATIONS[node.id]}s`}
                begin={`${DURATIONS[node.id] / 3}s`}
                repeatCount="indefinite"
              />
            </path>
          </g>
        ))}

        {nodes.map((node) => (
          <NodeBadge key={node.id} node={node} />
        ))}

        <g>
          <rect
            x={CENTER.cx - CENTER.w / 2}
            y={CENTER.cy - CENTER.h / 2}
            width={CENTER.w}
            height={CENTER.h}
            rx={10}
            fill="var(--card)"
            stroke="var(--primary)"
            strokeOpacity={0.6}
          />
          <circle
            cx={CENTER.cx - CENTER.w / 2 + 24}
            cy={CENTER.cy}
            r={4}
            fill="var(--primary)"
          />
          <text
            x={CENTER.cx - CENTER.w / 2 + 38}
            y={CENTER.cy + 1}
            textAnchor="start"
            dominantBaseline="central"
            fontSize={14}
            fontWeight={700}
            fill="var(--card-foreground)"
          >
            Votre entreprise
          </text>
        </g>
      </svg>
    </div>
  );
}
