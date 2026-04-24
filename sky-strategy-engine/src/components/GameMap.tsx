import { GameState } from "@/game/types"; // Se till att sökvägen stämmer

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
      <defs>
        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path
            d="M 50 0 L 0 0 0 50"
            fill="none"
            stroke="hsl(var(--border) / 0.25)"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>

      {/* Background sea and grid */}
      <rect width={VB_W} height={VB_H} fill="hsl(var(--terrain-sea))" />
      <rect width={VB_W} height={VB_H} fill="url(#grid)" />

      {/* ===================== NORTH TERRAIN ===================== */}
      <g id="north-group" transform="translate(0,-40)">
        <path
          fill="hsl(var(--terrain-north))"
          stroke="hsl(var(--background))"
          strokeWidth="1.5"
          d="
          M -5,-5 H 1005 V -5 Z
          M -5,-5 H 1005 V 5
          L 1005,5 1005,210
          C 990,205 978,194 960,200
          C 944,206 935,222 918,228
          C 900,234 880,220 858,214
          C 838,208 820,202 800,210
          C 778,220 765,240 742,245
          C 720,250 700,238 678,230
          C 656,222 640,210 616,218
          C 594,226 580,248 556,252
          C 532,256 512,240 488,234
          C 466,228 450,220 428,228
          C 404,238 392,262 366,260
          C 342,258 326,238 302,232
          C 278,226 258,228 236,240
          C 214,252 202,272 178,270
          C 156,268 140,250 118,244
          C 96,238 76,242 54,252
          C 36,260 18,272 -5,268
          L -5,-5 Z
        "
        />

        {/* Sea cutouts inside north landmass */}
        <path fill="hsl(var(--terrain-sea))" stroke="none" d="M 60,268 C 75,240 90,210 80,185 C 72,165 52,158 42,178 C 32,198 38,240 60,268 Z" />
        <path fill="hsl(var(--terrain-sea))" stroke="none" d="M 870,214 C 892,196 915,185 925,200 C 935,216 920,240 900,248 C 882,254 868,234 870,214 Z" />

        {/* North Islands */}
        <path fill="hsl(var(--terrain-island-north))" stroke="hsl(var(--background))" strokeWidth="1" d="M 596,252 C 612,262 626,285 618,306 C 610,324 588,322 576,304 C 564,286 570,258 596,252 Z" />
        <path fill="hsl(var(--terrain-island-north))" stroke="hsl(var(--background))" strokeWidth="1" d="M 296,232 C 276,248 264,278 272,300 C 280,320 304,322 318,306 C 332,288 322,250 296,232 Z" />
        <path fill="hsl(var(--terrain-island-north))" stroke="hsl(var(--background))" strokeWidth="1" d="M 355,308 C 378,296 410,298 424,318 C 436,336 426,362 406,368 C 386,374 362,358 354,338 C 347,320 350,314 355,308 Z" />
        <path fill="hsl(var(--terrain-island-north))" stroke="hsl(var(--background))" strokeWidth="1" transform="translate(-50,-38)" d="M 728,292 C 742,280 760,284 766,300 C 772,314 762,330 746,332 C 730,334 718,320 718,306 C 718,296 722,292 728,292 Z" />
        <path
          fill="hsl(var(--terrain-island-north))"
          stroke="hsl(var(--background))"
          strokeWidth="1.2"
          d="
          M 148,395 C 160,382 180,378 196,386
          C 212,394 220,412 216,430
          C 212,446 198,456 182,454
          C 166,452 152,438 148,420
          C 145,408 144,400 148,395 Z
        "
        />
      </g>

      {/* ===================== SOUTH TERRAIN ===================== */}
      <g id="south-group" transform="translate(0,40)">
        <path
          fill="hsl(var(--terrain-south))"
          stroke="hsl(var(--background))"
          strokeWidth="1.5"
          d="
          M -5,785 H 1005 V 785 Z
          M -5,785 H 1005 V 600
          C 985,598 968,582 948,576
          C 926,570 904,578 882,588
          C 860,598 842,610 818,602
          C 796,594 780,574 756,568
          C 732,562 710,570 688,582
          C 666,594 650,608 624,600
          C 600,592 586,570 560,566
          C 536,562 514,574 492,586
          C 470,598 454,612 428,606
          C 402,600 388,578 362,572
          C 338,566 316,570 294,582
          C 272,594 258,612 232,608
          C 208,604 192,584 168,578
          C 144,572 122,578 98,590
          C 76,600 58,614 30,608
          C 14,604 -5,598 -5,598
          L -5,785 Z
        "
        />

        {/* Sea cutouts inside south landmass */}
        <path fill="hsl(var(--terrain-sea))" stroke="none" d="M 920,576 C 940,592 968,602 980,588 C 990,574 978,552 958,546 C 938,540 916,556 920,576 Z" />
        <path fill="hsl(var(--terrain-sea))" stroke="none" d="M 40,608 C 22,588 8,564 20,548 C 32,532 56,538 66,558 C 76,576 62,598 40,608 Z" />

        {/* South Islands */}
        <path fill="hsl(var(--terrain-island-south))" stroke="hsl(var(--background))" strokeWidth="1" transform="translate(50,-90)" d="M 480,586 C 496,570 518,556 516,534 C 514,514 492,506 476,520 C 460,534 460,568 480,586 Z" />
        <path fill="hsl(var(--terrain-island-south))" stroke="hsl(var(--background))" strokeWidth="1" d="M 830,602 C 848,588 868,572 864,550 C 860,530 836,524 820,538 C 804,554 806,588 830,602 Z" />
        <path fill="hsl(var(--terrain-island-south))" stroke="hsl(var(--background))" strokeWidth="1" d="M 818,388 C 842,376 870,382 876,402 C 882,420 866,440 846,440 C 826,440 810,424 812,406 C 813,396 816,392 818,388 Z" />
        <path fill="hsl(var(--terrain-island-south))" stroke="hsl(var(--background))" strokeWidth="1" d="M 238,494 C 256,482 276,488 280,506 C 284,522 270,536 253,536 C 236,534 224,520 226,504 C 227,496 232,496 238,494 Z" />
      </g>

      {/* ===================== LABELS ===================== */}
      <text x={VB_W / 2} y="28" textAnchor="middle" className="fill-muted-foreground" style={{ letterSpacing: "0.4em", fontSize: 14 }}>
        COUNTRY X — NORTHERN TERRITORIES
      </text>
      <text x={VB_W / 2} y={VB_H - 12} textAnchor="middle" className="fill-muted-foreground" style={{ letterSpacing: "0.4em", fontSize: 14 }}>
        COUNTRY Y — SOUTHERN UNION
      </text>
      <text x={VB_W / 2} y={VB_H / 2} textAnchor="middle" className="fill-foreground/15" style={{ letterSpacing: "0.4em", fontSize: 28, fontWeight: "bold" }}>
        THE BOREAL PASSAGE
      </text>

      {/* Scale bar */}
      <g transform={`translate(${VB_W - 160} ${VB_H - 30})`}>
        <line x1="0" y1="0" x2="120" y2="0" stroke="hsl(var(--foreground))" strokeWidth="2" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="hsl(var(--foreground))" strokeWidth="2" />
        <line x1="120" y1="-4" x2="120" y2="4" stroke="hsl(var(--foreground))" strokeWidth="2" />
        <text x="60" y="16" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>200 km</text>
      </g>

      {/* Coordinates indicators from SVG */}
      <text x="6" y="12" className="fill-foreground/20" style={{ fontSize: 9 }}>0,0</text>
      <text x={VB_W - 40} y={VB_H - 6} className="fill-foreground/20" style={{ fontSize: 9 }}>1000,780</text>


      {/* ===================== DYNAMIC INTERACTIVE REACT STATE ===================== */}
      
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
        const size = c.isCapital ? 20 : 14;
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
        const angle = (Math.atan2(f.dest.y - f.origin.y, f.dest.x - f.origin.x) * 180) / Math.PI;
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
    </svg>
  );
}