import { useEffect, useMemo, useRef, useState } from "react";
import { GameMap } from "@/components/GameMap";
import { ParametersPanel } from "@/components/ParametersPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { createInitialState, DEFAULT_PARAMS } from "@/game/initial";
import { GameState, SimParams } from "@/game/types";
import { tick } from "@/game/engine";
import { allMovesFor, runAITick, Suggestion } from "@/game/ai";
import { applyPlan, CoordinatedPlan, rankedPlansFor } from "@/game/strategy";
import { AdvisorPanel } from "@/components/AdvisorPanel";
import { ManualOrderPanel } from "@/components/ManualOrderPanel";
import { launchFlight, findBase, findTarget } from "@/game/engine";
import { MissionKind } from "@/game/types";
import { Pause, Play, RotateCcw, Gauge, Sliders } from "lucide-react";

const Index = () => {
  const [params, setParams] = useState<SimParams>(DEFAULT_PARAMS);
  const [state, setState] = useState<GameState>(() => createInitialState(DEFAULT_PARAMS));
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [showParams, setShowParams] = useState(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState((s) => ({ ...s, params }));
  }, [params]);

  useEffect(() => {
    document.title = "Boreal Passage — Air Theater Simulation";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Real-time air combat simulation between North and South over the Boreal Passage with heuristic AI strategy.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = { ...stateRef.current };
      // mutate clone (deep enough for our arrays — but engine mutates references)
      // Since engine mutates objects, we need a true mutable copy for React to re-render
      // We'll deep-clone the parts that mutate.
      const cloned: GameState = {
        ...s,
        cities: s.cities.map((c) => ({ ...c })),
        bases: s.bases.map((b) => ({ ...b })),
        flights: s.flights.map((f) => ({ ...f, pos: { ...f.pos }, origin: { ...f.origin }, dest: { ...f.dest } })),
        log: [...s.log],
      };
      tick(cloned, dt);
      runAITick(cloned);
      stateRef.current = cloned;
      setState(cloned);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const togglePause = () =>
    setState((s) => ({ ...s, paused: !s.paused }));
  const setSpeed = (sp: number) => setState((s) => ({ ...s, speed: sp }));
  const reset = () => setState(createInitialState(params));

  const northMoves = useMemo(() => allMovesFor(state, "north"), [state]);
  const southMoves = useMemo(() => allMovesFor(state, "south"), [state]);
  // Lookahead is expensive — recompute on a slow tick (every ~1s of sim time)
  const planTick = Math.floor(state.time);
  const northPlans = useMemo(() => rankedPlansFor(state, "north"), [planTick, state.bases.length, state.flights.length]);
  const southPlans = useMemo(() => rankedPlansFor(state, "south"), [planTick, state.bases.length, state.flights.length]);

  const executeSuggestion = (sug: Suggestion) => {
    setState((s) => {
      const cloned: GameState = {
        ...s,
        cities: s.cities.map((c) => ({ ...c })),
        bases: s.bases.map((b) => ({ ...b })),
        flights: s.flights.map((f) => ({ ...f, pos: { ...f.pos }, origin: { ...f.origin }, dest: { ...f.dest } })),
        log: [...s.log],
      };
      sug.apply(cloned);
      stateRef.current = cloned;
      return cloned;
    });
  };

  const executePlan = (plan: CoordinatedPlan) => {
    setState((s) => {
      const cloned: GameState = {
        ...s,
        cities: s.cities.map((c) => ({ ...c })),
        bases: s.bases.map((b) => ({ ...b })),
        flights: s.flights.map((f) => ({ ...f, pos: { ...f.pos }, origin: { ...f.origin }, dest: { ...f.dest } })),
        log: [...s.log],
      };
      applyPlan(cloned, plan);
      stateRef.current = cloned;
      return cloned;
    });
  };

  const dispatchManual = (order: {
    fromBaseId: string;
    targetId: string;
    kind: MissionKind;
    fighters: number;
    bombers: number;
  }) => {
    setState((s) => {
      const cloned: GameState = {
        ...s,
        cities: s.cities.map((c) => ({ ...c })),
        bases: s.bases.map((b) => ({ ...b })),
        flights: s.flights.map((f) => ({ ...f, pos: { ...f.pos }, origin: { ...f.origin }, dest: { ...f.dest } })),
        log: [...s.log],
      };
      const base = findBase(cloned, order.fromBaseId);
      const target = findTarget(cloned, order.targetId);
      if (base && target) {
        launchFlight(cloned, base, target, order.kind, order.fighters, order.bombers);
      }
      stateRef.current = cloned;
      return cloned;
    });
  };

  const hovered = useMemo(() => {
    if (!hoverId) return null;
    return (
      state.bases.find((b) => b.id === hoverId) ??
      state.cities.find((c) => c.id === hoverId) ??
      null
    );
  }, [hoverId, state]);

  const totals = useMemo(() => {
    const sum = (faction: "north" | "south") => {
      const bases = state.bases.filter((b) => b.faction === faction);
      const f = bases.reduce((a, b) => a + b.fighters, 0) +
        state.flights.filter((x) => x.faction === faction).reduce((a, x) => a + x.fighters, 0);
      const bm = bases.reduce((a, b) => a + b.bombers, 0) +
        state.flights.filter((x) => x.faction === faction).reduce((a, x) => a + x.bombers, 0);
      return { f, bm, basesAlive: bases.filter((b) => b.hp > 0).length, citiesAlive: state.cities.filter((c) => c.faction === faction && c.hp > 0).length };
    };
    return { north: sum("north"), south: sum("south") };
  }, [state]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-wide">Boreal Passage — Air Theater</h1>
          <p className="text-xs text-muted-foreground">South: Monte Carlo attacker · North: risk-min defender</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={togglePause}>
            {state.paused ? <Play className="size-4 mr-1" /> : <Pause className="size-4 mr-1" />}
            {state.paused ? "Play" : "Pause"}
          </Button>
          <div className="flex items-center gap-1">
            <Gauge className="size-4 text-muted-foreground" />
            {[0.5, 1, 2, 4].map((sp) => (
              <Button
                key={sp}
                size="sm"
                variant={state.speed === sp ? "default" : "ghost"}
                onClick={() => setSpeed(sp)}
                className="px-2 h-8"
              >
                {sp}×
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant={showParams ? "default" : "outline"}
            onClick={() => setShowParams((v) => !v)}
          >
            <Sliders className="size-4 mr-1" /> Parameters
          </Button>
          <Button size="sm" variant="outline" onClick={reset}>
            <RotateCcw className="size-4 mr-1" /> Reset
          </Button>
        </div>
      </header>

      <main
        className={`flex-1 grid grid-cols-1 gap-0 ${
          showParams
            ? "lg:grid-cols-[18rem_1fr_22rem]"
            : "lg:grid-cols-[1fr_22rem]"
        }`}
      >
        {showParams && (
          <aside className="border-r border-border bg-card/40 hidden lg:block min-h-0">
            <ParametersPanel params={params} onChange={setParams} onReset={reset} />
          </aside>
        )}
        <div className="relative bg-terrain-sea">
          <div className="absolute inset-0">
            <GameMap state={state} hoverId={hoverId} onHover={setHoverId} />
          </div>
          {state.winner && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <Card className="p-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Engagement concluded</p>
                <p className="text-3xl font-semibold mt-2 capitalize">
                  {state.winner === "draw" ? "Mutual collapse" : `${state.winner} victorious`}
                </p>
                <Button onClick={reset} className="mt-4"><RotateCcw className="size-4 mr-1" />New simulation</Button>
              </Card>
            </div>
          )}
        </div>

        <aside className="border-l border-border bg-card/40 flex flex-col min-h-0 lg:h-[calc(100vh-57px)]">
          <div className="p-3 border-b border-border grid grid-cols-2 gap-2 text-xs">
            <FactionStat label="North" color="north" data={totals.north} />
            <FactionStat label="South" color="south" data={totals.south} />
          </div>

          <div className="border-b border-border max-h-[55vh] overflow-y-auto">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Strategy Advisor
                </p>
                <p className="text-[9px] text-muted-foreground">
                  two-sided AI · click Run to override
                </p>
              </div>
              <AdvisorPanel
                faction="north"
                suggestions={northMoves}
                plans={northPlans}
                onExecute={executeSuggestion}
                onExecutePlan={executePlan}
              />
              <AdvisorPanel
                faction="south"
                suggestions={southMoves}
                plans={southPlans}
                onExecute={executeSuggestion}
                onExecutePlan={executePlan}
              />
              <ManualOrderPanel state={state} onDispatch={dispatchManual} />
            </div>
          </div>

          {hovered && (
            <div className="p-3 border-b border-border text-xs space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Selected</p>
              <p className="font-medium">{hovered.name}</p>
              <p>HP: {Math.round(hovered.hp)} / {hovered.maxHp}</p>
              {"fighters" in hovered && (
                <p>Garrison: {hovered.fighters}F · {hovered.bombers}B</p>
              )}
            </div>
          )}

          <div className="p-3 flex-1 min-h-0 flex flex-col">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Combat Log · t = {state.time.toFixed(1)}s · wave {state.waveNumber}
            </p>
            <ScrollArea className="flex-1 min-h-0 pr-2">
              <ul className="space-y-1 text-xs">
                {state.log.map((l, i) => (
                  <li key={i} className="leading-snug">
                    <span className="text-muted-foreground">[{l.t.toFixed(1)}]</span>{" "}
                    {l.faction && (
                      <Badge
                        variant="outline"
                        className={`mr-1 px-1 py-0 text-[9px] uppercase ${
                          l.faction === "north" ? "border-north text-north" : "border-south text-south"
                        }`}
                      >
                        {l.faction}
                      </Badge>
                    )}
                    {l.text}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        </aside>
      </main>
    </div>
  );
};

function FactionStat({
  label,
  color,
  data,
}: {
  label: string;
  color: "north" | "south";
  data: { f: number; bm: number; basesAlive: number; citiesAlive: number };
}) {
  const text = color === "north" ? "text-north" : "text-south";
  return (
    <div className="rounded-md border border-border p-2">
      <p className={`text-[10px] uppercase tracking-widest ${text}`}>{label}</p>
      <p className="font-mono">{data.f}F · {data.bm}B</p>
      <p className="text-muted-foreground">
        Bases {data.basesAlive} · Cities {data.citiesAlive}
      </p>
    </div>
  );
}


export default Index;
