import { SimParams } from "@/game/types";
import { DEFAULT_PARAMS } from "@/game/initial";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  params: SimParams;
  onChange: (p: SimParams) => void;
  onReset: () => void;
}

interface Field {
  key: keyof SimParams | string;
  label: string;
  min: number;
  max: number;
  step: number;
  hint?: string;
  group?: string;
  // for nested costs
  costKey?: "fighter" | "bomber" | "missile" | "aa" | "fighterOpsPerSec" | "bomberOpsPerSec";
}

const FIELDS: Field[] = [
  { group: "Flight", key: "flightSpeed", label: "Flight speed", min: 30, max: 200, step: 5, hint: "map units / sec" },
  { group: "Flight", key: "maxFuel", label: "Aircraft max fuel (range)", min: 600, max: 3000, step: 50 },
  { group: "Combat", key: "fighterVsFighter", label: "Attacker loss share (dogfight)", min: 0.2, max: 0.8, step: 0.05 },
  { group: "Combat", key: "bomberDmg", label: "Bomber damage", min: 4, max: 40, step: 1 },
  { group: "Combat", key: "fighterStrafeDmg", label: "Fighter strafe damage", min: 0, max: 15, step: 1 },
  { group: "Combat", key: "flakDmgPerUnit", label: "Flak intensity", min: 0, max: 2, step: 0.1 },
  { group: "Production", key: "productionInterval", label: "Production interval (s)", min: 3, max: 30, step: 1 },
  { group: "Production", key: "northProdRate", label: "North production rate", min: 0, max: 1, step: 0.05 },
  { group: "Production", key: "southProdRate", label: "South production rate", min: 0, max: 1.5, step: 0.05 },
  { group: "Production", key: "southWaveBase", label: "South wave base size", min: 0, max: 8, step: 1 },
  { group: "Production", key: "southWaveInterval", label: "South wave interval (s)", min: 5, max: 60, step: 1 },
  { group: "AI", key: "northThinkInterval", label: "North decision cadence (s)", min: 1, max: 15, step: 0.5 },
  { group: "AI", key: "southThinkInterval", label: "South decision cadence (s)", min: 1, max: 15, step: 0.5 },
  { group: "Intercept", key: "interceptRange", label: "Interception range", min: 0, max: 600, step: 10, hint: "0 disables scrambling" },
  { group: "Intercept", key: "interceptScrambleFraction", label: "Scramble fraction", min: 0.1, max: 1, step: 0.05 },
  // Missiles
  { group: "Missiles", key: "missileMaxFuel", label: "Missile range", min: 200, max: 2000, step: 25, hint: "one-way max distance" },
  { group: "Missiles", key: "missileSpeedMult", label: "Missile speed ×", min: 1, max: 5, step: 0.1 },
  { group: "Missiles", key: "missileDmg", label: "Missile damage / unit", min: 5, max: 80, step: 1 },
  // AA
  { group: "AA", key: "aaRange", label: "AA engagement range", min: 40, max: 400, step: 5 },
  { group: "AA", key: "aaSpeed", label: "AA ground speed", min: 0, max: 80, step: 1, hint: "0 = stationary" },
  { group: "AA", key: "aaFireInterval", label: "AA fire interval (s)", min: 0.3, max: 6, step: 0.1 },
  { group: "AA", key: "aaDmgPerShot", label: "AA damage per shot", min: 0.2, max: 5, step: 0.1 },
  { group: "AA", key: "aaHp", label: "AA battery HP", min: 20, max: 200, step: 5 },
  { group: "AA", key: "aaCoastBand", label: "AA coast deploy band", min: 0, max: 250, step: 10, hint: "sea margin AA may roll into" },
  // Economy
  { group: "Economy", key: "baseIncomePerSec", label: "Income / base / s", min: 0, max: 10, step: 0.1 },
  { group: "Economy", key: "cityIncomePerSec", label: "Income / city / s", min: 0, max: 15, step: 0.1 },
  { group: "Economy", key: "capitalIncomePerSec", label: "Income / capital / s", min: 0, max: 25, step: 0.1 },
  // Costs
  { group: "Costs", key: "cost.fighter", label: "Cost: fighter", min: 20, max: 600, step: 10, costKey: "fighter" },
  { group: "Costs", key: "cost.bomber", label: "Cost: bomber", min: 40, max: 1200, step: 10, costKey: "bomber" },
  { group: "Costs", key: "cost.missile", label: "Cost: missile", min: 5, max: 300, step: 1, costKey: "missile" },
  { group: "Costs", key: "cost.aa", label: "Cost: AA battery", min: 20, max: 600, step: 5, costKey: "aa" },
  { group: "Costs", key: "cost.fighterOps", label: "Fighter ops cost / s flown", min: 0, max: 5, step: 0.05, costKey: "fighterOpsPerSec" },
  { group: "Costs", key: "cost.bomberOps", label: "Bomber ops cost / s flown", min: 0, max: 8, step: 0.05, costKey: "bomberOpsPerSec" },
];

export function ParametersPanel({ params, onChange, onReset }: Props) {
  const setTop = (k: keyof SimParams, v: number) => onChange({ ...params, [k]: v });
  const setCost = (k: NonNullable<Field["costKey"]>, v: number) =>
    onChange({ ...params, costs: { ...params.costs, [k]: v } });

  const getValue = (f: Field): number =>
    f.costKey ? (params.costs[f.costKey] as number) : (params[f.key as keyof SimParams] as number);

  // Group fields for readability
  const groups: Record<string, Field[]> = {};
  for (const f of FIELDS) {
    const g = f.group ?? "Other";
    (groups[g] ||= []).push(f);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div>
          <p className="text-sm font-medium">Parameters</p>
          <p className="text-[11px] text-muted-foreground">Live tuning · applies immediately</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onChange({ ...DEFAULT_PARAMS })}>
          Defaults
        </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-5">
          {Object.entries(groups).map(([groupName, fields]) => (
            <div key={groupName} className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-1">
                {groupName}
              </p>
              {fields.map((f) => {
                const v = getValue(f);
                const display = Number.isInteger(f.step) ? v : v.toFixed(2);
                return (
                  <div key={f.key} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <Label className="text-xs">{f.label}</Label>
                      <span className="font-mono text-muted-foreground">{display}</span>
                    </div>
                    <Slider
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={[v]}
                      onValueChange={([nv]) =>
                        f.costKey ? setCost(f.costKey, nv) : setTop(f.key as keyof SimParams, nv)
                      }
                    />
                    {f.hint && <p className="text-[10px] text-muted-foreground">{f.hint}</p>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-border">
        <Button variant="secondary" className="w-full" onClick={onReset}>
          Restart simulation with current params
        </Button>
      </div>
    </div>
  );
}
