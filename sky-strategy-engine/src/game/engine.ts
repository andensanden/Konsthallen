import { AirBase, City, Flight, GameState, Vec2 } from "./types";

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

export function launchFlight(
  s: GameState,
  base: AirBase,
  target: AirBase | City,
  kind: Flight["kind"],
  fighters: number,
  bombers: number,
): Flight | null {
  if (fighters > base.fighters || bombers > base.bombers) return null;
  if (fighters + bombers <= 0) return null;
  const required = fuelNeeded(s, base.pos, target.pos, kind !== "transfer");
  if (required > s.params.maxFuel) return null;

  base.fighters -= fighters;
  base.bombers -= bombers;

  const d = dist(base.pos, target.pos);
  const f: Flight = {
    id: `f${Math.random().toString(36).slice(2, 9)}`,
    faction: base.faction,
    fromId: base.id,
    targetId: target.id,
    kind,
    fighters,
    bombers,
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
    `${base.name} → ${targetName}: ${kind.replace("_", " ")} (${fighters}F / ${bombers}B)`,
    base.faction,
  );
  return f;
}

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

/** Air-to-air encounter between two flights (interception en route). */
function midairCombat(s: GameState, defender: Flight, attacker: Flight) {
  const p = s.params;
  const dF = defender.fighters;
  const aF = attacker.fighters;
  const fights = Math.min(dF, aF);
  const aLost = Math.round(fights * p.fighterVsFighter + Math.random() * 0.5);
  const dLost = Math.round(fights * (1 - p.fighterVsFighter) + Math.random() * 0.5);
  attacker.fighters = Math.max(0, aF - aLost);
  defender.fighters = Math.max(0, dF - dLost);

  // Surviving defender fighters savage bombers
  const bombKill = Math.min(defender.fighters, attacker.bombers);
  const bombersDown = Math.round(bombKill * 0.7);
  attacker.bombers = Math.max(0, attacker.bombers - bombersDown);

  log(
    s,
    `Intercept! ${defender.fighters + dLost}F vs ${aF}F/${attacker.bombers + bombersDown}B → atk -${aLost}F/-${bombersDown}B, def -${dLost}F.`,
    defender.faction,
  );

  // Defender returns home regardless
  returnHome(s, defender);
}

/** When an enemy flight crosses near a base, that base may scramble interceptors. */
function tryScrambleIntercept(s: GameState, attacker: Flight) {
  if (attacker.kind === "transfer") return; // don't intercept ferries
  const p = s.params;
  const candidates = s.bases.filter(
    (b) => b.faction !== attacker.faction && b.hp > 0 && b.fighters > 0
      && dist(b.pos, attacker.pos) <= p.interceptRange
      && !s.flights.some((x) => x.fromId === b.id && x.targetId === attacker.id), // not already intercepting
  );
  if (candidates.length === 0) return;
  // Pick base with most fighters
  candidates.sort((a, b) => b.fighters - a.fighters);
  const base = candidates[0];
  const send = Math.max(1, Math.floor(base.fighters * p.interceptScrambleFraction));
  base.fighters -= send;
  const interceptor: Flight = {
    id: `i${Math.random().toString(36).slice(2, 9)}`,
    faction: base.faction,
    fromId: base.id,
    targetId: attacker.id,
    kind: "attack_base", // marker; resolved as midair on arrival
    fighters: send,
    bombers: 0,
    pos: { ...base.pos },
    origin: { ...base.pos },
    dest: { ...attacker.pos },
    fuel: p.maxFuel,
    speed: p.flightSpeed * 1.15, // interceptors faster
    progress: 0,
    totalDist: dist(base.pos, attacker.pos),
  };
  s.flights.push(interceptor);
  log(s, `${base.name} scrambles ${send}F to intercept!`, base.faction);
}

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

function landTransfer(s: GameState, f: Flight, base: AirBase) {
  if (base.faction !== f.faction || base.hp <= 0) {
    log(s, `Transfer aborted — destination ${base.name} not viable.`, f.faction);
    return;
  }
  base.fighters += f.fighters;
  base.bombers += f.bombers;
  log(s, `${f.fighters}F/${f.bombers}B landed at ${base.name}.`, f.faction);
}

export function tick(s: GameState, dt: number) {
  if (s.paused || s.winner) return;
  const adt = dt * s.speed;
  s.time += adt;
  const p = s.params;

  // Move flights
  for (const f of [...s.flights]) {
    const stepDist = f.speed * adt;
    f.fuel -= stepDist;
    f.progress += stepDist / Math.max(1, f.totalDist);
    if (f.progress >= 1) f.progress = 1;
    f.pos = {
      x: f.origin.x + (f.dest.x - f.origin.x) * f.progress,
      y: f.origin.y + (f.dest.y - f.origin.y) * f.progress,
    };

    // Interceptors target moving flights — keep updating destination
    const targetFlight = s.flights.find((x) => x.id === f.targetId);
    if (targetFlight && f.fighters > 0 && f.bombers === 0 && f.faction !== targetFlight.faction) {
      f.dest = { ...targetFlight.pos };
      f.totalDist = Math.max(1, dist(f.origin, f.dest));
      // Check rendezvous
      if (dist(f.pos, targetFlight.pos) < 18) {
        s.flights = s.flights.filter((x) => x !== f);
        midairCombat(s, f, targetFlight);
        // If the target attacker was wiped out, remove it (and its path) from the map
        if (targetFlight.fighters + targetFlight.bombers <= 0) {
          s.flights = s.flights.filter((x) => x !== targetFlight);
          log(s, `Attacking flight wiped out mid-air.`, targetFlight.faction);
        }
        continue;
      }
    }

    // Any flight that has lost all aircraft is removed (no ghost paths)
    if (f.fighters + f.bombers <= 0) {
      s.flights = s.flights.filter((x) => x !== f);
      continue;
    }

    if (f.progress >= 1) {
      const target = findTarget(s, f.targetId);
      s.flights = s.flights.filter((x) => x !== f);
      if (!target) continue;
      if (f.kind === "transfer") {
        if ("fighters" in target) landTransfer(s, f, target);
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

  // Scramble interceptors against attacking flights crossing defended airspace
  for (const f of [...s.flights]) {
    if (f.kind === "transfer") continue;
    // only intercept enemy flights heading to friendly assets
    tryScrambleIntercept(s, f);
  }

  // Production
  if (s.time - s.lastProduceAt >= p.productionInterval) {
    s.lastProduceAt = s.time;
    for (const b of s.bases) {
      if (b.hp <= 0) continue;
      const rate = b.faction === "south" ? p.southProdRate : p.northProdRate;
      if (Math.random() < rate) b.fighters += 1;
      if (Math.random() < rate * 0.45) b.bombers += 1;
    }
  }

  // Win condition: a side loses only when ALL its cities AND ALL its bases are eliminated
  const northAlive = s.cities.some((c) => c.faction === "north" && c.hp > 0)
                  || s.bases.some((b) => b.faction === "north" && b.hp > 0);
  const southAlive = s.cities.some((c) => c.faction === "south" && c.hp > 0)
                  || s.bases.some((b) => b.faction === "south" && b.hp > 0);
  if (!northAlive && !southAlive) s.winner = "draw";
  else if (!northAlive) s.winner = "south";
  else if (!southAlive) s.winner = "north";
}
