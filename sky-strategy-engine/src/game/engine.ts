import { AAUnit, AirBase, City, Faction, Flight, GameState, MissionKind, Vec2 } from "./types";

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function findBase(s: GameState, id: string): AirBase | undefined {
  return s.bases.find((b) => b.id === id);
}
export function findCity(s: GameState, id: string): City | undefined {
  return s.cities.find((c) => c.id === id);
}
export function findTarget(s: GameState, id: string) {
  return findBase(s, id) ?? findCity(s, id);
}

export function log(s: GameState, text: string, faction?: Flight["faction"]) {
  s.log.unshift({ t: s.time, text, faction });
  if (s.log.length > 80) s.log.pop();
}

export function fuelNeeded(s: GameState, from: Vec2, to: Vec2, roundTrip: boolean): number {
  const d = dist(from, to);
  return roundTrip ? d * 2 + 80 : d + 50;
}

// ---------------- Land mask -----------------
// Coarse polygon match to GameMap landmasses. Used to constrain AA movement.
const NORTH_LAND_MAX_Y = 360;     // approximate south edge of north mainland
const SOUTH_LAND_MIN_Y = 510;     // approximate north edge of south mainland
const MAP_W = 1000;
const MAP_H = 780;

export function isInOwnLand(faction: Faction, pos: Vec2, coastBand: number = 0): boolean {
  if (pos.x < -coastBand || pos.x > MAP_W + coastBand || pos.y < -coastBand || pos.y > MAP_H + coastBand) return false;
  // Allow up to `coastBand` map units past the friendly coastline into the sea
  // so AA can deploy along the shore but not cross to the other side.
  if (faction === "north") return pos.y <= NORTH_LAND_MAX_Y + coastBand;
  return pos.y >= SOUTH_LAND_MIN_Y - coastBand;
}

// ---------------- Economy -----------------

export function unitOpsCost(s: GameState, fighters: number, bombers: number, distance: number, roundTrip: boolean): number {
  const seconds = (distance * (roundTrip ? 2 : 1)) / Math.max(1, s.params.flightSpeed);
  return seconds * (fighters * s.params.costs.fighterOpsPerSec + bombers * s.params.costs.bomberOpsPerSec);
}

export function tickIncome(s: GameState, dt: number) {
  for (const faction of ["north", "south"] as const) {
    let inc = 0;
    for (const b of s.bases) if (b.faction === faction && b.hp > 0) inc += s.params.baseIncomePerSec;
    for (const c of s.cities) {
      if (c.faction !== faction || c.hp <= 0) continue;
      inc += c.isCapital ? s.params.capitalIncomePerSec : s.params.cityIncomePerSec;
    }
    s.credits[faction] += inc * dt;
  }
}

// ---------------- Launching ----------------

export function launchFlight(
  s: GameState,
  base: AirBase,
  target: AirBase | City,
  kind: MissionKind,
  fighters: number,
  bombers: number,
): Flight | null {
  if (kind === "missile_strike") return null; // use launchMissile
  if (fighters > base.fighters || bombers > base.bombers) return null;
  if (fighters + bombers <= 0) return null;
  const required = fuelNeeded(s, base.pos, target.pos, kind !== "transfer");
  if (required > s.params.maxFuel) return null;

  // Operating cost (deducted at launch). Allow negative credits — debt is just a soft signal.
  const d = dist(base.pos, target.pos);
  const ops = unitOpsCost(s, fighters, bombers, d, kind !== "transfer");
  s.credits[base.faction] -= ops;

  base.fighters -= fighters;
  base.bombers -= bombers;

  const f: Flight = {
    id: `f${Math.random().toString(36).slice(2, 9)}`,
    faction: base.faction,
    fromId: base.id,
    targetId: target.id,
    kind,
    fighters,
    bombers,
    missiles: 0,
    pos: { ...base.pos },
    origin: { ...base.pos },
    dest: { ...target.pos },
    fuel: s.params.maxFuel,
    speed: s.params.flightSpeed,
    progress: 0,
    totalDist: d,
  };
  s.flights.push(f);
  const targetName = (target as { name?: string }).name ?? (target as { id: string }).id;
  log(
    s,
    `${base.name} → ${targetName}: ${kind.replace("_", " ")} (${fighters}F / ${bombers}B) · -${ops.toFixed(0)}cr`,
    base.faction,
  );
  return f;
}

export function launchMissile(
  s: GameState,
  base: AirBase,
  target: AirBase | City,
  count: number,
): Flight | null {
  if (count <= 0 || base.missiles < count) return null;
  // Missiles: one-way only with their own short range cap.
  const required = fuelNeeded(s, base.pos, target.pos, false);
  if (required > s.params.missileMaxFuel) return null;

  base.missiles -= count;
  const d = dist(base.pos, target.pos);
  const f: Flight = {
    id: `m${Math.random().toString(36).slice(2, 9)}`,
    faction: base.faction,
    fromId: base.id,
    targetId: target.id,
    kind: "missile_strike",
    fighters: 0,
    bombers: 0,
    missiles: count,
    pos: { ...base.pos },
    origin: { ...base.pos },
    dest: { ...target.pos },
    fuel: s.params.missileMaxFuel,
    speed: s.params.flightSpeed * s.params.missileSpeedMult,
    progress: 0,
    totalDist: d,
  };
  s.flights.push(f);
  const targetName = (target as { name?: string }).name ?? (target as { id: string }).id;
  log(s, `${base.name} launches ${count}× missile → ${targetName}`, base.faction);
  return f;
}

// ---------------- Purchasing ----------------

export type PurchaseKind = "fighter" | "bomber" | "missile" | "aa";

export function purchaseUnit(s: GameState, faction: Faction, kind: PurchaseKind, baseId?: string): boolean {
  const c = s.params.costs;
  const price = kind === "fighter" ? c.fighter : kind === "bomber" ? c.bomber : kind === "missile" ? c.missile : c.aa;
  if (s.credits[faction] < price) return false;

  if (kind === "aa") {
    // Spawn at faction's most-threatened owned base (or a default position)
    const bases = s.bases.filter((b) => b.faction === faction && b.hp > 0);
    if (bases.length === 0) return false;
    const home = bases[Math.floor(Math.random() * bases.length)];
    s.credits[faction] -= price;
    s.aaUnits.push({
      id: `aa${Math.random().toString(36).slice(2, 9)}`,
      faction,
      pos: { ...home.pos },
      dest: null,
      hp: s.params.aaHp,
      maxHp: s.params.aaHp,
      range: s.params.aaRange,
      speed: s.params.aaSpeed,
      fireCooldown: 0,
    });
    log(s, `New AA battery deployed near ${home.name} (-${price}cr)`, faction);
    return true;
  }

  // Aircraft / missile go to a base
  let base: AirBase | undefined;
  if (baseId) base = s.bases.find((b) => b.id === baseId && b.faction === faction && b.hp > 0);
  if (!base) {
    const bases = s.bases.filter((b) => b.faction === faction && b.hp > 0);
    if (bases.length === 0) return false;
    // Prefer base with lowest count of that unit
    base = bases.reduce((best, b) => {
      const v = (kind === "fighter" ? b.fighters : kind === "bomber" ? b.bombers : b.missiles);
      const vb = (kind === "fighter" ? best.fighters : kind === "bomber" ? best.bombers : best.missiles);
      return v < vb ? b : best;
    });
  }
  s.credits[faction] -= price;
  if (kind === "fighter") base.fighters += 1;
  else if (kind === "bomber") base.bombers += 1;
  else base.missiles += 1;
  log(s, `Built 1× ${kind} at ${base.name} (-${price}cr)`, faction);
  return true;
}

// ---------------- Combat (mid-air) ----------------

function returnHome(s: GameState, f: Flight) {
  const friendly = s.bases.filter((b) => b.faction === f.faction && b.hp > 0);
  if (friendly.length === 0) {
    log(s, `Flight from ${f.fromId} lost — no base to recover to.`, f.faction);
    return;
  }
  let best = friendly[0];
  let bd = dist(f.pos, best.pos);
  for (const b of friendly) {
    const d = dist(f.pos, b.pos);
    if (d < bd) { bd = d; best = b; }
  }
  if (bd > f.fuel) {
    log(s, `Flight ditched — out of fuel before reaching ${best.name}.`, f.faction);
    return;
  }
  f.kind = "transfer";
  f.targetId = best.id;
  f.origin = { ...f.pos };
  f.dest = { ...best.pos };
  f.totalDist = bd;
  f.progress = 0;
}

function midairCombat(s: GameState, defender: Flight, attacker: Flight) {
  const p = s.params;
  const dF = defender.fighters;
  const aF = attacker.fighters;
  const fights = Math.min(dF, aF);
  const aLost = Math.round(fights * p.fighterVsFighter + Math.random() * 0.5);
  const dLost = Math.round(fights * (1 - p.fighterVsFighter) + Math.random() * 0.5);
  attacker.fighters = Math.max(0, aF - aLost);
  defender.fighters = Math.max(0, dF - dLost);

  const bombKill = Math.min(defender.fighters, attacker.bombers);
  const bombersDown = Math.round(bombKill * 0.7);
  attacker.bombers = Math.max(0, attacker.bombers - bombersDown);

  log(
    s,
    `Intercept! ${defender.fighters + dLost}F vs ${aF}F/${attacker.bombers + bombersDown}B → atk -${aLost}F/-${bombersDown}B, def -${dLost}F.`,
    defender.faction,
  );
  returnHome(s, defender);
}

function tryScrambleIntercept(s: GameState, attacker: Flight) {
  if (attacker.kind === "transfer" || attacker.kind === "missile_strike") return;
  const p = s.params;
  const candidates = s.bases.filter(
    (b) => b.faction !== attacker.faction && b.hp > 0 && b.fighters > 0
      && dist(b.pos, attacker.pos) <= p.interceptRange
      && !s.flights.some((x) => x.fromId === b.id && x.targetId === attacker.id),
  );
  if (candidates.length === 0) return;
  candidates.sort((a, b) => b.fighters - a.fighters);
  const base = candidates[0];
  const send = Math.max(1, Math.floor(base.fighters * p.interceptScrambleFraction));
  base.fighters -= send;
  const interceptor: Flight = {
    id: `i${Math.random().toString(36).slice(2, 9)}`,
    faction: base.faction,
    fromId: base.id,
    targetId: attacker.id,
    kind: "attack_base",
    fighters: send,
    bombers: 0,
    missiles: 0,
    pos: { ...base.pos },
    origin: { ...base.pos },
    dest: { ...attacker.pos },
    fuel: p.maxFuel,
    speed: p.flightSpeed * 1.15,
    progress: 0,
    totalDist: dist(base.pos, attacker.pos),
  };
  s.flights.push(interceptor);
  log(s, `${base.name} scrambles ${send}F to intercept!`, base.faction);
}

// ---------------- AA logic ----------------

function tickAA(s: GameState, dt: number) {
  const p = s.params;
  for (const aa of s.aaUnits) {
    if (aa.hp <= 0) continue;

    // Movement on own land
    if (aa.dest) {
      const d = dist(aa.pos, aa.dest);
      if (d < 2) {
        aa.dest = null;
      } else {
        const step = aa.speed * dt;
        const nx = aa.pos.x + ((aa.dest.x - aa.pos.x) / d) * Math.min(step, d);
        const ny = aa.pos.y + ((aa.dest.y - aa.pos.y) / d) * Math.min(step, d);
        // Clamp: only move if intermediate point is in own territory (forbids crossing sea)
        if (isInOwnLand(aa.faction, { x: nx, y: ny }, p.aaCoastBand)) {
          aa.pos = { x: nx, y: ny };
        } else {
          aa.dest = null; // abort if would leave territory
        }
      }
    }

    // Firing
    aa.fireCooldown = Math.max(0, aa.fireCooldown - dt);
    if (aa.fireCooldown > 0) continue;
    // Pick best target in range: enemy flight with most fighters+bombers (missiles ignored per design)
    let best: Flight | null = null;
    let bestVal = 0;
    for (const f of s.flights) {
      if (f.faction === aa.faction) continue;
      if (f.kind === "missile_strike") continue; // AA cannot intercept missiles
      const tot = f.fighters + f.bombers;
      if (tot <= 0) continue;
      if (dist(aa.pos, f.pos) > aa.range) continue;
      const v = f.bombers * 2 + f.fighters;
      if (v > bestVal) { bestVal = v; best = f; }
    }
    if (!best) continue;
    // Apply damage probabilistically
    const dmg = p.aaDmgPerShot;
    if (best.bombers > 0 && Math.random() < 0.5) {
      best.bombers = Math.max(0, best.bombers - Math.ceil(dmg));
    } else if (best.fighters > 0) {
      best.fighters = Math.max(0, best.fighters - Math.ceil(dmg));
    }
    aa.fireCooldown = p.aaFireInterval;
    log(s, `AA battery engages ${best.faction === "north" ? "N" : "S"} flight (-${Math.ceil(dmg)} unit).`, aa.faction);
  }
}

// ---------------- Combat resolution at target ----------------

function resolveCombatAtBase(s: GameState, f: Flight, base: AirBase) {
  const p = s.params;
  const cap = base.fighters;
  const atkF = f.fighters;
  const atkB = f.bombers;

  const fighterFights = Math.min(atkF, cap);
  const atkFLost = Math.round(fighterFights * p.fighterVsFighter + Math.random());
  const defFLost = Math.round(fighterFights * (1 - p.fighterVsFighter) + Math.random());
  f.fighters = Math.max(0, atkF - atkFLost);
  base.fighters = Math.max(0, cap - defFLost);

  const intercept = Math.min(f.fighters === 0 ? base.fighters : Math.max(0, base.fighters - 1), atkB);
  const bombersDown = Math.round(intercept * 0.6);
  f.bombers = Math.max(0, atkB - bombersDown);

  if (Math.random() < p.flakDmgPerUnit * 0.2) f.bombers = Math.max(0, f.bombers - 1);

  const dmg = f.bombers * p.bomberDmg + f.fighters * p.fighterStrafeDmg;
  base.hp = Math.max(0, base.hp - dmg);

  log(
    s,
    `Strike on ${base.name}: -${defFLost}F def, base HP ${Math.round(base.hp)}/${base.maxHp}. Attacker -${atkFLost}F/-${bombersDown}B.`,
    f.faction,
  );

  if (base.hp <= 0) {
    log(s, `${base.name} destroyed!`, f.faction);
    base.fighters = 0;
    base.bombers = 0;
    base.missiles = 0;
  }
}

function resolveCombatAtCity(s: GameState, f: Flight, city: City) {
  const p = s.params;
  const atkB = f.bombers;
  const atkF = f.fighters;
  if (Math.random() < 0.25) f.bombers = Math.max(0, atkB - 1);
  const dmg = atkB * p.bomberDmg + atkF * p.fighterStrafeDmg * 0.7;
  city.hp = Math.max(0, city.hp - dmg);
  log(s, `Raid on ${city.name}: HP ${Math.round(city.hp)}/${city.maxHp}.`, f.faction);
  if (city.hp <= 0) log(s, `${city.name} fallen!`, f.faction);
}

function resolveMissileImpact(s: GameState, f: Flight, target: AirBase | City) {
  const dmg = f.missiles * s.params.missileDmg;
  target.hp = Math.max(0, target.hp - dmg);
  log(s, `Missile impact on ${target.name}: -${dmg} HP (${Math.round(target.hp)}/${target.maxHp}).`, f.faction);
  if (target.hp <= 0) log(s, `${target.name} destroyed by missile strike!`, f.faction);
}

function landTransfer(s: GameState, f: Flight, base: AirBase) {
  if (base.faction !== f.faction || base.hp <= 0) {
    log(s, `Transfer aborted — destination ${base.name} not viable.`, f.faction);
    return;
  }
  base.fighters += f.fighters;
  base.bombers += f.bombers;
  log(s, `${f.fighters}F/${f.bombers}B landed at ${base.name}.`, f.faction);
}

// ---------------- Main tick ----------------

export function tick(s: GameState, dt: number) {
  if (s.paused || s.winner) return;
  const adt = dt * s.speed;
  s.time += adt;
  const p = s.params;

  tickIncome(s, adt);
  tickAA(s, adt);

  for (const f of [...s.flights]) {
    const stepDist = f.speed * adt;
    f.fuel -= stepDist;
    f.progress += stepDist / Math.max(1, f.totalDist);
    if (f.progress >= 1) f.progress = 1;
    f.pos = {
      x: f.origin.x + (f.dest.x - f.origin.x) * f.progress,
      y: f.origin.y + (f.dest.y - f.origin.y) * f.progress,
    };

    // Interceptors target moving flights — keep updating destination.
    // Skip if target is a missile (cannot be intercepted by fighters).
    const targetFlight = s.flights.find((x) => x.id === f.targetId);
    if (
      targetFlight && targetFlight.kind !== "missile_strike" &&
      f.fighters > 0 && f.bombers === 0 && f.faction !== targetFlight.faction
    ) {
      f.dest = { ...targetFlight.pos };
      f.totalDist = Math.max(1, dist(f.origin, f.dest));
      if (dist(f.pos, targetFlight.pos) < 18) {
        s.flights = s.flights.filter((x) => x !== f);
        midairCombat(s, f, targetFlight);
        if (targetFlight.fighters + targetFlight.bombers <= 0) {
          s.flights = s.flights.filter((x) => x !== targetFlight);
          log(s, `Attacking flight wiped out mid-air.`, targetFlight.faction);
        }
        continue;
      }
    }

    // Remove flights with no payload
    if (f.kind !== "missile_strike" && f.fighters + f.bombers <= 0) {
      s.flights = s.flights.filter((x) => x !== f);
      continue;
    }
    if (f.kind === "missile_strike" && f.missiles <= 0) {
      s.flights = s.flights.filter((x) => x !== f);
      continue;
    }

    if (f.progress >= 1) {
      const target = findTarget(s, f.targetId);
      s.flights = s.flights.filter((x) => x !== f);
      if (!target) continue;
      if (f.kind === "transfer") {
        if ("fighters" in target) landTransfer(s, f, target);
      } else if (f.kind === "missile_strike") {
        resolveMissileImpact(s, f, target);
      } else if (f.kind === "attack_base" && "fighters" in target) {
        resolveCombatAtBase(s, f, target);
        if (f.fighters + f.bombers > 0) {
          s.flights.push(f);
          returnHome(s, f);
        }
      } else if (f.kind === "attack_city" && !("fighters" in target)) {
        resolveCombatAtCity(s, f, target);
        if (f.fighters + f.bombers > 0) {
          s.flights.push(f);
          returnHome(s, f);
        }
      }
    } else if (f.fuel <= 0) {
      log(s, `Flight ran out of fuel.`, f.faction);
      s.flights = s.flights.filter((x) => x !== f);
    }
  }

  // Scramble interceptors
  for (const f of [...s.flights]) {
    if (f.kind === "transfer" || f.kind === "missile_strike") continue;
    tryScrambleIntercept(s, f);
  }

  // Production (passive base churn — independent of credits)
  if (s.time - s.lastProduceAt >= p.productionInterval) {
    s.lastProduceAt = s.time;
    for (const b of s.bases) {
      if (b.hp <= 0) continue;
      const rate = b.faction === "south" ? p.southProdRate : p.northProdRate;
      if (Math.random() < rate) b.fighters += 1;
      if (Math.random() < rate * 0.45) b.bombers += 1;
    }
  }

  // Win condition
  const northAlive = s.cities.some((c) => c.faction === "north" && c.hp > 0)
                  || s.bases.some((b) => b.faction === "north" && b.hp > 0);
  const southAlive = s.cities.some((c) => c.faction === "south" && c.hp > 0)
                  || s.bases.some((b) => b.faction === "south" && b.hp > 0);
  if (!northAlive && !southAlive) s.winner = "draw";
  else if (!northAlive) s.winner = "south";
  else if (!southAlive) s.winner = "north";
}
