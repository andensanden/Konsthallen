import { GameState, City, AirBase, SimParams } from "./types";

export const DEFAULT_PARAMS: SimParams = {
  flightSpeed: 90,
  maxFuel: 1400,
  fighterVsFighter: 0.55,
  bomberDmg: 14,
  fighterStrafeDmg: 4,
  flakDmgPerUnit: 0.6,
  productionInterval: 8,
  northProdRate: 0.55,
  southProdRate: 0.9,
  southWaveBase: 1,
  southWaveInterval: 14,
  northThinkInterval: 3.5,
  southThinkInterval: 5,
  interceptRange: 260,
  interceptScrambleFraction: 0.5,
};

export function createInitialState(params: SimParams = DEFAULT_PARAMS): GameState {
  const cities: City[] = [
    { id: "cN1", name: "Valbrek", faction: "north", pos: { x: 854, y: 128 }, isCapital: false, hp: 100, maxHp: 100 },
    { id: "cN2", name: "Nordvik", faction: "north", pos: { x: 84, y: 194 }, isCapital: false, hp: 100, maxHp: 100 },
    { id: "cNcap", name: "Arktholm (Capital)", faction: "north", pos: { x: 251, y: 57 }, isCapital: true, hp: 160, maxHp: 160 },
    { id: "cS1", name: "Callhaven", faction: "south", pos: { x: 58, y: 690 }, isCapital: false, hp: 100, maxHp: 100 },
    { id: "cS2", name: "Solano", faction: "south", pos: { x: 346, y: 742 }, isCapital: false, hp: 100, maxHp: 100 },
    { id: "cScap", name: "Meridia (Capital)", faction: "south", pos: { x: 735, y: 725 }, isCapital: true, hp: 160, maxHp: 160 },
  ];

  const bases: AirBase[] = [
    { id: "bN1", name: "Northern Vanguard Base", faction: "north", pos: { x: 119, y: 196 }, hp: 120, maxHp: 120, fighters: 6, bombers: 2 },
    { id: "bN2", name: "Highridge Command", faction: "north", pos: { x: 503, y: 41 }, hp: 120, maxHp: 120, fighters: 5, bombers: 2 },
    { id: "bN3", name: "Boreal Watch Post", faction: "north", pos: { x: 695, y: 227 }, hp: 120, maxHp: 120, fighters: 4, bombers: 1 },
    { id: "bS1", name: "Firewatch Station", faction: "south", pos: { x: 839, y: 639 }, hp: 140, maxHp: 140, fighters: 9, bombers: 4 },
    { id: "bS2", name: "Southern Redoubt", faction: "south", pos: { x: 193, y: 739 }, hp: 140, maxHp: 140, fighters: 8, bombers: 4 },
    { id: "bS3", name: "Spear Point Base", faction: "south", pos: { x: 551, y: 519 }, hp: 140, maxHp: 140, fighters: 7, bombers: 3 },
  ];

  return {
    time: 0,
    paused: false,
    speed: 1,
    params,
    cities,
    bases,
    flights: [],
    log: [{ t: 0, text: "Theater command online — Boreal Passage simulation begin." }],
    nextWaveAt: 6,
    waveNumber: 0,
    winner: null,
    northThinkAt: 3,
    southThinkAt: 0,
    lastProduceAt: 0,
  };
}
