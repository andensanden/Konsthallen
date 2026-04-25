// ai.ts

import { dist, fuelNeeded, launchFlight, log } from "./engine";
import { AirBase, City, Faction, Flight, GameState } from "./types";
import { applyPlan, bestPlanFor, rankedPlansFor } from "./strategy";
import { NeuralNetwork } from "./ai_network"; 

export type SuggestionKind = "transfer" | "attack_base" | "attack_city";

export interface Suggestion {
  score: number;
  faction: Faction;
  kind: SuggestionKind;
  description: string;
  fromBaseId: string;
  fromBaseName: string;
  targetId: string;
  targetName: string;
  fighters: number;
  bombers: number;
  apply: (s: GameState) => void;
}

// ============================================================
// AI HJÄRNAN (Vår nya bedömare)
// 8 inputs, 12 dolda noder, 3 outputs (poäng, andel fighters, andel bombers)
// ============================================================
const moveScorerAI = new NeuralNetwork(8, 12, 3);

function scoreMoveWithAI(
  s: GameState, 
  base: AirBase, 
  target: AirBase | City, 
  kind: SuggestionKind,
  targetThreat: number,
  selfThreat: number
): { score: number, fighterRatio: number, bomberRatio: number } {
  
  // 1. Normalisera all data
  const normDist = dist(base.pos, target.pos) / s.params.maxFuel;
  const normTargetThreat = Math.min(targetThreat / 20, 1.0);
  const normSelfThreat = Math.min(selfThreat / 20, 1.0);
  const normTargetValue = targetValue(target) / 100;
  const normMyHp = base.hp / base.maxHp;
  const bomberRatio = base.bombers / (base.fighters + base.bombers || 1);
  
  let targetDef = 0;
  if ("fighters" in target) {
    targetDef = Math.min((target as AirBase).fighters / 10, 1.0);
  }

  let actionCode = 0;
  if (kind === "transfer") actionCode = 1.0;
  else if (kind === "attack_base") actionCode = 0.5;
  else if (kind === "attack_city") actionCode = 0.0;

  // 2. Skapa input-arrayen
  const inputs = [
    normDist, 
    normTargetThreat, 
    normSelfThreat, 
    normTargetValue, 
    targetDef, 
    actionCode,
    normMyHp,
    bomberRatio
  ];

  // 3. Fråga hjärnan vad den tycker
  const output = moveScorerAI.predict(inputs);

  // 4. Returnera objektet
  // output[0] = poängen
  // output[1] = andel fighters att skicka (begränsat till 0.0 - 1.0)
  // output[2] = andel bombers att skicka (begränsat till 0.0 - 1.0)
  return {
    score: output[0] * 100,
    fighterRatio: Math.min(Math.max(output[1], 0), 1),
    bomberRatio: Math.min(Math.max(output[2], 0), 1)
  };
}


function inFlightThreatTo(s: GameState, target: AirBase | City): number {
  let t = 0;
  for (const f of s.flights) {
    if (f.faction === target.faction) continue;
    if (f.targetId !== target.id) continue;
    t += f.bombers * 2 + f.fighters * 0.5;
  }
  return t;
}

function targetValue(target: AirBase | City): number {
  if ("isCapital" in target) {
    return target.isCapital ? 100 : 45;
  }
  return 35 + (target.fighters + target.bombers) * 2;
}

function reachable(s: GameState, from: AirBase, target: AirBase | City, roundTrip: boolean): boolean {
  return fuelNeeded(s, from.pos, target.pos, roundTrip) <= s.params.maxFuel;
}

export function allMovesFor(s: GameState, faction: Faction): Suggestion[] {
  const myBases = s.bases.filter((b) => b.faction === faction && b.hp > 0);
  const enemyBases = s.bases.filter((b) => b.faction !== faction && b.hp > 0);
  const enemyCities = s.cities.filter((c) => c.faction !== faction && c.hp > 0);

  const candidates: Suggestion[] = [];

  for (const base of myBases) {
    const selfThreat = inFlightThreatTo(s, base);

    // ---- Defensive transfers ----
    for (const ally of [...s.bases.filter((b) => b.faction === faction && b.hp > 0 && b.id !== base.id)]) {
      const threat = inFlightThreatTo(s, ally);
      if (threat <= 0) continue;
      if (!reachable(s, base, ally, false)) continue;
      
      const aiDecision = scoreMoveWithAI(s, base, ally, "transfer", threat, selfThreat);
      
      // AI bestämmer hur många fighters som ska skickas
      let send = Math.round(base.fighters * aiDecision.fighterRatio);
      
      // Vi lägger in en minimiregel för vettig spelmekanik
      if (send === 0 && base.fighters > 0 && aiDecision.score > 20) {
         send = 1; 
      }

      if (send <= 0) continue;
      
      candidates.push({
        score: aiDecision.score,
        faction,
        kind: "transfer",
        description: `Reinforce ${ally.name} from ${base.name} (${send}F)`,
        fromBaseId: base.id,
        fromBaseName: base.name,
        targetId: ally.id,
        targetName: ally.name,
        fighters: send,
        bombers: 0,
        apply: (st) => {
          const b = st.bases.find((x) => x.id === base.id)!;
          const a = st.bases.find((x) => x.id === ally.id)!;
          launchFlight(st, b, a, "transfer", send, 0);
        },
      });
    }

    // ---- Offensive: attack enemy base ----
    for (const eb of enemyBases) {
      if (!reachable(s, base, eb, true)) continue;
      if (base.bombers <= 0 && base.fighters <= 0) continue;
      
      const aiDecision = scoreMoveWithAI(s, base, eb, "attack_base", 0, selfThreat);

      // AI bestämmer upplägget
      const useB = Math.round(base.bombers * aiDecision.bomberRatio);
      const escort = Math.round(base.fighters * aiDecision.fighterRatio);

      if (useB + escort <= 0) continue;
      
      candidates.push({
        score: aiDecision.score,
        faction,
        kind: "attack_base",
        description: `Strike ${eb.name} from ${base.name} (${escort}F + ${useB}B)`,
        fromBaseId: base.id,
        fromBaseName: base.name,
        targetId: eb.id,
        targetName: eb.name,
        fighters: escort,
        bombers: useB,
        apply: (st) => {
          const b = st.bases.find((x) => x.id === base.id)!;
          const t = st.bases.find((x) => x.id === eb.id)!;
          launchFlight(st, b, t, "attack_base", escort, useB);
        },
      });
    }

    // ---- Offensive: bomb enemy city ----
    for (const ec of enemyCities) {
      if (!reachable(s, base, ec, true)) continue;
      if (base.bombers <= 0) continue; 
      
      const aiDecision = scoreMoveWithAI(s, base, ec, "attack_city", 0, selfThreat);

      // AI bestämmer upplägget
      const useB = Math.round(base.bombers * aiDecision.bomberRatio);
      const escort = Math.round(base.fighters * aiDecision.fighterRatio);

      if (useB <= 0) continue; // Måste ha bombplan för att bomba en stad
      
      candidates.push({
        score: aiDecision.score,
        faction,
        kind: "attack_city",
        description: `Raid ${ec.name} from ${base.name} (${escort}F + ${useB}B)`,
        fromBaseId: base.id,
        fromBaseName: base.name,
        targetId: ec.id,
        targetName: ec.name,
        fighters: escort,
        bombers: useB,
        apply: (st) => {
          const b = st.bases.find((x) => x.id === base.id)!;
          const t = st.cities.find((x) => x.id === ec.id)!;
          launchFlight(st, b, t, "attack_city", escort, useB);
        },
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

export function bestMoveFor(s: GameState, faction: Faction): Suggestion | null {
  return allMovesFor(s, faction)[0] ?? null;
}

// ... resten av runAITick och runNorthDefender stannar oförändrade! ...
export function runAITick(s: GameState) {
  const p = s.params;

  if (s.time >= s.nextWaveAt) {
    s.waveNumber += 1;
    const waveSize = p.southWaveBase + Math.floor(Math.random() * 3) + Math.floor(s.waveNumber / 2);
    log(s, `=== South wave ${s.waveNumber} incoming (${waveSize} sorties) ===`, "south");
    const plan = bestPlanFor(s, "south");
    if (plan && plan.projectedScore > 0) applyPlan(s, plan);
    for (let i = 0; i < waveSize; i++) {
      const sug = bestMoveFor(s, "south");
      if (!sug) break;
      sug.apply(s);
    }
    s.nextWaveAt = s.time + p.southWaveInterval + Math.random() * 8;
    s.southThinkAt = s.time + 4;
  } else if (s.time >= s.southThinkAt) {
    s.southThinkAt = s.time + p.southThinkInterval;
    const plan = bestPlanFor(s, "south");
    if (plan && plan.projectedScore > 10) {
      applyPlan(s, plan);
    } else {
      const sug = bestMoveFor(s, "south");
      if (sug && sug.score > 30) sug.apply(s);
    }
  }

  if (s.time >= s.northThinkAt) {
    s.northThinkAt = s.time + p.northThinkInterval;
    runNorthDefender(s);
  }
}

function runNorthDefender(s: GameState) {
  const myCities = s.cities.filter((c) => c.faction === "north" && c.hp > 0);
  const capital = myCities.find((c) => c.isCapital);

  const threatened = new Set<string>();
  for (const f of s.flights) {
    if (f.faction === "south" && (f.kind === "attack_base" || f.kind === "attack_city")) {
      threatened.add(f.targetId);
    }
  }
  const underAttack = threatened.size > 0;
  const ranked = bestPlanFor(s, "north");

  if (underAttack) {
    if (ranked && ranked.kind === "fortify" && ranked.projectedScore > -5) {
      applyPlan(s, ranked);
      return;
    }
    const moves = allMovesFor(s, "north").filter((m) => m.kind === "transfer");
    const top = moves[0];
    if (top && top.score > 5) top.apply(s);
    return;
  }

  if (capital) {
    const myBases = s.bases.filter((b) => b.faction === "north" && b.hp > 0);
    let guard = myBases[0];
    let gd = guard ? dist(guard.pos, capital.pos) : Infinity;
    for (const b of myBases) {
      const d = dist(b.pos, capital.pos);
      if (d < gd) { gd = d; guard = b; }
    }
    if (guard && guard.fighters < 4) {
      const transfers = allMovesFor(s, "north").filter(
        (m) => m.kind === "transfer" && m.targetId === guard.id,
      );
      const t = transfers[0];
      if (t) { t.apply(s); return; }
    }
  }

  if (ranked && ranked.kind !== "fortify" && ranked.projectedScore > 15) {
    applyPlan(s, ranked);
    return;
  }
  const sug = bestMoveFor(s, "north");
  if (sug && sug.kind !== "transfer" && sug.score > 25) sug.apply(s);
}