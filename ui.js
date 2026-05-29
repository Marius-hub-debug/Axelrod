(function boot(){
  buildSandboxGrids();buildCharGrid();buildWikiAll();randomDraft();
  document.querySelectorAll('input[name="cond"]').forEach(r=>r.addEventListener("change",()=>{
    document.getElementById("cfg-gen").style.display=r.value==="gen"?"":"none";
    document.getElementById("cfg-pop").style.display=r.value==="pop"?"":"none";
  }));
  updateSummary();
})();
function buildSandboxGrids() {
  const renderCard = (m, isSelected, onClickFn) => `
    <div class="mcard ${isSelected ? 'sel' : ''}" onclick="${onClickFn}('${m.id}')">
      <span class="mcard-icon">${m.icon}</span>
      <div class="mcard-name">${m.name}</div>
      <div class="mcard-desc">${m.desc}</div>
    </div>`;
  document.getElementById("grid-structure").innerHTML = CONFIG_STRUCTURE.map(m => renderCard(m, sandboxConfig.structure === m.id, 'setStructure')).join("");
  document.getElementById("grid-matrix").innerHTML = CONFIG_MATRIX.map(m => renderCard(m, sandboxConfig.matrix === m.id, 'setMatrix')).join("");
  document.getElementById("grid-eol").innerHTML = CONFIG_EOL.map(m => renderCard(m, sandboxConfig.eol.includes(m.id), 'toggleEol')).join("");
  document.getElementById("grid-modifiers").innerHTML = CONFIG_MODIFIERS.map(m => renderCard(m, sandboxConfig.modifiers.includes(m.id), 'toggleModifier')).join("");
}
function setStructure(id) { sandboxConfig.structure = id; buildSandboxGrids(); updateSummary(); }
function setMatrix(id) { 
  sandboxConfig.matrix = id; 
  buildSandboxGrids(); 
  updateSummary(); 
  document.getElementById("cfg-custom-mat").style.display = (id === "custom_mat") ? "block" : "none";
}
function toggleEol(id) { 
  const idx = sandboxConfig.eol.indexOf(id); 
  if(idx > -1) sandboxConfig.eol.splice(idx, 1); else sandboxConfig.eol.push(id);
  buildSandboxGrids(); updateSummary(); 
}
function toggleModifier(id) { 
  const idx = sandboxConfig.modifiers.indexOf(id); 
  if(idx > -1) sandboxConfig.modifiers.splice(idx, 1); else sandboxConfig.modifiers.push(id);
  buildSandboxGrids(); updateSummary(); 
}
function setN(n){
  nPlayers=n;
  [4,8,16,32].forEach(x=>{
    const el=document.getElementById("nc-"+x);
    if(el){el.classList.toggle("sel",x===n);const nn=el.querySelector(".ncard-n");if(nn)nn.style.color=x===n?"var(--teal)":"";}
  });
  document.getElementById("sel-max").textContent=n;
  if(draft.sel.length>n){draft.sel=draft.sel.slice(0,n);if(!draft.sel.includes(draft.me))draft.me=draft.sel[0]||null;}
  buildCharGrid();renderSlots();updateSummary();
}
function toggleAdv(){
  document.getElementById("adv-toggle").classList.toggle("open");
  document.getElementById("adv-body").classList.toggle("show");
}
function buildCharGrid(){
  const elo=loadELO();
  document.getElementById("char-grid").innerHTML=CHARS.map(c=>{
    const hasSel=c.strats.some(s=>draft.sel.includes(s.sid));
    return`<div class="cblock ${hasSel?"has-sel":""}">
      <div class="cblock-head">
        <div class="cbe">${c.e}</div>
        <div class="cbn" style="color:${c.color}">${c.name.toUpperCase()}</div>
      </div>
      <div class="cstrats">
        ${c.strats.map(s=>{
          const sel=draft.sel.includes(s.sid),me=draft.me===s.sid,full=!sel&&draft.sel.length>=nPlayers;
          const eloData=elo[s.sid];
          const eloBadge=eloData?`<span class="elo-badge ${getELOClass(eloData.rating)}" title="${eloData.games} tournois">${getELOLabel(eloData.rating)}</span>`:"";
          return`<div class="scard ${me?"me-sel":sel?"sel":""} ${full?"disabled":""}" onclick="toggleStrat('${s.sid}')">
            <div class="sc-icon">${c.e}</div>
            <div class="sc-info">
              <div class="sc-name" style="color:${c.color}">${s.name}</div>
              <div style="display:flex;align-items:center;gap:4px"><span class="sc-tag tag ${s.tc}">${s.tag}</span>${eloBadge}</div>
            </div>
            <button class="sc-wiki" onclick="event.stopPropagation();openWikiStrat('${s.sid}')" title="Wiki">ⓘ</button>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  }).join("");
}
function toggleStrat(sid){
  const idx=draft.sel.indexOf(sid);
  if(idx>=0){draft.sel.splice(idx,1);if(draft.me===sid)draft.me=draft.sel[0]||null;}
  else{if(draft.sel.length>=nPlayers)return;draft.sel.push(sid);if(!draft.me)draft.me=sid;}
  buildCharGrid();renderSlots();updateSummary();
}
function setMe(sid){if(draft.sel.includes(sid)){draft.me=sid;buildCharGrid();renderSlots();}}
function renderSlots(){
  const slots=document.getElementById("draft-slots");
  const hint=document.getElementById("draft-hint");
  slots.innerHTML=Array(nPlayers).fill(0).map((_,i)=>{
    const sid=draft.sel[i];if(!sid)return`<div class="dslot"></div>`;
    const s=ALL_STRATS.find(x=>x.sid===sid);const me=draft.me===sid;
    return`<div class="dslot ${me?"me-slot":"filled"}" onclick="setMe('${sid}')" title="${s.charName}: ${s.name}" style="border-color:${s.color}40">${s.e}</div>`;
  }).join("");
  document.getElementById("sel-count").textContent=draft.sel.length;
  const me=draft.me?ALL_STRATS.find(x=>x.sid===draft.me):null;
  document.getElementById("sel-me").textContent=me?`${me.e} ${me.name}`:"—";
  document.getElementById("me-display").textContent=me?`★ vous = ${me.name}`:"";
  hint.style.display=nPlayers>16?"none":"";
}
function randomDraft(){
  const sh=[...ALL_STRATS].sort(()=>Math.random()-.5);
  draft.sel=sh.slice(0,nPlayers).map(s=>s.sid);
  draft.me=draft.sel[0];
  buildCharGrid();renderSlots();updateSummary();
}
function clearDraft(){draft.sel=[];draft.me=null;buildCharGrid();renderSlots();updateSummary();}
function selectAll32(){
  if(nPlayers!==32){setN(32);}
  draft.sel=ALL_STRATS.map(s=>s.sid);
  draft.me=draft.sel[0];
  buildCharGrid();renderSlots();updateSummary();
}
function updateSummary(){
  const mStruct = CONFIG_STRUCTURE.find(x=>x.id===sandboxConfig.structure);
  const mMat = CONFIG_MATRIX.find(x=>x.id===sandboxConfig.matrix);
  const cond=document.querySelector('input[name="cond"]:checked')?.value||"gen";
  const condVal=cond==="gen"?document.getElementById("gsl")?.value:(document.getElementById("psl")?.value+"%");
  const ph=document.getElementById("p-phases")?.value||3;
  document.getElementById("summary").innerHTML=`
    <div class="summary-row"><span class="summary-k">Struct.</span><span class="summary-v" style="color:var(--gold)">${mStruct?.name||"—"}</span></div>
    <div class="summary-row"><span class="summary-k">Matrice</span><span class="summary-v" style="color:var(--amber)">${mMat?.name||"—"}</span></div>
    <div class="summary-row"><span class="summary-k">Joueurs</span><span class="summary-v" style="color:var(--teal)">${nPlayers}</span></div>
    <div class="summary-row"><span class="summary-k">Arrêt</span><span class="summary-v">${cond==="gen"?"Générations: "+condVal:"Seuil: "+condVal}</span></div>
    <div class="summary-row"><span class="summary-k">Manches</span><span class="summary-v">${ph}</span></div>
    <div class="summary-row"><span class="summary-k">Stratèges</span><span class="summary-v">${draft.sel.length}</span></div>
    <div class="summary-row"><span class="summary-k">Vous</span><span class="summary-v" style="color:var(--teal)">${draft.me?ALL_STRATS.find(x=>x.sid===draft.me)?.name||"—":"—"}</span></div>`;
}
function launchTournament(){
  const err=document.getElementById("launch-err");
  if(draft.sel.length<nPlayers){err.textContent=`⚠ Sélectionnez ${nPlayers} stratèges`;return;}
  if(!draft.me){err.textContent="⚠ Cliquez un slot pour vous désigner";return;}
  err.textContent="";
  const s=document.getElementById("setup");
  s.style.opacity="0";s.style.transition="opacity .2s";
  setTimeout(()=>{s.classList.add("hidden");s.style.opacity="";s.style.transition="";initTournament();},200);
}
function goSetup(){
  if(T?.interval){clearInterval(T.interval);T.interval=null;}
  document.getElementById("setup").classList.remove("hidden");
  document.getElementById("final").classList.remove("show");
  const fs=document.getElementById("final-splash");if(fs)fs.style.display="none";
  const fb=document.getElementById("final-body");if(fb)fb.style.display="none";
  document.getElementById("pts-main").style.display="none";
  document.getElementById("btn-next").style.display="none";
  document.getElementById("btn-replay").style.display="none";
  ["chaos-banner","diplo-banner","goat-banner","arms-banner"].forEach(id=>document.getElementById(id).style.display="none");
  document.getElementById("pbadge").style.display="none";
  confettiPieces=[];
  const weO=document.getElementById("world-event-overlay");if(weO){clearTimeout(worldEventOverlayTimeout);weO.style.display="none";}
  setSt("idle","—");
}
function wikiStratHTML(c, s) {
  return `<div class="we" id="we_${s.sid}">
    <div class="we-head">
      <div class="we-emoji">${c.e}</div>
      <div><div class="we-name" style="color:${c.color}">${s.name}</div><div class="we-strat">${c.name} · ${s.tag}</div></div>
    </div>
    <div class="we-desc">${s.desc}</div>
    <div class="we-behav">"${s.behav}"</div>
    <div class="we-tags">${s.tags.map(t => `<span class="tag ${t.c}">${t.t}</span>`).join("")}</div>
    <div class="we-stats">${Object.entries(s.stats).map(([k, v]) => `<div class="we-stat"><div class="we-sv">${k}</div><div class="we-sv2">${v}</div></div>`).join("")}</div>
    <div class="we-vs">${s.vs}</div>
  </div>`;
}
function buildWikiAll() {
  
  const half = Math.ceil(CHARS.length / 2);
  document.getElementById("wiki-strats-content").innerHTML =
    `<div>${CHARS.slice(0, half).map(c => c.strats.map(s => wikiStratHTML(c, s)).join("")).join("")}</div>` +
    `<div>${CHARS.slice(half).map(c => c.strats.map(s => wikiStratHTML(c, s)).join("")).join("")}</div>`;
  
  const sandboxLore = [
    { cat: "1. STRUCTURES DE RENCONTRE", desc: "Définit comment les stratèges s'affrontent et le système de points.", items: [
      { i: "🔄", n: "Round Robin", b: "Classique", d: "Chacun affronte tous les autres. Le format le plus équitable pour évaluer la force brute d'une stratégie sur l'ensemble de l'écosystème." },
      { i: "🏆", n: "Bracket", b: "Éliminatoire", d: "Arbre de tournoi classique. Les vainqueurs avancent, les perdants vont en consolante. Favorise les stratégies capables de battre des adversaires spécifiques." },
      { i: "🔄", n: "Double Élimination", b: "Esport", d: "Format compétitif. Une défaite vous envoie dans le Loser Bracket. Deux défaites = élimination définitive de l'arène." },
      { i: "🇨🇭", n: "Système Suisse", b: "Équilibré", d: "À chaque manche, les forts affrontent les forts et les faibles affrontent les faibles. Évite les massacres unilatéraux initiaux." },
      { i: "🗺", n: "Territoire", b: "Spatial", d: "Simule une grille 2D. Un stratège ne joue qu'avec ses 4 voisins directs. Permet aux coopérateurs de former des clusters inexpugnables." },
      { i: "🕸️", n: "Réseau", b: "Topologie", d: "Les stratèges sont connectés via un graphe aléatoire (Small World). L'évolution se fait par influence locale en copiant le meilleur voisin. Les Hubs ont un avantage énorme." },
      { i: "🌐", n: "Nexus", b: "Méta-tournoi", d: "Enchaîne automatiquement 3 tournois complets consécutifs. Le vrai test d'endurance évolutionnaire." },
      { i: "🔭", n: "Observatoire", b: "Multivers", d: "Lance 6 arènes parallèles avec des conditions différentes (bruit, rapidité, matrices mutées) et compile un Méta-classement." }
    ]},
    { cat: "2. MATRICES DE GAINS", desc: "Le cœur du Dilemme du Prisonnier.", items: [
      { i: "🎲", n: "Standard", b: "Aléatoire", d: "Génère une matrice aléatoire respectant T > R > P > S à chaque nouvelle manche." },
      { i: "🐐", n: "Mode GOAT", b: "Historique", d: "Force la matrice canonique d'Axelrod 1984 (T=5, R=3, P=1, S=0) pour toute la durée de la partie." },
      { i: "🎛️", n: "Sur Mesure", b: "Custom", d: "Permet de régler manuellement les paramètres de la matrice (T, R, P, S) pour tester des dilemmes exotiques et casser les règles." },
      { i: "🌌", n: "Quantique", b: "Fluctuant", d: "La matrice de gains fluctue de façon aléatoire à chaque match. Le bruit de l'univers teste la capacité d'adaptation absolue." },
      { i: "⚡", n: "Chaos", b: "Instable", d: "La matrice mute et change toutes les 80 générations. Empêche toute adaptation à long terme." },
      { i: "🌿", n: "Écologie", b: "Réactif", d: "Feedback en temps réel : si tout le monde coopère, la Tentation (T) augmente. Si tout le monde trahit, la Récompense mutuelle (R) augmente." },
      { i: "🚀", n: "Course aux Armements", b: "Escalade", d: "À chaque nouvelle manche, la Tentation (T) augmente brutalement. Survivre à la dernière manche relève de l'exploit." }
    ]},
    { cat: "3. PROTOCOLES DE FIN DE VIE", desc: "Règles d'élimination de l'écosystème.", items: [
      { i: "💀", n: "Survie (Deathmatch)", b: "Tension", d: "Tout stratège dont la population chute sous les 5% est éliminé définitivement." },
      { i: "🌡️", n: "Réchauffement", b: "Étau", d: "Le seuil de survie minimal augmente de +0.5% toutes les 10 générations. L'étau se resserre inexorablement, personne ne peut s'y cacher." },
      { i: "💥", n: "Battle Royale", b: "Timer", d: "Toutes les 60 générations, le stratège avec la population la plus faible est exécuté sur-le-champ." },
      { i: "☄️", n: "Extinction", b: "Purge", d: "Un cataclysme régulier balaie les 20% les plus faibles du classement." },
      { i: "🌊", n: "Tsunami", b: "Rotation", d: "Périodiquement, les plus faibles sont effacés et remplacés par de nouveaux stratèges tirés au sort." }
    ]},
    { cat: "4. MODIFICATEURS ENVIRONNEMENTAUX", desc: "Règles spéciales cumulables.", items: [
      { i: "🦠", n: "Invasion", b: "Asymétrique", d: "Votre stratège démarre avec seulement 5% de la population. L'objectif est d'atteindre 50% de domination." },
      { i: "⚔", n: "Gauntlet", b: "Boss", d: "Votre stratège commence avec une population doublée. Serez-vous le boss final intouchable ou la cible de tous ?" },
      { i: "👑", n: "King of the Hill", b: "Bonus", d: "Contrôler la première place octroie un flux constant de points supplémentaires." },
      { i: "📢", n: "Propagande", b: "Influence", d: "Le leader de l'arène convertit passivement 5% de la population des trois derniers à sa propre stratégie. Effet boule de neige garanti." },
      { i: "🌍", n: "Diplomatie", b: "Équilibrage", d: "Si un stratège dépasse 40% de population globale, une coalition se forme pour le détruire passivement (-0.2 pts)." },
      { i: "🪞", n: "Miroir", b: "Introspection", d: "Chaque stratège joue 30% de ses matchs contre un clone parfait de lui-même." },
      { i: "🗡", n: "Vendetta", b: "Rancune", d: "Les trahisons s'accumulent en jauge de 'rancune' globale, ostracisant progressivement les traîtres." },
      { i: "🦠", n: "Épidémie", b: "Contagion", d: "Un stratège hautement agressif a une probabilité de contaminer ses voisins, propageant la trahison." },
      { i: "🧬", n: "Mutation", b: "Dérive", d: "Un stratège au bord de l'extinction (<3%) mute et voit son code altéré par l'injection de bruit aléatoire." },
      { i: "🧬", n: "Coévolution", b: "Copie", d: "Les stratèges faibles tentent de copier l'algorithme des leaders pour survivre, avec un taux d'erreur génétique." },
      { i: "🤝", n: "Coalition", b: "Guerre", d: "Les profils aux taux de coopération similaires fusionnent en factions idéologiques. Des guerres éclatent." },
      { i: "🏛", n: "Civilisations", b: "Géopolitique", d: "4 super-puissances prédéfinies. Le but est la conquête territoriale (60%) plutôt que la survie individuelle." }
    ]}
  ];
  document.getElementById("wp-modes").innerHTML = sandboxLore.map(cat => `
    <div style="margin-bottom:20px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.3rem;color:var(--gold);letter-spacing:.1em;margin-bottom:2px;border-bottom:1px solid var(--border);padding-bottom:4px;">${cat.cat}</div>
      <div style="font-size:8px;color:var(--muted);margin-bottom:12px;letter-spacing:.05em;">${cat.desc}</div>
      ${cat.items.map(m => `
        <div class="wm">
          <div class="wm-head">
            <div class="wm-icon">${m.i}</div>
            <div class="wm-name">${m.n} <span style="font-size:7px;color:var(--amber);border:1px solid rgba(255,140,0,.3);padding:1px 4px;border-radius:3px;margin-left:5px">${m.b}</span></div>
          </div>
          <div class="wm-desc">${m.d}</div>
        </div>`).join("")}
    </div>`).join("");
  
  document.getElementById("wp-concepts").innerHTML = [
    { t: "Le Dilemme du Prisonnier", b: "Deux joueurs choisissent simultanément <b>Coopérer (C)</b> ou <b>Trahir (T)</b>. La tension : trahir est individuellement rationnel mais collectivement destructeur.", f: "T > R > P > S  (Tentation > Récompense > Punition > Naïf)", n: null },
    { t: "Les Tournois d'Axelrod (1984)", b: "Robert Axelrod organisa des tournois computationnels où des stratégies s'affrontaient en round robin. Gagnant surprenant : <b>Tit-for-Tat</b> de Rapoport — seulement 5 lignes de code.", f: null, n: "TFT n'est jamais premier à trahir, punit immédiatement, pardonne dès que l'adversaire recoopère." },
    { t: "Dynamique Évolutionnaire (Replicator Eq.)", b: "Chaque stratégie est une population. Les meilleurs scores <b>croissent</b> proportionnellement, les autres <b>déclinent</b>. La dérive empêche la convergence prématurée.", f: "pop[i] ← pop[i] × (1 + α×(f[i]−f̄)) + dérive", n: "α bas (0.005-0.01) = évolution lente et renversements naturels. Fortement recommandé." },
    { t: "Bruit & Erreurs", b: "Un coup inversé aléatoirement déclenche une spirale de représailles si la stratégie est rigide (comme TFT ou Grudger). <b>TF2T</b> et <b>GTFT</b> y résistent mieux car elles pardonnent les accidents.", f: null, n: "Bruit 4-6% : dynamiques parfaitement réalistes." },
    { t: "Équilibre de Nash", b: "(Trahir,Trahir) est l'unique équilibre de Nash en interaction unique. Pourtant sous-optimal vs (Coop,Coop). C'est le cœur philosophique du dilemme.", f: null, n: null },
    { t: "Réciprocité Directe", b: "La coopération émerge si les interactions sont répétées. La probabilité d'une prochaine interaction (w) doit être suffisante pour dissuader la trahison.", f: "w > (T−R) / (T−P)", n: "Plus T est tentant, plus il faut de tours pour stabiliser la coop." },
    { t: "Écosystèmes SandBox", b: "Dans Arena X, la survie dépend des autres. AllD gagne contre AllC, mais si les AllC meurent, AllD s'effondre contre TFT. C'est l'essence de l'évolution interdépendante.", f: null, n: "Aucune stratégie n'est absolue. Tout dépend du pool de départ." }
  ].map(c => `<div class="wc"><div class="wc-title">${c.t}</div><div class="wc-body">${c.b}${c.f ? `<span class="wc-formula">${c.f}</span>` : ""}</div>${c.n ? `<div class="wc-note">💡 ${c.n}</div>` : ""}</div>`).join("");
  
  document.getElementById("wp-goat").innerHTML = `
    <div style="margin-bottom:14px;padding:10px;background:rgba(245,200,66,.04);border:1px solid rgba(245,200,66,.15);border-radius:8px">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.3rem;color:var(--gold);letter-spacing:.1em;margin-bottom:5px">🐐 Hall of Fame — Les Légendes d'Axelrod</div>
      <div style="font-size:9px;line-height:1.7;color:rgba(255,255,255,.58)">La Matrice GOAT utilise les payoffs originaux (<b>T=5, R=3, P=1, S=0</b>) des tournois de 1984. C'est le test universel de la théorie des jeux évolutionnaire.</div>
    </div>
    ${[
      { rank: "🥇", name: "Tit-for-Tat (TFT)", year: "Axelrod 1984 · Rapoport", score: "504.5 pts", desc: "Le champion inattendu. Jamais premier à trahir. Copie exactement le dernier coup. Gagna les deux tournois successifs d'Axelrod." },
      { rank: "🥈", name: "Tit-for-Two-Tats (TF2T)", year: "Axelrod 1984 · Generous TFT", score: "491.3 pts", desc: "Attend deux trahisons consécutives avant de punir. Résiste magnifiquement au bruit (malentendus)." },
      { rank: "🥉", name: "GRIM / Grudger", year: "Axelrod 1984 · Friedman", score: "477.1 pts", desc: "Dissuasion nucléaire : une seule trahison déclenche une guerre permanente. Fragile face au bruit." },
      { rank: "4", name: "Gradual", year: "Beaufils & Mathieu 1996", score: "510.7 pts", desc: "Souvent considérée comme la vraie stratégie optimale : N trahisons adverses → N punitions exactes puis pardon total." },
      { rank: "5", name: "Pavlov (Win-Stay Lose-Shift)", year: "Nowak & May 1993", score: "498.2 pts", desc: "Auto-correcteur évolutionnaire : répète si résultat satisfaisant, change sinon. Exploit AllC impitoyablement." },
      { rank: "6", name: "Contrite TFT", year: "Sugden 1986 · Patching", score: "468.9 pts", desc: "S'il trahit par accident (bruit), accepte la punition adverse sans contre-attaquer. Évite la spirale de mort." },
      { rank: "7", name: "Joss", year: "Axelrod 1984 · Joss", score: "432.6 pts", desc: "TFT mais trahit 10% du temps pour tester l'adversaire. Finit par s'autodétruire contre TFT." },
      { rank: "8", name: "AllDefect", year: "Axelrod 1984 · Harrington", score: "401.2 pts", desc: "L'équilibre de Nash. Gagne sur des interactions courtes, mais anéantit son propre pool de ressources à long terme." }
    ].map(g => `<div class="wgoat-entry">
      <div class="wgoat-rank">${g.rank}</div>
      <div class="wgoat-name">${g.name}</div>
      <div class="wgoat-year">${g.year} · ${g.score} (moyenne)</div>
      <div class="wgoat-desc">${g.desc}</div>
    </div>`).join("")}`;
  
  document.getElementById("wp-guide").innerHTML = `
    <div style="font-size:9px;line-height:1.65;color:rgba(255,255,255,.5);margin-bottom:12px">Conseils de survie selon les options Sandbox. <span class="guide-pick good" style="display:inline">✓ Picks recommandés</span> <span class="guide-pick bad" style="display:inline">✗ À éviter</span></div>
    ${[
      { icon: "🏆", name: "Structures Compétitives", tip: "En Bracket ou Duel, la polyvalence est clé. Les stratégies adaptatives (TFT, GTFT, Graduel) dominent.", goods: ["TFT", "GTFT", "Graduel"], bads: ["AllD", "Crescendo"] },
      { icon: "💀", name: "Modes Fin de Vie", tip: "En Survie, Extinction ou Royale, évitez de provoquer les autres. Restez stable pour ne pas chuter sous les seuils.", goods: ["TF2T", "Philosophe", "Humaniste"], bads: ["AllC", "Aléatoire", "Vagabond"] },
      { icon: "⚡", name: "Matrices Mutantes", tip: "Chaos, Éco, ou Arms Race détruisent les stratégies statiques. Il faut des profils capables de lire la méta.", goods: ["Pavlov", "Miroir", "Explorateur"], bads: ["Autocrate", "AllC", "Contrat"] },
      { icon: "🤝", name: "Modificateurs Sociaux", tip: "Diplomatie, Vendetta ou Civilisations punissent l'arrogance et la tyrannie. La discrétion prime.", goods: ["GTFT", "Philosophe", "Sage"], bads: ["Opportuniste", "AllD", "Trompeur"] },
      { icon: "🗺", name: "Modificateurs Spatiaux", tip: "Territoire ou Miroir favorisent la cohérence interne. Les coopérateurs forment des forteresses en se regroupant.", goods: ["TFT", "TF2T", "Graduel"], bads: ["AllD", "Anarchiste", "Saboteur"] }
    ].map(g => `<div class="guide-mode">
      <div class="guide-mode-head"><div class="guide-mode-icon">${g.icon}</div><div class="guide-mode-name">${g.name}</div></div>
      <div class="guide-picks">${g.goods.map(x => `<span class="guide-pick good">✓ ${x}</span>`).join("")}${g.bads.map(x => `<span class="guide-pick bad">✗ ${x}</span>`).join("")}</div>
      <div class="guide-tip">${g.tip}</div>
    </div>`).join("")}`;
  
  const archs = ["AllC", "TFT", "Graduel", "TF2T", "GTFT", "Pavlov", "AllD", "Grudger", "Chaos"];
  const outcomes = {
    "AllC": { AllC: "++", TFT: "++", Graduel: "++", TF2T: "++", GTFT: "++", Pavlov: "+", AllD: "--", Grudger: "++", Chaos: "+" },
    "TFT": { AllC: "++", TFT: "++", Graduel: "++", TF2T: "++", GTFT: "++", Pavlov: "+", AllD: "-", Grudger: "++", Chaos: "~" },
    "Graduel": { AllC: "++", TFT: "++", Graduel: "++", TF2T: "++", GTFT: "++", Pavlov: "+", AllD: "~", Grudger: "++", Chaos: "+" },
    "TF2T": { AllC: "++", TFT: "++", Graduel: "++", TF2T: "++", GTFT: "++", Pavlov: "+", AllD: "+", Grudger: "++", Chaos: "+" },
    "GTFT": { AllC: "++", TFT: "++", Graduel: "++", TF2T: "++", GTFT: "++", Pavlov: "+", AllD: "-", Grudger: "++", Chaos: "+" },
    "Pavlov": { AllC: "+", TFT: "+", Graduel: "+", TF2T: "+", GTFT: "+", Pavlov: "+", AllD: "-", Grudger: "+", Chaos: "~" },
    "AllD": { AllC: "++", TFT: "-", Graduel: "~", TF2T: "+", GTFT: "~", Pavlov: "-", AllD: "--", Grudger: "--", Chaos: "+" },
    "Grudger": { AllC: "++", TFT: "++", Graduel: "++", TF2T: "++", GTFT: "++", Pavlov: "+", AllD: "--", Grudger: "++", Chaos: "~" },
    "Chaos": { AllC: "+", TFT: "~", Graduel: "+", TF2T: "+", GTFT: "+", Pavlov: "~", AllD: "+", Grudger: "~", Chaos: "~" },
  };
  const symMap = { "++": "pp", "+": "p", "~": "e", "-": "n", "--": "nn" };
  const lblMap = { "++": "⊕⊕", "+": "⊕", "~": "~", "-": "⊖", "--": "⊖⊖" };
  document.getElementById("wp-matchups").innerHTML = `
    <div style="font-size:8px;line-height:1.6;color:rgba(255,255,255,.5);margin-bottom:10px">Résultats 1v1 théoriques sans bruit. <b style="color:var(--teal)">⊕⊕</b>=excellent <b style="color:rgba(0,229,200,.55)">⊕</b>=bon <b>~</b>=neutre <b style="color:rgba(255,48,96,.55)">⊖</b>=faible <b style="color:var(--red)">⊖⊖</b>=écrasé</div>
    <div style="overflow-x:auto">
    <table class="mu-table">
      <tr><th>vs →</th>${archs.map(a => `<th>${a}</th>`).join("")}</tr>
      ${archs.map(row => `<tr><td>${row}</td>${archs.map(col => {
    const o = outcomes[row]?.[col] || "~";
    return `<td><span class="mu-vp ${symMap[o]}">${lblMap[o]}</span></td>`;
  }).join("")}</tr>`).join("")}
    </table>
    </div>
    <div style="margin-top:12px;font-size:8px;line-height:1.7;color:rgba(255,255,255,.45)">
    <b style="color:var(--gold)">Note :</b> En Sandbox multicorps (Round Robin), ces interactions s'entremêlent. Écraser un AllC en 1v1 ne vous fera pas gagner si les TFT vous détruisent en parallèle !
    </div>`;
  
  document.getElementById("wp-lexique").innerHTML = `
    <div style="font-size:8px;line-height:1.6;color:rgba(255,255,255,.4);margin-bottom:12px">Glossaire technique de l'Arena X.</div>
    <div class="lex-cols">
    ${[
      { t: "α (Alpha)", d: "Pression de sélection. Contrôle la vitesse d'évolution. α élevé = domination fulgurante. α bas = évolution stable." },
      { t: "AllC / AllD", d: "Always Cooperate / Always Defect. Les deux extrêmes absolus." },
      { t: "Bruit (Noise)", d: "Erreur de transmission (%). Transforme accidentellement un C en T ou inversement." },
      { t: "Dérive", d: "Facteur aléatoire (mutation) appliqué à la reproduction. Empêche la stagnation." },
      { t: "Dyn. réplicatrice", d: "Équation d'évolution : Les profils au score supérieur à la moyenne se reproduisent, les autres dépérissent." },
      { t: "ESS", d: "Evolutionary Stable Strategy. Une stratégie qui, si dominante, ne peut être envahie par un mutant." },
      { t: "Nash (équilibre de)", d: "Situation où aucun joueur ne gagne à changer sa décision seul. (AllD, AllD) en est un." },
      { t: "P (Punition)", d: "Le Payoff de la trahison mutuelle." },
      { t: "R (Récompense)", d: "Le Payoff de la coopération mutuelle." },
      { t: "S (Sucker)", d: "Le Payoff du 'Pigeon' : coopérer face à une trahison." },
      { t: "T (Tentation)", d: "Le Payoff de la trahison face à une coopération." },
      { t: "TFT", d: "Tit-For-Tat. L'algorithme roi. Coopère puis copie le coup précédent." },
      { t: "ZD (Zero-Determinant)", d: "Stratégies asymétriques fixant mathématiquement le score de l'adversaire de force." }
    ].map(e => `<div class="lex-entry"><div class="lex-term">${e.t}</div><div class="lex-def">${e.d}</div></div>`).join("")}
    </div>`;
}
function wikiStratHTML(c,s){
  return`<div class="we" id="we_${s.sid}">
    <div class="we-head">
      <div class="we-emoji">${c.e}</div>
      <div><div class="we-name" style="color:${c.color}">${s.name}</div><div class="we-strat">${c.name} · ${s.tag}</div></div>
    </div>
    <div class="we-desc">${s.desc}</div>
    <div class="we-behav">"${s.behav}"</div>
    <div class="we-tags">${s.tags.map(t=>`<span class="tag ${t.c}">${t.t}</span>`).join("")}</div>
    <div class="we-stats">${Object.entries(s.stats).map(([k,v])=>`<div class="we-stat"><div class="we-sv">${k}</div><div class="we-sv2">${v}</div></div>`).join("")}</div>
    <div class="we-vs">${s.vs}</div>
  </div>`;
}
function openWiki(tab){document.getElementById("wiki-bg").classList.add("open");if(tab)wikiTab(tab);}
function closeWiki(){document.getElementById("wiki-bg").classList.remove("open");}
function wikiTab(tab){
  ["strats","modes","concepts","goat","guide","matchups","lexique"].forEach(t=>{
    document.getElementById("wt-"+t)?.classList.toggle("active",t===tab);
    document.getElementById("wp-"+t)?.classList.toggle("active",t===tab);
  });
}
function openWikiStrat(sid){openWiki("strats");setTimeout(()=>document.getElementById("we_"+sid)?.scrollIntoView({behavior:"smooth",block:"start"}),80);}
document.getElementById("wiki-bg").addEventListener("click",e=>{if(e.target===document.getElementById("wiki-bg"))closeWiki();});
}
const maxPhases = p.structure === "swiss" ? Math.min(p.PHASES+1, 6) :
    (p.eol.includes("royale") || p.modifiers.includes("invasion") || p.modifiers.includes("mirror") || p.structure === "territoire" || p.modifiers.includes("mutation") || p.eol.includes("extinction") || p.eol.includes("tsunami") || p.modifiers.includes("coalition") || p.modifiers.includes("coevo") || p.modifiers.includes("civilisation") || p.structure === "observatoire") ? 1 :
    (p.structure === "duel" || p.structure === "duel2") ? Math.ceil(Math.log2(Math.max(p.N,2)))*2+2 :
    p.PHASES;
  T={
    ...p, strats, maxPhases,
    phase:0, history:[], interval:null, pendingPayoff:null,
    gen:0, points:Array(p.N).fill(0), phasePoints:[], finalRanking:[],
    survHP:Array(p.N).fill(1.0),
    kohKing:0, kohReign:0, kohBest:0, kohBestWho:0, kohPts:Array(p.N).fill(0),
    events:[], chaosInterval:80, bracket:null,
    royaleElims:[], armsBoost:[1.0,1.5,2.2], diploLeader:-1,
    goatMatrix:{coop:{coop:[3,3],betray:[0,5]},betray:{coop:[5,0],betray:[1,1]}},
    coopHistory:[], genCoopMoves:0, genTotalMoves:0,
    liveMatch:null, milestones:[], lastLeader:-1,
    ecoT:null, ecoR:null, invasionSuccess:false,
    paused:false, scrubIdx:null,
    terrGrid:null, terrSize:0, terrHistory:[],
    mutCount:0, mutHistory:[],
    vendettaMatrix:null, epidemicAggro:null,
    extinctionCountdown:50, extinctionWave:0, extinctionElims:[], extinctionAlive:[...Array(p.N).keys()],
    tsunamiCountdown:60, tsunamiWave:0, tsunamiElims:[], tsunamiEntries:[],
    tsunamiPool:ALL_STRATS.filter(s=>!draft.sel.includes(s.sid)),
    coalitions:[], coalitionWars:[], coalitionUpdateIn:30, coalitionTraitorWarns:{},
    worldEventsEnabled:p.worldEvents||false,
    worldEventNext:120+Math.floor(Math.random()*80),
    worldEventActive:null, worldEventPayMod:null,
    duelLosses:Array(p.N).fill(0), duelLBPairs:[], duelLBResults:[],
    duelResults:[], duelElim:[],
    consolBracket:[], consolElim:[],
    heatmapMatrix:Array.from({length:p.N},()=>new Float64Array(p.N)),
    heatmapCount:Array.from({length:p.N},()=>new Float64Array(p.N)),
    ffActive:false,
    sparkHistory:Array.from({length:p.N},()=>[]),
    sparkSampleIn:5,
    rivalries:[], rivalryMap:{}, rivalryCheckIn:15,
    chronicle:[], chronicleChapters:[], chronicleChapterIn:200,
    coevoCountdown:60, coevoLineage:[], coevoMutRates:new Float64Array(p.N).fill(0),
    civFactions:null, civTerritoryHistory:[], civWars:[], civAlliances:[], civUpdateIn:30,
    obsArenas:null, obsWins:null, obsGens:0,
    tempSeuil: 0 
  };
  if(p.structure === "bracket"){
    T.bracket=[[{group:[...Array(p.N).keys()],done:false,ranked:[],track:"all"}],[],[]];
    if(p.N===16) T.bracket.push([]);
    if(p.N===32) { T.bracket.push([]); T.bracket.push([]); }
  }
  if(p.structure === "duel" || p.structure === "duel2"){
    const idxs=[...Array(p.N).keys()];
    for(let i=idxs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idxs[i],idxs[j]]=[idxs[j],idxs[i]];}
    T.duelPairs=[];
    for(let i=0;i<idxs.length;i+=2){
      if(i+1<idxs.length) T.duelPairs.push([idxs[i],idxs[i+1]]);
      else T.duelPairs.push([idxs[i],-1]); 
    }
    T.duelRound=1;
    if(p.structure === "duel2") T.duelLBPairs=[];
  }
  if(p.structure === "territoire") initTerritoire();
  if(p.structure === "reseau") initReseau();
  if(p.modifiers.includes("vendetta")) T.vendettaMatrix=Array.from({length:p.N},()=>new Float64Array(p.N));
  if(p.modifiers.includes("epidemie")) T.epidemicAggro=new Float64Array(p.N).fill(0);
  if(p.structure === "nexus"){T.nexusScores=new Float64Array(p.N);T.nexusTourneyIdx=0;T.nexusResults=[];}
  if(p.modifiers.includes("coevo")){T.strats.forEach(s=>{s._origFn=s.fn;s._mutRate=0;s._mutParent=null;});}
  if(p.modifiers.includes("civilisation")) initCivilisation();
  if(p.structure === "observatoire") initObservatoire();
  hlIdx=null; prevPops=null;
  document.getElementById("pts-main").style.display="none";
  document.getElementById("final").classList.remove("show");
  if(document.getElementById("post-analysis"))document.getElementById("post-analysis").style.display="none";
  document.getElementById("btn-next").style.display="none";
  document.getElementById("btn-replay").style.display="none";
  ["chaos-banner","diplo-banner","goat-banner","arms-banner","invasion-banner","eco-banner","mirror-banner","territoire-banner","mutation-banner","vendetta-banner","epidemie-banner","nexus-banner","duel-banner","duel2-banner","extinction-banner","tsunami-banner","coalition-banner","coevo-banner","civilisation-banner","observatoire-banner"].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display="none";
  });
  document.getElementById("evts-section").style.display=
    ["survival","koh","chaos","gauntlet","royale","arms","diplomacy","goat","invasion","eco","mirror","territoire","mutation","vendetta","epidemie","nexus","duel","duel2","extinction","tsunami","coalition","coevo","civilisation","observatoire"].includes(p.mode)?"":"none";
  document.getElementById("evts").innerHTML="";
  const mStruct = CONFIG_STRUCTURE.find(x=>x.id===p.structure);
  const mMat = CONFIG_MATRIX.find(x=>x.id===p.matrix);
  document.getElementById("side-lbl").textContent = `${mStruct?.name || "Arène"} + ${mMat?.name || "Standard"}`;
  document.getElementById("side-inner").innerHTML="";
  document.getElementById("pbadge").style.display="none";
  const coopWrap=document.getElementById("coop-wrap");if(coopWrap)coopWrap.style.display="none";
  const statsBar=document.getElementById("stats-bar");if(statsBar)statsBar.style.display="none";
  const liveMs=document.getElementById("live-match-section");if(liveMs)liveMs.style.display="none";
  const sw=document.getElementById("scrubber-wrap");if(sw)sw.classList.remove("visible");
  const pb=document.getElementById("btn-pause");if(pb){pb.classList.remove("visible","paused");pb.textContent="⏸ Pause";}
  const resSect = document.getElementById("reseau-section");
  if(resSect) resSect.style.display = (p.structure === "reseau") ? "block" : "none";
  if(p.matrix === "chaos") document.getElementById("chaos-banner").style.display="";
  if(p.matrix === "goat") document.getElementById("goat-banner").style.display="";
  if(p.matrix === "arms") document.getElementById("arms-banner").style.display="";
  if(p.matrix === "eco") document.getElementById("eco-banner").style.display="";
  
  if(p.matrix === "quantique") document.getElementById("quantique-banner").style.display="";
  if(p.structure === "reseau") document.getElementById("reseau-banner").style.display="";
  if(p.eol.includes("rechauffement")) document.getElementById("temp-banner").style.display="";
  if(p.modifiers.includes("propaganda")) document.getElementById("propaganda-banner").style.display="";
  if(p.structure === "territoire") document.getElementById("territoire-banner").style.display="";
  if(p.structure === "nexus") document.getElementById("nexus-banner").style.display="";
  if(p.structure === "duel") document.getElementById("duel-banner").style.display="";
  if(p.structure === "duel2") document.getElementById("duel2-banner").style.display="";
  if(p.structure === "observatoire") document.getElementById("observatoire-banner").style.display="";
  if(p.eol.includes("extinction")) { const eb=document.getElementById("extinction-banner"); if(eb) eb.style.display=""; }
  if(p.eol.includes("tsunami")) { const tb=document.getElementById("tsunami-banner"); if(tb) tb.style.display=""; }
  if(p.modifiers.includes("diplomacy")) document.getElementById("diplo-banner").style.display="";
  if(p.modifiers.includes("invasion")) document.getElementById("invasion-banner").style.display="";
  if(p.modifiers.includes("mirror")) document.getElementById("mirror-banner").style.display="";
  if(p.modifiers.includes("mutation")) { const b=document.getElementById("mutation-banner"); if(b) b.style.display=""; }
  if(p.modifiers.includes("vendetta")) { const b=document.getElementById("vendetta-banner"); if(b) b.style.display=""; }
  if(p.modifiers.includes("epidemie")) { const b=document.getElementById("epidemie-banner"); if(b) b.style.display=""; }
  if(p.modifiers.includes("coalition")) { const cb=document.getElementById("coalition-banner"); if(cb) cb.style.display=""; }
  if(p.modifiers.includes("coevo")) { const cb=document.getElementById("coevo-banner"); if(cb) cb.style.display=""; }
  if(p.modifiers.includes("civilisation")) { const b=document.getElementById("civilisation-banner"); if(b) b.style.display=""; }
  if(p.N>=4){const hs=document.getElementById("heatmap-section");if(hs)hs.style.display="";}
  const bff=document.getElementById("btn-ff");if(bff)bff.classList.add("visible");
  clearCanvas();clearCoopCanvas();updateLegend();openModal();
}
function openModal(){
  let pay;
  if(T.matrix==="goat"){
    pay={...T.goatMatrix,R:3,T:5,P:1,S:0};
  } else if(T.matrix==="custom_mat"){
    pay = {
      T: parseFloat(document.getElementById("c-mat-t").value),
      R: parseFloat(document.getElementById("c-mat-r").value),
      P: parseFloat(document.getElementById("c-mat-p").value),
      S: parseFloat(document.getElementById("c-mat-s").value)
    };
    pay.coop = { coop: [pay.R, pay.R], betray: [pay.S, pay.T] };
    pay.betray = { coop: [pay.T, pay.S], betray: [pay.P, pay.P] };
  } else if(T.matrix==="quantique") {
    pay = mkMatrix();
  } else {
    const boost=T.matrix==="arms"?(T.armsBoost[T.phase]||1.0):1.0;
    pay=mkMatrix(boost);
  }
  T.pendingPayoff=pay;
  const mStruct=CONFIG_STRUCTURE.find(x=>x.id===T.structure);
  document.getElementById("mt").textContent=`${(mStruct?.name||"Sandbox").toUpperCase()} · MANCHE ${T.phase+1}/${T.maxPhases}`;
  const isGoat=T.matrix==="goat";
  const isArms=T.matrix==="arms";
  let subtitle=`${T.N} joueurs · ${T.RMATCH} rounds/match · α=${T.ALPHA.toFixed(3)} · bruit=${(T.NOISE*100).toFixed(0)}%`;
  if(isGoat)subtitle="⚜️ Matrice canonique T=5 R=3 P=1 S=0 — Axelrod 1984";
  if(isArms)subtitle=`🚀 Arms Race · Boost T×${(T.armsBoost[T.phase]||1).toFixed(1)} · Manche ${T.phase+1}`;
  document.getElementById("ms").textContent=subtitle;
  document.getElementById("mcnl").style.display=T.phase===0?"none":"";
  const{R,T:Tv,P,S}=pay;
  document.getElementById("mm").innerHTML=`
    <div class="mc mmt"></div><div class="mc mh">🤝 Coop</div><div class="mc mh">⚔ Trahit</div>
    <div class="mc mh">🤝</div>
    <div class="mc md"><span class="bv" style="color:#5bdfb4">${R.toFixed(2)}</span><span class="sv">R</span></div>
    <div class="mc md"><span class="bv" style="color:#ff5f5f">${S.toFixed(2)}</span><span class="sv">S</span></div>
    <div class="mc mh">⚔</div>
    <div class="mc md"><span class="bv" style="color:#f5c842">${Tv.toFixed(2)}</span><span class="sv">T</span></div>
    <div class="mc md"><span class="bv" style="color:rgba(255,255,255,.35)">${P.toFixed(2)}</span><span class="sv">P</span></div>`;
  const tent=Tv-R,dil=Tv>R&&R>P&&P>S;
  document.getElementById("mtg").innerHTML=
    `<span class="mtag">T=${Tv.toFixed(1)}</span><span class="mtag">R=${R.toFixed(1)}</span>`+
    `<span class="mtag">P=${P.toFixed(1)}</span><span class="mtag">S=${S.toFixed(1)}</span>`+
    `<span class="mtag ${tent>1.5?"w":"ok"}">${tent>1.5?"⚠ haute tentation":"✓ stable"}</span>`+
    `<span class="mtag ${dil?"w":"ok"}">${dil?"Dilemme du Prisonnier":"Coop. favorable"}</span>`+
    (isGoat?`<span class="mtag goat">🐐 GOAT CANONICAL</span>`:"");
  document.getElementById("mbg").classList.add("open");
}
function closeModal(){document.getElementById("mbg").classList.remove("open");}
function confirmRun(){closeModal();runPhase();}
document.getElementById("mbg").addEventListener("click",e=>{if(e.target===document.getElementById("mbg"))closeModal();});
function renderSide(){
  if(!T) return;
  const el = document.getElementById("side-inner");
  el.innerHTML = ""; 
  
  if(T.structure === "bracket") renderBracket(el);
  if(T.structure === "duel" || T.structure === "duel2") renderDuel(el);
  if(T.structure === "territoire") renderTerritoire(el);
  if(T.structure === "nexus") renderNexus(el);
  if(T.structure === "observatoire") renderObservatoire(el);
  
  let tempHtml = "";
  const appendModule = (htmlStr) => { if(htmlStr) tempHtml += htmlStr; };
  
  if(T.matrix === "arms") { const d=document.createElement('div'); renderArms(d); appendModule(d.innerHTML); }
  if(T.matrix === "eco") { const d=document.createElement('div'); renderEco(d); appendModule(d.innerHTML); }
  if(T.matrix === "goat") { const d=document.createElement('div'); renderGoat(d); appendModule(d.innerHTML); }
  
  if(T.eol.includes("survival")) { const d=document.createElement('div'); renderSurvival(d); appendModule(d.innerHTML); }
  if(T.eol.includes("royale")) { const d=document.createElement('div'); renderRoyale(d); appendModule(d.innerHTML); }
  if(T.eol.includes("extinction")) { const d=document.createElement('div'); renderExtinction(d); appendModule(d.innerHTML); }
  if(T.eol.includes("tsunami")) { const d=document.createElement('div'); renderTsunami(d); appendModule(d.innerHTML); }
  
  if(T.modifiers.includes("koh") || T.modifiers.includes("gauntlet")) { const d=document.createElement('div'); renderKoH(d); appendModule(d.innerHTML); }
  if(T.modifiers.includes("diplomacy")) { const d=document.createElement('div'); renderDiplo(d); appendModule(d.innerHTML); }
  if(T.modifiers.includes("invasion")) { const d=document.createElement('div'); renderInvasion(d); appendModule(d.innerHTML); }
  if(T.modifiers.includes("mirror")) { const d=document.createElement('div'); renderMirror(d); appendModule(d.innerHTML); }
  if(T.modifiers.includes("mutation")) { const d=document.createElement('div'); renderMutation(d); appendModule(d.innerHTML); }
  if(T.modifiers.includes("vendetta")) { const d=document.createElement('div'); renderVendetta(d); appendModule(d.innerHTML); }
  if(T.modifiers.includes("epidemie")) { const d=document.createElement('div'); renderEpidemie(d); appendModule(d.innerHTML); }
  if(T.modifiers.includes("coalition")) { const d=document.createElement('div'); renderCoalition(d); appendModule(d.innerHTML); }
  if(T.modifiers.includes("coevo")) { const d=document.createElement('div'); renderCoevo(d); appendModule(d.innerHTML); }
  if(T.modifiers.includes("civilisation")) { const d=document.createElement('div'); renderCivilisation(d); appendModule(d.innerHTML); }
  
  el.innerHTML += tempHtml;
}
function renderBracket(el){
  if(!T.bracket)return;
  const lbls=["Phase 1","Phase 2","Finales","Semi","Quart"];
  const maxR=Math.min(T.phase+1,T.bracket.filter(x=>x.length).length);
  let h=`<div class="brds">`;
  for(let r=0;r<maxR;r++){
    if(!T.bracket[r]?.length)continue;
    h+=`<div class="brd"><div class="brdl">${lbls[r]||"R"+(r+1)}</div><div class="brms">`;
    T.bracket[r].forEach(g=>{
      if(!g.group?.length)return;
      const trkCls=g.track==="winners"?"winners":g.track==="consolation"?"consolation":"";
      const trkLbl=trkCls?`<span class="bracket-track ${trkCls}">${trkCls==="winners"?"W":"C"}</span>`:"";
      h+=`<div class="brm" style="${trkCls==="consolation"?"border-left:2px solid rgba(255,140,0,.3)":""}">`;
      const dp=g.done?g.ranked:g.group;
      dp.slice(0,6).forEach((idx,ki)=>{
        const s=T.strats[idx];
        const cls=g.done?(ki===0?"win":"los"):(r===T.phase?"act":"");
        h+=`<div class="brs ${cls}">${ki===0?trkLbl:""}<div class="brd-dot" style="background:${s.color}"></div>${s.e} <span style="font-size:6px;opacity:.8;overflow:hidden;max-width:50px">${s.name.slice(0,10)}</span></div>`;
      });
      if(dp.length>6)h+=`<div class="brs" style="opacity:.4;font-size:7px">+${dp.length-6}</div>`;
      h+=`</div>`;
    });
    h+=`</div></div>`;
  }
  h+=`</div>`;el.innerHTML=h;
}
function renderSurvival(el){
  const sorted=[...Array(T.N).keys()].sort((a,b)=>(T.survHP[b]||0)-(T.survHP[a]||0));
  el.innerHTML=sorted.map(i=>{
    const s=T.strats[i],hp=T.survHP[i]||0,alive=hp>0,pct=T.POP>0?s.pop/T.POP*100:0;
    return`<div class="surv-row ${alive?"alive":"dead"}">
      <div style="font-size:.9rem;width:20px;text-align:center">${s.e}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${alive?s.color:"var(--muted)"}">${s.name}</div>
        <div class="surv-hp-bg"><div class="surv-hp-fill" style="width:${(hp*100).toFixed(0)}%;background:${alive?"var(--teal)":"var(--muted)"}"></div></div>
      </div>
      <div style="font-size:7px;color:var(--muted);width:24px;text-align:right">${pct.toFixed(0)}%</div>
    </div>`;
  }).join("");
}
function renderKoH(el){
  const king=T.strats[T.kohKing];if(!king)return;
  
  const sorted=T.modifiers.includes("koh")
    ?[...Array(T.N).keys()].sort((a,b)=>T.kohPts[b]-T.kohPts[a])
    :[T.kohKing,...[...Array(T.N).keys()].filter(i=>i!==T.kohKing).sort((a,b)=>T.strats[b].pop-T.strats[a].pop)];
  const maxPts=T.kohPts[sorted[0]]||1;
  el.innerHTML=`<div class="koh-throne">
    <span class="koh-crown">${king.e}</span>
    <div class="koh-king" style="color:${king.color}">${king.name}</div>
    <div class="koh-reign">Trône: <b>${T.kohReign}</b>g · Record: <b>${T.kohBest}</b>g</div>
  </div>
  <div style="font-size:7px;color:var(--muted);letter-spacing:.1em;margin:6px 0 4px">POINTS CUMULÉS (1er=4 2e=2 3e=1)</div>
  ${sorted.slice(0,T.N).map((i,rank)=>{
    const s=T.strats[i];const pts=T.kohPts[i]||0;const pct=pts/maxPts*100;
    const medal=rank===0?"🥇":rank===1?"🥈":rank===2?"🥉":"";
    return`<div class="rrow ${s.isMe?"isMe":""}">
      <div style="font-size:8px;width:14px;text-align:center;flex-shrink:0">${medal||rank+1}</div>
      <div class="rdot" style="background:${s.color}"></div>
      <div class="rname">${s.e} ${s.name}</div>
      <div style="flex:1;height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin:0 5px">
        <div style="width:${pct.toFixed(0)}%;height:100%;background:${s.color}"></div>
      </div>
      <span class="koh-pts-bar">${pts}</span>
    </div>`;
  }).join("")}`;
}
function renderDuel(el){
  if(!T.duelResults&&!T.duelPairs)return;
  
  const rounds={};
  T.duelResults.forEach(r=>{
    if(!rounds[r.round])rounds[r.round]=[];
    rounds[r.round].push(r);
  });
  
  const activePairs=T.duelPairs.filter(p=>p[1]>=0);
  const totalPts=T.kohPts||[];
  let h=`<div class="duel-bracket">`;
  
  Object.keys(rounds).sort((a,b)=>+a-+b).forEach(rn=>{
    h+=`<div class="duel-round"><div class="duel-round-lbl">Round ${rn}</div>`;
    rounds[rn].forEach(m=>{
      const sw=T.strats[m.winner],sl=T.strats[m.loser];
      const popW=T.POP>0?Math.round(T.strats[m.winner].pop/T.POP*100):50;
      const popL=T.POP>0?Math.round(T.strats[m.loser].pop/T.POP*100):50;
      h+=`<div class="duel-match done">
        <div class="duel-slot winner active-a">
          <span class="ds-emoji">${sw.e}</span>
          <span class="ds-name" style="color:${sw.color}">${sw.name}</span>
          <span class="ds-pct">${popW}%</span>
        </div>
        <div class="duel-sep"></div>
        <div class="duel-slot loser">
          <span class="ds-emoji">${sl.e}</span>
          <span class="ds-name">${sl.name}</span>
          <span class="ds-pct">${popL}%</span>
        </div>
      </div>`;
    });
    h+=`</div>`;
  });
  
  if(activePairs.length>0){
    h+=`<div class="duel-round"><div class="duel-round-lbl" style="color:var(--gold)">⚡ Round ${T.duelRound}</div>`;
    activePairs.forEach(pair=>{
      const sa=T.strats[pair[0]],sb=T.strats[pair[1]];
      const pctA=T.POP>0?Math.round(sa.pop/T.POP*100):50;
      const pctB=T.POP>0?Math.round(sb.pop/T.POP*100):50;
      const leadsA=sa.pop>=sb.pop;
      h+=`<div class="duel-match active">
        <div class="duel-slot ${leadsA?"winner":""} active-a" style="position:relative">
          <div class="ds-bar" style="background:${sa.color};width:${pctA}%"></div>
          <span class="ds-emoji">${sa.e}</span>
          <span class="ds-name" style="color:${sa.color};position:relative">${sa.name}</span>
          <span class="ds-pct">${pctA}%</span>
        </div>
        <div class="duel-sep"></div>
        <div class="duel-slot ${!leadsA?"winner":""}" style="position:relative">
          <div class="ds-bar" style="background:${sb.color};width:${pctB}%"></div>
          <span class="ds-emoji">${sb.e}</span>
          <span class="ds-name" style="color:${sb.color};position:relative">${sb.name}</span>
          <span class="ds-pct">${pctB}%</span>
        </div>
      </div>`;
    });
    h+=`</div>`;
  }
  
  if(T.structure==="duel2"&&T.duelLBPairs.length>0){
    h+=`<div class="duel-round">`;
    h+=`<div class="duel-lb-title">Losers</div>`;
    T.duelLBPairs.filter(p=>p[1]>=0).forEach(pair=>{
      const sa=T.strats[pair[0]],sb=T.strats[pair[1]];
      const pctA=T.POP>0?Math.round(sa.pop/T.POP*100):50;
      const pctB=T.POP>0?Math.round(sb.pop/T.POP*100):50;
      h+=`<div class="duel-match active" style="border-color:rgba(255,48,96,.25)">
        <div class="duel-slot active-a">
          <span class="ds-emoji">${sa.e}</span><span class="ds-name" style="color:${sa.color}">${sa.name}</span>
          <span class="duel-losses"><span class="duel-loss-dot"></span></span><span class="ds-pct">${pctA}%</span>
        </div>
        <div class="duel-sep"></div>
        <div class="duel-slot">
          <span class="ds-emoji">${sb.e}</span><span class="ds-name" style="color:${sb.color}">${sb.name}</span>
          <span class="duel-losses"><span class="duel-loss-dot"></span></span><span class="ds-pct">${pctB}%</span>
        </div>
      </div>`;
    });
    h+=`</div>`;
  }
  h+=`</div>`;
  
  if(T.duelElim.length>0){
    h+=`<div style="margin-top:8px;font-size:7px;color:var(--muted);letter-spacing:.1em">ÉLIMINÉS</div>`;
    h+=T.duelElim.map(i=>{const s=T.strats[i];return`<div class="rrow" style="opacity:.4"><div class="rdot" style="background:${s.color}"></div><div class="rname" style="text-decoration:line-through">${s.e} ${s.name}</div></div>`;}).join("");
  }
  el.innerHTML=h;
}
function renderCoalition(el){
  if(!T||!T.coalitions||T.coalitions.length===0){el.innerHTML="<div style='font-size:7px;color:var(--muted);padding:5px'>Formation des coalitions…</div>";return;}
  const total=T.POP||1;
  el.innerHTML=T.coalitions.map((faction,fi)=>{
    const inWar=T.coalitionWars.some(w=>w.includes(fi));
    const avgCoop=faction.reduce((s,i)=>s+(T.strats[i].coopRate||0.5),0)/faction.length;
    const totalPop=faction.reduce((s,i)=>s+T.strats[i].pop,0);
    const pct=(totalPop/total*100).toFixed(0);
    
    const col=avgCoop>0.6?"var(--teal)":avgCoop>0.4?"var(--amber)":"var(--red)";
    const label=avgCoop>0.62?"🕊 Coopérateurs":avgCoop<0.38?"🗡 Traîtres":"⚖️ Opportunistes";
    return`<div class="fac-card ${inWar?"at-war":""}" style="background:rgba(0,0,0,.25);border-color:${col}22">
      <div class="fac-name" style="color:${col}">
        ${label} <span style="font-size:7px;color:var(--muted)">${(avgCoop*100).toFixed(0)}% coop</span>
        <span class="ts-wave-badge" style="background:${col}18;color:${col};border:1px solid ${col}44">${pct}% pop</span>
        ${inWar?`<span class="fac-war-badge">⚔️ EN GUERRE</span>`:`<span class="fac-peace-badge">🤝 Paix</span>`}
      </div>
      <div class="fac-members">
        ${faction.map(i=>`<div class="fac-member" title="${T.strats[i].name}" style="background:${T.strats[i].color}22;border-radius:4px;padding:1px 3px">${T.strats[i].e}</div>`).join("")}
      </div>
    </div>`;
  }).join("");
}
function renderTsunami(el){
  if(!T)return;
  const total=T.POP||1;
  const cd=T.tsunamiCountdown;
  const pct=Math.max(0,(60-cd)/60*100);
  const alive=[...Array(T.N).keys()].filter(i=>T.strats[i].pop>0)
    .sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
  el.innerHTML=`
    <div style="font-size:7px;color:var(--muted);letter-spacing:.12em;margin-bottom:5px">🌊 VAGUE ${T.tsunamiWave} · Prochaine dans <b style="color:var(--blue)">${cd} gens</b></div>
    <div class="tsunami-next"><div class="tsunami-fill" style="width:${pct.toFixed(0)}%"></div></div>
    ${alive.map((i,rank)=>{
      const s=T.strats[i];const p=(s.pop/total*100).toFixed(0);
      const isNew=T.tsunamiEntries.some(e=>e.idx===i&&T.gen-e.gen<30);
      return`<div class="tsunami-entry ${isNew?"new-entry":""}">
        <div style="font-size:.85rem">${s.e}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:7.5px;color:${s.color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${s.name} ${isNew?`<span style="font-size:6px;color:var(--blue)">✦ NOUVEAU</span>`:""}
          </div>
          <div style="height:3px;margin-top:2px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden">
            <div style="width:${p}%;height:100%;background:${s.color}"></div></div>
        </div>
        <div style="font-size:7px;color:var(--muted);width:26px;text-align:right">${p}%</div>
      </div>`;
    }).join("")}
    ${T.tsunamiElims.length?`<div style="font-size:7px;color:var(--muted);margin-top:7px;letter-spacing:.1em">VAGUES PASSÉES</div>
    ${[...T.tsunamiElims].reverse().slice(0,4).map(e=>{
      const old=ALL_STRATS.find(s=>s.sid===e.oldSid);
      const nw=ALL_STRATS.find(s=>s.sid===e.newSid);
      return`<div style="font-size:7px;color:rgba(255,255,255,.35);padding:2px 0">
        v.${e.wave} : ${old?.e||"?"} → ${nw?.e||"?"} <span style="font-size:6px">(g.${e.gen})</span></div>`;
    }).join("")}`:""}
  `;
}
let worldEventOverlayTimeout=null;
function pickWorldEvent(){
  return WORLD_EVENTS[Math.floor(Math.random()*WORLD_EVENTS.length)];
}
function fireWorldEvent(ev,currentPay){
  let newPay=ev.apply(currentPay);
  if(ev.duration>0){
    T.worldEventActive={type:ev.id,remaining:ev.duration,started:T.gen};
    if(newPay&&ev.id!=="trahison_sys"&&ev.id!=="pandémie")currentPay=newPay;
  }
  const overlay=document.getElementById("world-event-overlay");
  if(!overlay)return;
  document.getElementById("we-category").textContent=ev.category;
  document.getElementById("we-icon").textContent=ev.icon;
  const titleEl=document.getElementById("we-title");
  titleEl.textContent=ev.title;titleEl.style.color=ev.col;
  document.getElementById("we-desc").textContent=ev.desc;
  const effEl=document.getElementById("we-effect");
  effEl.textContent=ev.effect;
  effEl.style.background=ev.col+"22";effEl.style.color=ev.col;effEl.style.border=`1px solid ${ev.col}44`;
  
  const pf=document.getElementById("we-progress-fill");
  if(pf){pf.style.background=ev.col;pf.style.animation="none";requestAnimationFrame(()=>{pf.style.animation="we-drain 4s linear forwards";});}
  overlay.classList.remove("hiding");
  overlay.style.display="";
  clearTimeout(worldEventOverlayTimeout);
  worldEventOverlayTimeout=setTimeout(()=>{
    overlay.classList.add("hiding");
    setTimeout(()=>{overlay.style.display="none";overlay.classList.remove("hiding");},350);
  },4000);
  playSoundEvent&&playSoundEvent("phase");
}
function renderExtinction(el){
  const alive=T.extinctionAlive;const total=T.POP||1;
  const sorted=[...alive].sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
  const cd=T.extinctionCountdown;
  const danger=cd<=10?"var(--red)":cd<=20?"var(--amber)":"var(--muted)";
  el.innerHTML=`
    <div class="ext-wave">☄️ Vague ${T.extinctionWave} · prochain: <b style="color:${danger}">${cd} gens</b> · éliminés: <b>${T.N-alive.length}</b></div>
    <div style="font-size:7px;color:var(--muted);margin-bottom:5px;letter-spacing:.1em">SURVIVANTS (${alive.length}/${T.N})</div>
    ${sorted.map((i,rank)=>{const s=T.strats[i];const pct=s.pop/total*100;
      const medal=rank===0?"👑":"";
      return`<div class="ext-survivor ${s.isMe?"isMe":""}">
        <div style="font-size:.9rem;flex-shrink:0">${medal||s.e}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:7.5px;color:${s.color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>
          <div style="height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin-top:2px">
            <div style="width:${pct.toFixed(0)}%;height:100%;background:${s.color}"></div>
          </div>
        </div>
        <div style="font-size:7px;color:var(--muted);width:26px;text-align:right">${pct.toFixed(0)}%</div>
      </div>`;}).join("")}
    ${T.extinctionElims.length>0?`<div style="font-size:7px;color:var(--muted);margin-top:8px;letter-spacing:.1em">ÉLIMINÉS</div>
    ${[...T.extinctionElims].reverse().slice(0,5).map(e=>{const s=T.strats[e.idx];
      return`<div class="ext-elim">${s.e} ${s.name} <span style="font-size:6px">(v.${e.wave})</span></div>`;}).join("")}`:""}`;
}
function renderRoyale(el){
  const alive=[...Array(T.N).keys()].filter(i=>T.strats[i].pop>0.5);
  el.innerHTML=`<div class="royale-tracker">
    <div class="royale-title">💥 Battle Royale</div>
    ${T.royaleElims.map((idx,i)=>{const s=T.strats[idx];
      return`<div class="royale-elim">${s.e} <span>${s.name}</span> · éliminé #${i+1}</div>`;
    }).join("")}
    <div class="royale-alive">✓ ${alive.length} survivant${alive.length!==1?"s":""}</div>
  </div>
  ${alive.sort((a,b)=>T.strats[b].pop-T.strats[a].pop).slice(0,5).map(i=>{
    const s=T.strats[i],pct=T.POP>0?s.pop/T.POP*100:0;
    return`<div class="rrow ${s.isMe?"isMe":""}"><div class="rdot" style="background:${s.color}"></div>
    <div class="rname">${s.e} ${s.name}</div><div class="rp">${pct.toFixed(0)}%</div></div>`;
  }).join("")}`;
}
function renderArms(el){
  const boost=T.armsBoost[T.phase]||1;
  const pct=Math.min(100,(boost-1)*80);
  el.innerHTML=`<div class="arms-status">
    <div style="font-size:8px;color:var(--amber)">🚀 Phase ${T.phase+1} · Boost T×${boost.toFixed(1)}</div>
    <div class="arms-t-bar"><span style="font-size:7px;color:var(--muted)">Tentation</span>
    <div class="arms-fill-bg"><div class="arms-fill" style="width:${pct}%"></div></div>
    <span style="font-size:7px;color:var(--amber)">${(pct).toFixed(0)}%</span></div>
  </div>
  ${[...Array(T.N).keys()].sort((a,b)=>T.strats[b].pop-T.strats[a].pop).slice(0,6).map(i=>{
    const s=T.strats[i],pct2=T.POP>0?s.pop/T.POP*100:0;
    return`<div class="rrow ${s.isMe?"isMe":""}"><div class="rdot" style="background:${s.color}"></div>
    <div class="rname">${s.e} ${s.name}</div><div class="rp">${pct2.toFixed(0)}%</div></div>`;
  }).join("")}`;
}
function renderDiplo(el){
  const allIdxs=[...Array(T.N).keys()];
  const totalPop=T.strats.reduce((s,x)=>s+x.pop,0)||1;
  const sorted=allIdxs.sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
  const leader=T.diploLeader>=0?T.strats[T.diploLeader]:null;
  el.innerHTML=`<div class="diplo-status">
    ${leader?`<div class="diplo-dominant">⚠ Leader: ${leader.e} ${leader.name} (${(T.strats[T.diploLeader].pop/totalPop*100).toFixed(0)}%)</div>
    <div class="diplo-alliance">Coalition active +0.4 vs leader</div>`:
    `<div class="diplo-alliance">Pas de leader dominant</div>`}
  </div>
  ${sorted.slice(0,6).map(i=>{const s=T.strats[i],pct=s.pop/totalPop*100;
    const isLeader=i===T.diploLeader;
    return`<div class="rrow ${s.isMe?"isMe":""}">
      <div class="rdot" style="background:${s.color}"></div>
      <div class="rname" style="color:${isLeader?"var(--red)":""}">${s.e} ${s.name}${isLeader?" ⚔":""}</div>
      <div class="rp">${pct.toFixed(0)}%</div>
    </div>`;
  }).join("")}`;
}
function renderGoat(el){
  const sorted=[...Array(T.N).keys()].sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
  el.innerHTML=`<div class="goat-score-panel">
    <div style="font-size:8px;color:var(--gold);margin-bottom:4px">🐐 Classement GOAT</div>
    ${sorted.slice(0,8).map((idx,r)=>{const s=T.strats[idx];
      return`<div class="goat-hist-row"><span class="goat-hist-name">${r+1}. ${s.e} ${s.name}</span>
      <span class="goat-hist-val">${(s.pop/T.POP*100).toFixed(0)}%</span></div>`;
    }).join("")}
  </div>`;
}
function renderInvasion(el){
  const me=[...Array(T.N).keys()].find(i=>T.strats[i].isMe);
  if(me===undefined){el.innerHTML="";return;}
  const s=T.strats[me];const pct=s.pop/T.POP*100;
  const enemies=[...Array(T.N).keys()].filter(i=>!T.strats[i].isMe).sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
  const phase=pct<10?"🔴 Survie":pct<25?"🟡 Tête de pont":pct<50?"🟠 Expansion":"🟢 Domination";
  el.innerHTML=`<div class="invasion-prog">
    <div style="font-size:8px;color:var(--teal)">🦠 ${s.e} ${s.name}</div>
    <div style="font-size:7px;color:var(--muted);margin-top:2px">${phase}</div>
    <div class="invasion-bar-bg"><div class="invasion-fill" style="width:${Math.min(100,pct*2).toFixed(0)}%"></div></div>
    <div style="font-size:7px;color:var(--muted);margin-top:2px">${pct.toFixed(1)}% · Objectif 50%</div>
  </div>
  <div style="font-size:7px;color:var(--muted);margin-bottom:4px">Défenseurs :</div>
  ${enemies.slice(0,5).map(i=>{const es=T.strats[i],ep=T.POP>0?es.pop/T.POP*100:0;
    return`<div class="rrow"><div class="rdot" style="background:${es.color}"></div>
    <div class="rname">${es.e} ${es.name}</div><div class="rp">${ep.toFixed(0)}%</div></div>`;
  }).join("")}`;
}
function renderEco(el){
  const cr=T.coopHistory.length>0?T.coopHistory[T.coopHistory.length-1]:0.5;
  const crPct=cr*100;
  const status=cr>0.7?"⚠ Trop de coop → T monte":cr<0.3?"⚠ Trop de trahison → R monte":"✓ Équilibre écologique";
  const fillColor=cr>0.7?"var(--amber)":cr<0.3?"var(--red)":"var(--teal)";
  const sorted=[...Array(T.N).keys()].sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
  el.innerHTML=`<div class="eco-panel">
    <div style="font-size:8px;color:var(--green)">🌿 Taux de coop</div>
    <div class="eco-gauge">
      <span style="font-size:7px;color:var(--muted)">0%</span>
      <div class="eco-fill-bg"><div class="eco-fill" style="width:${crPct.toFixed(0)}%;background:${fillColor}"></div></div>
      <span style="font-size:8px;font-family:'Bebas Neue',sans-serif;color:${fillColor}">${crPct.toFixed(0)}%</span>
    </div>
    <div style="font-size:7px;color:rgba(255,255,255,.5);margin-top:4px">${status}</div>
    ${T.ecoT!==null?`<div style="font-size:7px;color:var(--muted);margin-top:3px">T=${T.ecoT?.toFixed(1)||"?"} R=${T.ecoR?.toFixed(1)||"?"}</div>`:""}
  </div>
  ${sorted.slice(0,6).map(i=>{const s=T.strats[i],p=T.POP>0?s.pop/T.POP*100:0;
    return`<div class="rrow ${s.isMe?"isMe":""}"><div class="rdot" style="background:${s.color}"></div>
    <div class="rname">${s.e} ${s.name}</div><div class="rp">${p.toFixed(0)}%</div></div>`;
  }).join("")}`;
}
function renderMirror(el){
  const sorted=[...Array(T.N).keys()].sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
  el.innerHTML=`<div class="mirror-panel">
    <div style="font-size:8px;color:var(--purple)">🪞 Score interne</div>
    <div style="font-size:7px;color:rgba(255,255,255,.45);margin-top:3px;line-height:1.5">30% du score = match contre soi-même</div>
    ${sorted.slice(0,6).map(i=>{const s=T.strats[i],p=T.POP>0?s.pop/T.POP*100:0;
      const cr=(s.coopRate*100).toFixed(0);
      return`<div class="mirror-row ${s.isMe?"isMe":""}">
        <span style="color:${s.color}">${s.e} ${s.name}</span>
        <span class="mirror-self">coop ${cr}%</span>
        <span style="color:var(--muted)">${p.toFixed(0)}%</span>
      </div>`;
    }).join("")}
  </div>`;
}
function updateStatsBar(cr){
  if(!T)return;
  const total=T.strats.reduce((s,x)=>s+x.pop,0)||1;
  const leader=T.strats.reduce((b,s)=>s.pop>b.pop?s:b,T.strats[0]);
  const crPct=Math.round(cr*100);
  const crColor=crPct>60?"var(--teal)":crPct>35?"var(--amber)":"var(--red)";
  
  let mom="~";
  if(T.history.length>5){
    const old5=T.history[T.history.length-6];
    let oldPct=0;
    old5.groups.forEach(g=>{const pos=g.idxs.indexOf(leader.idx);if(pos>=0){const t=g.pops.reduce((a,x)=>a+x,0)||1;oldPct=g.pops[pos]/t*100;}});
    const curPct=leader.pop/total*100;
    const diff=curPct-oldPct;
    mom=diff>3?`↑+${diff.toFixed(0)}%`:diff<-3?`↓${diff.toFixed(0)}%`:"~";
  }
  const sc=document.getElementById("sb-coop");if(sc)sc.textContent=crPct+"%",sc.style.color=crColor;
  const sl=document.getElementById("sb-lead");if(sl)sl.textContent=leader.e+" "+leader.name,sl.style.color=leader.color;
  const sm=document.getElementById("sb-mom");if(sm)sm.textContent=mom,sm.style.color=mom.startsWith("↑")?"var(--green)":mom.startsWith("↓")?"var(--red)":"var(--muted)";
  
  if(T.milestones.length>0){
    const latest=T.milestones[T.milestones.length-1];
    if(T.gen-latest.gen<15){
      const se=document.getElementById("sb-evt");if(se){se.textContent=latest.txt;se.style.animation="none";setTimeout(()=>se.style.animation="",10);}
    }
  }
}
function clearCoopCanvas(){
  if(!coopCanvas)return;
  coopCanvas.width=coopCanvas.offsetWidth||600;coopCanvas.height=coopCanvas.offsetHeight||56;
  if(coopCtx)coopCtx.clearRect(0,0,coopCanvas.width,coopCanvas.height);
}
function drawCoopChart(){
  if(!coopCanvas||!coopCtx||!T||!T.coopHistory.length)return;
  const W=coopCanvas.offsetWidth||600,H=coopCanvas.offsetHeight||56;
  if(coopCanvas.width!==W||coopCanvas.height!==H){coopCanvas.width=W;coopCanvas.height=H;}
  coopCtx.clearRect(0,0,W,H);
  
  [0.25,0.5,0.75].forEach(y=>{
    coopCtx.strokeStyle="rgba(255,255,255,.05)";coopCtx.lineWidth=1;
    coopCtx.beginPath();coopCtx.moveTo(0,H*(1-y));coopCtx.lineTo(W*0.88,H*(1-y));coopCtx.stroke();
    coopCtx.fillStyle="rgba(255,255,255,.18)";coopCtx.font="6px 'DM Mono',monospace";
    coopCtx.fillText((y*100).toFixed(0)+"%",W*0.89,H*(1-y)+2);
  });
  const data=T.coopHistory;
  const nP=data.length,xS=(W*0.88)/Math.max(nP-1,1);
  const pts=data.map((v,i)=>({x:i*xS,y:H-(v*0.88+0.06)*H}));
  if(pts.length<2)return;
  
  coopCtx.beginPath();
  coopCtx.moveTo(pts[0].x,H);coopCtx.lineTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++){const cx=(pts[i-1].x+pts[i].x)/2,cy=(pts[i-1].y+pts[i].y)/2;coopCtx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,cx,cy);}
  coopCtx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);coopCtx.lineTo(pts[pts.length-1].x,H);coopCtx.closePath();
  const gr=coopCtx.createLinearGradient(0,0,0,H);gr.addColorStop(0,"rgba(0,229,200,.18)");gr.addColorStop(1,"rgba(0,229,200,.01)");
  coopCtx.fillStyle=gr;coopCtx.fill();
  
  const curCr=data[data.length-1];
  const lineColor=curCr>0.6?"#00e5c8":curCr>0.35?"#ff8c00":"#ff3060";
  coopCtx.beginPath();coopCtx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++){const cx=(pts[i-1].x+pts[i].x)/2,cy=(pts[i-1].y+pts[i].y)/2;coopCtx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,cx,cy);}
  coopCtx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);
  coopCtx.strokeStyle=lineColor;coopCtx.lineWidth=1.5;coopCtx.shadowColor=lineColor;coopCtx.shadowBlur=6;coopCtx.stroke();
  coopCtx.shadowBlur=0;
  
  const rv=document.getElementById("coop-rval");if(rv){rv.textContent=(curCr*100).toFixed(0)+"%";rv.style.color=lineColor;}
}
function renderLiveMatch(){
  const el=document.getElementById("live-match-inner");
  if(!el||!T?.liveMatch)return;
  const m=T.liveMatch;
  el.innerHTML=`<div class="lm-wrap">
    <div class="lm-versus">
      <span style="color:${m.Ac}">${m.Ae} ${m.An}</span>
      <span style="color:rgba(255,255,255,.2)">vs</span>
      <span style="color:${m.Bc}">${m.Be} ${m.Bn}</span>
    </div>
    <div class="lm-moves">${m.ma.map((v,i)=>`<div class="lm-dot ${v==="coop"?"c":"d"}" title="${m.An}: ${v}"></div>`).join("")}</div>
    <div class="lm-moves">${m.mb.map((v,i)=>`<div class="lm-dot ${v==="coop"?"c":"d"}" title="${m.Bn}: ${v}"></div>`).join("")}</div>
    <div class="lm-score">Coop: ${m.An.split(" ")[0]} ${(m.sa*100).toFixed(0)}% · ${m.Bn.split(" ")[0]} ${(m.sb*100).toFixed(0)}% · <span style="color:rgba(0,229,200,.6)">■</span>=coop <span style="color:rgba(255,48,96,.6)">■</span>=trahison</div>
  </div>`;
}
function togglePause(){
  if(!T)return;
  T.paused=!T.paused;
  const pb=document.getElementById("btn-pause");
  if(pb){pb.classList.toggle("paused",T.paused);pb.textContent=T.paused?"▶ Reprendre":"⏸ Pause";}
  if(!T.paused){T.scrubIdx=null;const sm=document.getElementById("scrub-mode");if(sm){sm.textContent="EN DIRECT";sm.style.color="var(--teal)";}setSt("run",`Gén. ${T.gen}`);}
  else{setSt("wait","En pause");}
}
let scrubWasPaused=false;
function pauseForScrub(){scrubWasPaused=T?.paused||false;if(T&&!T.paused)T.paused=true;}
function resumeFromScrub(){
  if(!scrubWasPaused&&T){T.paused=false;T.scrubIdx=null;
    const pb=document.getElementById("btn-pause");if(pb){pb.classList.remove("paused");pb.textContent="⏸ Pause";}
    const sm=document.getElementById("scrub-mode");if(sm){sm.textContent="EN DIRECT";sm.style.color="var(--teal)";}
  }
}
function scrubHistory(val){
  if(!T||!T.history.length)return;
  const idx=Math.max(0,Math.min(parseInt(val),T.history.length-1));
  T.scrubIdx=idx;
  const isLive=idx>=T.history.length-1;
  const sm=document.getElementById("scrub-mode");
  if(sm){sm.textContent=isLive?"EN DIRECT":"REPLAY";sm.style.color=isLive?"var(--teal)":"var(--amber)";}
  if(isLive)T.scrubIdx=null;
  const sl=document.getElementById("scrub-lbl");if(sl)sl.textContent=`Gén. ${idx+1}`;
  drawChartAtSnap(isLive?null:idx);
}
function drawChartAtSnap(snapIdx){
  if(snapIdx===null){drawChart();return;}
  if(!T||!T.history[snapIdx])return;
  const snap=T.history[snapIdx];
  const W=canvas.offsetWidth||600,H=canvas.offsetHeight||240;
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle="rgba(255,255,255,.018)";ctx.lineWidth=1;
  for(let y=H*.2;y<H;y+=H*.2){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  const allIdxs=[...new Set(T.history.slice(0,snapIdx+1).flatMap(s=>s.groups.flatMap(g=>g.idxs)))];
  const RPAD=T.N<=8?64:T.N<=16?72:80;const CW=W-4-RPAD;
  const nPts=snapIdx+1,xS=CW/Math.max(nPts-1,1);
  const PT=0.03,CH=0.93;
  allIdxs.forEach(idx=>{
    const s=T.strats[idx];
    const pts=T.history.slice(0,snapIdx+1).map((sn,ti)=>{
      let pct=0;sn.groups.forEach(g=>{const pos=g.idxs.indexOf(idx);if(pos>=0){const tot=g.pops.reduce((a,x)=>a+x,0)||1;pct=g.pops[pos]/tot;}});
      return{x:4+ti*xS,y:H-(pct*CH+PT)*H};
    });
    if(pts.length<2)return;
    ctx.save();ctx.globalAlpha=0.82;
    ctx.beginPath();ctx.moveTo(pts[0].x,H);ctx.lineTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++){const cx=(pts[i-1].x+pts[i].x)/2;ctx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,cx,(pts[i-1].y+pts[i].y)/2);}
    ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);ctx.lineTo(pts[pts.length-1].x,H);ctx.closePath();
    const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,s.color+"18");gr.addColorStop(1,s.color+"02");
    ctx.fillStyle=gr;ctx.fill();
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++){const cx=(pts[i-1].x+pts[i].x)/2;ctx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,cx,(pts[i-1].y+pts[i].y)/2);}
    ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);
    ctx.strokeStyle=s.color;ctx.lineWidth=1.6;ctx.shadowColor=s.color;ctx.shadowBlur=8;ctx.stroke();
    const last=pts[pts.length-1];
    ctx.beginPath();ctx.arc(last.x,last.y,3.5,0,Math.PI*2);ctx.fillStyle=s.color;ctx.fill();
    ctx.restore();
    if(T.N<=16){
      let pct=0;snap.groups.forEach(g=>{const pos=g.idxs.indexOf(idx);if(pos>=0){const tot=g.pops.reduce((a,x)=>a+x,0)||1;pct=g.pops[pos]/tot*100;}});
      ctx.save();ctx.fillStyle=s.color;ctx.globalAlpha=0.72;ctx.font=`400 7.5px 'DM Mono',monospace`;
      ctx.fillText(`${s.e}${pct.toFixed(0)}%`,4+CW+5,Math.max(8,Math.min(H-4,last.y+3)));ctx.restore();
    }
  });
  const scrubX=4+(snapIdx)*xS;
  ctx.save();ctx.strokeStyle="rgba(245,200,66,.4)";ctx.lineWidth=1;ctx.setLineDash([3,3]);
  ctx.beginPath();ctx.moveTo(scrubX,0);ctx.lineTo(scrubX,H);ctx.stroke();ctx.setLineDash([]);ctx.restore();
}
canvas.addEventListener("mousemove",e=>{
  if(!T||!T.history.length)return;
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left;
  const W=canvas.offsetWidth||600;
  const RPAD=T.N<=8?64:T.N<=16?72:80;const CW=W-4-RPAD;
  const xS=CW/Math.max(T.history.length-1,1);
  const snapIdx=Math.min(T.history.length-1,Math.max(0,Math.round((mx-4)/xS)));
  const snap=T.history[snapIdx];if(!snap)return;
  const tt=document.getElementById("chart-tooltip");if(!tt)return;
  const rows=snap.groups.flatMap(g=>{
    const tot=g.pops.reduce((a,x)=>a+x,0)||1;
    return g.idxs.map((idx,i)=>({s:T.strats[idx],pct:g.pops[i]/tot}));
  }).sort((a,b)=>b.pct-a.pct).slice(0,5);
  tt.innerHTML=`<div class="ct-gen">Gén. ${snapIdx+1}</div>`+
    rows.map(r=>`<div class="ct-row"><div class="ct-dot" style="background:${r.s.color}"></div><span style="color:${r.s.color};flex:1">${r.s.e} ${r.s.name}</span><span style="color:var(--muted)">${(r.pct*100).toFixed(0)}%</span></div>`).join("");
  tt.style.display="block";
  tt.style.left=Math.min(mx+12,W-115)+"px";tt.style.top="10px";
});
canvas.addEventListener("mouseleave",()=>{const tt=document.getElementById("chart-tooltip");if(tt)tt.style.display="none";});
function renderTerritoire(el){
  const S=T.terrSize;if(!S||!T.terrGrid){el.innerHTML="";return;}
  const cellSz=Math.max(5,Math.min(13,Math.floor(150/S)));
  const counts=new Float64Array(T.N);
  T.terrGrid.forEach(row=>row.forEach(idx=>counts[idx]++));
  const total=S*S||1;
  const top=[...Array(T.N).keys()].sort((a,b)=>counts[b]-counts[a]).slice(0,3);
  el.innerHTML=`<div class="terr-banner">🗺 Grille ${S}×${S} · voisins directs seulement</div>
  <div class="terr-map-outer">
  <div class="terr-map-grid" style="grid-template-columns:repeat(${S},${cellSz}px)">
  ${T.terrGrid.flatMap(row=>row.map(idx=>{const s=T.strats[idx];
    return`<div style="width:${cellSz}px;height:${cellSz}px;background:${s.color}33;border:1px solid ${s.color}55;text-align:center;line-height:${cellSz}px;font-size:${Math.max(5,cellSz-5)}px" title="${s.name}">${cellSz>=9?s.e:""}</div>`;
  })).join("")}
  </div></div>
  <div class="terr-stats">${top.map(i=>`<span style="color:${T.strats[i].color}">${T.strats[i].e}${(counts[i]/total*100).toFixed(0)}%</span>`).join(" · ")}</div>
  ${[...Array(T.N).keys()].sort((a,b)=>counts[b]-counts[a]).slice(0,5).map(i=>{const s=T.strats[i],pct=counts[i]/total*100;
    return`<div class="rrow ${s.isMe?"isMe":""}"><div class="rdot" style="background:${s.color}"></div><div class="rname">${s.e} ${s.name}</div><div class="rp">${pct.toFixed(0)}%</div></div>`;
  }).join("")}`;
}
function drawNetGraph() {
  const cv = document.getElementById("net-cv");
  if (!cv || !T || !T.graph) return;
  
  
  const W = cv.offsetWidth || 280, H = cv.offsetHeight || 210;
  if (cv.width !== W * 2 || cv.height !== H * 2) { 
      cv.width = W * 2; cv.height = H * 2; 
  }
  const ctx = cv.getContext("2d");
  ctx.save();
  ctx.scale(2, 2);
  ctx.clearRect(0, 0, W, H);
  
  
  if (!T.nodesPos) {
    T.nodesPos = []; T.nodesVel = [];
    for (let i=0; i<T.N; i++) {
      T.nodesPos.push({ x: W/2 + (Math.random()-0.5)*W*0.5, y: H/2 + (Math.random()-0.5)*H*0.5 });
      T.nodesVel.push({ x: 0, y: 0 });
    }
  }
  
  for (let step=0; step<2; step++) { 
    for (let i=0; i<T.N; i++) {
      let fx = 0, fy = 0;
      
      fx += (W/2 - T.nodesPos[i].x) * 0.003;
      fy += (H/2 - T.nodesPos[i].y) * 0.003;
      for (let j=0; j<T.N; j++) {
         if (i === j) continue;
         let dx = T.nodesPos[j].x - T.nodesPos[i].x;
         let dy = T.nodesPos[j].y - T.nodesPos[i].y;
         let dist = Math.sqrt(dx*dx + dy*dy) || 1;
         
         let force = -50 / (dist*dist); 
         if (T.graph[i].includes(j)) force += 0.015 * (dist - 50); 
         
         fx += (dx/dist)*force; fy += (dy/dist)*force;
      }
      T.nodesVel[i].x = (T.nodesVel[i].x + fx) * 0.82; 
      T.nodesVel[i].y = (T.nodesVel[i].y + fy) * 0.82;
    }
    for (let i=0; i<T.N; i++) { T.nodesPos[i].x += T.nodesVel[i].x; T.nodesPos[i].y += T.nodesVel[i].y; }
  }
  
  
  let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  T.nodesPos.forEach(p => { minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x); minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y); });
  let scale = Math.min((W-50)/(maxX-minX||1), (H-50)/(maxY-minY||1));
  if (scale > 1.3) scale = 1.3; 
  let cx = (minX+maxX)/2, cy = (minY+maxY)/2;
  
  
  ctx.lineWidth = 1.2;
  for (let i=0; i<T.N; i++) {
    if(T.strats[i].pop / T.POP < 0.005) continue; 
    T.graph[i].forEach(n => {
      if (n > i && T.strats[n].pop / T.POP >= 0.005) { 
        let px1 = W/2 + (T.nodesPos[i].x - cx) * scale;
        let py1 = H/2 + (T.nodesPos[i].y - cy) * scale;
        let px2 = W/2 + (T.nodesPos[n].x - cx) * scale;
        let py2 = H/2 + (T.nodesPos[n].y - cy) * scale;
        
        ctx.strokeStyle = "rgba(184, 84, 255, 0.15)";
        ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
      }
    });
  }
  
  
  for (let i=0; i<T.N; i++) {
    const s = T.strats[i];
    const popPct = s.pop / T.POP;
    if (popPct < 0.005) continue; 
    let px = W/2 + (T.nodesPos[i].x - cx) * scale;
    let py = H/2 + (T.nodesPos[i].y - cy) * scale;
    const radius = 6 + (popPct * 26); 
    
    
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 12;
    
    
    ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI*2);
    ctx.fillStyle = "rgba(10, 10, 20, 0.95)"; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = s.color; ctx.stroke();
    
    ctx.shadowBlur = 0; 
    
    ctx.font = `${Math.max(9, radius * 1.1)}px Arial`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(s.e, px, py + 1); 
    
    
    if (popPct > 0.04) {
      ctx.fillStyle = s.color;
      ctx.font = `bold 9px 'DM Mono', monospace`;
      ctx.fillText(s.name.toUpperCase(), px, py + radius + 10);
      
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `8px monospace`;
      ctx.fillText(Math.round(popPct*100) + "%", px, py + radius + 20);
    }
  }
  ctx.restore();
}
function renderMutation(el){
  el.innerHTML=`<div class="mut-banner">
    <div style="font-size:8px;color:var(--purple)">🧬 Mutations : <b>${T.mutCount}</b></div>
    <div style="font-size:7px;color:var(--muted);margin-top:2px">Déclenché si pop < 3% · toutes les 70 gens</div>
    <div class="mut-list">${T.mutHistory.slice(-5).reverse().map(m=>`<div class="mut-row">
      <span style="font-size:7px;color:var(--dim)">g.${m.gen}</span>
      <span style="color:rgba(255,255,255,.5)">${m.orig}</span>
      <span class="mut-arrow">→</span>
      <span style="color:var(--purple)">${m.mutant}</span>
      <span class="mut-badge">MUT</span>
    </div>`).join("")||`<div style="font-size:7px;color:var(--muted);padding:5px 0">Pas encore de mutation...</div>`}
    </div>
  </div>
  ${[...Array(T.N).keys()].sort((a,b)=>T.strats[b].pop-T.strats[a].pop).slice(0,6).map(i=>{const s=T.strats[i],pct=T.POP>0?s.pop/T.POP*100:0;
    return`<div class="rrow ${s.isMe?"isMe":""}"><div class="rdot" style="background:${s.color}"></div>
    <div class="rname" style="color:${s.name.includes("*")?"var(--purple)":""}">${s.e} ${s.name}</div><div class="rp">${pct.toFixed(0)}%</div></div>`;
  }).join("")}`;
}
function openStratModal(idx){
  if(!T||idx===undefined)return;
  const s=T.strats[idx];if(!s)return;
  const total=T.strats.reduce((a,x)=>a+x.pop,0)||1;
  const pct=(s.pop/total*100).toFixed(1);
  const cr=((s.coopRate||0.5)*100).toFixed(0);
  const pts=T.points[idx]||0;
  const rank=[...Array(T.N).keys()].sort((a,b)=>T.strats[b].pop-T.strats[a].pop).indexOf(idx)+1;
  document.getElementById("sm-emoji").textContent=s.e;
  document.getElementById("sm-emoji").style.textShadow=`0 0 20px ${s.color}`;
  document.getElementById("sm-name").textContent=s.name;
  document.getElementById("sm-name").style.color=s.color;
  document.getElementById("sm-char").textContent=s.tag||"";
  document.getElementById("sm-stats").innerHTML=`
    <div class="sm-stat"><div class="sm-stat-lbl">Population</div>
      <div class="sm-stat-val" style="color:${s.color}">${pct}%</div><div class="sm-stat-sub">Rang #${rank}</div></div>
    <div class="sm-stat"><div class="sm-stat-lbl">Coopération</div>
      <div class="sm-stat-val" style="color:${cr>60?"var(--teal)":cr>35?"var(--amber)":"var(--red)"}">${cr}%</div>
      <div class="sm-stat-sub">${cr>60?"Coopératif":cr>35?"Adaptatif":"Agressif"}</div></div>
    <div class="sm-stat"><div class="sm-stat-lbl">Points</div>
      <div class="sm-stat-val" style="color:var(--gold)">${pts}</div><div class="sm-stat-sub">ce tournoi</div></div>
    <div class="sm-stat"><div class="sm-stat-lbl">Génération</div>
      <div class="sm-stat-val">${T.gen}</div><div class="sm-stat-sub">actuelle</div></div>`;
  document.getElementById("sm-coop-bar").innerHTML=`
    <div style="font-size:7px;color:var(--muted);margin-bottom:4px">Taux de coopération récent</div>
    <div class="sm-coop-row"><div class="sm-coop-bg"><div class="sm-coop-fill" style="width:${cr}%;background:${s.color}"></div></div>
    <span style="font-size:8px;color:${s.color};min-width:28px;text-align:right">${cr}%</span></div>`;
  document.getElementById("sm-tag-row").innerHTML=(s.tags||[]).map(t=>`<span class="tag ${t.c}">${t.t}</span>`).join("")+
    (s.isMe?`<span class="tag adapt">◀ vous</span>`:"")+(s.name.includes("*")?`<span class="tag chaos">🧬 mutant</span>`:"");
  document.getElementById("sm-desc").textContent=s.desc||"";
  document.getElementById("strat-modal-bg").classList.add("open");
}
function closeStratModal(){document.getElementById("strat-modal-bg").classList.remove("open");}
document.getElementById("strat-modal-bg").addEventListener("click",e=>{if(e.target===document.getElementById("strat-modal-bg"))closeStratModal();});
function buildPostGameAnalysis(){
  const el=document.getElementById("post-analysis");if(!el||!T)return;
  el.style.display="";
  const allIdxs=[...Array(T.N).keys()];
  const r=T.finalRanking||allIdxs;
  const winner=T.strats[r[0]];
  const avgCoop=T.coopHistory.length?T.coopHistory.reduce((a,x)=>a+x,0)/T.coopHistory.length:0.5;
  const maxCoop=T.coopHistory.length?Math.max(...T.coopHistory):0;
  const minCoop=T.coopHistory.length?Math.min(...T.coopHistory):0;
  function buildNarrative(){
    const phoenixes=(T.milestones||[]).filter(m=>m.type==="phoenix");
    const collapses=(T.milestones||[]).filter(m=>m.type==="collapse");
    const dominated=(T.milestones||[]).filter(m=>m.type==="dom");
    let n=`<b>${winner.e} ${winner.name}</b> s'impose au terme de <b>${T.gen} générations</b>`;
    if(avgCoop>0.68)n+=` dans une atmosphère de coopération remarquable (${(avgCoop*100).toFixed(0)}% en moy.).`;
    else if(avgCoop<0.32)n+=` au cœur d'une guerre de trahisons sans répit (${(avgCoop*100).toFixed(0)}% coop.).`;
    else n+=` dans un équilibre instable entre alliance et défection.`;
    if(phoenixes.length)n+=` ${phoenixes.length>1?phoenixes.length+" résurrections spectaculaires ont":"Une résurrection a"} marqué ce tournoi.`;
    if(collapses.length)n+=` Un effondrement coopératif brutal a retourné le jeu.`;
    if(dominated.length)n+=` ${dominated[0].txt.replace(/<[^>]+>/g,"")}`;
    return n;
  }
  function buildDynastyCanvas(){
    if(!T.history.length)return"";
    const leaders=T.history.map(snap=>{
      let best=-1,bestPop=0;
      snap.groups.forEach(g=>g.idxs.forEach((idx,i)=>{if(g.pops[i]>bestPop){bestPop=g.pops[i];best=idx;}}));
      return best;
    });
    const uniq=[...new Set(leaders.filter(l=>l>=0))];
    setTimeout(()=>{
      const cv=document.getElementById("dynasty-cv");if(!cv)return;
      const W=cv.offsetWidth||400,H=cv.offsetHeight||36;
      if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
      const cc=cv.getContext("2d");cc.clearRect(0,0,W,H);
      const step=W/Math.max(leaders.length,1);
      leaders.forEach((lidx,ti)=>{if(lidx<0)return;const s=T.strats[lidx];cc.fillStyle=s.color+"cc";cc.fillRect(ti*step,0,Math.max(1,step+1),H);});
      cc.strokeStyle="rgba(0,0,0,.4)";cc.lineWidth=1;
      for(let g=100;g<T.gen;g+=100){const x=g/T.gen*W;cc.beginPath();cc.moveTo(x,0);cc.lineTo(x,H);cc.stroke();cc.fillStyle="rgba(0,0,0,.7)";cc.font="6px monospace";cc.fillText(g,x+2,10);}
    },60);
    const legendItems=uniq.map(i=>{const s=T.strats[i];return`<div class="dynasty-item"><div class="dynasty-dot" style="background:${s.color}"></div>${s.e} ${s.name}</div>`;}).join("");
    return`<div class="dynasty-wrap"><canvas id="dynasty-cv"></canvas></div><div class="dynasty-legend">${legendItems}</div>`;
  }
  function buildDNA(){
    const top=r.slice(0,Math.min(3,T.N));
    const leaderCount=new Float64Array(T.N);
    T.history.forEach(snap=>{let best=-1,bestPop=0;snap.groups.forEach(g=>g.idxs.forEach((idx,i)=>{if(g.pops[i]>bestPop){bestPop=g.pops[i];best=idx;}}));if(best>=0)leaderCount[best]++;});
    const totalH=T.history.length||1;
    return`<div class="dna-grid">${top.map((idx,rank)=>{
      const s=T.strats[idx];
      const coop=Math.round((s.coopRate||0.5)*100);
      const dominance=Math.round(leaderCount[idx]/totalH*100);
      const recentPops=T.history.slice(-50).map(snap=>{let pct=0;snap.groups.forEach(g=>{const pos=g.idxs.indexOf(idx);if(pos>=0){const t=g.pops.reduce((a,x)=>a+x,0)||1;pct=g.pops[pos]/t;}});return pct;});
      const mean=recentPops.reduce((a,x)=>a+x,0)/(recentPops.length||1);
      const variance=recentPops.reduce((a,x)=>a+(x-mean)**2,0)/(recentPops.length||1);
      const consistency=Math.round(Math.max(0,100-variance*800));
      const finalPop=T.POP>0?Math.round(s.pop/T.POP*100):0;
      const medal=rank===0?"🥇":rank===1?"🥈":"🥉";
      const metrics=[{lbl:"Coop.",val:coop,col:"var(--teal)"},{lbl:"Dominance",val:dominance,col:"var(--gold)"},{lbl:"Cohérence",val:consistency,col:"var(--blue)"},{lbl:"Pop. finale",val:finalPop,col:s.color}];
      return`<div class="dna-card">
        <div class="dna-card-header"><div class="dna-card-emoji">${s.e}</div><div class="dna-card-name" style="color:${s.color}">${s.name}</div><div class="dna-card-rank">${medal}</div></div>
        ${metrics.map(m=>`<div class="dna-row"><div class="dna-lbl">${m.lbl}</div><div class="dna-bar-bg"><div class="dna-bar-fill" style="width:${m.val}%;background:${m.col}"></div></div><div class="dna-pct">${m.val}%</div></div>`).join("")}
      </div>`;
    }).join("")}</div>`;
  }
  const timeline=(T.milestones||[]).slice(-12).reverse().map(m=>`<div class="ms-row"><div class="ms-gen">g.${m.gen}</div><div class="ms-txt">${m.txt}</div></div>`).join("")
    ||`<div style="font-size:8px;color:var(--muted);padding:6px 0">Tournoi sans événement marquant</div>`;
  el.innerHTML=`
    <div class="pg-narrative">${buildNarrative()}</div>
    <div class="pg-kpi-row">
      <div class="pg-kpi"><div class="pg-kpi-val" style="color:var(--teal)">${(avgCoop*100).toFixed(0)}%</div><div class="pg-kpi-lbl">Coop. moy.</div></div>
      <div class="pg-kpi"><div class="pg-kpi-val" style="color:var(--green)">${(maxCoop*100).toFixed(0)}%</div><div class="pg-kpi-lbl">Coop. max</div></div>
      <div class="pg-kpi"><div class="pg-kpi-val" style="color:var(--red)">${(minCoop*100).toFixed(0)}%</div><div class="pg-kpi-lbl">Coop. min</div></div>
      <div class="pg-kpi"><div class="pg-kpi-val" style="color:var(--gold)">${T.milestones.length}</div><div class="pg-kpi-lbl">Événements</div></div>
    </div>
    <div class="pg-section">
      <div class="pg-section-title">🏰 Chronologie du pouvoir</div>
      ${buildDynastyCanvas()}
    </div>
    <div class="pg-section">
      <div class="pg-section-title">🧬 ADN des finalistes</div>
      ${buildDNA()}
    </div>
    <div class="pg-section">
      <div class="pg-section-title">📜 Moments clés</div>
      ${timeline}
    </div>`;
}
function renderVendetta(el){
  if(!T.vendettaMatrix){el.innerHTML="";return;}
  const rancune=Array.from({length:T.N},(_,i)=>({i,r:T.vendettaMatrix.reduce((s,row)=>s+row[i],0)}));
  rancune.sort((a,b)=>b.r-a.r);
  el.innerHTML=`<div style="padding:8px;background:rgba(255,48,96,.04);border:1px solid rgba(255,48,96,.18);border-radius:6px;margin-bottom:6px">
    <div style="font-size:7px;color:var(--muted);margin-bottom:4px;letter-spacing:.1em">LISTE DE RANCUNE</div>
    ${rancune.slice(0,5).map(({i,r})=>{const s=T.strats[i];const pct=T.POP>0?s.pop/T.POP*100:0;
      const barW=Math.min(100,r/3*100).toFixed(0);
      return`<div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
        <div style="font-size:.75rem">${s.e}</div>
        <div style="flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden"><div style="width:${barW}%;height:100%;background:linear-gradient(90deg,var(--amber),var(--red))"></div></div>
        <span style="font-size:7px;color:var(--red);white-space:nowrap">${r.toFixed(1)}</span>
        <div style="font-size:7px;color:var(--muted);width:22px;text-align:right">${pct.toFixed(0)}%</div>
      </div>`;}).join("")}
  </div>
  ${[...Array(T.N).keys()].sort((a,b)=>T.strats[b].pop-T.strats[a].pop).slice(0,4).map(i=>{
    const s=T.strats[i],pct=T.POP>0?s.pop/T.POP*100:0;
    return`<div class="rrow ${s.isMe?"isMe":""}"><div class="rdot" style="background:${s.color}"></div><div class="rname">${s.e} ${s.name}</div><div class="rp">${pct.toFixed(0)}%</div></div>`;
  }).join("")}`;
}
function renderEpidemie(el){
  if(!T.epidemicAggro){el.innerHTML="";return;}
  const ranked=[...Array(T.N).keys()].sort((a,b)=>T.epidemicAggro[b]-T.epidemicAggro[a]);
  el.innerHTML=`<div style="padding:8px;background:rgba(180,127,255,.04);border:1px solid rgba(180,127,255,.2);border-radius:6px;margin-bottom:6px">
    <div style="font-size:7px;color:var(--muted);margin-bottom:5px;letter-spacing:.1em">CONTAGION D'AGRESSION</div>
    ${ranked.slice(0,6).map(i=>{const s=T.strats[i];const ag=T.epidemicAggro[i];const w=Math.min(100,Math.round(ag*100));const pct=T.POP>0?s.pop/T.POP*100:0;
      return`<div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
        <div style="font-size:.75rem">${s.e}</div>
        <div style="flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden"><div style="width:${w}%;height:100%;background:${ag>0.5?"var(--red)":ag>0.2?"var(--amber)":"var(--purple)"}"></div></div>
        <div style="font-size:7px;color:var(--muted);width:22px;text-align:right">${pct.toFixed(0)}%</div>
      </div>`;}).join("")}
  </div>`;
}
function updatePtsTable(){
  const nP=T.phasePoints.length;
  const isNexus=T.structure==="nexus";
  
  const sorted=[...Array(T.N).keys()].sort((a,b)=>{
    if(isNexus)return(T.nexusScores[b]+T.points[b])-(T.nexusScores[a]+T.points[a]);
    return T.points[b]-T.points[a];
  });
  let hdr=`<th>Joueur</th>`;
  if(isNexus){
    for(let t=0;t<T.nexusTourneyIdx;t++)hdr+=`<th>T${t+1}</th>`;
    hdr+=`<th>Actuel</th><th>Total</th>`;
  } else {
    for(let p=0;p<nP;p++)hdr+=`<th>M${p+1}</th>`;hdr+=`<th>Tot</th>`;
  }
  let rows="";
  sorted.forEach((idx,rank)=>{
    const s=T.strats[idx];
    const ptmap=getPtMap(T.N);
    let cells="";
    if(isNexus){
      for(let t=0;t<T.nexusTourneyIdx;t++){
        const v=T.nexusResults[t]?.[idx]||0;
        cells+=`<td>${v||"—"}</td>`;
      }
      cells+=`<td>${T.points[idx]||"—"}</td>`;
      const total=T.nexusScores[idx]+T.points[idx];
      cells+=`<td><b style="color:var(--gold)">${total}</b></td>`;
    } else {
      cells=T.phasePoints.map(ph=>`<td class="${ph[idx]===ptmap[0]?"pe":""}">${ph[idx]||"—"}</td>`).join("");
      cells+=`<td><b>${T.points[idx]}</b></td>`;
    }
    rows+=`<tr class="${rank===0?"r1":""} ${s.isMe?"isMe":""}">
      <td><div class="nc"><div class="pd" style="background:${s.color}"></div>${s.e} ${s.name}</div></td>
      ${cells}</tr>`;
  });
  document.getElementById("pts-inner").innerHTML=`<table class="ptbl"><thead><tr>${hdr}</tr></thead><tbody>${rows}</tbody></table>`;
  const structName = CONFIG_STRUCTURE.find(m => m.id === T.structure)?.name || "Classement";
  document.getElementById("pts-lbl").textContent = isNexus ? `🌐 Nexus — Tournoi ${T.nexusTourneyIdx+1}/3` : structName;
}
function drawSparkline(data,color,w=36,h=14){
  const cv=document.createElement("canvas");
  cv.width=w;cv.height=h;cv.className="r-spark";
  const cx=cv.getContext("2d");
  if(!data||data.length<2)return cv;
  const mn=Math.min(...data),mx=Math.max(...data);
  const range=(mx-mn)||1;
  cx.strokeStyle=color;cx.lineWidth=1.2;cx.lineCap="round";cx.lineJoin="round";
  cx.shadowColor=color;cx.shadowBlur=3;
  cx.beginPath();
  data.forEach((v,i)=>{
    const x=(i/(data.length-1))*(w-2)+1;
    const y=h-1-(v-mn)/range*(h-3)-1;
    i===0?cx.moveTo(x,y):cx.lineTo(x,y);
  });
  cx.stroke();
  return cv;
}
function updateRanking(){
  const gs=getGroups();
  const curPops=T.strats.map(s=>s.pop);
  const prev=prevPops||curPops;
  const el=document.getElementById("ranking");
  const frag=document.createDocumentFragment();
  gs.forEach((g,gi)=>{
    const srt=[...g].sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
    const gpop=g.reduce((s,i)=>s+T.strats[i].pop,0)||1;
    const mx=T.strats[srt[0]]?.pop||1;
    if(gs.length>1){const sep=document.createElement("div");sep.className="gsep";sep.textContent=`Grp ${gi+1}`;frag.appendChild(sep);}
    srt.forEach((idx,rank)=>{
      const s=T.strats[idx];const pct=s.pop/gpop*100;
      const dead=(T.mode==="survival"&&T.survHP[idx]<=0)||(T.mode==="royale"&&s.pop<=0.5);
      const delta=s.pop-(prev[idx]||s.pop);
      const trd=delta>1.5?"↑":delta<-1.5?"↓":"·";
      const trdCol=delta>1.5?"var(--green)":delta<-1.5?"var(--red)":"var(--muted)";
      const row=document.createElement("div");
      row.className=`rrow ${rank===0?"t1":rank===1?"t2":rank===2?"t3":""} ${s.isMe?"isMe":""} ${dead?"eliminated":""}`;
      row.onclick=()=>openStratModal(idx);
      row.innerHTML=`<div class="rn">${rank+1}</div>
        <div class="rdot" style="background:${s.color}"></div>
        <div class="rname">${s.e} ${s.name}</div>
        <div class="rbg"><div class="rbf" style="width:${(s.pop/mx*100).toFixed(0)}%;background:${s.color}"></div></div>
        <div class="rtrd" style="color:${trdCol}">${trd}</div>
        <div class="rp">${pct.toFixed(0)}%</div>`;
      
      const spark=T.sparkHistory?.[idx];
      if(spark&&spark.length>=3){row.appendChild(drawSparkline(spark,s.color,34,12));}
      frag.appendChild(row);
    });
  });
  el.innerHTML="";el.appendChild(frag);
  if(T.gen%5===0)prevPops=curPops;
  
  renderRivalryPanel();
  renderChroniquePanel();
}
function updateLegend(){
  if(!T)return;
  const active=new Set(getGroups().flat());
  document.getElementById("legend").innerHTML=T.strats.map((s,i)=>
    `<div class="li ${active.has(i)?"":"dim"} ${hlIdx===i?"hi":""}" onclick="toggleHL(${i})" id="li_${i}">
      <div class="ld" style="background:${s.color}"></div>${s.e} ${s.name}
    </div>`).join("");
}
function toggleHL(i){hlIdx=hlIdx===i?null:i;updateLegend();drawChart();}
function clearCanvas(){
  canvas.width=canvas.offsetWidth||600;canvas.height=canvas.offsetHeight||240;
  ctx.clearRect(0,0,canvas.width,canvas.height);
}
let _chartIdxsCache=null,_chartIdxsCacheGen=-1;
function getChartIdxs(){
  if(_chartIdxsCacheGen===T.gen)return _chartIdxsCache;
  _chartIdxsCache=[...new Set(T.history.flatMap(s=>s.groups.flatMap(g=>g.idxs)))];
  _chartIdxsCacheGen=T.gen;
  return _chartIdxsCache;
}
const MAX_CHART_PTS=300;
function getChartHistory(){
  const h=T.history;if(h.length<=MAX_CHART_PTS)return h;
  const step=h.length/MAX_CHART_PTS;
  const out=[];
  for(let i=0;i<MAX_CHART_PTS-1;i++)out.push(h[Math.round(i*step)]);
  out.push(h[h.length-1]);
  return out;
}
function drawChart(){
  const W=canvas.offsetWidth||600,H=canvas.offsetHeight||240;
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  ctx.clearRect(0,0,W,H);
  if(!T||!T.history.length)return;
  ctx.strokeStyle="rgba(255,255,255,.018)";ctx.lineWidth=1;
  for(let y=H*.2;y<H;y+=H*.2){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  const allIdxs=getChartIdxs();
  const RPAD=T.N<=8?64:T.N<=16?72:80;const CW=W-4-RPAD;
  const hist=getChartHistory();
  const nPts=hist.length,xS=CW/Math.max(nPts-1,1);
  const PT=0.03,CH=0.93;
  const dimAll=hlIdx!==null;
  const drawOrder=[...allIdxs].sort((a,b)=>{if(a===hlIdx)return 1;if(b===hlIdx)return-1;return 0;});
  drawOrder.forEach(idx=>{
    const s=T.strats[idx];if(!s)return;
    const isHi=hlIdx===idx,dim=dimAll&&!isHi;
    
    const pts=hist.map((snap,ti)=>{
      let pct=0;
      for(let gi=0;gi<snap.groups.length;gi++){
        const g=snap.groups[gi];const pos=g.idxs.indexOf(idx);
        if(pos>=0){const tot=g.pops.reduce((a,x)=>a+x,0)||1;pct=g.pops[pos]/tot;break;}
      }
      return{x:4+ti*xS,y:H-(pct*CH+PT)*H};
    });
    if(pts.length<2)return;
    ctx.save();ctx.globalAlpha=dim?0.08:(isHi?1:0.75);
    
    ctx.beginPath();ctx.moveTo(pts[0].x,H);ctx.lineTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++){const cx=(pts[i-1].x+pts[i].x)/2,cy=(pts[i-1].y+pts[i].y)/2;ctx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,cx,cy);}
    ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);ctx.lineTo(pts[pts.length-1].x,H);ctx.closePath();
    const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,s.color+(isHi?"28":"12"));gr.addColorStop(1,s.color+"02");
    ctx.fillStyle=gr;ctx.fill();
    
    ctx.shadowColor=s.color;ctx.shadowBlur=isHi?16:7;
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++){const cx=(pts[i-1].x+pts[i].x)/2,cy=(pts[i-1].y+pts[i].y)/2;ctx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,cx,cy);}
    ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);
    ctx.strokeStyle=s.color;ctx.lineWidth=isHi?2.5:T.N>16?1.2:1.6;ctx.stroke();
    
    const last=pts[pts.length-1];
    ctx.shadowBlur=isHi?18:8;
    ctx.beginPath();ctx.arc(last.x,last.y,isHi?4:2.2,0,Math.PI*2);ctx.fillStyle=s.color;ctx.fill();
    ctx.restore();
    
    if(!dim&&T.N<=16){
      const snap=T.history[T.history.length-1];let pct=0;
      snap.groups.forEach(g=>{const pos=g.idxs.indexOf(idx);if(pos>=0){const tot=g.pops.reduce((a,x)=>a+x,0)||1;pct=g.pops[pos]/tot*100;}});
      ctx.save();ctx.fillStyle=s.color;ctx.globalAlpha=isHi?1:0.72;
      ctx.font=`${isHi?500:400} ${isHi?9:7.5}px 'DM Mono',monospace`;
      ctx.fillText(`${s.e}${pct.toFixed(0)}%`,4+CW+5,Math.max(8,Math.min(H-4,last.y+3)));
      ctx.restore();
    }
  });
}
function showFinal(){
  setSt("done","Tournoi terminé !");
  document.getElementById("btn-next").style.display="none";
  document.getElementById("btn-replay").style.display="";
  document.getElementById("pbadge").style.display="none";
  const noPts=["bracket","duel","duel2"].includes(T.structure);
  if(!noPts){updatePtsTable();document.getElementById("pts-main").style.display="";}
  else{document.getElementById("pts-main").style.display="none";}
  const r=T.finalRanking;if(!r||!r.length)return;
  const winner=T.strats[r[0]];
  const getPtLabel=(idx)=>{
    if(T.modifiers.includes("koh")) return `${T.kohPts[idx]||0} pts`;
    if(noPts) return "";
    return `${T.points[idx]} pts`;
  };
  
  document.getElementById("final").classList.add("show");
  const splash=document.getElementById("final-splash");
  const body=document.getElementById("final-body");
  splash.style.display="";
  body.style.display="none";
  
  document.getElementById("fw-emoji").textContent=winner.e;
  document.getElementById("fw-name").style.color=winner.color;
  document.getElementById("fw-name").textContent=winner.name;
  document.getElementById("fw-sub").textContent=`${winner.tag} · ${winner.desc?.slice(0,60)||""}…`;
  
  const avgCoop=T.coopHistory.length?T.coopHistory.reduce((a,x)=>a+x,0)/T.coopHistory.length:0.5;
  const wCoop=((winner.coopRate||0.5)*100).toFixed(0);
  const wPct=(T.POP>0?winner.pop/T.POP*100:0).toFixed(0);
  document.getElementById("fw-bars").innerHTML=`
    <div class="fw-stat"><div class="fw-stat-val" style="color:${winner.color}">${wPct}%</div><div class="fw-stat-lbl">Pop. finale</div></div>
    <div class="fw-stat"><div class="fw-stat-val" style="color:var(--teal)">${wCoop}%</div><div class="fw-stat-lbl">Coopération</div></div>
    <div class="fw-stat"><div class="fw-stat-val" style="color:var(--gold)">${T.gen}</div><div class="fw-stat-lbl">Générations</div></div>
    ${!noPts&&getPtLabel(r[0])?`<div class="fw-stat"><div class="fw-stat-val" style="color:var(--gold)">${getPtLabel(r[0])}</div><div class="fw-stat-lbl">Score</div></div>`:""}
  `;
  
  setTimeout(()=>spawnConfetti(document.getElementById("confetti-cv")),200);
  playSoundEvent("win");
  
  setTimeout(()=>{
    body.style.display="";
    body.style.animation="name-slide .5s ease";
    
    const top=r.slice(0,3);
    const po=top.length>=3?[top[1],top[0],top[2]]:top;
    const pc=["g2","g1","g3"],pn=["2","1","3"];
    document.getElementById("pod").innerHTML=po.map((idx,i)=>{
      const s=T.strats[idx];
      return`<div class="pc">
        <div class="pe2">${s.e}</div>
        <div class="pn" style="color:${s.color}">${s.name}<br><span style="font-size:6px;color:var(--muted)">${s.tag}</span></div>
        ${getPtLabel(idx)?`<div class="ppts">${getPtLabel(idx)}</div>`:""}
        <div class="pb ${pc[i]}">${pn[i]}</div>
      </div>`;
    }).join("");
    
    document.getElementById("flist").innerHTML=`<div class="card" style="padding:8px 6px;margin-top:8px">`+r.map((idx,i)=>{
      const s=T.strats[idx];
      const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
      return`<div class="rrow ${i===0?"t1":i===1?"t2":i===2?"t3":""} ${s.isMe?"isMe":""}" style="animation:name-slide .3s ease ${i*0.04}s both">
        <div class="rn">${medal||i+1}</div>
        <div class="rdot" style="background:${s.color}"></div>
        <div class="rname">${s.e} <b>${s.name}</b> <span style="font-size:7px;color:var(--muted)">${s.tag}</span>
          ${s.isMe?`<span style="color:var(--teal);margin-left:5px">◀ vous</span>`:""}
        </div>
        ${getPtLabel(idx)?`<div style="margin-left:auto;font-size:9px;color:var(--gold)">${getPtLabel(idx)}</div>`:""}
      </div>`;
    }).join("")+`</div>`;
    buildPostGameAnalysis();
  },2400);
  
  checkAchievements();
  recordHOF();
  updateELO(r); 
  checkCampaignSuccess();
  
  if(winner&&canvas){
    setTimeout(()=>{spawnDomination(r[0]);for(let i=0;i<3;i++)setTimeout(()=>spawnParticles(canvas.offsetWidth/2,canvas.offsetHeight*.3,winner.color,20,"burst"),i*400);},300);
  }
  document.getElementById("commentator-section").style.display="";
  callCommentator(`Victoire finale de ${winner.name}`,``,`win`,true);
}
function setSt(type,txt){
  ["sdot","sdot2"].forEach(id=>{const d=document.getElementById(id);if(d)d.className=`sdot ${type}`;});
  ["stxt","stxt2"].forEach(id=>{const d=document.getElementById(id);if(d)d.textContent=txt;});
}
const pCv=document.getElementById("particle-cv");
const pCtx=pCv?pCv.getContext("2d"):null;
let particles=[];
function spawnParticles(x,y,color,count,type="burst"){
  if(!pCtx)return;
  for(let i=0;i<count;i++){
    const angle=type==="burst"?Math.random()*Math.PI*2:(-Math.PI/2)+((Math.random()-.5)*.8);
    const spd=type==="burst"?1.5+Math.random()*2.5:1+Math.random()*2;
    particles.push({x,y,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,
      life:1,decay:0.015+Math.random()*0.02,
      r:2+Math.random()*3,color,type});
  }
}
let confettiPieces=[];
function spawnConfetti(cv){
  if(!cv)return;
  const colors=["#f5c842","#00e5c8","#ff3060","#b47fff","#3de87a","#ff8c00","#5ba4f7"];
  confettiPieces=[];
  for(let i=0;i<120;i++){
    confettiPieces.push({
      x:Math.random()*cv.offsetWidth,y:-10-Math.random()*80,
      vx:(Math.random()-.5)*3,vy:1.5+Math.random()*3,
      w:5+Math.random()*8,h:3+Math.random()*5,
      color:colors[Math.floor(Math.random()*colors.length)],
      rot:Math.random()*Math.PI*2,rotV:(Math.random()-.5)*.2,
      life:1,decay:.004+Math.random()*.006
    });
  }
  function tickC(){
    if(!cv||!cv.getContext)return;
    const W=cv.offsetWidth||400,H=cv.offsetHeight||200;
    if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
    const cc=cv.getContext("2d");
    cc.clearRect(0,0,W,H);
    confettiPieces=confettiPieces.filter(p=>p.life>0&&p.y<H+20);
    for(const p of confettiPieces){
      p.x+=p.vx;p.y+=p.vy;p.vy*=1.01;p.rot+=p.rotV;p.life-=p.decay;
      cc.save();cc.globalAlpha=Math.max(0,p.life*.9);
      cc.translate(p.x,p.y);cc.rotate(p.rot);
      cc.fillStyle=p.color;
      cc.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      cc.restore();
    }
    if(confettiPieces.length>0)requestAnimationFrame(tickC);
  }
  requestAnimationFrame(tickC);
}
function spawnPhoenix(stratIdx){
  if(!T||!canvas)return;
  const s=T.strats[stratIdx];
  const W=canvas.offsetWidth,H=canvas.offsetHeight;
  
  for(let i=0;i<4;i++){
    setTimeout(()=>spawnParticles(W*.2+Math.random()*W*.6,H*.7+Math.random()*H*.2,s.color,12,"rise"),i*120);
  }
}
function spawnElimination(stratIdx){
  if(!T||!canvas)return;
  const s=T.strats[stratIdx];
  const W=canvas.offsetWidth,H=canvas.offsetHeight;
  spawnParticles(W/2,H/2,s.color,25,"burst");
  spawnParticles(W/2,H/2,"#ff3060",15,"burst");
}
function spawnDomination(stratIdx){
  if(!T||!canvas)return;
  const s=T.strats[stratIdx];
  const W=canvas.offsetWidth;
  for(let i=0;i<6;i++)spawnParticles(Math.random()*W,10+Math.random()*20,s.color,8,"rise");
}
function tickParticles(){
  if(!pCv||!pCtx)return;
  const W=pCv.offsetWidth||600,H=pCv.offsetHeight||240;
  if(pCv.width!==W||pCv.height!==H){pCv.width=W;pCv.height=H;}
  pCtx.clearRect(0,0,W,H);
  particles=particles.filter(p=>p.life>0);
  for(const p of particles){
    p.x+=p.vx;p.y+=p.vy;
    p.vy+=p.type==="rise"?-0.04:0.06;
    p.vx*=0.97;p.life-=p.decay;
    pCtx.save();pCtx.globalAlpha=Math.max(0,p.life);
    pCtx.shadowColor=p.color;pCtx.shadowBlur=p.r*3;
    pCtx.fillStyle=p.color;
    pCtx.beginPath();pCtx.arc(p.x,p.y,Math.max(0.01,p.r*p.life),0,Math.PI*2);pCtx.fill();
    pCtx.restore();
  }
  requestAnimationFrame(tickParticles);
}
tickParticles();
let audioCtx=null,gainNode=null,osc1=null,osc2=null,soundOn=false;
function initSound(){
  if(audioCtx)return;
  audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  gainNode=audioCtx.createGain();gainNode.gain.value=0.0;gainNode.connect(audioCtx.destination);
  osc1=audioCtx.createOscillator();osc1.type="sine";osc1.frequency.value=120;osc1.connect(gainNode);osc1.start();
  osc2=audioCtx.createOscillator();osc2.type="triangle";osc2.frequency.value=180;
  const g2=audioCtx.createGain();g2.gain.value=0.3;osc2.connect(g2);g2.connect(gainNode);osc2.start();
}
function toggleSound(){
  initSound();soundOn=!soundOn;
  const btn=document.getElementById("btn-sound");
  if(soundOn){
    gainNode.gain.setTargetAtTime(0.06,audioCtx.currentTime,0.3);
    btn.textContent="🔊";btn.classList.add("active");
  } else {
    gainNode.gain.setTargetAtTime(0,audioCtx.currentTime,0.3);
    btn.textContent="🔇";btn.classList.remove("active");
  }
}
function updateSoundCoop(cr){
  if(!soundOn||!audioCtx||!osc1)return;
  
  const freq=80+cr*120;const freq2=freq*1.5;
  osc1.frequency.setTargetAtTime(freq,audioCtx.currentTime,1.5);
  osc2.frequency.setTargetAtTime(freq2,audioCtx.currentTime,1.5);
}
function playSoundEvent(type){
  if(!soundOn||!audioCtx)return;
  const t=audioCtx.currentTime;
  const osc=audioCtx.createOscillator();
  const g=audioCtx.createGain();
  osc.connect(g);g.connect(audioCtx.destination);
  if(type==="milestone"){osc.frequency.value=660;osc.type="sine";g.gain.setValueAtTime(0.1,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.6);}
  else if(type==="elim"){osc.frequency.value=110;osc.type="sawtooth";g.gain.setValueAtTime(0.15,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.8);}
  else if(type==="dom"){osc.frequency.value=880;osc.type="sine";g.gain.setValueAtTime(0.08,t);g.gain.setValueAtTime(0.08,t+0.1);g.gain.exponentialRampToValueAtTime(0.001,t+0.9);}
  else if(type==="win"){[440,550,660,880].forEach((f,i)=>{const o2=audioCtx.createOscillator(),g2=audioCtx.createGain();o2.connect(g2);g2.connect(audioCtx.destination);o2.frequency.value=f;o2.type="sine";g2.gain.setValueAtTime(0,t+i*.08);g2.gain.linearRampToValueAtTime(0.12,t+i*.08+.04);g2.gain.exponentialRampToValueAtTime(0.001,t+i*.08+.5);o2.start(t+i*.08);o2.stop(t+i*.08+.5);});}
  osc.start(t);osc.stop(t+1.5);
}
function updateAchCount(){
  const ach=loadAch();const n=Object.keys(ach).length;
  const el=document.getElementById("ach-count");if(el)el.textContent=n;
}
function openAch(){
  const ach=loadAch();
  const grid=document.getElementById("ach-grid");
  if(grid)grid.innerHTML=ACHIEVEMENTS.map(a=>`
    <div class="ach-card ${ach[a.id]?"unlocked":""}">
      <div class="ach-badge">✓</div>
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-name">${a.name}</div>
      <div class="ach-desc">${a.desc}</div>
    </div>`).join("");
  const n=Object.keys(ach).length;
  const tot=document.getElementById("ach-total");
  if(tot)tot.textContent=`${n} / ${ACHIEVEMENTS.length} achievements débloqués`;
  const sub=document.getElementById("ach-sub");
  if(sub)sub.textContent=n===ACHIEVEMENTS.length?"🏆 COLLECTION COMPLÈTE !":n>6?"Presque là...":n>0?"Continue !":"Commence à jouer !";
  document.getElementById("ach-modal-bg").classList.add("open");
}
function closeAch(){document.getElementById("ach-modal-bg").classList.remove("open");}
document.getElementById("ach-modal-bg").addEventListener("click",e=>{if(e.target===document.getElementById("ach-modal-bg"))closeAch();});
let customStrategy=null;
function openBuilder(){document.getElementById("builder-modal-bg").classList.add("open");updateBuilderPreview();}
function closeBuilder(){document.getElementById("builder-modal-bg").classList.remove("open");}
document.getElementById("builder-modal-bg").addEventListener("click",e=>{if(e.target===document.getElementById("builder-modal-bg"))closeBuilder();});
function updateBuilderPreview(){
  const init=parseInt(document.getElementById("bld-init").value);
  const ret=parseInt(document.getElementById("bld-ret").value);
  const forg=parseInt(document.getElementById("bld-forg").value);
  const rand=parseInt(document.getElementById("bld-rand").value);
  const mem=parseInt(document.getElementById("bld-mem").value);
  document.getElementById("bld-init-v").textContent=init+"%";
  document.getElementById("bld-ret-v").textContent=ret+"%";
  document.getElementById("bld-forg-v").textContent=forg+"%";
  document.getElementById("bld-rand-v").textContent=rand+"%";
  document.getElementById("bld-mem-v").textContent=mem+(mem===1?" coup":" coups");
  const arch=init>80?"coopérateur naturel":init>40?"opportuniste":"méfiant par défaut";
  const retStr=ret>70?"riposte immédiate":ret>40?"représailles modérées":"ignore souvent les trahisons";
  const forgStr=forg>50?"pardonne facilement":forg>20?"pardon conditionnel":"rancunier";
  const randStr=rand>20?"comportement imprévisible":"décisions cohérentes";
  const memStr=mem>5?`analyse les ${mem} derniers coups`:`réagit au dernier coup`;
  document.getElementById("bld-preview-txt").innerHTML=
    `Vous êtes un <b>${arch}</b>. Face à une trahison, vous ${retStr}. Vous êtes ${forgStr}. ${randStr.charAt(0).toUpperCase()+randStr.slice(1)}. Vous ${memStr}.`;
}
function saveBuilder(){
  const init=parseInt(document.getElementById("bld-init").value)/100;
  const ret=parseInt(document.getElementById("bld-ret").value)/100;
  const forg=parseInt(document.getElementById("bld-forg").value)/100;
  const rand=parseInt(document.getElementById("bld-rand").value)/100;
  const mem=parseInt(document.getElementById("bld-mem").value);
  const name=document.getElementById("bld-name").value.trim()||"Mon Stratège";
  
  const fn=(history,round,state,selfPop,groupPop)=>{
    if(Math.random()<rand)return Math.random()<0.5?"coop":"betray";
    if(round===0)return Math.random()<init?"coop":"betray";
    const window=history.slice(-mem);
    const betrayals=window.filter(h=>h==="betray").length;
    const betrayalRate=betrayals/window.length;
    if(betrayalRate>0){
      
      const punish=betrayalRate*ret>Math.random();
      if(punish){
        
        if(Math.random()<forg)return "coop";
        return "betray";
      }
    }
    return "coop";
  };
  
  customStrategy={
    sid:"custom_"+Date.now(),name,e:"🔧",char:"Personnalisé",
    tag:"CUSTOM",color:"#a0f0e0",
    desc:`Stratège personnalisé : coop ${(init*100).toFixed(0)}% · représailles ${(ret*100).toFixed(0)}% · pardon ${(forg*100).toFixed(0)}%`,
    behav:"Comportement configuré par le joueur",
    tags:[{t:"custom",c:"adapt"}],
    stats:{"Coop":(init*100).toFixed(0)+"%","Riposte":(ret*100).toFixed(0)+"%","Pardon":(forg*100).toFixed(0)+"%"},
    vs:"Variable selon l'adversaire",fn
  };
  
  const existingIdx=ALL_STRATS.findIndex(s=>s.sid===customStrategy.sid);
  if(existingIdx<0){
    ALL_STRATS.push(customStrategy);
    
    const customChar=CHARS.find(c=>c.name==="Personnalisé");
    if(customChar){customChar.strats.push(customStrategy);}
    else{CHARS.push({name:"Personnalisé",e:"🔧",color:"#a0f0e0",strats:[customStrategy]});}
    buildCharGrid();
  }
  closeBuilder();
  
  if(!draft.sel.includes(customStrategy.sid)){
    if(draft.sel.length<nPlayers){draft.sel.push(customStrategy.sid);}
    else{draft.sel[draft.sel.length-1]=customStrategy.sid;}
    renderSlots();updateSummary();
  }
  
  draft.me=customStrategy.sid;
  renderSlots();updateSummary();
}
let activeMission=null;
function saveCampaignProgress(id){const c=loadCampaign();c[id]=Date.now();try{localStorage.setItem("axelrod_campaign",JSON.stringify(c));}catch{}}
function buildMissionGrid(){
  const camp=loadCampaign();
  const grid=document.getElementById("mission-grid");if(!grid)return;
  grid.innerHTML=MISSIONS.map((m,i)=>{
    const done=camp[m.id];
    const locked=i>0&&!camp[MISSIONS[i-1].id];
    return`<div class="mission-card ${done?"completed":""} ${locked?"locked":""}" onclick="${locked?"":"openMission('"+m.id+"')"}"  >
      <div class="mission-n">${m.n}</div>
      <div class="mission-name">${m.name}</div>
      <div class="mission-obj">${m.obj}</div>
      <div class="mission-boss">⚔ ${m.boss}</div>
    </div>`;
  }).join("");
}
function openMission(id){
  const m=MISSIONS.find(x=>x.id===id);if(!m)return;
  activeMission=m;
  document.getElementById("mm-num").textContent=m.n;
  document.getElementById("mm-title").textContent=m.name;
  document.getElementById("mm-title").style.color=m.id==="m6"?"var(--gold)":"var(--text)";
  document.getElementById("mm-story").textContent=m.story;
  document.getElementById("mm-tags").innerHTML=m.tags.map(t=>`<span class="mm-tag ${t.startsWith("obj")?"objective":"boss"}">${t.replace(/^(obj|boss):/,"")}</span>`).join("");
  document.getElementById("mm-setup").innerHTML=`⚙ ${m.setup}`;
  document.getElementById("mission-modal-bg").classList.add("open");
}
function closeMission(){document.getElementById("mission-modal-bg").classList.remove("open");}
function launchMission(){
  const m=activeMission; if(!m)return;
  closeMission();
  setN(m.N);
  
  
  sandboxConfig.structure = m.structure;
  sandboxConfig.matrix = m.matrix;
  sandboxConfig.eol = [...m.eol];
  sandboxConfig.modifiers = [...m.modifiers];
  buildSandboxGrids();
  
  if(m.N===32) selectAll32();
  else {
    clearDraft();
    const picks=ALL_STRATS.slice(0,m.N);
    picks.forEach(s=>{if(!draft.sel.includes(s.sid))draft.sel.push(s.sid);});
  }
  
  if(m.me) draft.me=m.me;
  else if(draft.sel.length>0) draft.me=draft.sel[Math.floor(Math.random()*draft.sel.length)];
  
  renderSlots(); buildCharGrid(); updateSummary();
  const phasesEl=document.getElementById("p-phases");
  if(phasesEl){phasesEl.value=3; document.getElementById("pv-phases").textContent="3";}
  launchTournament();
}
let commCooldown=0,commActive=false;
function getCommContext(){
  if(!T||!T.strats)return{leader:"?",p1:"?",p2:"",p3:"",leadPct:0,p2Pct:0,coopPct:50,coop:50,gen:0,mode:"?",phase:1,maxPhases:1,milestoneCount:0,trend:"stable",trendPct:0};
  const sorted=[...T.strats].sort((a,b)=>b.pop-a.pop);
  const coopPct=T.coopHistory?.length?Math.round(T.coopHistory[T.coopHistory.length-1]*100):50;
  const leadPct=T.POP>0?Math.round(sorted[0].pop/T.POP*100):0;
  const p2Pct=T.POP>0&&sorted[1]?Math.round(sorted[1].pop/T.POP*100):0;
  
  let trend="stable",trendPct=0;
  if(T.history.length>20){
    const old=T.history[T.history.length-21];
    let oldPct=0;
    old.groups.forEach(g=>{const pos=g.idxs.indexOf(sorted[0].idx);if(pos>=0){const t=g.pops.reduce((a,x)=>a+x,0)||1;oldPct=g.pops[pos]/t*100;}});
    trendPct=Math.round(leadPct-oldPct);
    if(trendPct>4)trend="up";else if(trendPct<-4)trend="down";
  }
  
  const phaseMilestones=T.milestones?.filter(m=>m.gen>Math.max(0,T.gen-200))?.length||0;
  return{
    leader:`${sorted[0].e} ${sorted[0].name}`,
    p1:`${sorted[0].e} ${sorted[0].name}`,
    p2:sorted[1]?`${sorted[1].e} ${sorted[1].name}`:"",
    p3:sorted[2]?`${sorted[2].e} ${sorted[2].name}`:"",
    leadPct,p2Pct,
    coop:coopPct,coopPct,
    gen:T.gen||0, mode: CONFIG_STRUCTURE.find(m=>m.id===T.structure)?.name || "Sandbox",
    phase:(T.phase||0)+1,maxPhases:T.maxPhases||1,
    milestoneCount:phaseMilestones,
    trend,trendPct:Math.abs(trendPct),
  };
}
function pickTemplate(category){
  const pool=COMM_TEMPLATES[category]||COMM_TEMPLATES.default;
  return pool[Math.floor(Math.random()*pool.length)];
}
const _commUsed={};
function pickTemplateFresh(category){
  const pool=COMM_TEMPLATES[category]||COMM_TEMPLATES.default;
  if(!_commUsed[category])_commUsed[category]=[];
  let avail=pool.map((_,i)=>i).filter(i=>!_commUsed[category].includes(i));
  if(!avail.length){_commUsed[category]=[];avail=pool.map((_,i)=>i);}
  const idx=avail[Math.floor(Math.random()*avail.length)];
  _commUsed[category].push(idx);if(_commUsed[category].length>pool.length-1)_commUsed[category].shift();
  return pool[idx];
}
function callCommentator(eventText,contextStr,category="default",force=false){
  if(commActive&&!force)return;
  if(commActive&&force){commActive=false;} 
  commActive=true;
  const el=document.getElementById("commentator-text");
  const dot=document.getElementById("comm-dot");
  if(dot)dot.classList.add("thinking");
  const delay=force?150:400+Math.random()*300;
  setTimeout(()=>{
    if(dot)dot.classList.remove("thinking");
    const ctx=getCommContext();
    const tpl=pickTemplateFresh(category);
    const txt=tpl(eventText,ctx);
    if(el){
      el.classList.add("commentator-new");
      el.innerHTML="";
      let i=0;
      
      const speed=force?12:16;
      const typeInterval=setInterval(()=>{
        if(i>=txt.length){clearInterval(typeInterval);commActive=false;el.classList.remove("commentator-new");}
        else{el.innerHTML=txt.slice(0,++i)+(i<txt.length?'<span class="cursor"></span>':"");}
      },speed);
    } else {commActive=false;}
  },delay);
}
function triggerComment(event,ctx,category,force=false){
  const now=Date.now();
  if(!force&&now-commCooldown<8000)return;
  commCooldown=now;
  document.getElementById("commentator-section").style.display="";
  if(!category){
    const e=event.toLowerCase();
    if(e.includes("résurrection")||e.includes("résurr")||e.includes("phoenix"))category="phoenix";
    else if(e.includes("domin"))category="dom";
    else if(e.includes("prend la tête")||e.includes("tête"))category="lead";
    else if(e.includes("effondrement")||e.includes("coopératif"))category="collapse";
    else if(e.includes("victoire")||e.includes("remporte")||e.includes("champion"))category="win";
    else if(e.includes("éliminé")||e.includes("elim"))category="elim";
    else if(e.includes("manche")||e.includes("phase")||e.includes("fin de"))category="phase";
    else category="default";
  }
  callCommentator(event,ctx,category,force);
}
const _origCheckMilestones=checkMilestones;
checkMilestones=function(){
  const prevLen=(T?.milestones?.length||0);
  _origCheckMilestones();
  if(!T)return;
  const newMilestones=T.milestones?.slice(prevLen)||[];
  newMilestones.forEach(m=>{
    if(m.type==="phoenix"){spawnPhoenix(T.lastLeader>=0?T.lastLeader:0);playSoundEvent("milestone");triggerComment(m.txt,"Comeback spectaculaire détecté !","phoenix");}
    else if(m.type==="dom"){spawnDomination(T.lastLeader>=0?T.lastLeader:0);playSoundEvent("dom");triggerComment(m.txt,"Domination totale !","dom");}
    else if(m.type==="lead"){playSoundEvent("milestone");triggerComment(m.txt,"Changement de tête !","lead");}
    else if(m.type==="collapse"){playSoundEvent("elim");triggerComment(m.txt,"Effondrement coopératif !","collapse");}
  });
  
  if(T.coopHistory?.length)updateSoundCoop(T.coopHistory[T.coopHistory.length-1]);
};
const _origAddEvt=addEvt;
addEvt=function(cls,txt){
  _origAddEvt(cls,txt);
  if(cls==="ek"){
    
    const s=T?.strats?.reduce((b,s)=>s.pop<b.pop?s:b,T?.strats[0]);
    if(s)spawnElimination(s.idx||0);
    playSoundEvent("elim");
  }
};
const _origEndPhase=endPhase;
endPhase=function(phase){
  _origEndPhase(phase);
  
  document.getElementById("commentator-section").style.display="";
  callCommentator(`Fin manche ${phase+1}`,"",`phase`,true);
};
let chartMode="lines"; 
function setChartMode(m){
  chartMode=m;
  ["lines","stacked","bars"].forEach(x=>{
    const b=document.getElementById("cm-"+x);
    if(b)b.classList.toggle("active",x===m);
  });
  if(T&&T.history.length)drawChart();
}
const _origDrawChart=drawChart;
drawChart=function(){
  if(chartMode==="lines"){_origDrawChart();return;}
  if(!T||!T.history.length)return;
  const W=canvas.offsetWidth||600,H=canvas.offsetHeight||240;
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle="rgba(255,255,255,.018)";ctx.lineWidth=1;
  for(let y=H*.2;y<H;y+=H*.2){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  const RPAD=T.N<=8?64:T.N<=16?72:80;const CW=W-4-RPAD;
  const hist=getChartHistory(); 
  const nPts=hist.length;const xS=CW/Math.max(nPts-1,1);
  const sorted=[...Array(T.N).keys()].filter(i=>T.strats[i]&&T.strats[i].pop>0).sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
  if(chartMode==="stacked"){
    for(let ti=0;ti<nPts;ti++){
      const snap=hist[ti];
      const pcts={};
      snap.groups.forEach(g=>{const tot=g.pops.reduce((a,x)=>a+x,0)||1;g.idxs.forEach((idx,pi)=>{pcts[idx]=g.pops[pi]/tot;});});
      let cumY=H;
      sorted.forEach(idx=>{
        const s=T.strats[idx];const pct=pcts[idx]||0;const barH=pct*H*0.93;
        ctx.fillStyle=s.color+"99";
        ctx.fillRect(4+ti*xS,cumY-barH,Math.max(1,xS),barH);
        cumY-=barH;
      });
    }
    
    const lastSnap=T.history[T.history.length-1];
    const lastPcts={};
    lastSnap.groups.forEach(g=>{const tot=g.pops.reduce((a,x)=>a+x,0)||1;g.idxs.forEach((idx,pi)=>{lastPcts[idx]=g.pops[pi]/tot;});});
    let cumY=H;
    sorted.forEach(idx=>{
      const s=T.strats[idx];const pct=lastPcts[idx]||0;const barH=pct*H*0.93;
      if(T.N<=16&&pct>0.03){ctx.save();ctx.fillStyle=s.color;ctx.font=`400 7px 'DM Mono',monospace`;ctx.fillText(`${s.e}${(pct*100).toFixed(0)}%`,4+CW+5,cumY-barH/2+3);ctx.restore();}
      cumY-=barH;
    });
  } else if(chartMode==="bars"){
    const snap=T.history[T.history.length-1];
    const pcts={};
    snap.groups.forEach(g=>{const tot=g.pops.reduce((a,x)=>a+x,0)||1;g.idxs.forEach((idx,pi)=>{pcts[idx]=g.pops[pi]/tot;});});
    const allIdxs=[...Array(T.N).keys()];
    const barW=Math.max(4,(CW-T.N*2)/T.N);
    const maxP=Math.max(...allIdxs.map(i=>pcts[i]||0))||1;
    allIdxs.forEach((idx,rank)=>{
      const s=T.strats[idx];const pct=pcts[idx]||0;const bH=pct/maxP*H*0.85;const x=4+rank*(barW+2);
      const gr=ctx.createLinearGradient(0,H-bH,0,H);gr.addColorStop(0,s.color+"ee");gr.addColorStop(1,s.color+"44");
      ctx.save();ctx.shadowColor=s.color;ctx.shadowBlur=pct>0.1?10:4;ctx.fillStyle=gr;
      ctx.beginPath();ctx.roundRect?ctx.roundRect(x,H-bH,barW,bH,2):ctx.rect(x,H-bH,barW,bH);
      ctx.fill();ctx.restore();
      if(barW>12){ctx.save();ctx.fillStyle=s.color;ctx.font=`400 8px 'DM Mono',monospace`;ctx.fillText(s.e,x+(barW-8)/2,H-bH-3);ctx.restore();}
    });
  }
};
function updateChartAmbient(cr){
  const el=document.getElementById("chart-ambient");if(!el)return;
  
  if(cr>0.65){
    const t=(cr-0.65)/0.35;
    el.style.background=`radial-gradient(ellipse at 50% 100%, rgba(0,${Math.round(80+t*80)},${Math.round(80+t*100)},.${Math.round(8+t*6)}) 0%, transparent 70%)`;
  } else if(cr<0.35){
    const t=(0.35-cr)/0.35;
    el.style.background=`radial-gradient(ellipse at 50% 100%, rgba(${Math.round(80+t*80)},0,${Math.round(30+t*30)},.${Math.round(8+t*8)}) 0%, transparent 70%)`;
  } else {
    el.style.background="none";
  }
}
function toggleFF(){
  if(!T)return;
  T.ffActive=!T.ffActive;
  const btn=document.getElementById("btn-ff");
  if(btn)btn.classList.toggle("active",T.ffActive);
  if(btn)btn.textContent=T.ffActive?"⏩ x10 ON":"⏩ x10";
}
function drawHeatmap(){
  if(!T||T.N<2)return;
  const hcv=document.getElementById("heatmap-cv");if(!hcv)return;
  const N=T.N;
  const sideMax=Math.min(150,document.getElementById("side")?.offsetWidth||160);
  const cell=Math.max(4,Math.floor(sideMax/N));
  const sz=cell*N;
  if(hcv.width!==sz||hcv.height!==sz){hcv.width=sz;hcv.height=sz;}
  const hctx=hcv.getContext("2d");
  hctx.clearRect(0,0,sz,sz);
  
  let maxV=0,minV=Infinity;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    if(i===j)continue;
    const v=T.heatmapMatrix[i][j];
    if(T.heatmapCount[i][j]>0){if(v>maxV)maxV=v;if(v<minV)minV=v;}
  }
  const range=maxV-minV||1;
  for(let i=0;i<N;i++){
    for(let j=0;j<N;j++){
      const x=j*cell,y=i*cell;
      if(i===j){
        hctx.fillStyle="rgba(255,255,255,.06)";
        hctx.fillRect(x,y,cell,cell);
      } else {
        const v=T.heatmapMatrix[i][j];
        const cnt=T.heatmapCount[i][j];
        if(cnt===0){hctx.fillStyle="rgba(255,255,255,.03)";hctx.fillRect(x,y,cell,cell);continue;}
        const t=(v-minV)/range; 
        let r,g,b;
        if(t<0.5){r=Math.round(180*(1-t*2));g=Math.round(20+t*30);b=Math.round(20+t*60);}
        else{r=Math.round(20*(2-t*2));g=Math.round(80+(t-0.5)*2*140);b=Math.round(80+(t-0.5)*2*140);}
        hctx.fillStyle=`rgb(${r},${g},${b})`;
        hctx.fillRect(x,y,cell,cell);
      }
      
      hctx.strokeStyle="rgba(0,0,0,.3)";hctx.lineWidth=.5;
      hctx.strokeRect(x,y,cell,cell);
    }
  }
  
  if(cell>=10){
    hctx.font=`${Math.min(cell-2,9)}px monospace`;
    hctx.textBaseline="middle";hctx.textAlign="center";
    for(let i=0;i<N;i++){
      hctx.fillStyle=T.strats[i]?.color||"#fff";
      hctx.globalAlpha=.7;
      hctx.fillText(T.strats[i]?.e||"?",i*cell+cell/2,sz+Math.min(cell,8));
    }
    hctx.globalAlpha=1;
  }
}
document.getElementById("heatmap-cv")?.addEventListener("mousemove",e=>{
  const hcv=document.getElementById("heatmap-cv");if(!hcv||!T)return;
  const rect=hcv.getBoundingClientRect();
  const mx=e.clientX-rect.left,my=e.clientY-rect.top;
  const cell=hcv.width/T.N;
  const ci=Math.floor(my/cell),cj=Math.floor(mx/cell);
  if(ci<0||ci>=T.N||cj<0||cj>=T.N)return;
  const tt=document.getElementById("heatmap-tooltip");if(!tt)return;
  const si=T.strats[ci],sj=T.strats[cj];
  if(!si||!sj)return;
  const score=ci===cj?"—":T.heatmapMatrix[ci][cj].toFixed(3);
  const cnt=ci===cj?"":T.heatmapCount[ci][cj]+" matchs";
  tt.innerHTML=`<span style="color:${si.color}">${si.e}${si.name}</span> vs <span style="color:${sj.color}">${sj.e}${sj.name}</span><br>Score moy: <b>${score}</b>${cnt?`<br><span style="color:var(--muted)">${cnt}</span>`:""}`;
  tt.style.display="block";
  tt.style.left=(e.clientX-document.getElementById("side").getBoundingClientRect().left+8)+"px";
  tt.style.top=(e.clientY-document.getElementById("side").getBoundingClientRect().top-35)+"px";
});
document.getElementById("heatmap-cv")?.addEventListener("mouseleave",()=>{
  const tt=document.getElementById("heatmap-tooltip");if(tt)tt.style.display="none";
});
let _hofTab="hof";
function switchHOFTab(tab){
  _hofTab=tab;
  document.getElementById("hof-list").style.display=tab==="hof"?"":"none";
  const eloDiv=document.getElementById("elo-board-inner");
  if(eloDiv){eloDiv.style.display=tab==="elo"?"":"none";if(tab==="elo")eloDiv.innerHTML=renderELOBoard();}
  const clearBtn=document.getElementById("hof-clear-btn");
  if(clearBtn)clearBtn.textContent=tab==="hof"?"🗑 Effacer records":"🗑 Effacer ELO";
  if(clearBtn)clearBtn.onclick=tab==="hof"?clearHOF:()=>{resetELO();};
  ["hof","elo"].forEach(t=>{const b=document.getElementById("hof-tab-"+t);if(b)b.style.opacity=t===tab?"1":".45";});
}
function openHOF(){
  const hof=loadHOF();
  const list=document.getElementById("hof-list");
  if(list){
    if(!hof.length){list.innerHTML=`<div class="hof-empty">Aucune performance enregistrée.<br>Terminez un tournoi pour apparaître ici !</div>`;}
    else list.innerHTML=hof.map((h,i)=>`<div class="hof-row">
      <div class="hof-rank ${i===0?"g1":i===1?"g2":i===2?"g3":""}">${i+1}</div>
      <div class="hof-info">
        <div class="hof-name"><span style="color:${h.color}">${h.emoji} ${h.name}</span></div>
        <div class="hof-meta">${h.mode} · ${h.N} joueurs · ${h.gen}g · coop ${h.avgCoop}% · ${h.date}</div>
      </div>
      <div class="hof-score" style="color:${h.color}">${h.score}</div>
    </div>`).join("");
  }
  switchHOFTab(_hofTab);
  document.getElementById("hof-modal-bg").classList.add("open");
}
function closeHOF(){document.getElementById("hof-modal-bg").classList.remove("open");}
document.getElementById("hof-modal-bg").addEventListener("click",e=>{if(e.target===document.getElementById("hof-modal-bg"))closeHOF();});
function renderNexus(el){
  if(!T.nexusScores){el.innerHTML="";return;}
  const sorted=[...Array(T.N).keys()].sort((a,b)=>T.nexusScores[b]-T.nexusScores[a]);
  const maxS=T.nexusScores[sorted[0]]||1;
  el.innerHTML=`<div class="nexus-panel">
    <div style="font-size:7px;color:var(--purple);letter-spacing:.12em">NEXUS · TOURNOI ${T.nexusTourneyIdx+1}/3</div>
    <div class="nexus-progress">
      ${[0,1,2].map(i=>`<div class="nexus-dot ${i<T.nexusTourneyIdx?"done":i===T.nexusTourneyIdx?"active":""}"></div>`).join("")}
      <span style="font-size:7px;color:var(--muted)">tournois</span>
    </div>
  </div>
  <div style="font-size:7px;color:var(--muted);margin-bottom:6px;letter-spacing:.08em">SCORES CUMULÉS</div>
  ${sorted.slice(0,8).map(i=>{
    const s=T.strats[i];const sc=T.nexusScores[i];const pct=sc/maxS*100;
    return`<div class="nexus-score-row ${s.isMe?"isMe":""}">
      <div class="rdot" style="background:${s.color}"></div>
      <div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px">${s.e} ${s.name}</div>
      <div style="width:60px;height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin:0 6px">
        <div style="width:${pct.toFixed(0)}%;height:100%;background:${s.color};border-radius:2px"></div>
      </div>
      <div style="font-size:8px;color:var(--gold);min-width:24px;text-align:right">${sc}</div>
    </div>`;
  }).join("")}`;
}
const _v15_showFinal=showFinal;
showFinal=function(){
  _v15_showFinal();
  
    if(T.structure==="nexus"&&T.nexusTourneyIdx<2) {
    [...Array(T.N).keys()].forEach(i=>{T.nexusScores[i]+=T.points[i]||0;});
    T.nexusResults.push([...T.points]);
    T.nexusTourneyIdx++;
    const ni=document.getElementById("nexus-info");
    if(ni)ni.textContent=`Tournoi ${T.nexusTourneyIdx}/3 terminé · Tournoi ${T.nexusTourneyIdx+1}/3 dans 3s…`;
    addEvt("ec",`🌐 Nexus: tournoi ${T.nexusTourneyIdx}/3 terminé ! Suivant dans 3s…`);
    setTimeout(()=>{
      if(!T||T.mode!=="nexus")return;
      
      document.getElementById("final").classList.remove("show");
      const fs=document.getElementById("final-splash");if(fs)fs.style.display="none";
      const fb=document.getElementById("final-body");if(fb)fb.style.display="none";
      confettiPieces=[];
      
      T.phase=0;T.history=[];T.gen=0;T.events=[];T.points=Array(T.N).fill(0);T.phasePoints=[];
      T.strats.forEach(s=>{s.pop=T.POP/T.N;s.st={};s.coopRate=0.5;});
      T.coopHistory=[];T.milestones=[];
      clearCanvas();clearCoopCanvas();
      runPhase();
    },3000);
  } else if(T.mode==="nexus"&&T.nexusTourneyIdx>=2){
    
    [...Array(T.N).keys()].forEach(i=>{T.nexusScores[i]+=T.points[i]||0;});
    T.nexusResults.push([...T.points]);
    
    T.finalRanking=[...Array(T.N).keys()].sort((a,b)=>T.nexusScores[b]-T.nexusScores[a]);
    const ni=document.getElementById("nexus-info");if(ni)ni.textContent="NEXUS TERMINÉ — Classement cumulé";
    addEvt("ea","🌐 NEXUS FINAL — Classement cumulé sur 3 tournois !");
    playSoundEvent?.("win");
  }
};
updateAchCount();buildMissionGrid();
new ResizeObserver(()=>{if(T&&T.history.length)drawChart();}).observe(canvas);
function getRivalryName(a,b){
  const seed=(a.sid+b.sid).split("").reduce((n,c)=>n+c.charCodeAt(0),0);
  const adj=RIVALRY_ADJ[seed%RIVALRY_ADJ.length];
  const noun=RIVALRY_NOUN[(seed>>2)%RIVALRY_NOUN.length];
  return`La ${adj} ${noun}`;
}
function renderRivalryPanel(){
  if(!T||!T.rivalries)return;
  const sect=document.getElementById("rivalry-section");
  const inner=document.getElementById("rivalry-inner");
  if(!sect||!inner)return;
  
  const hot=T.rivalries.filter(r=>r.swaps>=2).sort((a,b)=>b.swaps-a.swaps)[0];
  if(!hot){sect.style.display="none";return;}
  sect.style.display="";
  const sA=T.strats[hot.a],sB=T.strats[hot.b];
  const isALeader=sA.pop>=sB.pop;
  const intensity=hot.swaps>=7?"🔥 LÉGENDAIRE":hot.swaps>=5?"⚡ INTENSE":hot.swaps>=3?"⚔️ ACTIVE":"🔸 NAISSANTE";
  inner.innerHTML=`<div class="rivalry-panel">
    <div class="rivalry-header">
      <div class="rivalry-badge">${intensity}</div>
      <div class="rivalry-name">${hot.name}</div>
    </div>
    <div class="rivalry-fighters">
      <div class="rv-fighter ${isALeader?"rv-leader":""}">
        <div style="font-size:1.1rem">${sA.e}</div>
        <div style="font-size:8px;font-weight:600">${sA.name}</div>
        <div style="font-size:7px;color:var(--muted)">${hot.winA} victoires</div>
      </div>
      <div class="rv-vs">VS</div>
      <div class="rv-fighter ${!isALeader?"rv-leader":""}">
        <div style="font-size:1.1rem">${sB.e}</div>
        <div style="font-size:8px;font-weight:600">${sB.name}</div>
        <div style="font-size:7px;color:var(--muted)">${hot.winB} victoires</div>
      </div>
    </div>
    <div class="rivalry-stats">
      <div class="rv-stat"><b>${hot.swaps}</b>renversements</div>
      <div class="rv-stat"><b>${hot.totalGens}</b>gens</div>
      <div class="rv-stat"><b>G${hot.gen0}</b>début</div>
    </div>
  </div>`;
}
function renderChroniquePanel(){
  if(!T||!T.chronicle||T.chronicle.length<2)return;
  const sect=document.getElementById("chronique-section");
  const inner=document.getElementById("chron-inner");
  if(!sect||!inner)return;
  sect.style.display="";
  
  const chapters={};
  T.chronicle.forEach(b=>{
    if(!chapters[b.chapterIdx])chapters[b.chapterIdx]=[];
    chapters[b.chapterIdx].push(b);
  });
  const chKeys=Object.keys(chapters).map(Number).sort((a,b)=>b-a).slice(0,3);
  inner.innerHTML=chKeys.map(ci=>{
    const title=T.chronicleChapters[ci]?.title||`Chapitre ${ci+1}`;
    const beats=chapters[ci].slice(-6).reverse();
    return`<div class="chron-chapter">
      <div class="chron-ch-title">${title}</div>
      ${beats.map(b=>`<div class="chron-beat cb-${b.type} chron-new">
        <span class="chron-beat-gen">G${b.gen}</span>${b.text}
      </div>`).join("")}
    </div>`;
  }).join("");
  
  inner.scrollTop=0;
}
function getELOClass(r){return r>=1500?"elo-s":r>=1300?"elo-a":"elo-b";}
function getELOLabel(r){return r>=1500?"★ "+r:r>=1300?"▲ "+r:""+r;}
function renderELOBoard(){
  const elo=loadELO();
  const entries=Object.values(elo).sort((a,b)=>b.rating-a.rating).slice(0,12);
  if(!entries.length)return`<div style="font-size:7.5px;color:var(--muted);font-style:italic">Aucun tournoi joué encore.</div>`;
  const maxR=entries[0].rating;
  return`<div class="elo-board">${entries.map((e,i)=>`<div class="elo-row ${i===0?"elo-top":""}">
    <span class="elo-rank-num">${i+1}</span>
    <span>${e.e}</span>
    <span style="flex:1;font-size:7.5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${e.name}</span>
    <div class="elo-bar-wrap"><div class="elo-bar-fill" style="width:${Math.round(e.rating/maxR*100)}%;background:${i===0?"var(--gold)":i<3?"var(--green)":"var(--muted)"}"></div></div>
    <span class="elo-badge ${getELOClass(e.rating)}" style="min-width:42px;justify-content:center">${getELOLabel(e.rating)}</span>
  </div>`).join("")}</div>`;
}
function resetELO(){saveELO({});if(document.getElementById("elo-board-inner"))document.getElementById("elo-board-inner").innerHTML=renderELOBoard();}
function initCivilisation(){
  const N=T.N;
  const perFac=Math.ceil(N/4);
  const shuffled=[...Array(N).keys()].sort(()=>Math.random()-0.5);
  T.civFactions=CIV_FACTIONS.map((cf,fi)=>({
    ...cf,
    members:shuffled.slice(fi*perFac,Math.min((fi+1)*perFac,N)),
    territory:25,
    score:0,
  }));
  T.civWars=[];T.civAlliances=[];
  addEvt("ea","🏛 CIVILISATIONS — 4 factions fondées ! Que la géopolitique commence.");
}
function renderCivilisation(el){
  if(!T.civFactions){el.innerHTML="";return;}
  
  const mapBars=T.civFactions.map(f=>`<div style="flex:${f.territory.toFixed(1)};background:${f.color};height:100%;transition:flex .5s"></div>`).join("");
  const factionHtml=T.civFactions.map(f=>{
    const atWar=T.civWars.some(w=>w.includes(f.id));
    const allied=T.civAlliances.some(a=>a.includes(f.id));
    const members=f.members.map(i=>T.strats[i]).filter(Boolean);
    return`<div class="civ-faction ${atWar?"at-war":allied?"allied":""}" style="background:${f.color}0d;border-color:${f.color}33">
      <div class="civ-name" style="color:${f.color}">
        ${f.icon} ${f.name}
        ${atWar?`<span class="civ-war-badge">⚔️ En guerre</span>`:allied?`<span class="civ-ally-badge">🤝 Allié</span>`:""}
      </div>
      <div style="font-size:6.5px;color:var(--muted);margin-bottom:3px">Territoire : <b style="color:${f.color}">${f.territory.toFixed(0)}%</b> · Coop : ${Math.round((f.coopRate||0.5)*100)}%</div>
      <div class="civ-territory-bar" style="background:rgba(255,255,255,.06)">
        <div class="civ-territory-bar" style="width:${f.territory.toFixed(0)}%;background:${f.color};margin:0;height:100%"></div>
      </div>
      <div class="civ-members">${members.slice(0,6).map(s=>`<span class="civ-member-tag">${s.e} ${s.name}</span>`).join("")}</div>
    </div>`;
  }).join("");
  el.innerHTML=`<div class="civ-territory-map">${mapBars}</div>
  <div style="font-size:6.5px;color:var(--muted);margin-bottom:6px;display:flex;gap:8px">
    ${T.civFactions.map(f=>`<span>${f.icon} <span style="color:${f.color}">${f.territory.toFixed(0)}%</span>`).join("")}
  </div>
  ${factionHtml}
  ${T.civWars.length>0?`<div style="font-size:7px;color:#ff6b6b;margin-top:4px">⚔️ ${T.civWars.length} guerre(s) active(s)</div>`:""}`;
}
function makeMiniPay(T0,mod,tMod){
  const t=T0.T*(tMod||1),r=T0.R,p=T0.P,s=T0.S;
  return{coop:{coop:[r*mod,r*mod],betray:[s*mod,t*mod]},betray:{coop:[t*mod,s*mod],betray:[p*mod,p*mod]}};
}
function initObservatoire(){
  const pay0=T.pendingPayoff||{R:3,T:5,P:1,S:0};
  T.obsArenas=OBS_VARIANTS.map((v,vi)=>{
    const strats=T.strats.map((s,i)=>{
      const initPop=T.POP/T.N;
      return{...s,idx:i,pop:initPop,st:{},coopRate:0.5,peakPop:initPop,totalScore:0,matchCount:0};
    });
    return{
      id:vi,label:v.label,strats,
      noise:Math.min(0.4,T.NOISE+v.noiseBonus),
      alpha:Math.min(0.12,T.ALPHA+v.alphaBonus),
      pay:makeMiniPay(pay0,v.payMod,v.tMod),
      coopHistory:[],gen:0,leader:-1,
    };
  });
  T.obsWins=new Array(T.N).fill(0);
  T.obsGens=0;
  addEvt("ea","🔭 OBSERVATOIRE — 6 arènes lancées simultanément !");
}
function nMoveObs(m,noise){return noise>0&&Math.random()<noise?(m==="coop"?"betray":"coop"):m;}
function renderObservatoire(el){
  if(!T.obsArenas){el.innerHTML="";return;}
  const arenaHtml=T.obsArenas.map((arena,vi)=>{
    const sorted=[...arena.strats].sort((a,b)=>b.pop-a.pop);
    const maxPop=sorted[0]?.pop||1;
    const bars=sorted.slice(0,5).map(s=>{
      const pct=Math.round(s.pop/maxPop*100);
      return`<div class="obs-bar-row"><div class="obs-bar-fill" style="width:${pct}%;background:${s.color};flex:${pct}"></div></div>`;
    }).join("");
    const ldr=sorted[0];
    return`<div class="obs-arena" title="${arena.label}">
      <div class="obs-arena-title">${arena.label}</div>
      <div class="obs-bars">${bars}</div>
      <div style="font-size:6px;color:var(--muted);margin-top:3px">${ldr?ldr.e+" "+ldr.name:""}</div>
    </div>`;
  }).join("");
  
  const metaSorted=[...Array(T.N).keys()].sort((a,b)=>(T.obsWins[b]||0)-(T.obsWins[a]||0));
  const maxWins=T.obsWins[metaSorted[0]]||1;
  const metaHtml=metaSorted.slice(0,6).map((i,rank)=>{
    const s=T.strats[i];const w=T.obsWins[i]||0;
    return`<div class="obs-meta-row">
      <span style="font-size:6.5px;color:var(--muted);width:12px">${rank+1}</span>
      <span style="font-size:7.5px">${s.e} ${s.name}</span>
      <div class="obs-win-bar"><div class="obs-win-fill" style="width:${Math.round(w/maxWins*100)}%"></div></div>
      <span style="font-size:7px;color:var(--gold);min-width:20px;text-align:right">${w}/6</span>
    </div>`;
  }).join("");
  el.innerHTML=`<div style="font-size:7px;color:#00d4ff;letter-spacing:.12em;margin-bottom:6px">🔭 ARÈNES PARALLÈLES · G${T.obsGens}</div>
  <div class="obs-grid">${arenaHtml}</div>
  <div style="font-size:6.5px;color:var(--muted);letter-spacing:.1em;margin-bottom:4px">MÉTA-CLASSEMENT</div>
  <div class="obs-meta">${metaHtml}</div>`;
}
function renderCoevo(el){
  if(!T||!T.coevoLineage){el.innerHTML="";return;}
  const sorted=[...T.strats].sort((a,b)=>b.pop-a.pop);
  el.innerHTML=`<div style="font-size:7px;color:var(--purple);letter-spacing:.12em;margin-bottom:6px">🧬 ARBRE DE MUTATIONS · ${T.coevoLineage.length} mutations</div>
  ${T.coevoLineage.length===0?`<div style="font-size:7.5px;color:var(--muted);font-style:italic">Première mutation dans ${T.coevoCountdown} générations…</div>`:""}
  ${T.coevoLineage.slice(-6).reverse().map(m=>{
    const s=T.strats[m.who],d=T.strats[m.from];
    if(!s||!d)return"";
    return`<div class="coevo-mut-line">
      <div style="display:flex;align-items:center;gap:5px;font-size:8px">
        <span>${s.e} <b>${s.name}</b></span>
        <span style="color:var(--muted);font-size:7px">←</span>
        <span style="color:var(--purple)">${d.e} ${d.name}</span>
        <span style="margin-left:auto;font-size:6.5px;color:var(--amber)">${Math.round(m.rate*100)}% err</span>
      </div>
      <div style="font-size:6.5px;color:var(--muted);margin-top:2px">G${m.gen} — mutation avec ${Math.round(m.rate*100)}% d'erreur</div>
    </div>`;
  }).join("")}
  <div style="margin-top:6px;font-size:7px;color:var(--muted);letter-spacing:.1em">CLASSEMENT ACTUEL</div>
  ${sorted.slice(0,6).map((s,i)=>{
    const hasMut=s._mutRate>0;
    return`<div style="display:flex;align-items:center;gap:5px;padding:2px 0;font-size:8px">
      <span style="font-size:7px;color:var(--muted);width:10px">${i+1}</span>
      <div class="rdot" style="background:${s.color}"></div>
      <span>${s.e} ${s.name}</span>
      ${hasMut?`<span class="coevo-gen-badge">${Math.round(s._mutRate*100)}%</span>`:""}
      <span style="margin-left:auto;font-size:7.5px;color:var(--muted)">${Math.round(s.pop/T.POP*100)}%</span>
    </div>`;
  }).join("")}`;
}
const _v17_checkMilestones=checkMilestones;
checkMilestones=function(){
  _v17_checkMilestones();
  if(!T)return;
  
  const last=T.milestones?.[T.milestones.length-1];
  if(last&&last.gen===T.gen){
    const clean=last.txt.replace(/<[^>]+>/g,"");
    const type=last.type==="phoenix"?"epic":last.type==="dom"?"epic":last.type==="collapse"?"dark":last.type==="lead"?"hope":"default";
    addChronicle(clean,type);
  }
};
const tutorialSteps = [
  { target: null, title: "Bienvenue dans Arena X", text: "Ce didacticiel va vous guider pas à pas pour préparer votre premier tournoi évolutionnaire." },
  { target: "#grid-structure", title: "1. La Structure", text: "Ici, vous choisissez le format du tournoi. 'Round Robin' (chacun affronte tout le monde) est parfait pour commencer et évaluer la force brute." },
  { target: "#grid-matrix", title: "2. La Matrice", text: "Ceci définit les points gagnés ou perdus lors d'une coopération ou d'une trahison (le fameux Dilemme du Prisonnier). Laissez sur 'Standard'." },
  { target: ".n-select", title: "3. Les Joueurs", text: "Combien d'algorithmes vont s'affronter dans cette arène ? Gardons 8 joueurs pour que ce soit facile à suivre." },
  { target: "#char-grid", title: "4. Le Casting", text: "Voici toutes les stratégies disponibles. Pour faire simple, cliquez sur le bouton '🎲 Aléatoire' juste au-dessus pour remplir l'arène." },
  { target: ".bg.bxl", title: "5. Lancement", text: "Tout est prêt. Cliquez sur '▶ LANCER' en haut à droite pour démarrer la simulation et observer l'évolution en temps réel !" }
];
let currentTutStep = 0;
function startTutorial() {
  currentTutStep = 0;
  document.getElementById("tut-overlay").style.display = "block";
  showTutStep(currentTutStep);
}
function showTutStep(index) {
  
  document.querySelectorAll('.tut-highlight').forEach(el => el.classList.remove('tut-highlight'));
  const step = tutorialSteps[index];
  const box = document.getElementById("tut-box");
  document.getElementById("tut-title").textContent = step.title;
  document.getElementById("tut-text").textContent = step.text;
  document.getElementById("tut-prev").style.visibility = index > 0 ? "visible" : "hidden";
  document.getElementById("tut-next").textContent = index === tutorialSteps.length - 1 ? "Terminer" : "Suivant ▶";
  if (step.target) {
    const targetEl = document.querySelector(step.target);
    if (targetEl) {
      targetEl.classList.add('tut-highlight');
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
      
      setTimeout(() => { 
        const rect = targetEl.getBoundingClientRect();
        box.style.transform = "none";
        
        let topPos = rect.bottom + 15;
        if (topPos + 150 > window.innerHeight) topPos = Math.max(10, rect.top - 160); 
        box.style.top = topPos + "px";
        box.style.left = Math.max(10, rect.left) + "px";
      }, 300);
    }
  } else {
    
    box.style.top = "40%";
    box.style.left = "50%";
    box.style.transform = "translate(-50%, -50%)";
  }
}
function nextTut() {
  if (currentTutStep < tutorialSteps.length - 1) {
    currentTutStep++;
    showTutStep(currentTutStep);
  } else {
    endTutorial();
  }
}
function prevTut() {
  if (currentTutStep > 0) {
    currentTutStep--;
    showTutStep(currentTutStep);
  }
}
function endTutorial() {
  document.getElementById("tut-overlay").style.display = "none";
  document.querySelectorAll('.tut-highlight').forEach(el => el.classList.remove('tut-highlight'));
  document.getElementById("tut-box").style.transform = "none"; 
}
