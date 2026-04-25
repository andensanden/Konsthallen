import { createInitialState } from "./initial";
import { tick } from "./engine";
import { runAITick, setNorthAI, northAI } from "./ai"; // Se till att exportera northAI!
import { NeuralNetwork } from "./ai_network";

// ==========================================
// Klistra in din tränade AI här för testet!
// ==========================================
const trainedWeights = {
    "ih": [[/* dina vikter */]],
    "ho": [[/* dina vikter */]]
};

function runBenchmark(antalMatcher: number) {
    console.log(`Börjar test av ${antalMatcher} matcher. Håll i dig...`);
    
    // 1. Skapa hjärnan och ladda in dina tränade vikter
    let testBrain = new NeuralNetwork(10, 16, 4);
    // testBrain.setWeights(trainedWeights.ih, trainedWeights.ho); 
    
    // Aktivera hjärnan
    setNorthAI(testBrain);

    let winsNorth = 0;
    let winsSouth = 0;
    let draws = 0;
    let totalCityHpLeft = 0;

    // 2. Spela matcherna!
    for (let i = 0; i < antalMatcher; i++) {
        let s = createInitialState();
        let matchTime = 0;
        
        while (matchTime < 300 && s.winner === null) {
            runAITick(s);
            tick(s, 0.5);
            matchTime += 0.5;
        }

        // 3. Registrera vem som vann
        if (s.winner === "north") winsNorth++;
        else if (s.winner === "south") winsSouth++;
        else draws++;

        // 4. Räkna ihop hur mycket hälsa städerna hade kvar
        for (const city of s.cities) {
            if (city.faction === "north") {
                totalCityHpLeft += city.hp;
            }
        }
    }

    // ==========================================
    // PRESENTERA RESULTATET
    // ==========================================
    console.log("\n==================================");
    console.log("🏆 TESTRESULTAT (NORTH AI) 🏆");
    console.log("==================================");
    console.log(`Antal matcher: ${antalMatcher}`);
    console.log(`Vinstprocent:  ${((winsNorth / antalMatcher) * 100).toFixed(1)}%`);
    console.log(`- Vinster:     ${winsNorth}`);
    console.log(`- Förluster:   ${winsSouth}`);
    console.log(`- Oavgjorda:   ${draws}`);
    
    let maxPossibleHp = 100 + 100 + 160; // Max HP för de 3 städerna från din initial.ts
    let avgHpLeft = totalCityHpLeft / antalMatcher;
    let hpPercent = (avgHpLeft / maxPossibleHp) * 100;
    console.log(`\nSnitthälsa på städer: ${avgHpLeft.toFixed(0)} / ${maxPossibleHp} HP (${hpPercent.toFixed(1)}%)`);
    console.log("==================================\n");
}

// Starta testet med 100 matcher!
runBenchmark(100);