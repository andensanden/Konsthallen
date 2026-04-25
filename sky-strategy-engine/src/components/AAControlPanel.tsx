import { GameState } from "@/game/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pause } from "lucide-react";

interface Props {
  state: GameState;
  selectedAaId: string | null;
  onSelect: (id: string | null) => void;
  onHold: (id: string) => void;
}

export function AAControlPanel({ state, selectedAaId, onSelect, onHold }: Props) {
  const units = state.aaUnits.filter((a) => a.hp > 0);
  const selected = units.find((a) => a.id === selectedAaId) ?? null;

  return (
    <div className="rounded-md border border-border bg-card/30 p-2 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          AA Control
        </p>
        <p className="text-[9px] text-muted-foreground">
          select → click map to move
        </p>
      </div>

      <Select
        value={selectedAaId ?? ""}
        onValueChange={(v) => onSelect(v || null)}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select AA battery" />
        </SelectTrigger>
        <SelectContent>
          {units.length === 0 && (
            <SelectItem value="__none" disabled className="text-xs">
              No AA units
            </SelectItem>
          )}
          {units.map((a) => (
            <SelectItem key={a.id} value={a.id} className="text-xs">
              {a.faction === "north" ? "N" : "S"} · {a.id.slice(0, 6)} · HP{" "}
              {Math.round(a.hp)}/{a.maxHp}
              {a.dest ? " · moving" : " · holding"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && (
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>
            pos {Math.round(selected.pos.x)},{Math.round(selected.pos.y)}
          </span>
          <span>range {Math.round(selected.range)}</span>
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        className="w-full h-7 text-xs"
        disabled={!selected || !selected.dest}
        onClick={() => selected && onHold(selected.id)}
      >
        <Pause className="size-3 mr-1" />
        Hold position
      </Button>
    </div>
  );
}
