
const canvas=document.getElementById("cv");
const ctx=canvas.getContext("2d");
const coopCanvas=document.getElementById("coop-cv");
const coopCtx=coopCanvas?coopCanvas.getContext("2d"):null;
const CHARS=[
  {id:"nick",  name:"Nick",  e:"🐀",color:"#f5c842",strats:[
    {sid:"nick_a",  name:"Le Trompeur",      tag:"Perfide",     tc:"chaos",
     desc:"Coopère les 3 premiers rounds pour installer la confiance, puis trahit indéfiniment. Dévastateur contre les stratégies à mémoire courte.",
     behav:"Coop×3 puis AllD définitif",
     stats:{Agressivité:"Différée",Coopération:"Feinte",Mémoire:"Compteur"},
     tags:[{t:"Traîtrise retardée",c:"chaos"},{t:"Manipulateur",c:"aggr"}],
     vs:"<b>TFT</b> le punit dès le 4ème round. <b>GTFT</b> peut le pardonner. Excellent contre <b>AllC</b>.",
     fn(h,r){return r<3?"coop":"betray";}},
    {sid:"nick_b",  name:"L'Anarchiste",     tag:"Chaos 75%",   tc:"rand",
     desc:"Trahit avec 75% de probabilité. Aucune logique ni mémoire. Perturbateur naturel de tout pattern.",
     behav:"Trahit 75% aléatoirement",
     stats:{Agressivité:"75%",Coopération:"25%",Mémoire:"Aucune"},
     tags:[{t:"Semi-aléatoire",c:"rand"},{t:"Hostile",c:"aggr"}],
     vs:"<b>AllC</b> se fait massacrer. <b>TF2T</b> résiste grâce à sa tolérance.",
     fn(){return Math.random()<0.75?"betray":"coop";}},
    {sid:"nick_c",  name:"Le Saboteur",      tag:"Infiltré",    tc:"chaos",
     desc:"TFT normal mais trahit systématiquement tous les 7 rounds. Un saboteur discret qui mine la confiance progressivement.",
     behav:"TFT + trahison secrète tous les 7 rounds",
     stats:{Agressivité:"Périodique",Coopération:"Conditionnelle",Mémoire:"Round + opp"},
     tags:[{t:"Sabotage périodique",c:"chaos"},{t:"Traîtrise subtile",c:"aggr"}],
     vs:"<b>Grudger</b> rompt à la première trahison secrète. <b>GTFT</b> pardonne souvent l'accident.",
     fn(h,r,st){if(r>0&&r%7===0)return"betray";return!h.length?"coop":h[h.length-1]==="betray"?"betray":"coop";}},
    {sid:"nick_d",  name:"Le Crescendo",     tag:"Escalade lente",tc:"aggr",
     desc:"Commence coopératif, augmente graduellement son taux de trahison. À la génération 100+, quasi-AllD.",
     behav:"Trahison croissante avec le temps",
     stats:{Agressivité:"Progressive",Coopération:"Initiale",Mémoire:"Round"},
     tags:[{t:"Escalade lente",c:"aggr"},{t:"Corruption progressive",c:"chaos"}],
     vs:"<b>TFT</b> et <b>Grudger</b> s'y adaptent vite. Redoutable sur des <b>matchs courts</b>.",
     fn(h,r){return Math.random()<Math.min(0.9,r/120)?"betray":"coop";}},
  ]},
  {id:"brick", name:"Brick", e:"🧮",color:"#ff5f5f",strats:[
    {sid:"brick_a", name:"L'Analyste (TFT)", tag:"Classique",   tc:"adapt",
     desc:"Tit-for-Tat. Jamais premier à trahir, copie exactement le dernier coup adverse. Championne historique des tournois Axelrod.",
     behav:"Coop d'abord, copie ensuite",
     stats:{Agressivité:"Réactive",Coopération:"Initiale",Mémoire:"1 round"},
     tags:[{t:"TFT canonique",c:"adapt"},{t:"Réciproque",c:"coop"}],
     vs:"<b>AllC</b> : relation parfaite. <b>Anarchiste</b> : spirale de punitions. <b>GTFT</b> : brisent les cycles.",
     fn(h){return!h.length?"coop":h[h.length-1]==="betray"?"betray":"coop";}},
    {sid:"brick_b", name:"Le Graduel",        tag:"Escalade",    tc:"adapt",
     desc:"N trahisons reçues → N trahisons en réponse, puis pardon total. Punition proportionnelle.",
     behav:"N trahisons → N punitions → pardon",
     stats:{Agressivité:"Proportionnelle",Coopération:"Conditionnelle",Mémoire:"Compteur global"},
     tags:[{t:"Escalade proportionnelle",c:"adapt"},{t:"Dissuasif",c:"aggr"}],
     vs:"<b>AllD</b> : escalade infinie. <b>TFT</b> : très robuste ensemble.",
     fn(h,r,st){
       if(!st.g)st.g={bt:0,pl:0,cl:0};const g=st.g;
       if(h.length&&h[h.length-1]==="betray"){g.bt++;g.pl=g.bt;g.cl=2;}
       if(g.pl>0){g.pl--;return"betray";}if(g.cl>0){g.cl--;return"coop";}return"coop";
     }},
    {sid:"brick_c", name:"Le Miroir",         tag:"Tendance",    tc:"adapt",
     desc:"Analyse les 3 derniers coups adverses. Trahit si la majorité étaient des trahisons. Plus robuste au bruit que TFT.",
     behav:"Trahit si ≥2/3 derniers coups = trahisons",
     stats:{Agressivité:"Moyenne",Coopération:"Contextuelle",Mémoire:"3 rounds glissants"},
     tags:[{t:"Fenêtre glissante",c:"adapt"},{t:"Tolérant au bruit",c:"coop"}],
     vs:"<b>AllD</b> déclenche vite le switch. <b>Random</b> : vote quasi-égal, décisions mixtes.",
     fn(h){if(h.length<3)return"coop";return h.slice(-3).filter(x=>x==="betray").length>=2?"betray":"coop";}},
    {sid:"brick_d", name:"Le Contrat",         tag:"Seuil 70%",   tc:"adapt",
     desc:"Coopère si et seulement si l'adversaire a coopéré ≥70% du temps. Calcul froid, basé sur l'historique total.",
     behav:"Coop si taux adversaire ≥ 70%",
     stats:{Agressivité:"Proportionnelle",Coopération:"Conditionnelle",Mémoire:"Historique complet"},
     tags:[{t:"Seuil contractuel",c:"adapt"},{t:"Analyse statistique",c:"def"}],
     vs:"<b>AllD</b> → trahit après peu de rounds. <b>GTFT</b> : relation presque stable (>70% coop).",
     fn(h){if(h.length<5)return"coop";return h.filter(x=>x==="coop").length/h.length>=0.7?"coop":"betray";}},
  ]},
  {id:"pedro", name:"Pedro", e:"🪨",color:"#5bdfb4",strats:[
    {sid:"pedro_a", name:"Le Pacifiste (AllC)",tag:"Pur",          tc:"coop",
     desc:"Coopère toujours. Roi dans un monde coopératif, proie dans un monde hostile. Sa présence booste l'écosystème coopératif.",
     behav:"Coopère quoi qu'il arrive",
     stats:{Agressivité:"0%",Coopération:"100%",Mémoire:"Aucune"},
     tags:[{t:"Coopération absolue",c:"coop"},{t:"Naïf",c:"def"}],
     vs:"<b>Traîtres</b> l'exploitent. <b>TFT</b> : relation optimale.",
     fn(){return"coop";}},
    {sid:"pedro_b", name:"Le Bouclier",         tag:"Défensif",    tc:"def",
     desc:"AllC jusqu'à 3 trahisons consécutives adverses, puis switch TFT. Revient à AllC si l'adversaire recoopère.",
     behav:"AllC → TFT si 3 trahisons consécutives",
     stats:{Agressivité:"Conditionnelle",Coopération:"Quasi-totale",Mémoire:"3 derniers rounds"},
     tags:[{t:"Patient",c:"coop"},{t:"Switch adaptatif",c:"adapt"}],
     vs:"<b>AllD</b> déclenche le switch. <b>Random</b> peut l'activer par accident.",
     fn(h,r,st){
       if(st.tm===undefined)st.tm=false;
       if(h.length>=3&&h.slice(-3).every(x=>x==="betray"))st.tm=true;
       if(st.tm&&h.length&&h[h.length-1]==="coop")st.tm=false;
       if(st.tm&&h.length)return h[h.length-1]==="betray"?"betray":"coop";
       return"coop";
     }},
    {sid:"pedro_c", name:"Le Mur",              tag:"Statistique", tc:"def",
     desc:"Trahit si l'adversaire a trahi plus de 40% du temps sur les 10 derniers rounds. Résistant aux fluctuations.",
     behav:"Trahit si taux adversaire >40% sur 10 rounds",
     stats:{Agressivité:"Statistique",Coopération:"Par défaut",Mémoire:"10 rounds glissants"},
     tags:[{t:"Fenêtre statistique",c:"def"},{t:"Robuste",c:"adapt"}],
     vs:"<b>AllD</b> déclenche rapidement. <b>Random</b> : ~50% → souvent sous le seuil.",
     fn(h){
       if(h.length<10)return"coop";
       return h.slice(-10).filter(x=>x==="betray").length/10>0.4?"betray":"coop";
     }},
    {sid:"pedro_d", name:"Le Titan",            tag:"Punition 20", tc:"def",
     desc:"Coopère d'abord, mais dès qu'on le trahit, répond 20 rounds d'affilée, puis remet les compteurs à zéro.",
     behav:"AllC → 20 rounds punition → réinitialisation",
     stats:{Agressivité:"Temporaire intense",Coopération:"Après pardon",Mémoire:"Compteur 20"},
     tags:[{t:"Punition longue",c:"aggr"},{t:"Pardon total",c:"coop"}],
     vs:"<b>AllD</b> : cycles infinis. <b>TFT</b> : coexistence, la punition de Titan > celle de TFT.",
     fn(h,r,st){
       if(st.p===undefined)st.p=0;
       if(h.length&&h[h.length-1]==="betray"&&st.p===0)st.p=20;
       if(st.p>0){st.p--;return"betray";}return"coop";
     }},
  ]},
  {id:"peski",    name:"Peski",    e:"🎒",color:"#7eb8ff",strats:[
    {sid:"peski_a",    name:"L'Aléatoire",         tag:"50/50",       tc:"rand",
     desc:"50/50 à chaque round. Aucune logique, aucune mémoire. Ni fort ni faible, crée de l'entropie.",
     behav:"Choix aléatoire 50/50",
     stats:{Agressivité:"~50%",Coopération:"~50%",Mémoire:"Aucune"},
     tags:[{t:"Pur aléatoire",c:"rand"},{t:"Perturbateur",c:"rand"}],
     vs:"Déstabilise <b>TFT</b> et <b>Grudger</b> par accident. <b>TF2T</b> résiste grâce à sa tolérance.",
     fn(){return Math.random()<0.5?"coop":"betray";}},
    {sid:"peski_b",    name:"L'Explorateur",        tag:"Scout",       tc:"adapt",
     desc:"Coopère 5 rounds en observant, puis adopte le comportement dominant adverse.",
     behav:"5 rounds obs → mimétisme total",
     stats:{Agressivité:"Variable",Coopération:"Initiale",Mémoire:"5 premiers rounds"},
     tags:[{t:"Mimétisme adaptatif",c:"adapt"},{t:"Observateur",c:"rand"}],
     vs:"<b>AllC</b> → Peski devient AllC. <b>AllD</b> → Peski se transforme en traître.",
     fn(h,r,st){
       if(r<5)return"coop";
       if(st.mode===undefined)st.mode=h.slice(0,5).filter(x=>x==="betray").length/5>0.5?"betray":"coop";
       return st.mode;
     }},
    {sid:"peski_c",    name:"Le Testeur",           tag:"Probe",       tc:"chaos",
     desc:"Trahit dès le round 0 pour tester la réaction. Si non-puni → exploitation totale. Si puni → devient TFT.",
     behav:"Round 0 trahison-test → AllD ou TFT selon réponse",
     stats:{Agressivité:"Test initial",Coopération:"Si puni",Mémoire:"Réaction initiale"},
     tags:[{t:"Sondage initial",c:"chaos"},{t:"Opportuniste",c:"exploit"}],
     vs:"<b>AllC</b> : exploite sans pitié. <b>TFT</b> : punit, Peski devient sage. <b>Grudger</b> : guerre immédiate.",
     fn(h,r,st){
       if(r===0)return"betray";
       if(r===1){st.exploit=h[0]==="coop";return"coop";}
       if(r===2&&st.exploit===undefined)st.exploit=h[0]==="coop";
       if(st.exploit)return"betray";
       return h[h.length-1]==="betray"?"betray":"coop";
     }},
    {sid:"peski_d",    name:"Le Vagabond",          tag:"Cyclique",    tc:"rand",
     desc:"Change de stratégie tous les 15 rounds : coopère, puis TFT, puis trahit. Imprévisible sur le long terme.",
     behav:"Phase 15g : AllC → TFT → AllD (cycle)",
     stats:{Agressivité:"Cyclique",Coopération:"Périodique",Mémoire:"Round"},
     tags:[{t:"Stratégie cyclique",c:"rand"},{t:"Imprévisible",c:"chaos"}],
     vs:"<b>Grudger</b> se fait piéger lors de la phase AllD. <b>GTFT</b> gère bien les cycles.",
     fn(h,r){
       const ph=Math.floor(r/15)%3;
       if(ph===0)return"coop";
       if(ph===1)return!h.length?"coop":h[h.length-1]==="betray"?"betray":"coop";
       return"betray";
     }},
  ]},
  {id:"köner",   name:"Köner",   e:"👑",color:"#ff8c00",strats:[
    {sid:"köner_a",   name:"L'Implacable (Grudger)",tag:"Rancunier",  tc:"aggr",
     desc:"Une seule trahison déclenche une rancœur permanente. Dissuasion absolue.",
     behav:"Coop → AllD permanent à la 1ère trahison",
     stats:{Agressivité:"Conditionnelle",Coopération:"Initiale",Mémoire:"Permanente"},
     tags:[{t:"Mémoire infinie",c:"aggr"},{t:"Dissuasion absolue",c:"adapt"}],
     vs:"<b>AllC</b> : relation parfaite. <b>Random</b> déclenche la rancœur par accident.",
     fn(h){return h.includes("betray")?"betray":"coop";}},
    {sid:"köner_b",   name:"Le Czar",               tag:"Peine/Pardon",tc:"adapt",
     desc:"5 rounds de punition par trahison, puis pardon total. Plus flexible que Grudger.",
     behav:"1 trahison → 5 rounds punition → pardon",
     stats:{Agressivité:"Temporaire",Coopération:"Après pardon",Mémoire:"5 rounds"},
     tags:[{t:"Punition limitée",c:"aggr"},{t:"Pardon conditionnel",c:"adapt"}],
     vs:"<b>Random</b> : cycles peine-pardon répétés. <b>AllD</b> : punitions cycliques.",
     fn(h,r,st){
       if(st.p===undefined)st.p=0;
       if(h.length&&h[h.length-1]==="betray")st.p=5;
       if(st.p>0){st.p--;return"betray";}return"coop";
     }},
    {sid:"köner_c",   name:"Le Despote (AllD)",     tag:"Traître pur", tc:"aggr",
     desc:"Trahit toujours et sans condition. Équilibre de Nash mais sous-optimal. Nécessite d'autres traîtres pour survivre.",
     behav:"Trahit quoi qu'il arrive",
     stats:{Agressivité:"100%",Coopération:"0%",Mémoire:"Aucune"},
     tags:[{t:"AllD",c:"aggr"},{t:"Nash equilibrium",c:"def"}],
     vs:"<b>AllC</b> : exploitation totale. <b>TFT</b> : guerre réciproque, perdants tous les deux.",
     fn(){return"betray";}},
    {sid:"köner_d",   name:"L'Autocrate",           tag:"Paradoxe",    tc:"chaos",
     desc:"Trahit systématiquement sauf si les 3 derniers rounds adverses étaient AUSSI des trahisons. Cherche à fuir la guerre mutuelle.",
     behav:"AllD sauf si opp AllD aussi → coop surprise",
     stats:{Agressivité:"Très haute",Coopération:"Paradoxale",Mémoire:"3 derniers rounds"},
     tags:[{t:"AllD contextuel",c:"aggr"},{t:"Coopération paradoxale",c:"chaos"}],
     vs:"<b>AllD</b> : paradoxalement coopèrent parfois ensemble. <b>TFT</b> : guerre permanente.",
     fn(h){
       if(h.length>=3&&h.slice(-3).every(x=>x==="betray"))return"coop";
       return"betray";
     }},
  ]},
  {id:"r'oil", name:"R'Oil", e:"🔥",color:"#c87fff",strats:[
    {sid:"r'oil_a", name:"Pavlov (Win-Stay)",     tag:"Auto-corr.",  tc:"adapt",
     desc:"Win-Stay Lose-Shift. Si le résultat était bon, répète. Sinon change. Auto-correcteur.",
     behav:"Bon résultat → répète, mauvais → change",
     stats:{Agressivité:"Variable",Coopération:"Conditionnelle",Mémoire:"1 résultat"},
     tags:[{t:"Win-Stay-Lose-Shift",c:"adapt"},{t:"Exploiteur",c:"aggr"}],
     vs:"<b>AllC</b> : alterne C/D pour maximiser. <b>Grudger</b> : peut déclencher la guerre.",
     fn(h,r,st){
       const ml=st.ml||"coop";const ol=h.length?h[h.length-1]:null;
       let res;
       if(!ol)res="coop";
       else if(ml==="coop"&&ol==="coop")res="coop";
       else if(ml==="betray"&&ol==="betray")res="coop";
       else res="betray";
       st.ml=res;return res;
     }},
    {sid:"r'oil_b", name:"L'Opportuniste",        tag:"Profiteur",   tc:"chaos",
     desc:"TFT jusqu'à dépasser 40% du groupe, puis bascule en AllD pour capitaliser.",
     behav:"TFT + AllD si pop > 40%",
     stats:{Agressivité:"Variable",Coopération:"Conditionnelle",Mémoire:"TFT + pop"},
     tags:[{t:"Contextuel",c:"chaos"},{t:"Exploitation de position",c:"exploit"}],
     vs:"<b>TFT</b> le punira quand il bascule. <b>AllC</b> : victime parfaite en mode domination.",
     fn(h,r,st,sp,gp){
       if((sp||100)/(gp||1400)>0.4)return"betray";
       return!h.length?"coop":h[h.length-1]==="betray"?"betray":"coop";
     }},
    {sid:"r'oil_c", name:"L'Extorqueur",          tag:"Parasite",    tc:"exploit",
     desc:"Round 0 : trahit. Round 1 : offre la paix. Si l'adversaire n'avait pas puni au round 0 → exploitation totale. Sinon → TFT.",
     behav:"Trahison initiale → exploit si non-puni",
     stats:{Agressivité:"Test + exploitation",Coopération:"Si puni",Mémoire:"Réaction initiale"},
     tags:[{t:"Extorsion",c:"exploit"},{t:"Parasite conditionnel",c:"aggr"}],
     vs:"<b>AllC</b> : victime parfaite, exploité à jamais. <b>Grudger</b> : guerre dès le début.",
     fn(h,r,st){
       if(r===0)return"betray";
       if(r===1){st.suck=h[0]==="coop";return st.suck?"betray":"coop";}
       return st.suck?"betray":(h[h.length-1]==="betray"?"betray":"coop");
     }},
    {sid:"r'oil_d", name:"Le Stratège CCCD",      tag:"Périodique",  tc:"chaos",
     desc:"Pattern CCCD répété. Coopère 3 fois puis trahit 1 fois, mais s'adapte si puni : suspend le pattern et punit en retour.",
     behav:"C,C,C,D pattern + punition si représailles",
     stats:{Agressivité:"Périodique",Coopération:"75% du temps",Mémoire:"Pattern + punition"},
     tags:[{t:"Pattern CCCD",c:"chaos"},{t:"Adaptatif",c:"adapt"}],
     vs:"<b>AllC</b> : exploitation légère. <b>Grudger</b> : déclenche la guerre au 1er D.",
     fn(h,r,st){
       if(!st.pu)st.pu=0;
       if(h.length&&h[h.length-1]==="betray"&&st.pu===0){st.pu=2;}
       if(st.pu>0){st.pu--;return"betray";}
       return r%4===3?"betray":"coop";
     }},
  ]},
  {id:"snook", name:"Snook", e:"🎮",color:"#39e87a",strats:[
    {sid:"snook_a", name:"Le Patient (TF2T)",     tag:"Tolérant",    tc:"coop",
     desc:"Ne punit qu'après deux trahisons consécutives. Supérieur à TFT en environnement bruité.",
     behav:"Punit après 2 trahisons consécutives",
     stats:{Agressivité:"Faible",Coopération:"Haute",Mémoire:"2 derniers rounds"},
     tags:[{t:"Tolérant",c:"coop"},{t:"Résilient",c:"adapt"}],
     vs:"<b>AllD</b> finit par déclencher 2T consécutives. <b>Random</b> : rarement 2T de suite.",
     fn(h){
       if(h.length<2)return"coop";
       return h[h.length-1]==="betray"&&h[h.length-2]==="betray"?"betray":"coop";
     }},
    {sid:"snook_b", name:"Le Speed Runner",       tag:"Tempo",       tc:"adapt",
     desc:"10 rounds de coopération pure pour accumuler du capital social, puis TFT strict.",
     behav:"10× coop puis TFT strict",
     stats:{Agressivité:"Tardive",Coopération:"Intense au début",Mémoire:"Round + 1"},
     tags:[{t:"Capital social",c:"coop"},{t:"Transition stratégique",c:"adapt"}],
     vs:"<b>Traîtres</b> profitent des 10 rounds gratuits. <b>TFT</b> : après le switch, parfait.",
     fn(h,r){
       if(r<10)return"coop";
       return h.length&&h[h.length-1]==="betray"?"betray":"coop";
     }},
    {sid:"snook_c", name:"L'Économiste",          tag:"Probabiliste", tc:"adapt",
     desc:"Le taux de trahison de ses réponses est proportionnel au taux de trahison adverse. Ni trop gentil, ni trop dur.",
     behav:"Trahit avec probabilité = taux adverse",
     stats:{Agressivité:"Proportionnelle",Coopération:"Inversement proportionnelle",Mémoire:"Historique complet"},
     tags:[{t:"Proportionnel",c:"adapt"},{t:"Probabiliste",c:"rand"}],
     vs:"<b>AllC</b> → économiste coopère 100%. <b>AllD</b> → trahit 100%. <b>Random</b> → 50/50.",
     fn(h){
       if(h.length<3)return"coop";
       return Math.random()<h.filter(x=>x==="betray").length/h.length?"betray":"coop";
     }},
    {sid:"snook_d", name:"Le Négociateur",        tag:"Diplomate",   tc:"adapt",
     desc:"10 rounds TFT pour évaluer, puis AllC si >80% de coop adverse, sinon TFT strict. Cherche les coopérateurs fiables.",
     behav:"10 rounds TFT → AllC si taux coop > 80%",
     stats:{Agressivité:"Contextuelle",Coopération:"Conditionnelle",Mémoire:"10 + décision"},
     tags:[{t:"Négociation",c:"adapt"},{t:"Recherche de fiabilité",c:"coop"}],
     vs:"<b>AllC</b> : relation parfaite après évaluation. <b>Random</b> : reste en TFT après les 10 rounds.",
     fn(h,r,st){
       if(r<10)return!h.length?"coop":h[h.length-1]==="betray"?"betray":"coop";
       if(st.dec===undefined)st.dec=h.slice(0,10).filter(x=>x==="coop").length/10>0.8?"allc":"tft";
       if(st.dec==="allc")return"coop";
       return h[h.length-1]==="betray"?"betray":"coop";
     }},
  ]},
  {id:"nova",   name:"Nova",   e:"🌟",color:"#00d4ff",strats:[
    {sid:"nova_a",  name:"Pavlov (WSLS)",         tag:"Réflexe",    tc:"adapt",
     desc:"Win-Stay Lose-Shift. Répète si le dernier échange était mutuellement cohérent (CC ou DD). Change sinon. Redoutable contre TFT.",
     behav:"Répète si résultat 'bon', change sinon",
     stats:{Agressivité:"Adaptative",Coopération:"Contextuelle",Mémoire:"1 round propre + adverse"},
     tags:[{t:"Win-Stay Lose-Shift",c:"adapt"},{t:"Anti-cycle",c:"adapt"}],
     vs:"<b>AllD</b> : finit en D perpétuel après quelques rounds. <b>TFT</b> : coopération stable. <b>AllC</b> : coopère indéfiniment.",
     fn(h,r,st){
       if(!r){st.myLast="coop";return"coop";}
       const oppLast=h[h.length-1]||"coop";
       const myLast=st.myLast||"coop";
       const win=(myLast==="coop"&&oppLast==="coop")||(myLast==="betray"&&oppLast==="betray");
       const next=win?myLast:(myLast==="coop"?"betray":"coop");
       st.myLast=next;return next;
     }},
    {sid:"nova_b",  name:"Gradient",              tag:"Proportionnel",tc:"adapt",
     desc:"Coopère avec une probabilité exactement égale au taux de coopération adverse. Miroir probabiliste parfait.",
     behav:"P(coop) = taux_coop_adverse",
     stats:{Agressivité:"Proportionnelle",Coopération:"Proportionnelle",Mémoire:"Historique complet"},
     tags:[{t:"Miroir probabiliste",c:"adapt"},{t:"Auto-régulateur",c:"adapt"}],
     vs:"<b>AllD</b> : finit quasi-D. <b>AllC</b> : quasi-C. <b>Random</b> : ~50/50 symétrique.",
     fn(h){
       if(!h.length)return"coop";
       const cr=h.filter(x=>x==="coop").length/h.length;
       return Math.random()<cr?"coop":"betray";
     }},
    {sid:"nova_c",  name:"Omega TFT",             tag:"Fenêtres",   tc:"adapt",
     desc:"Maintient deux compteurs glissants : coopérations et trahisons adverses. Coopère si le delta est favorable. Résistant au bruit.",
     behav:"Coopère si compteur_coop − compteur_trahison > 0",
     stats:{Agressivité:"Faible",Coopération:"Haute",Mémoire:"Compteurs glissants"},
     tags:[{t:"Résistant au bruit",c:"adapt"},{t:"Omega dynamique",c:"adapt"}],
     vs:"<b>AllD</b> : se ferme progressivement. <b>Noisy TFT</b> : beaucoup plus stable que TFT normal.",
     fn(h,r,st){
       if(!h.length)return"coop";
       if(!st.coop)st.coop=0;if(!st.def)st.def=0;
       const last=h[h.length-1];
       if(last==="coop")st.coop=Math.min(8,st.coop+1);
       else st.def=Math.min(8,(st.def||0)+1);
       return(st.def-st.coop)<=0?"coop":"betray";
     }},
    {sid:"nova_d",  name:"Extorteur ZD",          tag:"Extortion",  tc:"chaos",
     desc:"Stratégie Zero-Determinant : impose une relation fixe entre son score et celui de l'adversaire. Gagne toujours au ratio — mais détruit la coopération collective.",
     behav:"P(coop) = φ·taux_adverse + χ (avec φ=0.5, χ=0.08)",
     stats:{Agressivité:"Calculée",Coopération:"Instrumentale",Mémoire:"Taux global adverse"},
     tags:[{t:"Zero-Determinant",c:"chaos"},{t:"Ratio fixe",c:"chaos"}],
     vs:"<b>AllC</b> : l'exploite. <b>AllD</b> : se retrouve en guerre. <b>TFT</b> : équilibre instable.",
     fn(h){
       if(!h.length)return Math.random()<0.88?"coop":"betray";
       const cr=h.filter(x=>x==="coop").length/h.length;
       return Math.random()<(0.5*cr+0.08)?"coop":"betray";
     }},
  ]},
  {id:"zephyr", name:"Zephyr", e:"🔮",color:"#b854ff",strats:[
    {sid:"zephyr_a", name:"L'Oracle", tag:"Markov", tc:"adapt",
     desc:"Analyse vos séquences. Tente de deviner votre prochain coup basé sur le passé.",
     behav:"Modèle de Markov basique sur 1 coup",
     stats:{Agressivité:"Anticipative",Coopération:"Stratégique",Mémoire:"Séquentielle"},
     tags:[{t:"Prédiction",c:"adapt"}],
     vs:"Très fort contre les patterns répétitifs (Vagabond, Crescendo).",
     fn(h,r,st){
       if(r<3) return "coop";
       if(!st.markov) st.markov = {cc:0, cb:0, bc:0, bb:0};
       let prev = h[h.length-2], curr = h[h.length-1];
       if(prev==="coop"&&curr==="coop") st.markov.cc++;
       if(prev==="coop"&&curr==="betray") st.markov.cb++;
       if(prev==="betray"&&curr==="coop") st.markov.bc++;
       if(prev==="betray"&&curr==="betray") st.markov.bb++;
       
       let pBetray = 0.5;
       if(curr==="coop" && (st.markov.cc+st.markov.cb)>0) pBetray = st.markov.cb/(st.markov.cc+st.markov.cb);
       if(curr==="betray" && (st.markov.bc+st.markov.bb)>0) pBetray = st.markov.bb/(st.markov.bc+st.markov.bb);
       
       return pBetray > 0.5 ? "betray" : "coop";
     }},
    {sid:"zephyr_b", name:"Le Maître Chanteur", tag:"Psychologique", tc:"chaos",
     desc:"Alterne aléatoirement, mais si on le trahit, il punit lourdement pendant 3 tours.",
     behav:"Mixte + Punition longue",
     stats:{Agressivité:"Aléatoire",Coopération:"Imprévisible",Mémoire:"Punitive (3 tours)"},
     tags:[{t:"Dissuasion",c:"aggr"}],
     vs:"Détruit les AllD. Rend fous les TFT.",
     fn(h,r,st){
       if(!st.punish) st.punish = 0;
       if(h.length && h[h.length-1]==="betray" && st.punish===0) st.punish = 3;
       if(st.punish > 0){ st.punish--; return "betray"; }
       return Math.random() < 0.5 ? "coop" : "betray";
     }},
    {sid:"zephyr_c", name:"L'Altruiste Calculateur", tag:"Équilibre", tc:"def",
     desc:"Coopère seulement si l'adversaire a un taux de coopération entre 40% et 60%. Exploite les extrêmes.",
     behav:"Coop si taux adverse ∈ [0.4, 0.6]",
     stats:{Agressivité:"Contre les extrêmes",Coopération:"Modératrice",Mémoire:"Totale"},
     tags:[{t:"Anti-Extrême",c:"def"}],
     vs:"Punit les AllC (exploit) et punit les AllD (réciproque). Stabilise les Randoms.",
     fn(h){
       if(h.length < 4) return "coop";
       let rate = h.filter(x=>x==="coop").length / h.length;
       return (rate >= 0.4 && rate <= 0.6) ? "coop" : "betray";
     }},
    {sid:"zephyr_d", name:"L'Écho Décalé", tag:"Retardement", tc:"adapt",
     desc:"Copie l'avant-dernier coup de l'adversaire (et non le dernier). Perturbe les stratégies réactives.",
     behav:"Copie coup n-2",
     stats:{Agressivité:"Réactive",Coopération:"Réactive",Mémoire:"Décalée"},
     tags:[{t:"Anti-TFT",c:"chaos"}],
     vs:"Crée des cycles infinis très étranges contre TFT et GTFT.",
     fn(h){
       if(h.length < 2) return "coop";
       return h[h.length-2];
     }},
  ]},
  {id:"nina",   name:"Nina",   e:"📚",color:"#ff6eb5",strats:[
    {sid:"nina_a",   name:"La Généreuse (GTFT)",   tag:"Indulgente",  tc:"coop",
     desc:"TFT avec 20% de pardon après une trahison. Brise les cycles de vengeance.",
     behav:"TFT + 20% pardon post-trahison",
     stats:{Agressivité:"Faible",Coopération:"Haute",Mémoire:"1 round + aléa"},
     tags:[{t:"Pardon partiel",c:"coop"},{t:"Cycle-breaking",c:"adapt"}],
     vs:"<b>AllD</b> profite légèrement. <b>TFT</b> ensemble : brisent mieux les cycles.",
     fn(h){
       if(!h.length)return"coop";
       return h[h.length-1]==="coop"?"coop":Math.random()<0.2?"coop":"betray";
     }},
    {sid:"nina_b",   name:"La Philosophe",          tag:"Tendances",   tc:"adapt",
     desc:"Analyse les 10 derniers rounds. Coopère si tendance globale >50% coopérative.",
     behav:"Coop si tendance >50% coop sur 10 rounds",
     stats:{Agressivité:"Proportionnelle",Coopération:"Contextuelle",Mémoire:"10 rounds glissants"},
     tags:[{t:"Tendances longues",c:"adapt"},{t:"Résistante au bruit",c:"coop"}],
     vs:"<b>AllD</b> : tendance clairement hostile. <b>Random</b> : ~50/50, oscille.",
     fn(h){
       if(h.length<10)return"coop";
       return h.slice(-10).filter(x=>x==="betray").length/10>0.5?"betray":"coop";
     }},
    {sid:"nina_c",   name:"L'Humaniste",            tag:"No Double-D", tc:"coop",
     desc:"Ne trahit jamais deux fois de suite. Même si l'adversaire trahit en boucle, Nina alterne C/D. Humaine avant tout.",
     behav:"Jamais deux trahisons consécutives",
     stats:{Agressivité:"Modérée",Coopération:"Alternée",Mémoire:"Son propre dernier coup"},
     tags:[{t:"No double defect",c:"coop"},{t:"Humaniste",c:"coop"}],
     vs:"<b>AllD</b> : alterne C/D pour toujours, score honorable. <b>TFT</b> : coopération soutenue.",
     fn(h,r,st){
       if(!st.last)st.last="coop";
       if(st.last==="betray"){st.last="coop";return"coop";}
       const m=h.length&&h[h.length-1]==="betray"?"betray":"coop";
       st.last=m;return m;
     }},
    {sid:"nina_d",   name:"La Sage",                tag:"Sagesse",     tc:"adapt",
     desc:"Trahit seulement si l'adversaire a trahi en dernier ET que le taux global est <50%. Sinon pardonne toujours.",
     behav:"Trahit si: dernière trahison ET taux coop < 50%",
     stats:{Agressivité:"Minimale",Coopération:"Maximale",Mémoire:"Dernier coup + historique"},
     tags:[{t:"Double condition",c:"adapt"},{t:"Sagesse pacifiste",c:"coop"}],
     vs:"<b>AllD</b> : finit par trahir systématiquement. <b>AllC</b> : coopération permanente.",
     fn(h){
       if(!h.length)return"coop";
       if(h[h.length-1]==="coop")return"coop";
       const coopRate=h.filter(x=>x==="coop").length/h.length;
       return coopRate<0.5?"betray":"coop";
     }},
  ]},
];
const ALL_STRATS=CHARS.flatMap(c=>c.strats.map(s=>({...s,charId:c.id,charName:c.name,e:c.e,color:c.color})));
const PTMAP4=[4,3,2,1];
const PTMAP8=[8,7,6,5,4,3,2,1];
const PTMAP16=[16,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0];
const PTMAP32=Array.from({length:32},(_,i)=>Math.max(0,32-i));
function getPtMap(n){if(n<=4)return PTMAP4;if(n<=8)return PTMAP8;if(n<=16)return PTMAP16;return PTMAP32;}
const HARD_CAP=2000;
const BATCH_MAP={1:8,5:4,20:2,70:1};
  
let sandboxConfig = {
  structure: "bracket",
  matrix: "standard",
  eol: [],
  modifiers: []
};
const CONFIG_STRUCTURE = [
  {id:"rrobin", icon:"🔄", name:"Round Robin", desc:"Chacun contre tous"},
  {id:"bracket", icon:"🏆", name:"Bracket", desc:"Phases éliminatoires"},
  {id:"duel2", icon:"🔄", name:"Double Élim", desc:"1v1, deux défaites = out"},
  {id:"swiss", icon:"🇨🇭", name:"Swiss", desc:"Appariement équitable"},
  {id:"territoire", icon:"🗺", name:"Territoire", desc:"Jeu spatial sur grille"},
  {id:"reseau", icon:"🕸️", name:"Réseau", desc:"Graphe social (Hubs & Isolés)"}, 
  {id:"nexus", icon:"🌐", name:"Nexus", desc:"3 tournois enchaînés"},
  {id:"observatoire", icon:"🔭", name:"Observatoire", desc:"6 arènes parallèles"}
];
const CONFIG_MATRIX = [
  {id:"standard", icon:"🎲", name:"Standard", desc:"Générée aléatoirement"},
  {id:"goat", icon:"🐐", name:"GOAT Mode", desc:"Canonique T=5 R=3 P=1 S=0"},
  {id:"custom_mat", icon:"🎛️", name:"Sur Mesure", desc:"Définissez T, R, P, S"}, 
  {id:"quantique", icon:"🌌", name:"Quantique", desc:"Payoffs fluctuants"}, 
  {id:"chaos", icon:"⚡", name:"Chaos", desc:"Change toutes les 80 gens"},
  {id:"eco", icon:"🌿", name:"Écologie", desc:"S'adapte au taux de coop"},
  {id:"arms", icon:"🚀", name:"Arms Race", desc:"Tentation T monte à chaque manche"}
];
const CONFIG_EOL = [
  {id:"survival", icon:"💀", name:"Survie", desc:"Éliminé si pop < 5%"},
  {id:"rechauffement", icon:"🌡️", name:"Réchauffement", desc:"Seuil de survie croissant"}, 
  {id:"extinction", icon:"☄️", name:"Extinction", desc:"Les 20% faibles balayés (50g)"},
  {id:"royale", icon:"💥", name:"Battle Royale", desc:"Le dernier exécuté (60g)"},
  {id:"tsunami", icon:"🌊", name:"Tsunami", desc:"Remplacement par des challengers"}
];
const CONFIG_MODIFIERS = [
  {id:"invasion", icon:"🦠", name:"Invasion", desc:"Vous commencez à 5%"},
  {id:"gauntlet", icon:"⚔", name:"Gauntlet", desc:"Vous commencez avec pop x2"},
  {id:"koh", icon:"👑", name:"King of Hill", desc:"Points bonus pour le trône"},
  {id:"propaganda", icon:"📢", name:"Propagande", desc:"Le leader convertit les faibles"},
  {id:"diplomacy", icon:"🌍", name:"Diplomatie", desc:"Coalitions anti-leader (>40%)"},
  {id:"mirror", icon:"🪞", name:"Miroir", desc:"+30% auto-évaluation"},
  {id:"vendetta", icon:"🗡", name:"Vendetta", desc:"Rancune permanente"},
  {id:"epidemie", icon:"🦠", name:"Épidémie", desc:"Trahison contagieuse"},
  {id:"mutation", icon:"🧬", name:"Mutation", desc:"Variantes imprévisibles (<3%)"},
  {id:"coevo", icon:"🧬", name:"Coévolution", desc:"Copie imparfaite des forts"},
  {id:"coalition", icon:"🤝", name:"Coalition", desc:"Factions émergentes"},
  {id:"civilisation", icon:"🏛", name:"Civilisations", desc:"4 Factions prédéfinies"}
];
let nPlayers=8;
let draft={sel:[],me:null};
const MISSIONS=[
  {id:"m1",n:"MISSION 01",name:"Les Origines",
   story:"Nous sommes en 1981. Axelrod vient de recevoir les résultats de son premier tournoi. Un inconnu nommé Rapoport a soumis le code le plus simple : 4 lignes. Vous jouez TFT. Prouvez qu'il méritait de gagner.",
   obj:"Finir 1er avec TFT (Analyste)",boss:"AllD (Despote)",
   setup:"8 joueurs · Round Robin · Standard",
   structure:"rrobin", matrix:"standard", eol:[], modifiers:[], N:8, me:"brick_a",
   tags:["obj:Victoire avec L'Analyste","boss:Le Despote"],
   condition:{type:"winner_sid",value:"brick_a"}},
  {id:"m2",n:"MISSION 02",name:"La Guerre Froide",
   story:"Les missiles sont pointés. Chaque nation calcule : trahir rapporte plus, mais si tout le monde trahit, c'est l'anéantissement mutuel. Vous dirigez une puissance qui refuse l'escalade.",
   obj:"Survive 3 manches d'Arms Race",boss:"L'Implacable + Le Crescendo",
   setup:"8 joueurs · Round Robin · Arms Race",
   structure:"rrobin", matrix:"arms", eol:[], modifiers:[], N:8, me:"pedro_a",
   tags:["obj:Finir dans le top 3","boss:Escalade de T"],
   condition:{type:"top3"}},
  {id:"m3",n:"MISSION 03",name:"Invasion",
   story:"Une colonie de coopérateurs contrôle 95% du territoire. Vos traîtres ne représentent que 5% de la population. Infiltrez-vous, adaptez-vous, dominez.",
   obj:"Invasion réussie : atteindre 50%",boss:"Territoire hostile (95%)",
   setup:"8 joueurs · Invasion",
   structure:"rrobin", matrix:"standard", eol:[], modifiers:["invasion"], N:8, me:"nick_c",
   tags:["obj:Coloniser 50% du territoire","boss:Masse de coopérateurs"],
   condition:{type:"invasion"}},
  {id:"m4",n:"MISSION 04",name:"Le Chaos Absolu",
   story:"Les règles changent sans prévenir. La matrice de gains se recalibrate toutes les 80 générations. Dans l'instabilité totale, seuls les adaptables survivent.",
   obj:"Gagner le tournoi Chaos",boss:"Le Chaos lui-même",
   setup:"16 joueurs · Chaos",
   structure:"rrobin", matrix:"chaos", eol:[], modifiers:[], N:16, me:null,
   tags:["obj:1er place finale","boss:Instabilité matricielle"],
   condition:{type:"winner"}},
  {id:"m5",n:"MISSION 05",name:"La Diplomatie",
   story:"L'hégémonie est impossible. Chaque fois qu'un empire monte, les autres se coalisent contre lui. Naviguez dans ce jeu d'alliances précaires sans jamais vous exposer.",
   obj:"Gagner sans jamais dépasser 60%",boss:"Coalition permanente",
   setup:"16 joueurs · Diplomatie",
   structure:"rrobin", matrix:"standard", eol:[], modifiers:["diplomacy"], N:16, me:null,
   tags:["obj:Gagner en restant discret","boss:Coalitions automatiques"],
   condition:{type:"winner"}},
  {id:"m6",n:"MISSION 06",name:"Le GOAT Final",
   story:"Matrice canonique T=5 R=3 P=1 S=0. Le benchmark d'Axelrod 1984. Toutes les légendes sont là. Une seule question : qui est réellement le plus grand de tous les temps ?",
   obj:"Gagner le mode GOAT",boss:"Les 32 stratèges",
   setup:"32 joueurs · GOAT Mode",
   structure:"rrobin", matrix:"goat", eol:[], modifiers:[], N:32, me:null,
   tags:["obj:Champion GOAT","boss:Tous les stratèges"],
   condition:{type:"winner"}},
];
const COMM_TEMPLATES={
  phoenix:[
    (e,c)=>`Incroyable retournement ! ${c.p1} semblait condamné — et pourtant, le voilà qui surgit des décombres à la génération ${c.gen}. ${c.p2?`${c.p2} ferait bien de regarder derrière lui.`:""}`,
    (e,c)=>`On les avait enterrés trop tôt. ${c.p1} vient de signer l'une des remontées les plus spectaculaires de ce tournoi. À ${c.coopPct}% de coopération globale, rien n'est jamais acquis.`,
    (e,c)=>`${c.gen} générations de combat, et c'est maintenant que ${c.p1} se réveille ! ${c.coop>55?"La patience coopérative a payé.":"La trahison au bon moment — un classique."} La salle est en délire.`,
    (e,c)=>`De l'ombre à la lumière. ${c.p1} refait surface avec une brutalité déconcertante. Ceux qui avaient parié sur sa disparition regrettent amèrement leur cynisme.`,
    (e,c)=>`Phoenix ! ${c.p1} était à l'agonie — le voilà qui dépasse ${c.p2||"ses adversaires"} d'un coup d'aile rageur. Ce tournoi n'est pas fini, loin de là.`,
  ],
  dom:[
    (e,c)=>`${c.p1} établit sa domination — ${c.leadPct}% de la population sous son contrôle. ${c.p2?`${c.p2} résiste encore, mais pour combien de temps ?`:"Les autres stratèges semblent impuissants."} ${c.coop>55?"Une hégémonie fondée sur la confiance.":"Une tyrannie froide et méthodique."}`,
    (e,c)=>`C'est un rouleau compresseur. ${c.p1} écrase tout sur son passage. ${c.p2?`${c.p2} est relégué à ${c.p2Pct}% — il faut un miracle.`:""} À ${c.coopPct}% de coop, le ton est donné.`,
    (e,c)=>`Domination absolue de ${c.p1}. La question n'est plus "qui va gagner ?" mais "qui va résister le plus longtemps ?" ${c.p3?`${c.p3} joue sa survie.`:""}`,
    (e,c)=>`${c.p1} impose sa loi à la génération ${c.gen}. ${c.coop<35?"La trahison systématique porte ses fruits — redoutable.":"La coopération comme arme absolue — élégant."} Les challengers devront se réinventer.`,
  ],
  lead:[
    (e,c)=>`Changement de tête ! ${c.p1} arrache le leadership — ${c.leadPct}% contre ${c.p2Pct||"?"}% pour ${c.p2||"le second"}. Personne n'avait anticipé ce retournement.`,
    (e,c)=>`${c.p1} prend les commandes à la génération ${c.gen}. ${c.coop>55?"Atmosphère coopérative favorable.":"Le chaos lui profite."} Le classement est plus ouvert que jamais.`,
    (e,c)=>`Nouveau leader ! ${c.p1} détrône ${c.p2||"l'ancien patron"}. ${c.coopPct}% de coopération — ${c.coop>60?"un signal fort.":"une tension palpable."}`,
    (e,c)=>`${c.p1} s'empare du sommet. ${c.p2?`${c.p2} devra riposter vite — l'écart se creuse.`:"La hiérarchie est rebattue."} Génération ${c.gen}, tout reste à jouer.`,
  ],
  collapse:[
    (e,c)=>`L'effondrement coopératif. Le taux dégringole à ${c.coopPct}% — une spirale de méfiance qui emportera les plus fragiles. ${c.p1} saura-t-il naviguer dans ce chaos ?`,
    (e,c)=>`La confiance s'est brisée en quelques générations. ${c.p1} tient la tête, mais dans une guerre de tous contre tous, aucun avantage n'est définitif.`,
    (e,c)=>`${c.coopPct}% de coopération — les chiffres sont impitoyables. La trahison est devenue endémique. Qui sera assez cynique pour en profiter ? ${c.p1} en pole position.`,
    (e,c)=>`Effondrement. En quelques générations, ce tournoi a basculé dans l'anarchie. La sélection naturelle va s'accélérer — seuls les plus adaptables survivront à cet hiver de la coopération.`,
  ],
  phase:[
    (e,c)=>`Fin de la manche ${c.phase} sur ${c.maxPhases}. ${c.p1} domine avec ${c.leadPct}% de population${c.p2?`, devant ${c.p2} à ${c.p2Pct}%`:""}.${c.phase<c.maxPhases?" La prochaine manche sera décisive.":""} Coopération globale : ${c.coopPct}%.`,
    (e,c)=>{const coop=c.coop>65?" Un tournoi remarquablement coopératif.":c.coop<35?" La trahison a régné.":"L'équilibre reste fragile.";const ev=c.milestoneCount>0?` ${c.milestoneCount} moment${c.milestoneCount>1?"s":""} fort${c.milestoneCount>1?"s":""}.`:"";return`Manche ${c.phase}/${c.maxPhases} — rideau. ${c.p1} en tête${c.p2?`, ${c.p2} à la chasse`:""}${c.p3?`, ${c.p3} en embuscade`:""}.${coop}${ev}`;},
    (e,c)=>`Arrêt sur image. Après ${c.gen} générations, ${c.p1} commande. ${c.trend==="up"?`Sa progression est fulgurante — +${c.trendPct}% sur cette manche.`:c.trend==="down"?`Mais attention — ${c.p1} perd du terrain, ${c.p2||"un challenger"} revient fort.`:"La domination reste stable."} ${c.coopPct}% de coop globale.`,
    (e,c)=>`Manche terminée. ${c.p1} est en tête, mais ${c.p2?`${c.p2} n'est qu'à ${Math.abs((c.leadPct||0)-(c.p2Pct||0))}% derrière`:""} — un écart qui peut fondre en quelques générations. Mode ${c.mode} : chaque manche rebat les cartes.`,
    (e,c)=>`Bilan de la manche ${c.phase}. Leader : ${c.p1} (${c.leadPct}%). ${c.coop>60?`Le camp coopérateur a brillé — ${c.coopPct}% de coopération moyenne.`:c.coop<35?`La trahison a fait la loi — ${c.coopPct}% de coop seulement.`:`Équilibre instable à ${c.coopPct}% de coop.`}${c.milestoneCount>2?` Ce fut une manche épique.`:""}`,
  ],
  win:[
    (e,c)=>`${c.p1} remporte ce tournoi en mode ${c.mode} ! ${c.gen} générations, ${c.coopPct}% de coopération moyenne. ${c.coop>65?"Une victoire bâtie sur la confiance — la preuve que coopérer paye sur la durée.":c.coop<35?"Une victoire arrachée dans la boue — la trahison a finalement triomphé.":"Un triomphe équilibré, entre alliances et calculs froids. Le dilemme du prisonnier n'a pas livré tous ses secrets."}`,
    (e,c)=>`Rideau ! ${c.p1} s'impose comme le grand vainqueur. ${c.p2?`${c.p2} termine second — honorable mais insuffisant.`:""} ${c.gen} générations de lutte. La théorie des jeux a parlé.`,
    (e,c)=>`${c.p1} — champion ! Coopération à ${c.coopPct}%, ${c.gen} générations. ${c.milestoneCount} moment${c.milestoneCount>1?"s":""} fort${c.milestoneCount>1?"s":""} ont marqué ce tournoi. ${c.coop>60?"La confiance, arme suprême.":"La trahison, art de vivre."} Chapeau bas.`,
    (e,c)=>`C'est terminé. ${c.p1} écrase la concurrence pour s'adjuger la victoire en ${c.gen} générations. ${c.p2?`${c.p2} et ${c.p3||"les autres"} devront revoir leur stratégie.`:""} Ce tournoi restera gravé dans les annales.`,
    (e,c)=>`Victoire de ${c.p1} ! En mode ${c.mode}, avec ${c.coopPct}% de coopération, ${c.p1} a dominé ${c.gen} générations d'évolution impitoyable. ${c.leadPct}% de population finale — une suprématie écrasante.`,
  ],
  elim:[
    (e,c)=>`Élimination ! Le champ de bataille se réduit encore. ${c.p1} consolide son avance pendant que les plus faibles disparaissent un à un.`,
    (e,c)=>`Encore une victime de la sélection. La nature est impitoyable — dans l'arène du dilemme du prisonnier, la moindre faiblesse se paie cher.`,
  ],
  default:[
    (e,c)=>`Le tournoi se poursuit. ${c.p1} mène à la génération ${c.gen}${c.p2?`, talonné par ${c.p2} à ${c.p2Pct}%`:""}.`,
    (e,c)=>`${c.coopPct}% de coopération globale. ${c.p1} en tête — ${c.coop>55?"l'équilibre coopératif tient bon.":"la méfiance s'est installée."}`,
    (e,c)=>`Génération ${c.gen}. ${c.p1} domine avec ${c.leadPct}%. ${c.coop>55?"L'esprit de coopération reste vivace.":"La méfiance s'est installée durablement."}`,
  ]
};
const WORLD_EVENTS=[
  {id:"revolution",icon:"🔥",title:"RÉVOLUTION",category:"CRISE POLITIQUE",
   desc:"Le leader est renversé. Sa population est divisée par deux et redistribuée aux opprimés.",
   effect:"Leader -50% · Bottom 30% +80%",col:"var(--red)",
   apply(pay){
     const total=T.strats.reduce((s,x)=>s+x.pop,0)||1;
     const sorted=[...Array(T.N).keys()].sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
     const leader=sorted[0];const bottom=sorted.slice(-Math.ceil(T.N*0.3));
     const taken=T.strats[leader].pop*0.5;T.strats[leader].pop-=taken;
     const share=taken/bottom.length;bottom.forEach(i=>T.strats[i].pop+=share);
     addEvt("ek2",`🔥 RÉVOLUTION ! ${T.strats[leader].e}${T.strats[leader].name} renversé !`);
     T.milestones.push({gen:T.gen,txt:`🔥 Révolution ! ${T.strats[leader].name} renversé`,type:"dom"});
   },duration:0},
  {id:"amnistie",icon:"🕊",title:"GRANDE AMNISTIE",category:"DIPLOMATIE",
   desc:"Toutes les rancunes sont oubliées. Toutes les stratégies reprennent leurs décisions sur une ardoise vierge.",
   effect:"Reset mémoire · Coop boost +15%",col:"var(--teal)",
   apply(pay){
     T.strats.forEach(s=>{s.st={};s.coopRate=Math.min(1,s.coopRate+0.15);});
     if(T.vendettaMatrix)T.vendettaMatrix=Array.from({length:T.N},()=>new Float64Array(T.N));
     addEvt("ea",`🕊 Amnistie générale ! Toutes les rancunes effacées.`);
     T.milestones.push({gen:T.gen,txt:"🕊 Grande Amnistie — ardoise vierge",type:"lead"});
   },duration:0},
  {id:"famine",icon:"💀",title:"GRANDE FAMINE",category:"CATASTROPHE",
   desc:"Les ressources s'effondrent. Toutes les populations perdent 30%. Les forts survivent moins bien.",
   effect:"Toutes pops -30% · Renormalisé",col:"var(--amber)",
   apply(pay){
     T.strats.forEach(s=>{s.pop*=0.7;});
     addEvt("ek",`💀 Grande Famine ! Toutes les populations s'effondrent.`);
     T.milestones.push({gen:T.gen,txt:"💀 Grande Famine — effondrement populaire",type:"collapse"});
   },duration:0},
  {id:"choc_eco",icon:"📉",title:"CHOC ÉCONOMIQUE",category:"ÉCONOMIE",
   desc:"Crise mondiale. Les gains de la trahison s'effondrent pendant 40 générations.",
   effect:"Payoff trahison ×0.5 pendant 40 gens",col:"var(--purple)",
   apply(pay){
     const modded=pay.map(r=>r.map((v,ci)=>ci>0?v*0.5:v));
     T.worldEventPayMod={original:pay,modded};
     return modded;
   },duration:40},
  {id:"diplomatie",icon:"🌍",title:"ÈRE DE PAIX",category:"DIPLOMATIE",
   desc:"Traités internationaux. La coopération rapporte davantage pendant 50 générations.",
   effect:"Payoff coop ×1.4 pendant 50 gens",col:"var(--green)",
   apply(pay){
     const modded=pay.map((r,ri)=>r.map((v,ci)=>ri===0&&ci===0?v*1.4:v));
     T.worldEventPayMod={original:pay,modded};
     return modded;
   },duration:50},
  {id:"pandémie",icon:"🦠",title:"PANDÉMIE",category:"CATASTROPHE",
   desc:"Un virus de méfiance se propage. Les stratégies coopératives deviennent temporairement plus méfiantes.",
   effect:"CoopRate des allC -30% · Trahisseurs boostés",col:"var(--pink)",
   apply(pay){
     T.strats.forEach(s=>{if((s.coopRate||0.5)>0.6){s.coopRate=Math.max(0.2,s.coopRate-0.3);}else{s.pop*=1.1;}});
     addEvt("ek",`🦠 Pandémie de méfiance ! Les coopérateurs vacillent.`);
     T.milestones.push({gen:T.gen,txt:"🦠 Pandémie — méfiance généralisée",type:"collapse"});
   },duration:0},
  {id:"renaissance",icon:"⭐",title:"RENAISSANCE",category:"ESPOIR",
   desc:"Les outsiders se révoltent. Les 3 derniers voient leur population doubler instantanément.",
   effect:"Bottom 3 pop ×2 · Surprise garantie",col:"var(--gold)",
   apply(pay){
     const sorted=[...Array(T.N).keys()].filter(i=>T.strats[i].pop>0).sort((a,b)=>T.strats[a].pop-T.strats[b].pop);
     sorted.slice(0,3).forEach(i=>{T.strats[i].pop*=2;spawnDomination&&spawnDomination(i);});
     addEvt("ea",`⭐ Renaissance ! Les outsiders se relèvent !`);
     T.milestones.push({gen:T.gen,txt:"⭐ Renaissance des outsiders",type:"phoenix"});
   },duration:0},
  {id:"trahison_sys",icon:"🗡",title:"TRAHISON SYSTÉMIQUE",category:"CHAOS",
   desc:"Quelque chose empoisonne l'air. Toutes les stratégies trahissent davantage pendant 25 générations.",
   effect:"CoopRate -25% global · 25 gens",col:"var(--red)",
   apply(pay){
     T.strats.forEach(s=>{s.coopRate=Math.max(0.05,s.coopRate-0.25);});
     addEvt("ek2",`🗡 Trahison systémique ! La confiance s'effondre partout.`);
     T.milestones.push({gen:T.gen,txt:"🗡 Trahison systémique — chaos total",type:"collapse"});
   },duration:25},
];
const ACHIEVEMENTS=[
  {id:"first_blood",icon:"🩸",name:"Premier Sang",desc:"Première élimination d'un tournoi"},
  {id:"allc_win",icon:"🕊",name:"Pacifiste",desc:"Gagner un tournoi avec une stratégie AllC"},
  {id:"alld_win",icon:"💀",name:"Tyran",desc:"Gagner un tournoi avec AllD ou similaire"},
  {id:"phoenix",icon:"🦅",name:"Phénix",desc:"Remonter de <5% à >50% de population"},
  {id:"coop80",icon:"🌈",name:"Utopie",desc:"Maintenir coop >80% pendant 100 générations"},
  {id:"collapse",icon:"💥",name:"Apocalypse",desc:"Effondrement total (coop <10%)"},
  {id:"goat_win",icon:"🐐",name:"GOAT",desc:"Gagner en mode GOAT"},
  {id:"invasion_ok",icon:"🦠",name:"Conquistador",desc:"Invasion réussie (5%→50%)"},
  {id:"mutation_win",icon:"🧬",name:"Darwin",desc:"Gagner avec un stratège muté"},
  {id:"domination",icon:"☢️",name:"Omnipotent",desc:"Atteindre 90% de population"},
  {id:"custom_win",icon:"🔧",name:"Architecte",desc:"Gagner avec votre stratège personnalisé"},
  {id:"campaign_end",icon:"🎖",name:"Le Général",desc:"Terminer toutes les missions de la campagne"},
];
const CIV_FACTIONS=[
  {id:"pacifistes", name:"Pacifistes",    icon:"🕊", color:"#5bdfb4", coopThresh:0.60},
  {id:"guerriers",  name:"Guerriers",     icon:"⚔️", color:"#ff5f5f", coopThresh:0.30},
  {id:"stratèges",  name:"Stratèges",     icon:"🧠", color:"#7eb8ff", coopThresh:0.50},
  {id:"opportunistes",name:"Opportunistes",icon:"🎭", color:"#f5c842", coopThresh:0.45},
];
const OBS_VARIANTS=[
  {label:"Standard",     noiseBonus:0,    alphaBonus:0,   payMod:1.0},
  {label:"Bruit élevé",  noiseBonus:0.15, alphaBonus:0,   payMod:1.0},
  {label:"Évolution rapide",noiseBonus:0, alphaBonus:0.04,payMod:1.0},
  {label:"Haute trahison",noiseBonus:0,   alphaBonus:0,   payMod:1.3, tMod:1.5},
  {label:"Coopération forcée",noiseBonus:0,alphaBonus:0,  payMod:0.7, tMod:0.6},
  {label:"Chaos pur",    noiseBonus:0.25, alphaBonus:0.05,payMod:1.0},
];
const CHAPTER_NAMES=[
  "L'Aube du Tournoi","La Montée en Puissance","L'Ère des Trahisons","La Grande Guerre",
  "L'Équilibre Fragile","Le Temps des Champions","Le Crépuscule","L'Âge d'Or",
  "La Chute","La Renaissance","L'Ère Nouvelle","Le Dernier Acte"
];
const RIVALRY_ADJ=["Grande","Éternelle","Légendaire","Sanglante","Secrète","Épique","Silencieuse","Infernale","Titanesque","Fatale"];
const RIVALRY_NOUN=["Guerre","Rivalité","Bataille","Lutte","Confrontation","Duel","Querelle","Vendetta","Saga","Guerre Froide"];
