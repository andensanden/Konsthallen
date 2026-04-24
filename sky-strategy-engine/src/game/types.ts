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
}

export type AircraftRole = "fighter" | "bomber";
export type MissionKind = "attack_base" | "attack_city" | "transfer";

export interface Flight {
  id: string;
  faction: Faction;
  fromId: BaseId;
  targetId: string; // base or city id
  kind: MissionKind;
  fighters: number;
  bombers: number;
  pos: Vec2;
  origin: Vec2;
  dest: Vec2;
  fuel: number;        // remaining range units
  speed: number;       // units per second
  progress: number;    // 0..1
  totalDist: number;
}

export interface LogEntry {
  t: number;
  faction?: Faction;
  text: string;
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
}

export interface GameState {
  time: number;
  paused: boolean;
  speed: number;
  params: SimParams;
  cities: City[];
  bases: AirBase[];
  flights: Flight[];
  log: LogEntry[];
  nextWaveAt: number;
  waveNumber: number;
  winner: Faction | "draw" | null;
  northThinkAt: number;
  southThinkAt: number;
  lastProduceAt: number;
}
