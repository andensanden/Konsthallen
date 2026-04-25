// ai.ts

import { dist, fuelNeeded, isInOwnLand, launchFlight, launchMissile, log, purchaseUnit, PurchaseKind } from "./engine";
import { AAUnit, AirBase, City, Faction, Flight, GameState } from "./types";
import { applyPlan, bestPlanFor, rankedPlansFor } from "./strategy";
import { NeuralNetwork } from "./ai_network"; // Importera hjärnan!

// NYTT: Lade till missile_strike så AI:n kan skilja på vanliga anfall och missiler
export type SuggestionKind = "transfer" | "attack_base" | "attack_city" | "missile_strike";

export interface Suggestion {
  score: number;
  faction: Faction;
  kind: SuggestionKind;
  description: string;
  fromBaseId: string;
  fromBaseName: string;
  targetId: string;
  targetName: string;
  fighters: number;
  bombers: number;
  apply: (s: GameState) => void;
}

// ============================================================
// AI HJÄRNORNA (En för varje lag)
// ============================================================
export let southAI = new NeuralNetwork(10, 16, 4);
export let northAI = new NeuralNetwork(10, 16, 4);

// 1. Skapa en variabel för dina tränade vikter (Klistra in hela din långa JSON här!)
const trainedNorthWeights = {"ih":[[0.24112211581297627,0.5098077608922919,0.6303703293324014,0.9095385998783465,-0.12205258414653092,-0.43552053589809264,-0.0164831712496403,-0.9783595521231364,0.37518002499050473,0.624944391065265,-1.1401081916568363,-0.7104742312376754,0.6175254316087758,-0.035623684278998924,-0.680263169742094,0.8845394015032075],[0.8942986953058708,-0.109591781363031,0.4417177071856077,-0.825277982749285,-1.1018848225109488,-0.5927904513318002,0.696734030134857,-0.9519601298200946,-1.2171575561390806,0.6294440015784064,-0.9144536624671932,0.8947867869483872,-0.30546333044425816,0.7477266834406673,0.0523481225022977,0.6376904144578031],[-1.373323891403097,-0.20970497199156962,-0.017794787475488683,-0.7119615747539281,-0.343168285170405,-0.4871867427059225,1.0753987087001744,-0.022424737997112892,0.16351175898963688,-0.7110113699694686,-0.7461701292624136,0.7338860494223278,-0.7500047593867425,-0.2763624832743608,-1.1254864167511656,0.11946076094927083],[0.805266759236555,-0.8119185823293544,0.16984722514911987,0.8241115682488701,0.37844116103627456,0.008451098467915391,-0.25772202134834155,0.6875536899523449,0.6837708147538114,-0.24970272455355208,0.9671406317129476,-1.2899330557851485,1.6034439780422565,0.6479853121375085,1.178251268267039,0.7534148190048195],[0.3284847112440622,0.5903157166188067,-0.13416519215237233,1.1643659250777598,-1.415853575560186,0.13121644172055674,1.0317300554651692,0.7515017514542583,-1.1057114274972881,-0.9858234453334602,1.2221030173299248,0.19025817219505495,0.31364113933551063,-1.0820897770188214,-1.3786209092086463,0.05834054345261944],[-1.2245966007614684,-0.2780274340970699,0.5289854929213857,0.6636818118472868,-0.6747435319196693,0.19604767066974482,-0.559720892136429,-0.10251256970068247,-1.1698135417860982,0.02462960178513382,-0.9016625342984806,-0.0024710825876558817,-0.2993493983308209,-1.003865100947532,0.1543238506883252,-1.2193847052758706],[0.6039188968695257,1.4210430789640927,1.2250988303911796,-0.6930325987877666,-1.6205308575656665,0.30491499457587384,1.1503281463052075,-0.7487016883114406,-0.2851683783394342,-1.3506992671260376,-0.5111715167643205,-0.15338730930253822,-0.22121407201696894,0.6718531787448484,0.29123331632658944,-0.7961762540204627],[0.32104896696474244,0.25238124019255004,0.8086916039995842,0.6560759567803364,-1.160066857234301,-0.2984132774856517,0.4185374265006737,-0.6129826014274432,0.29498427384262427,1.0888509877859776,0.2834351153809823,-0.045564970415641226,0.45466154435315026,-0.0437733914539801,0.6898494431050296,0.039116816795029666],[-0.5280722868729173,-0.5102592688566407,-0.040943083769094196,-0.679615004997824,-0.268444264246228,1.162206911207126,0.320583571572027,0.14550721344647893,1.265505506436925,0.4849399434236562,-0.8525013338465057,-0.5662338422148963,-0.34131233511257425,0.32003753591197703,1.389122840889056,0.3156573946713978],[-0.9090847487050521,-1.32750239964186,-0.3872415367835858,-0.02080405263355578,-0.4386060089439726,-0.38856001683837815,0.9194120607720242,0.20759259902145455,-0.2132811928443729,0.28722860716398146,0.14941720736183497,-1.4456638647546527,-0.7236751972817043,-0.2950008433180984,-0.13016700772346884,0.6763196489848383]],"ho":[[-0.46500994836477105,-0.11624070625997426,-0.6506051280568451,-0.9242343277689408],[0.8539470062929009,-1.0858088051443744,0.5117724663420493,0.3106162990829858],[-0.31438684186911087,-0.7330532345128861,-0.3929096115145649,0.4643125567533031],[-0.36590502276231024,0.9674076166321635,1.3630146771537726,0.5943075268791926],[1.0261600027881606,-0.8887385083617053,-0.41713576896553456,-1.0479814765363633],[0.12911421277227567,-0.17101462206676613,-0.07609867626422423,-0.06305837263237424],[1.4409261365523731,0.5847833243481502,0.7713556476387753,-0.09615335905990913],[-0.02652358629334288,-0.43213825219503543,-0.7441363894832472,0.3264598370026741],[-0.2647013583411814,0.8073795971432414,-0.7234982804806035,-0.3024691718350817],[0.4872573735067665,-0.2678362085469175,0.2770586400238025,0.3776615219013362],[0.527985713555608,0.29336050509089673,0.5421331875034808,-0.9761071348451548],[0.03936035730407353,-0.1720510287504133,0.2917668605989049,0.9750353208626844],[0.1326640893970181,-0.27164424371097884,-1.3616460646053627,0.21294179870310787],[1.373173405025954,-0.6814992296767788,-0.3523718241855616,-0.34137435010158823],[-0.17273673828283725,0.3836537433557999,-0.4736603146539451,0.5250004239487548],[1.3948474672908144,0.9242642490201163,0.4013312970293553,0.040697009442838036]]}


const trainedSouthWeights = {"ih": [[0.6143032342088246,0.5429211076411689,-0.7467846325480823,0.8163752622882292,-0.9226629609076948,0.7774764192954393,0.976816524041948,-0.7017565763022926,0.8135805882327956,-0.19193556774011017,0.5997871377766388,0.02275426240294609,-0.23730091241684048,0.9091282973232555,0.1233215862271636,-0.6328226357353763],[0.1497712727627621,-0.6542788660488834,-0.7773745811935893,-0.040212957588175446,0.5469072485515114,1.064566975677125,-0.7827396050894705,-0.47124196495770165,-1.1484958109183798,0.3446579219146222,0.6490931878365619,0.19140497205726356,0.33383677906990883,-0.3680829612999162,-0.8809441481511256,-0.21224378618103446],[0.5203606462843846,0.016020217119109836,1.0666552633111535,0.34147282033138304,-0.1955752057709107,0.27593707454674854,-0.23481743690517798,0.30541678578327297,0.054867859699603366,-0.5350053454116108,-0.029600334384258978,0.08137203761140047,0.9123364241830351,-0.6266686450643058,-0.1052613915961978,0.5695822123399907],[-0.4344453721707453,0.2531559724057548,0.7018944776298335,0.006897342545761992,0.28356623868573855,0.8826472301285223,0.20831652167267323,0.6664471336741016,-0.5089639591207228,1.1776001533452123,0.719857165118342,-0.8667966500164015,-0.804104213162272,0.6914251179205564,0.5555152721881564,0.2429860074003809],[0.5420213524370299,-0.33908381652596253,-0.30098932617598056,-0.7575090138119378,-0.8814169099339801,0.5151471322627845,-0.5952784972068274,0.5879260400588624,0.7625909246859989,-0.023411988326462296,-0.09235597310631605,0.8676738519742044,-0.2554418018401375,0.9383557546913164,0.5005375571687658,-0.7496163433812579],[0.7367051477278306,0.40830225087671473,0.7327805874498443,0.5969182530830314,-0.8245105903617642,-0.9081896070027689,0.9811717422672775,0.5580973065504129,-0.028498819177859402,0.08454241970525195,0.2583390146211124,-0.5425879835391116,-0.058802740326180186,0.19055891811231496,0.5820049655820785,-0.46546708344775944],[0.7599913527985007,-0.27253637225250477,0.1337377021019699,-0.9318074630812696,0.5032033577961483,-0.20364702660265205,0.5910974010868879,-0.5711162092393197,-0.009412451067034838,0.9741244317166933,-0.16422368735281606,-0.08120588807690607,0.88539048073222,0.5886538866006615,-0.24313096402299111,-0.6048296126791215],[0.6651168602825013,1.0279509510888294,0.5204600721232505,-0.5652007645077279,0.49120235095527676,-0.6065069153831695,1.0410557863067182,-0.04784105781764689,-0.6328625386990621,0.8631471423306678,-0.2382688415169597,0.5604649207484381,0.3208674066733405,0.5947693180337338,0.5338272265812396,-0.7460681063141802],[-0.46358878103434564,-0.1510797327372675,1.0501555548232882,-0.6120133337926079,-0.21337424106921254,0.3140866471049655,0.731151727145916,0.23698199038612788,0.6784380373685667,-1.1091930151485971,-0.8159625804334113,-0.16112030364493624,0.6505899696854635,-0.12786472736446275,0.06476942195369775,-0.1598108014003286],[-0.02263830429980107,-0.23221018048520906,0.5393256940422069,-0.2599998483476812,-0.3458376785234689,-0.5982756595696848,-0.5046558319350336,1.0786885583494867,0.445670082218922,-0.08995746091511823,-0.24230384136587518,0.1056833569467363,-0.702783508479947,-0.6647371344993424,0.08153608332066306,-0.8318530619489295]], "ho":[[-0.1619917929311174,0.13814453855325198,0.446723699699733,-0.2349846512222953],[-0.13684225997969357,1.0402564445560758,-0.5503300957140475,0.49984520027205237],[-0.7100919933087458,-0.7460289420522419,-0.06476625236420139,0.27621629226167443],[0.9531350097322331,-0.13355080474878867,-0.8199388701358972,0.0031380907091289323],[-0.217386482677588,-0.9112716922590334,0.6406195860374299,0.42271817820345037],[0.5223155722264535,-0.21170990612255047,0.1415058144397994,-0.9467001872824119],[0.704381270814391,-0.7582416195026743,-0.09226321200075238,0.5334969739473967],[0.49956446061848964,0.3809265418303341,0.5630804223321424,-0.9631725627850939],[0.5127698305569302,-0.48257856680956596,-0.3959238015032455,0.43147464109840705],[-0.12396543479301664,0.41464352302304885,0.7756621069088105,-0.021461522105311853],[0.8801753705238525,0.7787906615036688,0.47652984236399293,-0.026678458297260205],[0.6304230185636859,-0.679059137286721,-0.4461552596958178,-1.2131443638232322],[0.029491256095136087,-0.2400199773366597,0.5256001675711365,0.6040711742918918],[0.9418829400344306,0.26863937833754015,1.3386612534716205,0.3353656101930621],[0.4073798348691108,0.12161882439039289,0.3959537942227205,-0.6061701377519758],[-0.13665595224281868,0.9773867865338731,-0.5703682683506328,0.4004000299130633]]}
// 2. Ladda in vikterna i Norths hjärna!
northAI.setWeights(trainedNorthWeights.ih, trainedNorthWeights.ho);
southAI.setWeights(trainedSouthWeights.ih, trainedSouthWeights.ho);


// Denna funktion låter train.ts byta ut Norths hjärna tillfälligt under träning!
export function setNorthAI(brain: NeuralNetwork) {
  northAI = brain;
}

export function setSouthAI(brain: NeuralNetwork){
  southAI = brain; 
}


function scoreMoveWithAI(
  s: GameState, 
  base: AirBase, 
  target: AirBase | City, 
  kind: SuggestionKind,
  targetThreat: number,
  selfThreat: number
): { score: number, fighterRatio: number, bomberRatio: number, missileRatio: number } {
  
  // 1. Normalisera all data
  const normDist = dist(base.pos, target.pos) / s.params.maxFuel;
  const normTargetThreat = Math.min(targetThreat / 20, 1.0);
  const normSelfThreat = Math.min(selfThreat / 20, 1.0);
  const normTargetValue = targetValue(target) / 100;
  const normMyHp = base.hp / base.maxHp;
  
  // Håll koll på trupper
  const totalAir = base.fighters + base.bombers || 1;
  const bomberRatio = base.bombers / totalAir;
  const normMissiles = Math.min(base.missiles / 10, 1.0); // Antar att >10 är mycket
  
  // Håll koll på plånboken (så AI:n inte skickar plan och går i skuld i onödan)
  const normCredits = Math.min(Math.max(s.credits[base.faction] / 1000, 0), 1.0);

  // Räkna ut målets försvar (Fighters + Anti-Air)
  let targetDef = 0;
  if ("fighters" in target) {
    targetDef += (target as AirBase).fighters / 10;
  }
  for (const aa of s.aaUnits) {
    // Om det finns en fientlig AA-enhet i närheten av målet
    if (aa.faction !== base.faction && aa.hp > 0 && dist(aa.pos, target.pos) < aa.range + 20) {
      targetDef += 0.5; // AA är väldigt farligt, ge det hög vikt
    }
  }
  targetDef = Math.min(targetDef, 1.0);

  // Koda om typ av attack
  let actionCode = 0;
  if (kind === "transfer") actionCode = 1.0;
  else if (kind === "attack_base") actionCode = 0.6;
  else if (kind === "attack_city") actionCode = 0.3;
  else if (kind === "missile_strike") actionCode = 0.0;

  // 2. Skapa input-arrayen (Nu 10 variabler!)
  const inputs = [
    normDist, 
    normTargetThreat, 
    normSelfThreat, 
    normTargetValue, 
    targetDef, 
    actionCode,
    normMyHp,
    bomberRatio,
    normMissiles,
    normCredits
  ];

// 3. Fråga rätt hjärna beroende på vems tur det är!
  const activeBrain = base.faction === "north" ? northAI : southAI;
  const output = activeBrain.predict(inputs);

  // 4. Returnera AI:ns val
  return {
    score: output[0] * 100,
    fighterRatio: Math.min(Math.max(output[1], 0), 1),
    bomberRatio: Math.min(Math.max(output[2], 0), 1),
    missileRatio: Math.min(Math.max(output[3], 0), 1) // Ny output för missiler!
  };
}

function inFlightThreatTo(s: GameState, target: AirBase | City): number {
  let t = 0;
  for (const f of s.flights) {
    if (f.faction === target.faction) continue;
    if (f.targetId !== target.id) continue;
    t += f.bombers * 2 + f.fighters * 0.5;
  }
  return t;
}

function targetValue(target: AirBase | City): number {
  if ("isCapital" in target) {
    return target.isCapital ? 100 : 45;
  }
  return 35 + (target.fighters + target.bombers) * 2;
}

function reachable(s: GameState, from: AirBase, target: AirBase | City, roundTrip: boolean): boolean {
  return fuelNeeded(s, from.pos, target.pos, roundTrip) <= s.params.maxFuel;
}

export function allMovesFor(s: GameState, faction: Faction): Suggestion[] {
  const myBases = s.bases.filter((b) => b.faction === faction && b.hp > 0);
  const enemyBases = s.bases.filter((b) => b.faction !== faction && b.hp > 0);
  const enemyCities = s.cities.filter((c) => c.faction !== faction && c.hp > 0);
  const myCities = s.cities.filter((c) => c.faction === faction && c.hp > 0);

  const candidates: Suggestion[] = [];

  for (const base of myBases) {
    const selfThreat = inFlightThreatTo(s, base);

    // ---- Defensive transfers ----
    for (const ally of [...s.bases.filter((b) => b.faction === faction && b.hp > 0 && b.id !== base.id)]) {
      const threat = inFlightThreatTo(s, ally);
      if (threat <= 0) continue;
      if (!reachable(s, base, ally, false)) continue;
      
      const aiDecision = scoreMoveWithAI(s, base, ally, "transfer", threat, selfThreat);
      let send = Math.round(base.fighters * aiDecision.fighterRatio);
      
      if (send === 0 && base.fighters > 0 && aiDecision.score > 20) send = 1; 
      if (send <= 0) continue;
      
      candidates.push({
        score: aiDecision.score,
        faction,
        kind: "transfer",
        description: `Reinforce ${ally.name} from ${base.name} (${send}F)`,
        fromBaseId: base.id,
        fromBaseName: base.name,
        targetId: ally.id,
        targetName: ally.name,
        fighters: send,
        bombers: 0,
        apply: (st) => {
          const b = st.bases.find((x) => x.id === base.id)!;
          const a = st.bases.find((x) => x.id === ally.id)!;
          launchFlight(st, b, a, "transfer", send, 0);
        },
      });
    }

    // ---- Offensive: attack enemy base ----
    for (const eb of enemyBases) {
      if (!reachable(s, base, eb, true)) continue;
      if (base.bombers <= 0 && base.fighters <= 0) continue;
      
      const aiDecision = scoreMoveWithAI(s, base, eb, "attack_base", 0, selfThreat);
      const useB = Math.round(base.bombers * aiDecision.bomberRatio);
      const escort = Math.round(base.fighters * aiDecision.fighterRatio);

      if (useB + escort <= 0) continue;
      
      candidates.push({
        score: aiDecision.score,
        faction,
        kind: "attack_base",
        description: `Strike ${eb.name} from ${base.name} (${escort}F + ${useB}B)`,
        fromBaseId: base.id,
        fromBaseName: base.name,
        targetId: eb.id,
        targetName: eb.name,
        fighters: escort,
        bombers: useB,
        apply: (st) => {
          const b = st.bases.find((x) => x.id === base.id)!;
          const t = st.bases.find((x) => x.id === eb.id)!;
          launchFlight(st, b, t, "attack_base", escort, useB);
        },
      });
    }

    // ---- Offensive: bomb enemy city ----
    for (const ec of enemyCities) {
      if (!reachable(s, base, ec, true)) continue;
      if (base.bombers <= 0) continue;
      
      const aiDecision = scoreMoveWithAI(s, base, ec, "attack_city", 0, selfThreat);
      const useB = Math.round(base.bombers * aiDecision.bomberRatio);
      const escort = Math.round(base.fighters * aiDecision.fighterRatio);

      if (useB <= 0) continue; 
      
      candidates.push({
        score: aiDecision.score,
        faction,
        kind: "attack_city",
        description: `Raid ${ec.name} from ${base.name} (${escort}F + ${useB}B)`,
        fromBaseId: base.id,
        fromBaseName: base.name,
        targetId: ec.id,
        targetName: ec.name,
        fighters: escort,
        bombers: useB,
        apply: (st) => {
          const b = st.bases.find((x) => x.id === base.id)!;
          const t = st.cities.find((x) => x.id === ec.id)!;
          launchFlight(st, b, t, "attack_city", escort, useB);
        },
      });
    }

    // ---- NYTT: Missile strike ----
    if (base.missiles > 0) {
      const allTargets: Array<AirBase | City> = [...enemyBases, ...enemyCities];
      for (const t of allTargets) {
        const oneWay = fuelNeeded(s, base.pos, t.pos, false);
        if (oneWay > s.params.missileMaxFuel) continue;
        
        // Fråga AI om missiler
        const aiDecision = scoreMoveWithAI(s, base, t, "missile_strike", 0, selfThreat);
        
        // Låt AI bestämma hur många missiler som ska skjutas
        let useM = Math.round(base.missiles * aiDecision.missileRatio);
        
        // Tillåt minsta skott om AI gav det högt betyg
        if (useM === 0 && base.missiles > 0 && aiDecision.score > 25) useM = 1;
        if (useM <= 0) continue;

        const tIsBase = "fighters" in t;
        
        candidates.push({
          score: aiDecision.score,
          faction,
          kind: "missile_strike",
          description: `Missile ${t.name} from ${base.name} (${useM}× missile)`,
          fromBaseId: base.id,
          fromBaseName: base.name,
          targetId: t.id,
          targetName: t.name,
          fighters: 0,
          bombers: 0,
          apply: (st) => {
            const b = st.bases.find((x) => x.id === base.id)!;
            const tt = tIsBase
              ? st.bases.find((x) => x.id === t.id)!
              : st.cities.find((x) => x.id === t.id)!;
            launchMissile(st, b, tt, useM);
          },
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

export function bestMoveFor(s: GameState, faction: Faction): Suggestion | null {
  return allMovesFor(s, faction)[0] ?? null;
}

export function runAITick(s: GameState) {
  const p = s.params;

  // Din kompis ekonomi- och AA-skript körs här! 
  // Dessa är "hardkodade" regler, vilket fungerar utmärkt tillsammans med en Neural taktik-hjärna.
  manageEconomy(s, "south");
  manageEconomy(s, "north");
  manageAA(s, "south");
  manageAA(s, "north");

  if (s.time >= s.nextWaveAt) {
    s.waveNumber += 1;
    const waveSize = p.southWaveBase + Math.floor(Math.random() * 3) + Math.floor(s.waveNumber / 2);
    log(s, `=== South wave ${s.waveNumber} incoming (${waveSize} sorties) ===`, "south");
    const plan = bestPlanFor(s, "south");
    if (plan && plan.projectedScore > 0) applyPlan(s, plan);
    for (let i = 0; i < waveSize; i++) {
      const sug = bestMoveFor(s, "south");
      if (!sug) break;
      sug.apply(s);
    }
    s.nextWaveAt = s.time + p.southWaveInterval + Math.random() * 8;
    s.southThinkAt = s.time + 4;
  } else if (s.time >= s.southThinkAt) {
    s.southThinkAt = s.time + p.southThinkInterval;
    const plan = bestPlanFor(s, "south");
    if (plan && plan.projectedScore > 10) {
      applyPlan(s, plan);
    } else {
      const sug = bestMoveFor(s, "south");
      if (sug && sug.score > 30) sug.apply(s);
    }
  }

  if (s.time >= s.northThinkAt) {
    s.northThinkAt = s.time + p.northThinkInterval;
    runNorthDefender(s);
  }
}

// ============================================================
// Kompisens Ekonomi och AA kod ligger kvar helt orörd nedanför
// ============================================================

function manageEconomy(s: GameState, faction: Faction) {
  const credits = s.credits[faction];
  const c = s.params.costs;
  if (credits < c.missile) return;

  const myBases = s.bases.filter((b) => b.faction === faction && b.hp > 0);
  if (myBases.length === 0) return;

  const myFighters = myBases.reduce((a, b) => a + b.fighters, 0);
  const myBombers  = myBases.reduce((a, b) => a + b.bombers, 0);
  const myMissiles = myBases.reduce((a, b) => a + b.missiles, 0);
  const myAA = s.aaUnits.filter((a) => a.faction === faction && a.hp > 0).length;

  const wishlist: PurchaseKind[] = faction === "south"
    ? buildWishlist({ missile: 12, bomber: 8, fighter: 10, aa: 3 }, { missile: myMissiles, bomber: myBombers, fighter: myFighters, aa: myAA })
    : buildWishlist({ fighter: 14, aa: 5, missile: 8, bomber: 4 }, { missile: myMissiles, bomber: myBombers, fighter: myFighters, aa: myAA });

  let budget = credits * 0.4;
  for (const kind of wishlist) {
    const price = kind === "fighter" ? c.fighter : kind === "bomber" ? c.bomber : kind === "missile" ? c.missile : c.aa;
    if (budget < price) continue;
    if (purchaseUnit(s, faction, kind)) budget -= price;
  }
}

function buildWishlist(
  target: Record<PurchaseKind, number>,
  current: Record<PurchaseKind, number>,
): PurchaseKind[] {
  const kinds: PurchaseKind[] = ["fighter", "bomber", "missile", "aa"];
  const scored = kinds
    .map((k) => ({ k, deficit: (target[k] - current[k]) / Math.max(1, target[k]) }))
    .filter((x) => x.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit);
  const out: PurchaseKind[] = [];
  for (const x of scored) {
    const reps = Math.min(3, Math.ceil(x.deficit * 4));
    for (let i = 0; i < reps; i++) out.push(x.k);
  }
  return out;
}

function manageAA(s: GameState, faction: Faction) {
  const myAA = s.aaUnits.filter((a) => a.faction === faction && a.hp > 0);
  if (myAA.length === 0) return;

  const assets: Array<{ pos: { x: number; y: number }; weight: number }> = [];
  for (const c of s.cities) {
    if (c.faction !== faction || c.hp <= 0) continue;
    let threat = 0;
    for (const f of s.flights) {
      if (f.faction === faction) continue;
      if (f.targetId === c.id) threat += f.bombers * 2 + f.fighters * 0.5 + f.missiles * 1.5;
    }
    if (threat > 0 || c.isCapital) assets.push({ pos: c.pos, weight: threat + (c.isCapital ? 6 : 1) });
  }
  for (const b of s.bases) {
    if (b.faction !== faction || b.hp <= 0) continue;
    let threat = 0;
    for (const f of s.flights) {
      if (f.faction === faction) continue;
      if (f.targetId === b.id) threat += f.bombers * 2 + f.fighters * 0.5 + f.missiles * 1.5;
    }
    if (threat > 0) assets.push({ pos: b.pos, weight: threat });
  }
  if (assets.length === 0) return;

  for (const aa of myAA) {
    if (aa.dest) continue;
    let best: { pos: { x: number; y: number }; weight: number } | null = null;
    let bestScore = -Infinity;
    for (const a of assets) {
      if (!isInOwnLand(faction, a.pos, s.params.aaCoastBand)) continue;
      const d = dist(aa.pos, a.pos);
      const score = a.weight * 10 - d * 0.05;
      if (score > bestScore) { bestScore = score; best = a; }
    }
    if (best && dist(aa.pos, best.pos) > 30) aa.dest = { ...best.pos };
  }
}

function runNorthDefender(s: GameState) {
  const myCities = s.cities.filter((c) => c.faction === "north" && c.hp > 0);
  const capital = myCities.find((c) => c.isCapital);

  const threatened = new Set<string>();
  for (const f of s.flights) {
    if (f.faction === "south" && (f.kind === "attack_base" || f.kind === "attack_city")) {
      threatened.add(f.targetId);
    }
  }
  const underAttack = threatened.size > 0;
  const ranked = bestPlanFor(s, "north");

  if (underAttack) {
    if (ranked && ranked.kind === "fortify" && ranked.projectedScore > -5) {
      applyPlan(s, ranked);
      return;
    }
    const moves = allMovesFor(s, "north").filter((m) => m.kind === "transfer");
    const top = moves[0];
    if (top && top.score > 5) top.apply(s);
    return;
  }

  if (capital) {
    const myBases = s.bases.filter((b) => b.faction === "north" && b.hp > 0);
    let guard = myBases[0];
    let gd = guard ? dist(guard.pos, capital.pos) : Infinity;
    for (const b of myBases) {
      const d = dist(b.pos, capital.pos);
      if (d < gd) { gd = d; guard = b; }
    }
    if (guard && guard.fighters < 4) {
      const transfers = allMovesFor(s, "north").filter(
        (m) => m.kind === "transfer" && m.targetId === guard.id,
      );
      const t = transfers[0];
      if (t) { t.apply(s); return; }
    }
  }

  if (ranked && ranked.kind !== "fortify" && ranked.projectedScore > 15) {
    applyPlan(s, ranked);
    return;
  }
  const sug = bestMoveFor(s, "north");
  if (sug && sug.kind !== "transfer" && sug.score > 25) sug.apply(s);
}