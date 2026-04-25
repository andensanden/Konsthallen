import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Suggestion } from "@/game/ai";
import { CoordinatedPlan } from "@/game/strategy";
import { Faction } from "@/game/types";
import {
  ChevronDown,
  ChevronRight,
  Play,
  Crosshair,
  Building2,
  ArrowRightLeft,
  Layers,
  Plane,
} from "lucide-react";

interface Props {
  faction: Faction;
  suggestions: Suggestion[];
  plans: CoordinatedPlan[];
  onExecute: (s: Suggestion) => void;
  onExecutePlan: (p: CoordinatedPlan) => void;
}

const KIND_META: Record<Suggestion["kind"], { label: string; icon: typeof Crosshair; tone: string }> = {
  attack_base: { label: "Strike Base", icon: Crosshair, tone: "text-destructive" },
  attack_city: { label: "Raid City", icon: Building2, tone: "text-destructive" },
  transfer: { label: "Transfer", icon: ArrowRightLeft, tone: "text-muted-foreground" },
};

const PLAN_META: Record<CoordinatedPlan["kind"], { label: string; icon: typeof Crosshair; tone: string }> = {
  coordinated_strike: { label: "Coord. Strike", icon: Crosshair, tone: "text-destructive" },
  coordinated_raid: { label: "Coord. Raid", icon: Building2, tone: "text-destructive" },
  fortify: { label: "Fortify", icon: ArrowRightLeft, tone: "text-muted-foreground" },
};

export function AdvisorPanel({ faction, suggestions, plans, onExecute, onExecutePlan }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"plans" | "flights">("plans");
  const text = faction === "north" ? "text-north" : "text-south";
  const topPlan = plans[0];
  const topFlight = suggestions[0];
  const flightsList = suggestions;
  const plansList = plans;

  return (
    <div className="rounded-md border border-border bg-card/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-1.5 text-xs">
          {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          <span className={`font-medium uppercase tracking-wider ${text}`}>{faction}</span>
          <span className="text-muted-foreground">
            {topPlan
              ? `plan ${topPlan.projectedScore.toFixed(0)}`
              : topFlight
              ? `move ${topFlight.score.toFixed(0)}`
              : "no moves"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{plans.length}P</Badge>
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{suggestions.length}F</Badge>
        </div>
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="flex border-b border-border text-[10px]">
            <button
              type="button"
              onClick={() => setTab("plans")}
              className={`flex-1 px-2 py-1 flex items-center justify-center gap-1 transition-colors ${
                tab === "plans" ? "bg-accent/40 font-medium" : "hover:bg-accent/20 text-muted-foreground"
              }`}
            >
              <Layers className="size-3" /> Coordinated Plans
            </button>
            <button
              type="button"
              onClick={() => setTab("flights")}
              className={`flex-1 px-2 py-1 flex items-center justify-center gap-1 transition-colors ${
                tab === "flights" ? "bg-accent/40 font-medium" : "hover:bg-accent/20 text-muted-foreground"
              }`}
            >
              <Plane className="size-3" /> Single Flights
            </button>
          </div>

          {tab === "plans" ? (
            plansList.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No coordinated plans available.</p>
            ) : (
              <ScrollArea className="h-72">
                <ul className="divide-y divide-border">
                  {plansList.map((p, i) => {
                    const meta = PLAN_META[p.kind];
                    const Icon = meta.icon;
                    const isTop = i === 0;
                    return (
                      <li key={p.id} className={`px-2 py-1.5 text-xs flex items-start gap-2 ${isTop ? "bg-accent/20" : ""}`}>
                        <Icon className={`size-3.5 mt-0.5 shrink-0 ${meta.tone}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium">{meta.label}</span>
                            {isTop && <Badge className="text-[9px] px-1 py-0 h-4">AI pick</Badge>}
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                              {p.legs.length} bases
                            </Badge>
                            <span className="font-mono text-muted-foreground ml-auto">
                              {p.projectedScore >= 0 ? "+" : ""}{p.projectedScore.toFixed(0)}
                            </span>
                          </div>
                          <p className="text-muted-foreground truncate">→ {p.targetName}</p>
                          <ul className="text-[10px] text-muted-foreground font-mono mt-0.5 space-y-0.5">
                            {p.legs.map((l, idx) => (
                              <li key={idx} className="truncate">
                                · {l.fromBaseName}: {l.fighters > 0 && `${l.fighters}F`}
                                {l.fighters > 0 && l.bombers > 0 && " "}
                                {l.bombers > 0 && `${l.bombers}B`}
                              </li>
                            ))}
                          </ul>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            prior {p.rawScore.toFixed(0)} · lookahead {p.projectedScore.toFixed(0)}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => onExecutePlan(p)}>
                          <Play className="size-3 mr-0.5" />Run
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )
          ) : flightsList.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No viable single flights.</p>
          ) : (
            <ScrollArea className="h-64">
              <ul className="divide-y divide-border">
                {flightsList.map((s, i) => {
                  const meta = KIND_META[s.kind];
                  const Icon = meta.icon;
                  const isTop = i === 0;
                  return (
                    <li key={i} className={`px-2 py-1.5 text-xs flex items-start gap-2 ${isTop ? "bg-accent/20" : ""}`}>
                      <Icon className={`size-3.5 mt-0.5 shrink-0 ${meta.tone}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium">{meta.label}</span>
                          {isTop && <Badge className="text-[9px] px-1 py-0 h-4">Top</Badge>}
                          <span className="font-mono text-muted-foreground ml-auto">{s.score.toFixed(0)}</span>
                        </div>
                        <p className="text-muted-foreground truncate">{s.fromBaseName} → {s.targetName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {s.fighters > 0 && `${s.fighters}F`}
                          {s.fighters > 0 && s.bombers > 0 && " · "}
                          {s.bombers > 0 && `${s.bombers}B`}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => onExecute(s)}>
                        <Play className="size-3 mr-0.5" />Run
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
