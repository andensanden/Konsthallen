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
    { id: "cN1", name: "Northgate", faction: "north", pos: { x: 150, y: 200 }, isCapital: false, hp: 100, maxHp: 100 },
    { id: "cN2", name: "Aurelia",   faction: "north", pos: { x: 845, y: 130 }, isCapital: false, hp: 100, maxHp: 100 },
    { id: "cNcap", name: "Vorhal (Capital)", faction: "north", pos: { x: 250, y: 70 }, isCapital: true, hp: 160, maxHp: 160 },
    { id: "cS1", name: "Brackton",  faction: "south", pos: { x: 90,  y: 670 }, isCapital: false, hp: 100, maxHp: 100 },
    { id: "cS2", name: "Hollowfen", faction: "south", pos: { x: 510, y: 705 }, isCapital: false, hp: 100, maxHp: 100 },
    { id: "cScap", name: "Sondermere (Capital)", faction: "south", pos: { x: 745, y: 720 }, isCapital: true, hp: 160, maxHp: 160 },
  ];

  const bases: AirBase[] = [
    { id: "bN1", name: "Falconreach", faction: "north", pos: { x: 240, y: 200 }, hp: 120, maxHp: 120, fighters: 6, bombers: 2 },
    { id: "bN2", name: "Skyhold",     faction: "north", pos: { x: 680, y: 235 }, hp: 120, maxHp: 120, fighters: 5, bombers: 2 },
    { id: "bN3", name: "Northwind",   faction: "north", pos: { x: 510, y: 50 },  hp: 120, maxHp: 120, fighters: 4, bombers: 1 },
    { id: "bS1", name: "Ironclaw",    faction: "south", pos: { x: 540, y: 530 }, hp: 140, maxHp: 140, fighters: 9, bombers: 4 },
    { id: "bS2", name: "Redspear",    faction: "south", pos: { x: 870, y: 615 }, hp: 140, maxHp: 140, fighters: 8, bombers: 4 },
    { id: "bS3", name: "Suncrest",    faction: "south", pos: { x: 215, y: 700 }, hp: 140, maxHp: 140, fighters: 7, bombers: 3 },
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
