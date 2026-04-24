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
  key: keyof SimParams;
  label: string;
  min: number;
  max: number;
  step: number;
  hint?: string;
}

const FIELDS: Field[] = [
  { key: "flightSpeed", label: "Flight speed", min: 30, max: 200, step: 5, hint: "map units / sec" },
  { key: "maxFuel", label: "Max fuel (range)", min: 600, max: 3000, step: 50 },
  { key: "fighterVsFighter", label: "Attacker loss share (dogfight)", min: 0.2, max: 0.8, step: 0.05 },
  { key: "bomberDmg", label: "Bomber damage", min: 4, max: 40, step: 1 },
  { key: "fighterStrafeDmg", label: "Fighter strafe damage", min: 0, max: 15, step: 1 },
  { key: "flakDmgPerUnit", label: "Flak intensity", min: 0, max: 2, step: 0.1 },
  { key: "productionInterval", label: "Production interval (s)", min: 3, max: 30, step: 1 },
  { key: "northProdRate", label: "North production rate", min: 0, max: 1, step: 0.05 },
  { key: "southProdRate", label: "South production rate", min: 0, max: 1.5, step: 0.05 },
  { key: "southWaveBase", label: "South wave base size", min: 0, max: 8, step: 1 },
  { key: "southWaveInterval", label: "South wave interval (s)", min: 5, max: 60, step: 1 },
  { key: "northThinkInterval", label: "North decision cadence (s)", min: 1, max: 15, step: 0.5 },
  { key: "southThinkInterval", label: "South decision cadence (s)", min: 1, max: 15, step: 0.5 },
  { key: "interceptRange", label: "Interception range", min: 0, max: 600, step: 10, hint: "0 disables scrambling" },
  { key: "interceptScrambleFraction", label: "Scramble fraction", min: 0.1, max: 1, step: 0.05 },
];

export function ParametersPanel({ params, onChange, onReset }: Props) {
  const set = (k: keyof SimParams, v: number) => onChange({ ...params, [k]: v });
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
        <div className="p-3 space-y-4">
          {FIELDS.map((f) => {
            const v = params[f.key] as number;
            return (
              <div key={f.key} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label className="text-xs">{f.label}</Label>
                  <span className="font-mono text-muted-foreground">
                    {Number.isInteger(f.step) ? v : v.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={[v]}
                  onValueChange={([nv]) => set(f.key, nv)}
                />
                {f.hint && <p className="text-[10px] text-muted-foreground">{f.hint}</p>}
              </div>
            );
          })}
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
