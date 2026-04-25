// train.ts
import * as fs from 'fs'; // För att spara till hårddisken
import { createInitialState } from "./initial";
import { tick } from "./engine";
import { runAITick, setNorthAI, setSouthAI } from "./ai"; 
import { NeuralNetwork } from "./ai_network";

const POPULATION_SIZE = 100;
const MATCHES_PER_BRAIN = 3;
const MUTATION_RATE = 0.05;

// Filnamn för att spara framstegen
const SOUTH_FILE = "./weights_south.json";
const NORTH_FILE = "./weights_north.json";

// ==========================================
// FUNKTION FÖR ATT SPARA OCH LADDA
// ==========================================
function saveWeights(file: string, weights: any) {
    fs.writeFileSync(file, JSON.stringify(weights));
    console.log(`💾 Sparade vikter till ${file}`);
}

function loadWeights(file: string): any | null {
    if (fs.existsSync(file)) {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    }
    return null;
}

// ==========================================
// HUVUDLOOP: EVIGHETSMASKINEN
// ==========================================
async function startInfiniteTraining() {
    let round = 1;

    while (true) {
        console.log(`\n\n🚀 === STARTAR TRÄNINGSRUNDA ${round} ===`);

        // --- FAS 1: TRÄNA SOUTH I 100 GENERATIONER ---
        console.log("\n🎯 Fas 1: Tränar South för att knäcka North...");
        const bestSouth = runTrainingPhase("south", 100);
        saveWeights(SOUTH_FILE, bestSouth);

        // --- FAS 2: TRÄNA NORTH I 200 GENERATIONER ---
        console.log("\n🛡️ Fas 2: Tränar North för att stå emot den nya South...");
        const bestNorth = runTrainingPhase("north", 200);
        saveWeights(NORTH_FILE, bestNorth);

        round++;
        console.log(`\n✅ Runda ${round-1} klar. Påbörjar nästa runda med de senaste vikterna...`);
    }
}

function runTrainingPhase(factionToTrain: "north" | "south", generations: number): any {
    // Ladda de absolut senaste vikterna från disk inför varje fas
    let currentBestNorth = loadWeights(NORTH_FILE);
    let currentBestSouth = loadWeights(SOUTH_FILE);

    // Skapa motståndaren (den vi INTE tränar just nu)
    let opponentBrain = new NeuralNetwork(10, 16, 4);
    let oppWeights = factionToTrain === "north" ? currentBestSouth : currentBestNorth;
    if (oppWeights) opponentBrain.setWeights(oppWeights.ih, oppWeights.ho);

    // Skapa vår befolkning (utgå från våra egna senaste vikter om de finns)
    let myWeights = factionToTrain === "north" ? currentBestNorth : currentBestSouth;
    let population: NeuralNetwork[] = [];
    
    for (let i = 0; i < POPULATION_SIZE; i++) {
        let brain = new NeuralNetwork(10, 16, 4);
        if (myWeights) {
            brain.setWeights(myWeights.ih, myWeights.ho);
            if (i > 0) mutateWeights(brain); // Alla utom den första muteras
        }
        population.push(brain);
    }

    for (let gen = 0; gen < generations; gen++) {
        let fitnessScores: { ai: NeuralNetwork, score: number }[] = [];

        for (let brain of population) {
            let totalScore = 0;
            for (let m = 0; m < MATCHES_PER_BRAIN; m++) {
                totalScore += playMatch(brain, factionToTrain, opponentBrain);
            }
            fitnessScores.push({ ai: brain, score: totalScore / MATCHES_PER_BRAIN });
        }

        fitnessScores.sort((a, b) => b.score - a.score);
        
        // Logga framsteg var 10:e generation
        if (gen % 10 === 0) {
            console.log(`  [${factionToTrain.toUpperCase()}] Gen ${gen}/${generations} - Bästa: ${fitnessScores[0].score.toFixed(1)}`);
        }

        // Evolution (Selektion + Mutation)
        let nextGen: NeuralNetwork[] = [];
        for (let i = 0; i < 10; i++) nextGen.push(fitnessScores[i].ai); // Elitism
        while (nextGen.length < POPULATION_SIZE) {
            let parent = fitnessScores[Math.floor(Math.random() * 20)].ai;
            let child = new NeuralNetwork(10, 16, 4);
            child.setWeights(parent.getWeights().ih, parent.getWeights().ho);
            mutateWeights(child);
            nextGen.push(child);
        }
        population = nextGen;
    }

    return population[0].getWeights();
}

// Hjälpfunktion för mutation (ändrad för att modifiera existerande hjärna)
function mutateWeights(brain: NeuralNetwork) {
    let weights = brain.getWeights();
    const mutate = (m: number[][]) => {
        for (let i = 0; i < m.length; i++) {
            for (let j = 0; j < m[i].length; j++) {
                if (Math.random() < MUTATION_RATE) m[i][j] += (Math.random() * 0.4) - 0.2;
            }
        }
    };
    mutate(weights.ih);
    mutate(weights.ho);
    brain.setWeights(weights.ih, weights.ho);
}

// Återanvänd din playMatch-funktion från förra exemplet här...
function playMatch(trainingBrain: NeuralNetwork, trainingFaction: "north" | "south", opponentBrain: NeuralNetwork): number {
    if (trainingFaction === "north") {
        setNorthAI(trainingBrain);
        setSouthAI(opponentBrain);
    } else {
        setSouthAI(trainingBrain);
        setNorthAI(opponentBrain);
    }

    let s = createInitialState();
    let matchTime = 0;
    while(matchTime < 300 && s.winner === null) {
        runAITick(s);
        tick(s, 0.5); 
        matchTime += 0.5;
    }

    let fitness = 0;
    if (trainingFaction === "north") {
        for(const city of s.cities) if(city.faction === "north") fitness += city.hp * (city.isCapital ? 3 : 1); 
        for(const base of s.bases) if(base.faction === "north") fitness += base.hp;
        if (s.winner === "north") fitness += 5000; 
        else if (s.winner === "south") fitness -= (300 - matchTime) * 10; 
    } else {
        for(const city of s.cities) if(city.faction === "north") fitness += (city.maxHp - city.hp) * (city.isCapital ? 3 : 1);
        for(const base of s.bases) if(base.faction === "north") fitness += (base.maxHp - base.hp);
        if (s.winner === "south") fitness += 5000 + (300 - matchTime) * 10; 
    }
    return fitness;
}

// STARTA ALLT
startInfiniteTraining();