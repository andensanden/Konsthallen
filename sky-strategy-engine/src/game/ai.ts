import { dist, fuelNeeded, launchFlight, log } from "./engine";
import { AirBase, City, Faction, Flight, GameState } from "./types";
import { applyPlan, bestPlanFor, rankedPlansFor } from "./strategy";

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

/**
 * Enumerate all candidate moves for a faction, scored and sorted descending.
 */
export function allMovesFor(s: GameState, faction: Faction): Suggestion[] {
  const myBases = s.bases.filter((b) => b.faction === faction && b.hp > 0);
  const enemyBases = s.bases.filter((b) => b.faction !== faction && b.hp > 0);
  const enemyCities = s.cities.filter((c) => c.faction !== faction && c.hp > 0);
  const myCities = s.cities.filter((c) => c.faction === faction && c.hp > 0);

  const candidates: Suggestion[] = [];

  for (const base of myBases) {
    // ---- Defensive transfers: if a friendly base/city is under heavy threat, send fighters
    for (const ally of [...s.bases.filter((b) => b.faction === faction && b.hp > 0 && b.id !== base.id)]) {
      const threat = inFlightThreatTo(s, ally);
      if (threat <= 0) continue;
      if (!reachable(s, base, ally, false)) continue;
      const send = Math.min(base.fighters, Math.max(2, Math.ceil(threat / 3)));
      if (send <= 0) continue;
      const score = threat * 6 + targetValue(ally) * 0.4 - dist(base.pos, ally.pos) * 0.05;
      candidates.push({
        score,
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

    // ---- Offensive: attack enemy base with bombers + escort
    for (const eb of enemyBases) {
      if (!reachable(s, base, eb, true)) continue;
      if (base.bombers <= 0 && base.fighters < 4) continue;
      const useB = Math.min(base.bombers, 4);
      const escort = Math.min(base.fighters, Math.max(2, useB + 1));
      if (useB + escort <= 0) continue;
      // Don't strip a base that's itself threatened
      const selfThreat = inFlightThreatTo(s, base);
      const reserveOk = base.fighters - escort >= Math.ceil(selfThreat / 2);
      if (!reserveOk) continue;
      const value = targetValue(eb);
      const enemyDef = eb.fighters * 4;
      const score = value * 1.2 - enemyDef * 0.6 - dist(base.pos, eb.pos) * 0.04 + useB * 3;
      candidates.push({
        score,
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

    // ---- Offensive: bomb enemy city
    for (const ec of enemyCities) {
      if (!reachable(s, base, ec, true)) continue;
      const useB = Math.min(base.bombers, ec.isCapital ? 5 : 3);
      const escort = Math.min(base.fighters, Math.max(1, useB));
      if (useB <= 0) continue;
      const selfThreat = inFlightThreatTo(s, base);
      const reserveOk = base.fighters - escort >= Math.ceil(selfThreat / 2);
      if (!reserveOk) continue;
      const value = targetValue(ec);
      const score = value * 1.4 - dist(base.pos, ec.pos) * 0.05 + useB * 2.5;
      candidates.push({
        score,
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

  // Defensive consideration: if my own city is under heavy threat and we have no plan, prioritize transfer of fighters to nearest friendly base near it.
  for (const city of myCities) {
    const threat = inFlightThreatTo(s, city);
    if (threat <= 0) continue;
    // boost any transfer suggestion landing at the base nearest this city
    let nearest = myBases[0];
    let nd = nearest ? dist(nearest.pos, city.pos) : Infinity;
    for (const b of myBases) {
      const d = dist(b.pos, city.pos);
      if (d < nd) { nd = d; nearest = b; }
    }
    if (!nearest) continue;
    for (const c of candidates) {
      if (c.description.includes(nearest.name)) c.score += threat * 4;
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/** Best single suggestion for a faction (top of allMovesFor). */
export function bestMoveFor(s: GameState, faction: Faction): Suggestion | null {
  return allMovesFor(s, faction)[0] ?? null;
}

/**
 * Run AI cadence — two distinct AIs.
 *
 *  SOUTH (attacker): Monte Carlo rollout planner.
 *    - Launches scheduled waves with the best multi-base coordinated plan
 *    - Between waves, opportunistically presses if mean rollout shows clear gain
 *
 *  NORTH (defender): Risk-minimizing reactive defender.
 *    - Reinforces threatened bases first; counter-strikes only when safe
 *    - Always keeps a fighter reserve at the base nearest the capital
 *    - Uses worst-case (max-regret) scoring so it picks moves that protect the worst outcome
 */
export function runAITick(s: GameState) {
  const p = s.params;

  // -------- SOUTH: attacker (Monte Carlo) --------
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

  // -------- NORTH: defender (risk-minimizing) --------
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

  // No active threat — keep capital guard healthy before any offense
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

  // Counter-strike only when clearly favorable in worst-case
  if (ranked && ranked.kind !== "fortify" && ranked.projectedScore > 15) {
    applyPlan(s, ranked);
    return;
  }
  const sug = bestMoveFor(s, "north");
  if (sug && sug.kind !== "transfer" && sug.score > 25) sug.apply(s);
}
