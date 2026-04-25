import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GameState, MissionKind } from "@/game/types";
import { dist, fuelNeeded, findTarget } from "@/game/engine";
import { Send } from "lucide-react";

interface Props {
  state: GameState;
  onDispatch: (params: {
    fromBaseId: string;
    targetId: string;
    kind: MissionKind;
    fighters: number;
    bombers: number;
    missiles?: number;
  }) => void;
}

export function ManualOrderPanel({ state, onDispatch }: Props) {
  const [fromId, setFromId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [fighters, setFighters] = useState<string>("0");
  const [bombers, setBombers] = useState<string>("0");
  const [missiles, setMissiles] = useState<string>("0");
  const [error, setError] = useState<string | null>(null);

  const friendlyBases = useMemo(
    () => state.bases.filter((b) => b.hp > 0),
    [state.bases],
  );
  const fromBase = useMemo(
    () => friendlyBases.find((b) => b.id === fromId) ?? null,
    [friendlyBases, fromId],
  );

  const targets = useMemo(() => {
    if (!fromBase) return [] as Array<{ id: string; name: string; kind: MissionKind; faction: string }>;
    const out: Array<{ id: string; name: string; kind: MissionKind; faction: string }> = [];
    for (const b of state.bases) {
      if (b.id === fromBase.id || b.hp <= 0) continue;
      out.push({
        id: b.id,
        name: `Base · ${b.name} (${b.faction})`,
        kind: b.faction === fromBase.faction ? "transfer" : "attack_base",
        faction: b.faction,
      });
    }
    for (const c of state.cities) {
      if (c.hp <= 0 || c.faction === fromBase.faction) continue;
      out.push({
        id: c.id,
        name: `City · ${c.name} (${c.faction})`,
        kind: "attack_city",
        faction: c.faction,
      });
    }
    return out;
  }, [fromBase, state.bases, state.cities]);

  const selectedTarget = targets.find((t) => t.id === targetId) ?? null;

  const fNum = Math.max(0, Math.floor(Number(fighters) || 0));
  const bNum = Math.max(0, Math.floor(Number(bombers) || 0));
  const mNum = Math.max(0, Math.floor(Number(missiles) || 0));

  // Determine final mission kind: if any missiles assigned and target is enemy, fire as missile_strike
  const finalKind: MissionKind | null = (() => {
    if (!selectedTarget) return null;
    if (mNum > 0 && fNum === 0 && bNum === 0 && selectedTarget.kind !== "transfer") {
      return "missile_strike";
    }
    return selectedTarget.kind;
  })();

  const validation = (() => {
    if (!fromBase) return "Pick a launching base.";
    if (!selectedTarget) return "Pick a destination.";
    if (fNum + bNum + mNum <= 0) return "Assign at least 1 unit.";
    if (mNum > 0 && (fNum > 0 || bNum > 0)) return "Missiles must launch alone.";
    if (mNum > 0 && selectedTarget.kind === "transfer") return "Cannot missile a friendly base.";
    if (fNum > fromBase.fighters) return `Only ${fromBase.fighters} fighters at ${fromBase.name}.`;
    if (bNum > fromBase.bombers) return `Only ${fromBase.bombers} bombers at ${fromBase.name}.`;
    if (mNum > fromBase.missiles) return `Only ${fromBase.missiles} missiles at ${fromBase.name}.`;
    const target = findTarget(state, selectedTarget.id);
    if (!target) return "Target unavailable.";
    const isMissile = finalKind === "missile_strike";
    const required = fuelNeeded(state, fromBase.pos, target.pos, !isMissile && selectedTarget.kind !== "transfer");
    const cap = isMissile ? state.params.missileMaxFuel : state.params.maxFuel;
    if (required > cap) return `Out of range (${Math.round(required)} > ${Math.round(cap)}).`;
    return null;
  })();

  const distance = fromBase && selectedTarget
    ? Math.round(dist(fromBase.pos, findTarget(state, selectedTarget.id)?.pos ?? fromBase.pos))
    : null;

  const submit = () => {
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    onDispatch({
      fromBaseId: fromBase!.id,
      targetId: selectedTarget!.id,
      kind: finalKind!,
      fighters: fNum,
      bombers: bNum,
      missiles: mNum,
    });
    setFighters("0");
    setBombers("0");
    setMissiles("0");
  };

  return (
    <div className="rounded-md border border-border bg-card/30 p-2 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Manual Order
        </p>
        {fromBase && (
          <p className="text-[9px] font-mono text-muted-foreground">
            avail {fromBase.fighters}F · {fromBase.bombers}B · {fromBase.missiles}M
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">From base</Label>
          <Select value={fromId} onValueChange={(v) => { setFromId(v); setTargetId(""); }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select base" />
            </SelectTrigger>
            <SelectContent>
              {friendlyBases.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs">
                  {b.name} ({b.faction}) · {b.fighters}F/{b.bombers}B/{b.missiles}M
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">To target</Label>
          <Select value={targetId} onValueChange={setTargetId} disabled={!fromBase}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={fromBase ? "Select target" : "Pick base first"} />
            </SelectTrigger>
            <SelectContent>
              {targets.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Fighters</Label>
          <Input
            type="number"
            min={0}
            value={fighters}
            onChange={(e) => setFighters(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Bombers</Label>
          <Input
            type="number"
            min={0}
            value={bombers}
            onChange={(e) => setBombers(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Missiles</Label>
          <Input
            type="number"
            min={0}
            value={missiles}
            onChange={(e) => setMissiles(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
        <span>
          {finalKind ? `mission: ${finalKind.replace("_", " ")}` : "—"}
        </span>
        <span>{distance !== null ? `dist ${distance}` : ""}</span>
      </div>

      {(error || validation) && (
        <p className={`text-[10px] ${error ? "text-destructive" : "text-muted-foreground"}`}>
          {error ?? validation}
        </p>
      )}

      <Button
        size="sm"
        className="w-full h-8 text-xs"
        onClick={submit}
        disabled={!!validation}
      >
        <Send className="size-3 mr-1" /> Dispatch
      </Button>
    </div>
  );
}
