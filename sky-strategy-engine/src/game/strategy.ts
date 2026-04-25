import { dist, fuelNeeded, launchFlight, tick } from "./engine";
import { AirBase, City, Faction, GameState } from "./types";

// ============================================================
// State cloning (for lookahead simulation)
// ============================================================

export function cloneState(s: GameState): GameState {
  return {
    ...s,
    cities: s.cities.map((c) => ({ ...c })),
    bases: s.bases.map((b) => ({ ...b })),
    flights: s.flights.map((f) => ({
      ...f,
      pos: { ...f.pos },
      origin: { ...f.origin },
      dest: { ...f.dest },
    })),
    aaUnits: s.aaUnits.map((a) => ({ ...a, pos: { ...a.pos }, dest: a.dest ? { ...a.dest } : null })),
    credits: { ...s.credits },
    log: [...s.log],
  };
}

// ============================================================
// Coordinated multi-base plans
// ============================================================

export type PlanKind = "coordinated_strike" | "coordinated_raid" | "fortify";

export interface PlanLeg {
  fromBaseId: string;
  fromBaseName: string;
  fighters: number;
  bombers: number;
}

export interface CoordinatedPlan {
  id: string;
  faction: Faction;
  kind: PlanKind;
  targetId: string;
  targetName: string;
  targetKind: "base" | "city";
  legs: PlanLeg[];
  totalFighters: number;
  totalBombers: number;
  rawScore: number;          // heuristic prior
  projectedScore: number;    // after lookahead simulation
  description: string;
}

interface Candidate {
  base: AirBase;
  fighters: number;
  bombers: number;
  reachTime: number;
}

function selectContributors(
  s: GameState,
  faction: Faction,
  target: AirBase | City,
  kind: PlanKind,
): Candidate[] {
  const myBases = s.bases.filter((b) => b.faction === faction && b.hp > 0);
  const cands: Candidate[] = [];
  const isBase = "fighters" in target;

  for (const base of myBases) {
    const roundTrip = kind !== "fortify";
    if (fuelNeeded(s, base.pos, target.pos, roundTrip) > s.params.maxFuel) continue;

    // Reserve a defensive minimum based on incoming threat to this base
    const incomingThreat = s.flights
      .filter((f) => f.faction !== faction && f.targetId === base.id)
      .reduce((a, f) => a + f.fighters * 0.5 + f.bombers * 2, 0);
    const reserveF = Math.ceil(incomingThreat / 2);

    let useF = 0;
    let useB = 0;

    if (kind === "coordinated_strike") {
      useB = Math.min(base.bombers, isBase ? 4 : 0);
      const wantEscort = Math.max(2, useB + 1);
      useF = Math.min(Math.max(0, base.fighters - reserveF), wantEscort);
    } else if (kind === "coordinated_raid") {
      const cap = "isCapital" in target && target.isCapital;
      useB = Math.min(base.bombers, cap ? 5 : 3);
      const wantEscort = Math.max(1, useB);
      useF = Math.min(Math.max(0, base.fighters - reserveF), wantEscort);
    } else {
      // fortify (transfer)
      useF = Math.min(base.fighters, Math.max(0, base.fighters - reserveF));
      useB = 0;
    }

    if (useF + useB <= 0) continue;
    const reachTime = dist(base.pos, target.pos) / s.params.flightSpeed;
    cands.push({ base, fighters: useF, bombers: useB, reachTime });
  }

  cands.sort((a, b) => a.reachTime - b.reachTime);
  return cands;
}

function priorScore(
  s: GameState,
  faction: Faction,
  target: AirBase | City,
  legs: PlanLeg[],
): number {
  const totalF = legs.reduce((a, l) => a + l.fighters, 0);
  const totalB = legs.reduce((a, l) => a + l.bombers, 0);
  const value = "isCapital" in target
    ? (target.isCapital ? 100 : 45)
    : 35 + ((target as AirBase).fighters + (target as AirBase).bombers) * 2;
  const enemyDef = "fighters" in target ? (target as AirBase).fighters * 4 : 0;
  const massBonus = legs.length > 1 ? legs.length * 8 : 0;
  return value * 1.3 - enemyDef * 0.5 + totalB * 3 + totalF * 0.6 + massBonus;
}

export function generateCoordinatedPlans(s: GameState, faction: Faction): CoordinatedPlan[] {
  const plans: CoordinatedPlan[] = [];
  const enemyBases = s.bases.filter((b) => b.faction !== faction && b.hp > 0);
  const enemyCities = s.cities.filter((c) => c.faction !== faction && c.hp > 0);
  const myBasesUnderThreat = s.bases.filter((b) => {
    if (b.faction !== faction || b.hp <= 0) return false;
    return s.flights.some((f) => f.faction !== faction && f.targetId === b.id);
  });

  const buildPlan = (target: AirBase | City, kind: PlanKind, targetKind: "base" | "city"): CoordinatedPlan | null => {
    const cands = selectContributors(s, faction, target, kind);
    if (cands.length === 0) return null;
    const window = 4;
    const lead = cands[0].reachTime;
    const chosen = cands.filter((c) => c.reachTime - lead <= window).slice(0, 3);
    const legs: PlanLeg[] = chosen.map((c) => ({
      fromBaseId: c.base.id,
      fromBaseName: c.base.name,
      fighters: c.fighters,
      bombers: c.bombers,
    }));
    const totalF = legs.reduce((a, l) => a + l.fighters, 0);
    const totalB = legs.reduce((a, l) => a + l.bombers, 0);
    if (totalF + totalB <= 0) return null;
    const raw = priorScore(s, faction, target, legs);
    const verb = kind === "coordinated_strike" ? "Strike" : kind === "coordinated_raid" ? "Raid" : "Fortify";
    return {
      id: `plan_${faction}_${target.id}_${kind}`,
      faction,
      kind,
      targetId: target.id,
      targetName: target.name,
      targetKind,
      legs,
      totalFighters: totalF,
      totalBombers: totalB,
      rawScore: raw,
      projectedScore: raw,
      description: `${verb} ${target.name} — ${legs.length} base${legs.length > 1 ? "s" : ""}, ${totalF}F + ${totalB}B`,
    };
  };

  for (const eb of enemyBases) {
    const p = buildPlan(eb, "coordinated_strike", "base");
    if (p) plans.push(p);
  }
  for (const ec of enemyCities) {
    const p = buildPlan(ec, "coordinated_raid", "city");
    if (p) plans.push(p);
  }
  for (const ally of myBasesUnderThreat) {
    const p = buildPlan(ally, "fortify", "base");
    if (p) plans.push(p);
  }
  return plans;
}

export function applyPlan(s: GameState, plan: CoordinatedPlan): void {
  const target = plan.targetKind === "base"
    ? s.bases.find((b) => b.id === plan.targetId)
    : s.cities.find((c) => c.id === plan.targetId);
  if (!target) return;
  const kind = plan.kind === "fortify"
    ? "transfer"
    : plan.targetKind === "base" ? "attack_base" : "attack_city";
  for (const leg of plan.legs) {
    const base = s.bases.find((b) => b.id === leg.fromBaseId);
    if (!base) continue;
    const f = Math.min(leg.fighters, base.fighters);
    const b = Math.min(leg.bombers, base.bombers);
    if (f + b <= 0) continue;
    launchFlight(s, base, target, kind, f, b);
  }
}

// ============================================================
// Outcome scoring (no zonal advantage — pure asset value)
// ============================================================

interface FactionValue {
  bases: number;
  cities: number;
  capital: number;
  air: number;
  total: number;
}

function valueFor(s: GameState, faction: Faction): FactionValue {
  let bases = 0, cities = 0, capital = 0, air = 0;
  for (const b of s.bases) {
    if (b.faction !== faction) continue;
    bases += b.hp;
    air += b.fighters * 4 + b.bombers * 6;
  }
  for (const c of s.cities) {
    if (c.faction !== faction) continue;
    if (c.isCapital) capital += c.hp * 2.5;
    else cities += c.hp;
  }
  for (const f of s.flights) {
    if (f.faction !== faction) continue;
    air += f.fighters * 4 + f.bombers * 6;
  }
  return { bases, cities, capital, air, total: bases + cities + capital + air };
}

export interface OutcomeScore {
  myValue: number;
  enemyValue: number;
  net: number;
  myCapital: number;
}

function evaluateOutcome(s: GameState, faction: Faction): OutcomeScore {
  const mine = valueFor(s, faction);
  const enemy = valueFor(s, faction === "north" ? "south" : "north");
  return {
    myValue: mine.total,
    enemyValue: enemy.total,
    net: mine.total - enemy.total,
    myCapital: mine.capital,
  };
}

/** Run engine forward `seconds` of in-game time (no AI interference). */
function simulateForward(s: GameState, seconds: number): void {
  const stepDt = 0.5;
  const steps = Math.ceil(seconds / stepDt);
  const origSpeed = s.speed;
  s.speed = 1;
  for (let i = 0; i < steps; i++) tick(s, stepDt);
  s.speed = origSpeed;
}

// ============================================================
// South: Monte Carlo rollout planner (attacker)
// Samples N noisy futures per plan, picks highest mean net gain.
// ============================================================

function meanRolloutScore(
  base: GameState,
  plan: CoordinatedPlan | null,
  horizon: number,
  rollouts: number,
  faction: Faction,
): number {
  let sum = 0;
  for (let i = 0; i < rollouts; i++) {
    const sim = cloneState(base);
    if (plan) applyPlan(sim, plan);
    simulateForward(sim, horizon);
    sum += evaluateOutcome(sim, faction).net;
  }
  return sum / rollouts;
}

export function scorePlanMonteCarlo(
  base: GameState,
  plan: CoordinatedPlan,
  horizon = 18,
  rollouts = 3,
): number {
  const baseline = meanRolloutScore(base, null, horizon, rollouts, plan.faction);
  const planMean = meanRolloutScore(base, plan, horizon, rollouts, plan.faction);
  return planMean - baseline;
}

// ============================================================
// North: Risk-minimizing defender (worst-case projection)
// For each candidate, simulate, and score by minimizing damage to
// own capital + cities + bases (max-regret style).
// ============================================================

export function scorePlanRiskMin(
  base: GameState,
  plan: CoordinatedPlan,
  horizon = 18,
  rollouts = 3,
): number {
  // Worst (lowest) outcome among rollouts — this is what we want to maximize
  let worstBaseline = Infinity;
  let worstWithPlan = Infinity;
  for (let i = 0; i < rollouts; i++) {
    const a = cloneState(base);
    simulateForward(a, horizon);
    const oa = evaluateOutcome(a, plan.faction);
    // Heavy penalty for capital damage — defender's prime directive
    const va = oa.myValue - oa.enemyValue * 0.5 + oa.myCapital * 1.5;
    if (va < worstBaseline) worstBaseline = va;

    const b = cloneState(base);
    applyPlan(b, plan);
    simulateForward(b, horizon);
    const ob = evaluateOutcome(b, plan.faction);
    const vb = ob.myValue - ob.enemyValue * 0.5 + ob.myCapital * 1.5;
    if (vb < worstWithPlan) worstWithPlan = vb;
  }
  return worstWithPlan - worstBaseline;
}

// ============================================================
// Per-faction ranked plans
// ============================================================

export function rankedPlansFor(
  s: GameState,
  faction: Faction,
  opts: { horizon?: number; topK?: number; rollouts?: number } = {},
): CoordinatedPlan[] {
  const horizon = opts.horizon ?? 16;
  const topK = opts.topK ?? 4;
  const rollouts = opts.rollouts ?? (faction === "south" ? 3 : 2);
  const all = generateCoordinatedPlans(s, faction);
  if (all.length === 0) return [];
  all.sort((a, b) => b.rawScore - a.rawScore);
  const head = all.slice(0, topK);
  const scorer = faction === "south" ? scorePlanMonteCarlo : scorePlanRiskMin;
  for (const p of head) {
    p.projectedScore = scorer(s, p, horizon, rollouts);
  }
  const tail = all.slice(topK);
  const combined = [...head, ...tail];
  combined.sort((a, b) => b.projectedScore - a.projectedScore);
  return combined;
}

export function bestPlanFor(s: GameState, faction: Faction): CoordinatedPlan | null {
  const ranked = rankedPlansFor(s, faction);
  return ranked[0] ?? null;
}
