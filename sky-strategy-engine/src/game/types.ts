export type Faction = "north" | "south";
export type BaseId = string;
export type CityId = string;

export interface Vec2 {
  x: number;
  y: number;
}

export interface City {
  id: CityId;
  name: string;
  faction: Faction;
  pos: Vec2;
  isCapital: boolean;
  hp: number;
  maxHp: number;
}

export interface AirBase {
  id: BaseId;
  name: string;
  faction: Faction;
  pos: Vec2;
  hp: number;
  maxHp: number;
  fighters: number;
  bombers: number;
  missiles: number;
}

export type AircraftRole = "fighter" | "bomber";
export type MissionKind = "attack_base" | "attack_city" | "transfer" | "missile_strike";

export interface Flight {
  id: string;
  faction: Faction;
  fromId: BaseId;
  targetId: string; // base or city id (or another flight id for intercept)
  kind: MissionKind;
  fighters: number;
  bombers: number;
  missiles: number;       // missile payload (only meaningful for missile_strike)
  pos: Vec2;
  origin: Vec2;
  dest: Vec2;
  fuel: number;
  speed: number;
  progress: number;
  totalDist: number;
}

/** Ground anti-air unit. Slow movement on own land, intercepts air units in range. */
export interface AAUnit {
  id: string;
  faction: Faction;
  pos: Vec2;
  dest: Vec2 | null;       // movement order target (own-territory tile)
  hp: number;
  maxHp: number;
  range: number;           // engagement radius (map units)
  speed: number;           // ground speed (units/sec)
  fireCooldown: number;    // seconds until can fire again
}

export interface LogEntry {
  t: number;
  faction?: Faction;
  text: string;
}

export interface UnitCosts {
  fighter: number;
  bomber: number;
  missile: number;
  aa: number;
  // per-second-of-flight operating cost per unit on a sortie
  fighterOpsPerSec: number;
  bomberOpsPerSec: number;
}

export interface SimParams {
  flightSpeed: number;
  maxFuel: number;
  fighterVsFighter: number;
  bomberDmg: number;
  fighterStrafeDmg: number;
  flakDmgPerUnit: number;
  productionInterval: number;
  northProdRate: number;
  southProdRate: number;
  southWaveBase: number;
  southWaveInterval: number;
  northThinkInterval: number;
  southThinkInterval: number;
  interceptRange: number;
  interceptScrambleFraction: number;
  // economy
  baseIncomePerSec: number;
  cityIncomePerSec: number;
  capitalIncomePerSec: number;
  // missiles
  missileSpeedMult: number;
  missileDmg: number;
  missileMaxFuel: number;   // hard range cap for missiles (independent of aircraft fuel)
  // AA
  aaRange: number;
  aaSpeed: number;
  aaFireInterval: number;
  aaDmgPerShot: number;     // damage to fighters/bombers per shot (kills units probabilistically)
  aaHp: number;             // HP of newly built AA units
  aaCoastBand: number;      // how far past own land coastline AA may roll (sea margin in map units)
  costs: UnitCosts;
}

export interface GameState {
  time: number;
  paused: boolean;
  speed: number;
  params: SimParams;
  cities: City[];
  bases: AirBase[];
  flights: Flight[];
  aaUnits: AAUnit[];
  credits: { north: number; south: number };
  log: LogEntry[];
  nextWaveAt: number;
  waveNumber: number;
  winner: Faction | "draw" | null;
  northThinkAt: number;
  southThinkAt: number;
  lastProduceAt: number;
}
