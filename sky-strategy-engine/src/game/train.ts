// train.ts

import { createInitialState } from "./initial";
import { tick } from "./engine";
import { runAITick, setNorthAI } from "./ai"; 
import { NeuralNetwork } from "./ai_network";

// ==========================================
// TRÄNINGSINSTÄLLNINGAR ("Pro-Setup")
// ==========================================
const POPULATION_SIZE = 150;      // Hur många AI:s tävlar samtidigt?
const GENERATIONS = 500;          // Hur många generationer ska vi köra?
const MATCHES_PER_BRAIN = 3;      // Spela 3 matcher och ta snittpoängen (tar bort tur/RNG)
const MUTATION_RATE = 0.02;       // 2% chans att en siffra muterar

// 1. Skapa den allra första befolkningen
let population: NeuralNetwork[] = [];
for (let i = 0; i < POPULATION_SIZE; i++) {
  population.push(new NeuralNetwork(10, 16, 4)); 
}

// 2. Träningsloopen
export function runTrainingGenerations(generations: number) {
  
  for (let gen = 0; gen < generations; gen++) {
    console.log(`\n--- Startar Generation ${gen} ---`);
    let fitnessScores: { ai: NeuralNetwork, score: number }[] = [];

    // Låt varje hjärna spela
    for (let i = 0; i < population.length; i++) {
      let brain = population[i];
      let totalScore = 0;
      
      // Spela flera matcher för att få bort slumpen
      for(let m = 0; m < MATCHES_PER_BRAIN; m++) {
          totalScore += playMatchWithBrain(brain);
      }
      
      let snittScore = totalScore / MATCHES_PER_BRAIN;
      fitnessScores.push({ ai: brain, score: snittScore });
    }

    // Sortera: Bäst poäng hamnar överst
    fitnessScores.sort((a, b) => b.score - a.score);
    console.log(`Bästa snittpoäng denna generation: ${fitnessScores[0].score.toFixed(1)}`);

    // Skapa nästa generation
    let nextGeneration: NeuralNetwork[] = [];
    
    // Elitism: Spara de 15 absolut bästa (10%) exakt som de är
    const elitismCount = 15;
    for(let i = 0; i < elitismCount; i++) {
        nextGeneration.push(fitnessScores[i].ai);
    }

    // Fyll på resten (135 st) genom att mutera de bästa
    for(let i = elitismCount; i < POPULATION_SIZE; i++) {
        // Välj slumpmässigt en "förälder" bland de 30 bästa
        let parentIndex = Math.floor(Math.random() * 30); 
        let parentBrain = fitnessScores[parentIndex].ai;
        
        let childBrain = mutateBrain(parentBrain);
        nextGeneration.push(childBrain);
    }

    population = nextGeneration;
  }
  
  // När loopen är klar: Skriv ut den bästa hjärnan!
  console.log("\n================================================");
  console.log("TRÄNING KLAR! Här är den bästa hjärnans kod:");
  console.log("================================================");
  console.log(JSON.stringify(population[0].getWeights()));
}

// ==========================================
// MATCH OCH POÄNGRÄKNING
// ==========================================
function playMatchWithBrain(brain: NeuralNetwork): number {
    
    // Tvinga spelet att använda denna hjärna för North
    setNorthAI(brain); 

    let s = createInitialState();
    let matchTime = 0;
    const maxMatchTime = 300; // Kör matchen i 5 in-game minuter
    
    // Kör matchen snabbt i bakgrunden
    while(matchTime < maxMatchTime && s.winner === null) {
        runAITick(s);
        tick(s, 0.5); 
        matchTime += 0.5;
    }

    // RÄKNA UT POÄNG (FITNESS) FÖR NORTH
    let fitness = 0;

    // 1. Överlevande städer ger massor av poäng
    for(const city of s.cities) {
        if(city.faction === "north") {
            // Huvudstaden är extremt viktig (x3 poäng)
            fitness += city.hp * (city.isCapital ? 3 : 1); 
        }
    }

    // 2. Överlevande flygbaser ger poäng
    for(const base of s.bases) {
        if(base.faction === "north") {
            fitness += base.hp;
        }
    }

    // 3. Om matchen tog slut, vann eller förlorade vi?
    if (s.winner === "north") {
        fitness += 5000; // Episk vinstbonus!
    } 
    else if (s.winner === "south") {
        // Om North dog, straffa dem baserat på hur snabbt de dog
        fitness -= (maxMatchTime - matchTime) * 10; 
    }

    return fitness;
}

// ==========================================
// MUTATION
// ==========================================
function mutateBrain(parent: NeuralNetwork): NeuralNetwork {
    let child = new NeuralNetwork(10, 16, 4);
    let weights = parent.getWeights();
    
    // Mutera vikterna mellan Input -> Dolda lagret
    for(let i=0; i<weights.ih.length; i++) {
        for(let j=0; j<weights.ih[i].length; j++) {
            if(Math.random() < MUTATION_RATE) {
                weights.ih[i][j] += (Math.random() * 0.4) - 0.2; 
            }
        }
    }
    
    // Mutera vikterna mellan Dolda lagret -> Output
    for(let i=0; i<weights.ho.length; i++) {
        for(let j=0; j<weights.ho[i].length; j++) {
            if(Math.random() < MUTATION_RATE) {
                weights.ho[i][j] += (Math.random() * 0.4) - 0.2; 
            }
        }
    }

    child.setWeights(weights.ih, weights.ho);
    return child;
}

// ==========================================
// STARTKOMMANDO
// ==========================================
runTrainingGenerations(GENERATIONS);