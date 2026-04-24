import { GameState } from "@/game/types";

interface Props {
  state: GameState;
  hoverId: string | null;
  onHover: (id: string | null) => void;
}

const VB_W = 1000;
const VB_H = 780;

export function GameMap({ state, hoverId, onHover }: Props) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full h-full block select-none"
      role="img"
      aria-label="Boreal Passage theater map"
    >
      {/* Background sea */}
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="hsl(var(--terrain-sea))" />

      {/* North landmass (top) */}
      <path
        d="M0,0 H1000 V250
           C 940,260 900,300 850,290
           C 800,280 760,320 700,310
           C 640,300 600,340 540,335
           C 480,330 440,370 380,355
           C 320,340 280,375 220,360
           C 170,350 120,330 60,335
           C 30,338 10,320 0,305 Z"
        fill="hsl(var(--terrain-north))"
      />

      {/* North islands in sea */}
      <ellipse cx="80" cy="320" rx="55" ry="40" fill="hsl(var(--terrain-island-north))" />
      <ellipse cx="430" cy="430" rx="55" ry="40" fill="hsl(var(--terrain-island-north))" />
      <ellipse cx="320" cy="500" rx="50" ry="40" fill="hsl(var(--terrain-island-north))" />
      <ellipse cx="560" cy="445" rx="40" ry="30" fill="hsl(var(--terrain-island-north))" />
      <ellipse cx="700" cy="425" rx="38" ry="30" fill="hsl(var(--terrain-island-north))" />
      <ellipse cx="850" cy="430" rx="42" ry="32" fill="hsl(var(--terrain-island-north))" />

      {/* South landmass (bottom) */}
      <path
        d="M0,780 H1000 V520
           C 950,540 900,510 840,520
           C 780,530 740,500 680,520
           C 620,540 580,510 520,525
           C 460,540 420,510 360,525
           C 300,540 250,520 190,540
           C 130,560 80,540 0,560 Z"
        fill="hsl(var(--terrain-south))"
      />
      {/* South islands */}
      <ellipse cx="900" cy="490" rx="55" ry="40" fill="hsl(var(--terrain-island-south))" />
      <ellipse cx="640" cy="600" rx="50" ry="55" fill="hsl(var(--terrain-island-south))" />

      {/* Subtle grid */}
      <g stroke="hsl(var(--border) / 0.25)" strokeWidth="0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`vx${i}`} x1={(i + 1) * 100} y1="0" x2={(i + 1) * 100} y2={VB_H} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`hz${i}`} x1="0" y1={(i + 1) * 100} x2={VB_W} y2={(i + 1) * 100} />
        ))}
      </g>

      {/* Labels */}
      <text x={VB_W / 2} y="32" textAnchor="middle"
            className="fill-muted-foreground" style={{ letterSpacing: "0.4em", fontSize: 16 }}>
        COUNTRY X — NORTHERN TERRITORIES
      </text>
      <text x={VB_W / 2} y={VB_H - 12} textAnchor="middle"
            className="fill-muted-foreground" style={{ letterSpacing: "0.4em", fontSize: 16 }}>
        COUNTRY Y — SOUTHERN UNION
      </text>
      <text x={VB_W / 2} y={VB_H / 2} textAnchor="middle"
            className="fill-foreground/15" style={{ letterSpacing: "0.5em", fontSize: 28 }}>
        THE BOREAL PASSAGE
      </text>

      {/* Flight paths */}
      {state.flights.map((f) => (
        <line
          key={`p${f.id}`}
          x1={f.origin.x}
          y1={f.origin.y}
          x2={f.dest.x}
          y2={f.dest.y}
          stroke={f.faction === "north" ? "hsl(var(--north))" : "hsl(var(--south))"}
          strokeOpacity={0.35}
          strokeDasharray="4 6"
          strokeWidth={1.2}
        />
      ))}

      {/* Cities */}
      {state.cities.map((c) => {
        const size = c.isCapital ? 22 : 14;
        const fill = c.isCapital ? "hsl(var(--capital))" : "hsl(var(--city))";
        const dim = c.hp <= 0 ? 0.25 : 1;
        return (
          <g
            key={c.id}
            opacity={dim}
            onMouseEnter={() => onHover(c.id)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={c.pos.x - size / 2}
              y={c.pos.y - size / 2}
              width={size}
              height={size}
              fill={fill}
              stroke={hoverId === c.id ? "hsl(var(--foreground))" : "transparent"}
              strokeWidth={2}
            />
            {/* HP bar */}
            <rect x={c.pos.x - 18} y={c.pos.y + size / 2 + 4} width={36} height={3} fill="hsl(var(--muted))" />
            <rect
              x={c.pos.x - 18}
              y={c.pos.y + size / 2 + 4}
              width={36 * (c.hp / c.maxHp)}
              height={3}
              fill={c.faction === "north" ? "hsl(var(--north))" : "hsl(var(--south))"}
            />
          </g>
        );
      })}

      {/* Bases (triangles) */}
      {state.bases.map((b) => {
        const fill = b.faction === "north" ? "hsl(var(--north))" : "hsl(var(--south))";
        const size = 18;
        const path = `M ${b.pos.x},${b.pos.y - size} L ${b.pos.x + size},${b.pos.y + size * 0.85} L ${b.pos.x - size},${b.pos.y + size * 0.85} Z`;
        const dim = b.hp <= 0 ? 0.25 : 1;
        return (
          <g
            key={b.id}
            opacity={dim}
            onMouseEnter={() => onHover(b.id)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: "pointer" }}
          >
            <path
              d={path}
              fill={fill}
              stroke={hoverId === b.id ? "hsl(var(--foreground))" : "hsl(var(--background))"}
              strokeWidth={1.5}
            />
            <rect x={b.pos.x - 22} y={b.pos.y + size + 4} width={44} height={3} fill="hsl(var(--muted))" />
            <rect
              x={b.pos.x - 22}
              y={b.pos.y + size + 4}
              width={44 * (b.hp / b.maxHp)}
              height={3}
              fill={fill}
            />
            <text
              x={b.pos.x}
              y={b.pos.y + size + 18}
              textAnchor="middle"
              className="fill-foreground"
              style={{ fontSize: 10 }}
            >
              {b.fighters}F · {b.bombers}B
            </text>
          </g>
        );
      })}

      {/* Flights */}
      {state.flights.map((f) => {
        const color = f.faction === "north" ? "hsl(var(--north))" : "hsl(var(--south))";
        const angle =
          (Math.atan2(f.dest.y - f.origin.y, f.dest.x - f.origin.x) * 180) / Math.PI;
        return (
          <g key={f.id} transform={`translate(${f.pos.x} ${f.pos.y}) rotate(${angle})`}>
            <path
              d="M -6,-4 L 8,0 L -6,4 L -3,0 Z"
              fill={color}
              stroke="hsl(var(--background))"
              strokeWidth={0.5}
            />
            <text x={10} y={-6} className="fill-foreground" style={{ fontSize: 8 }}>
              {f.fighters}/{f.bombers}
            </text>
          </g>
        );
      })}

      {/* Scale bar */}
      <g transform={`translate(${VB_W - 180} ${VB_H - 30})`}>
        <line x1="0" y1="0" x2="120" y2="0" stroke="hsl(var(--foreground))" strokeWidth="2" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="hsl(var(--foreground))" strokeWidth="2" />
        <line x1="120" y1="-4" x2="120" y2="4" stroke="hsl(var(--foreground))" strokeWidth="2" />
        <text x="130" y="4" className="fill-muted-foreground" style={{ fontSize: 11 }}>200 km</text>
      </g>
    </svg>
  );
}
