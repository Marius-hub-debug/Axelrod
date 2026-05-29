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
