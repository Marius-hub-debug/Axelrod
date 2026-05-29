let T=null;
let hlIdx=null;
let prevPops=null;
function getParams(){
  const cond=document.querySelector('input[name="cond"]:checked')?.value||"gen";
  return{
    structure: sandboxConfig.structure,
    matrix: sandboxConfig.matrix,
    eol: [...sandboxConfig.eol],
    modifiers: [...sandboxConfig.modifiers],
    N: nPlayers,
    condType: cond,
    condVal: cond==="gen"?parseInt(document.getElementById("gsl").value):parseInt(document.getElementById("psl").value),
    spdVal: parseInt(document.getElementById("spd").value),
    ALPHA: parseFloat(document.getElementById("p-alpha").value),
    RMATCH: parseInt(document.getElementById("p-rmatch").value),
    NOISE: parseFloat(document.getElementById("p-noise").value),
    DRIFT: parseFloat(document.getElementById("p-drift").value),
    POP: parseInt(document.getElementById("p-pop").value),
    PHASES: parseInt(document.getElementById("p-phases").value),
    worldEvents: document.getElementById("p-worldevents")?.checked||false,
  };
function initTournament(){
  if(T?.interval){clearInterval(T.interval);T.interval=null;}
  if(draft.sel.length<nPlayers){goSetup();return;}
  const p=getParams();
  const defs=draft.sel.map(sid=>ALL_STRATS.find(s=>s.sid===sid));
  const strats=defs.map((def,i)=>{
    let initPop=p.POP/p.N;
    if(p.mode==="gauntlet"&&def.sid===draft.me)initPop=p.POP*2/p.N;
    if(p.mode==="invasion"){initPop=def.sid===draft.me?p.POP*0.05:p.POP*0.95/(p.N-1);}
    return{...def,idx:i,pop:initPop,isMe:def.sid===draft.me,st:{},coopRate:0.5,peakPop:initPop,totalScore:0,matchCount:0};
  });
function runPhase(){
  const phase=T.phase;
  T.history=[];T.gen=0;prevPops=null;T.coopHistory=[];
  let currentPay=T.pendingPayoff;
  const batch=BATCH_MAP[T.spdVal]||1;
  getGroups().forEach(g=>{
    const e=T.POP/Math.max(1,g.length);
    g.forEach(i=>{T.strats[i].pop=e;T.strats[i].st={};T.strats[i].coopRate=0.5;});
  });
  
  if(T.chronicle!==undefined){
    const chIdx=T.chronicleChapters.length;
    const chName=CHAPTER_NAMES[chIdx%CHAPTER_NAMES.length];
    T.chronicleChapters.push({title:`Chapitre ${chIdx+1} : ${chName}`,gen:0});
    const mStruct = CONFIG_STRUCTURE.find(m=>m.id===T.structure)?.name || "Sandbox";
    addChronicle(`${chName} — ${T.N} stratèges entrent en lice (${mStruct}).`,"hope");
  }
  if(T.modifiers.includes("invasion")){
    T.strats.forEach(s=>{s.pop=s.isMe?T.POP*0.05:T.POP*0.95/(T.N-1);s.st={};});
  }
  setSt("run",`Manche ${phase+1}/${T.maxPhases} — ${batch}g/tick`);
  document.getElementById("ph-lbl").textContent=`Manche ${phase+1}/${T.maxPhases}`;
  document.getElementById("btn-next").style.display="none";
  document.getElementById("pbadge").textContent=`${CONFIG_STRUCTURE.find(m=>m.id===T.structure)?.icon||"🏆"} ${phase+1}/${T.maxPhases}`;
  document.getElementById("pbadge").style.display="";
  
  document.getElementById("coop-wrap").style.display="";
  document.getElementById("stats-bar").style.display="";
  document.getElementById("live-match-section").style.display="";
  document.getElementById("btn-pause").classList.add("visible");
  document.getElementById("scrubber-wrap").classList.add("visible");
  updateLegend();
  if(T.matrix==="arms")document.getElementById("arms-t-info").textContent=`T boost: ×${(T.armsBoost[phase]||1).toFixed(1)}`;
  let rafId=null;
  let renderDirty=false;
  let _lastSideRender=0,_lastStatsRender=0;
  function scheduleRender(){
    if(rafId!==null)return;
    rafId=requestAnimationFrame(()=>{
      rafId=null;
      if(!T||!renderDirty)return;
      renderDirty=false;
      const gen=T.gen;
      
      if(T.scrubIdx===null){
        drawChart();
        drawCoopChart();
        if (T.structure === "reseau") drawNetGraph(); 
      }
      
      updateRanking();
      
      if(gen-_lastSideRender>=5){renderSide();renderLiveMatch();_lastSideRender=gen;}
      
      if(gen-_lastStatsRender>=10){
        const cr=T.coopHistory[T.coopHistory.length-1]||0.5;
        updateStatsBar(cr);updateChartAmbient(cr);drawHeatmap();
        _lastStatsRender=gen;
      }
      
      document.getElementById("gen-lbl").textContent=`Gén. ${gen}`;
      const scrEl=document.getElementById("scrubber");
      if(scrEl&&T.scrubIdx===null){
        scrEl.max=T.history.length-1;scrEl.value=T.history.length-1;
        const slEl=document.getElementById("scrub-lbl");if(slEl)slEl.textContent=`Gén. ${gen}`;
      }
    });
  }
  T.interval=setInterval(()=>{
    if(T.paused)return;
    const effectiveBatch=T.ffActive?Math.min(50,batch*10):batch;
    T.genCoopMoves=0;T.genTotalMoves=0;
    
    for(let b=0;b<effectiveBatch;b++){
      if(T.matrix==="chaos" && T.gen>0 && T.gen%T.chaosInterval===0){
        currentPay=mkMatrix();
        addEvt("ec",`⚡ Nouvelle matrice ! (gén. ${T.gen})`);
        const cnEl=document.getElementById("chaos-next");if(cnEl)cnEl.textContent=`+${T.chaosInterval} gens`;
      }
      
      checkRoyaleElim();
      if(T.structure==="territoire"){ terrStep(currentPay); }
      else if(T.structure==="reseau"){ reseauStep(currentPay); }
      else{ 
          
          getGroups().forEach(g=>simGroup(g, currentPay)); 
      }
      if(T.modifiers.includes("mutation") && T.gen>0 && T.gen%70===0){checkMutation(currentPay);}
      
      if(T.eol.includes("extinction")){
        T.extinctionCountdown--;
        const cntEl=document.getElementById("extinction-countdown");
        if(cntEl)cntEl.textContent=`EXTINCTION dans ${T.extinctionCountdown}`;
        if(T.extinctionCountdown<=0&&T.extinctionAlive.length>1){
          const alive=T.extinctionAlive.filter(i=>T.strats[i].pop>0);
          const sorted=[...alive].sort((a,b)=>T.strats[a].pop-T.strats[b].pop);
          const nKill=Math.max(1,Math.floor(alive.length*0.2));
          const killed=sorted.slice(0,nKill);
          killed.forEach(i=>{T.strats[i].pop=0;T.extinctionAlive=T.extinctionAlive.filter(x=>x!==i);
            T.extinctionElims.push({wave:T.extinctionWave+1,idx:i,gen:T.gen});
            addEvt("ek",`☄️ <b>${T.strats[i].name}</b> éliminé ! (vague ${T.extinctionWave+1})`);
            spawnElimination(i);
          });
          T.extinctionWave++;
          T.milestones.push({gen:T.gen,txt:`☄️ Vague ${T.extinctionWave} — ${nKill} éliminé(s)`,type:"dom"});
          const totalAlive=T.extinctionAlive.reduce((s,i)=>s+T.strats[i].pop,0)||1;
          T.extinctionAlive.forEach(i=>T.strats[i].pop=T.strats[i].pop/totalAlive*T.POP);
          T.extinctionCountdown=50;
          if(cntEl)cntEl.textContent=`EXTINCTION dans 50`;
        }
      }
      if(T.modifiers.includes("propaganda") && T.gen > 10){
          const sorted = [...Array(T.N).keys()].filter(i=>T.strats[i].pop>0).sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
          if(sorted.length >= 4) {
             const leader = sorted[0];
             const bottoms = sorted.slice(-3); 
             bottoms.forEach(b => {
                 let stole = T.strats[b].pop * 0.05; 
                 T.strats[b].pop -= stole;
                 T.strats[leader].pop += stole;
             });
          }
      }
      
      if(T.eol.includes("rechauffement")){
          if(T.gen % 10 === 0) T.tempSeuil += 0.005; 
          document.getElementById("temp-val").textContent = (T.tempSeuil*100).toFixed(1) + "%";
          document.getElementById("temp-fill").style.width = Math.min(100, T.tempSeuil*200) + "%"; 
          
          T.strats.forEach((s,i) => {
              if(s.pop > 0 && s.pop / T.POP < T.tempSeuil) {
                  s.pop = 0;
                  addEvt("ek", `🔥 <b>${s.name}</b> a brûlé (sous le seuil de ${Math.round(T.tempSeuil*100)}%)`);
                  spawnElimination(i);
              }
          });
      }
      
      if(T.eol.includes("tsunami")){
        T.tsunamiCountdown--;
        const tc=document.getElementById("tsunami-countdown");
        const tw=document.getElementById("tsunami-wave-num");
        if(tc)tc.textContent=T.tsunamiCountdown;
        if(T.tsunamiCountdown<=0){
          const alive=[...Array(T.N).keys()].filter(i=>T.strats[i].pop>0);
          const sorted=[...alive].sort((a,b)=>T.strats[a].pop-T.strats[b].pop);
          const nSwap=Math.max(1,Math.floor(alive.length*0.15));
          const victims=sorted.slice(0,nSwap);
          victims.forEach(i=>{
            const pool=T.tsunamiPool;
            if(!pool.length){T.tsunamiPool=[...ALL_STRATS.filter(s=>!T.strats.map(x=>x.sid).includes(s.sid))];if(!T.tsunamiPool.length)return;}
            const newDef=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
            const oldName=T.strats[i].name;
            T.tsunamiElims.push({wave:T.tsunamiWave+1,idx:i,oldSid:T.strats[i].sid,newSid:newDef.sid,gen:T.gen});
            T.strats[i]={...newDef,idx:i,pop:T.POP/T.N*0.4,isMe:false,st:{},coopRate:0.5,peakPop:T.POP/T.N*0.4,totalScore:0,matchCount:0};
            T.tsunamiEntries.push({wave:T.tsunamiWave+1,idx:i,gen:T.gen});
            addEvt("ea",`🌊 <b>${newDef.e} ${newDef.name}</b> débarque ! Remplace ${oldName}`);
            spawnParticles&&spawnParticles(canvas?.offsetWidth/2||200,canvas?.offsetHeight*0.4||100,newDef.color||"#00e5c8",15,"burst");
          });
          T.tsunamiWave++;
          T.milestones.push({gen:T.gen,txt:`🌊 Vague ${T.tsunamiWave} — ${nSwap} nouveau(x) challenger(s)`,type:"lead"});
          if(tw)tw.textContent=T.tsunamiWave;
          T.tsunamiCountdown=60;
          if(tc)tc.textContent="60";
        }
      }
      if(T.modifiers.includes("coalition") && T.gen>0 && T.gen%30===0){
        updateCoalitions();
      }
      if(T.modifiers.includes("coevo") && T.gen>0){
        T.coevoCountdown--;
        const cc=document.getElementById("coevo-countdown");if(cc)cc.textContent=T.coevoCountdown;
        if(T.coevoCountdown<=0){
          T.coevoCountdown=55+Math.floor(Math.random()*25);
          const sorted=[...T.strats].sort((a,b)=>a.pop-b.pop);
          const weak=sorted.slice(0,2);
          const strong=sorted.slice(-3);
          weak.forEach(ws=>{
            const donor=strong[Math.floor(Math.random()*strong.length)];
            if(ws===donor)return;
            const origFn=donor.fn;
            const mutRate=0.12+Math.random()*0.28;
            ws.fn=function(h,r,st,sp,gp){
              const base=origFn.call(this,h,r,st,sp,gp);
              return Math.random()<mutRate?(base==="coop"?"betray":"coop"):base;
            };
            ws._mutRate=mutRate;ws._mutParent=donor.idx;
            T.coevoMutRates[ws.idx]=mutRate;
            T.coevoLineage.push({gen:T.gen,who:ws.idx,from:donor.idx,rate:mutRate});
            const mc=document.getElementById("coevo-mut-count");if(mc)mc.textContent=T.coevoLineage.length;
            addEvt("ek2",`🧬 ${ws.e} ${ws.name} mute → copie de ${donor.e} ${donor.name} (err. ${Math.round(mutRate*100)}%)`);
            triggerComment(`Mutation de ${ws.name} depuis ${donor.name}`,"","phoenix");
          });
        }
      }
      if(T.modifiers.includes("civilisation") && T.gen>0){
        T.civUpdateIn--;
        if(T.civUpdateIn<=0){
          T.civUpdateIn=25+Math.floor(Math.random()*15);
          updateCivilisation();
        }
      }
      if(T.structure==="observatoire" && T.obsArenas){
        tickObservatoire();
      }
      if(T.worldEventsEnabled && T.gen>0){
        T.worldEventNext--;
        if(T.worldEventNext<=0){
          const overlay=document.getElementById("world-event-overlay");
          if(!overlay||overlay.style.display==="none"){
            const ev=pickWorldEvent();
            fireWorldEvent(ev,currentPay);
          }
          T.worldEventNext=120+Math.floor(Math.random()*100);
        }
        if(T.worldEventActive){
          T.worldEventActive.remaining--;
          if(T.worldEventActive.remaining<=0){
            if(T.worldEventPayMod){currentPay=T.worldEventPayMod.original;T.worldEventPayMod=null;}
            T.worldEventActive=null;
          }
        }
      }
      T.sparkSampleIn--;
      if(T.sparkSampleIn<=0){
        T.sparkSampleIn=5;
        T.strats.forEach((s,i)=>{
          if(!T.sparkHistory[i])T.sparkHistory[i]=[];
          T.sparkHistory[i].push(s.pop);
          if(T.sparkHistory[i].length>40)T.sparkHistory[i].shift();
        });
      }
      T.rivalryCheckIn--;
      if(T.rivalryCheckIn<=0){
        T.rivalryCheckIn=15;
        updateRivalries();
      }
      T.chronicleChapterIn--;
      if(T.chronicleChapterIn<=0){
        T.chronicleChapterIn=180+Math.floor(Math.random()*80);
        autoChronicleChapter();
      }
      T.gen++;
    }
    const cr=T.genTotalMoves>0?T.genCoopMoves/T.genTotalMoves:0.5;
    T.coopHistory.push(cr);
    if(T.gen%10===0)checkMilestones();
    const gs=getGroups();
    T.history.push({groups:gs.map(g=>({idxs:[...g],pops:g.map(i=>T.strats[i].pop)}))});
    renderDirty=true;
    scheduleRender();
    let stop=false;
    if(T.condType==="gen"){stop=T.gen>=T.condVal;}
    else{
      const gs2=getGroups();
      stop=gs2.length>0&&gs2.every(g=>{
        if(!g.length)return true;
        const pops=g.map(i=>T.strats[i].pop);
        const tot=pops.reduce((a,x)=>a+x,0)||1;
        return Math.max(...pops)/tot*100>=T.condVal;
      });
    }
    
    if(T.gen>=HARD_CAP)stop=true;
    if(T.eol.includes("survival")){const alive=[...Array(T.N).keys()].filter(i=>T.survHP[i]>0);if(alive.length<=1)stop=true;}
    if(T.eol.includes("royale")){const alive=[...Array(T.N).keys()].filter(i=>T.strats[i].pop>0.5);if(alive.length<=1)stop=true;}
    if(T.eol.includes("extinction")){if(T.extinctionAlive.length<=1)stop=true;}
    if(T.eol.includes("tsunami")){const alive=[...Array(T.N).keys()].filter(i=>T.strats[i].pop>0);if(alive.length<=1)stop=true;}
    
    if(T.worldEventActive){
      const rem=T.worldEventActive.remaining;
      const ev=WORLD_EVENTS.find(e=>e.id===T.worldEventActive.type);
      const seEl=document.getElementById("sb-event");
      if(seEl&&ev)seEl.textContent=`${ev.icon} ${ev.title} (${rem}g)`;
    }
    
    if(T.modifiers.includes("invasion")){
      const meIdx=[...Array(T.N).keys()].find(i=>T.strats[i].isMe);
      if(meIdx!==undefined&&T.strats[meIdx].pop/T.POP<0.005)stop=true;
    }
    
    if(stop){
      if(rafId!==null){cancelAnimationFrame(rafId);rafId=null;}
      clearInterval(T.interval);T.interval=null;
      drawChart();drawCoopChart();renderSide();updateRanking();
      endPhase(phase);
    }
  },T.spdVal);
}
function endPhase(phase){
  let grank;
  
  if(T.structure==="duel" || T.structure==="duel2"){
    const wbWinners=[],wbLosers=[];
    T.duelPairs.forEach(pair=>{
      const [a,b]=pair;
      if(b<0){wbWinners.push(a);return;}
      const winner=T.strats[a].pop>=T.strats[b].pop?a:b;
      const loser=winner===a?b:a;
      wbWinners.push(winner);wbLosers.push(loser);
      T.duelResults.push({round:T.duelRound,a,b,winner,loser});
      addEvt("ek2",`⚔️ <b>${T.strats[winner].name}</b> bat <b>${T.strats[loser].name}</b>`);
    });
    if(T.structure==="duel"){
      T.duelElim.unshift(...wbLosers.reverse());
    } else {
      const lbWinners=[],lbLosers=[];
      T.duelLBPairs.forEach(pair=>{
        const [a,b]=pair;
        if(b<0){lbWinners.push(a);return;}
        const winner=T.strats[a].pop>=T.strats[b].pop?a:b;
        const loser=winner===a?b:a;
        lbWinners.push(winner);lbLosers.push(loser);
        T.duelLBResults.push({round:T.duelRound,a,b,winner,loser});
        addEvt("ek",`💀 <b>${T.strats[loser].name}</b> éliminé (2 défaites)`);
      });
      T.duelElim.unshift(...lbLosers.reverse());
      const newLBPool=[...lbWinners,...wbLosers];
      T.duelLBPairs=[];
      for(let i=0;i<newLBPool.length-1;i+=2)T.duelLBPairs.push([newLBPool[i],newLBPool[i+1]]);
      if(newLBPool.length%2===1)T.duelLBPairs.push([newLBPool[newLBPool.length-1],-1]);
    }
    T.duelPairs=[];
    for(let i=0;i<wbWinners.length-1;i+=2)T.duelPairs.push([wbWinners[i],wbWinners[i+1]]);
    if(wbWinners.length%2===1)T.duelPairs.push([wbWinners[wbWinners.length-1],-1]);
    T.duelRound++;
    const remaining=wbWinners.concat(T.duelLBPairs?.flatMap(p=>p.filter(x=>x>=0))||[]);
    grank=[...remaining,...T.duelElim];
    const totalActive=T.duelPairs.filter(p=>p[1]>=0).length+(T.structure==="duel2"?T.duelLBPairs.filter(p=>p[1]>=0).length:0);
    if(totalActive===0){
      const winner=wbWinners[0]??T.duelLBPairs[0]?.[0];
      if(winner!==undefined)grank=[winner,...T.duelElim.filter(x=>x!==winner)];
      const PTMAP=getPtMap(T.N);
      const phPts=Array(T.N).fill(0);
      grank.forEach((idx,r)=>{const pt=PTMAP[r]||0;T.points[idx]+=pt;phPts[idx]=pt;});
      T.phasePoints.push(phPts);updatePtsTable();
      T.finalRanking=[...Array(T.N).keys()].sort((a,b)=>T.points[b]-T.points[a]);
      showFinal();return;
    }
    renderSide();
    T.phase=phase+1;
    setSt("wait",`Round ${T.duelRound-1} terminé — cliquez ▶`);
    document.getElementById("btn-next").style.display="";
    document.getElementById("pbadge").style.display="none";
    return;
  }
  
  if(T.structure==="bracket"){
    T.bracket[phase].forEach(g=>{
      g.ranked=[...g.group].sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
      g.done=true;
    });
    grank=interleave(T.bracket[phase]);
    buildNextBracket(phase);
    renderSide();
  } else if(T.eol.includes("survival")){
    const alive=[...Array(T.N).keys()].filter(i=>T.survHP[i]>0).sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
    const dead=[...Array(T.N).keys()].filter(i=>T.survHP[i]<=0);
    grank=[...alive,...dead];
  } else if(T.modifiers.includes("koh") || T.modifiers.includes("gauntlet")){
    grank=T.modifiers.includes("koh")
      ?[...Array(T.N).keys()].sort((a,b)=>T.kohPts[b]-T.kohPts[a])
      :[T.kohKing,...[...Array(T.N).keys()].filter(i=>i!==T.kohKing).sort((a,b)=>T.strats[b].pop-T.strats[a].pop)];
  } else if(T.eol.includes("royale")){
    const alive=[...Array(T.N).keys()].filter(i=>T.strats[i].pop>0.5).sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
    grank=[...alive,...T.royaleElims.slice().reverse()];
  } else {
    grank=[...Array(T.N).keys()].sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
  }
  const noPts=["bracket","duel","duel2"].includes(T.structure);
  if(!noPts){
    const PTMAP=getPtMap(T.N);
    const phPts=Array(T.N).fill(0);
    grank.forEach((idx,r)=>{const pt=PTMAP[r]||0;T.points[idx]+=pt;phPts[idx]=pt;});
    if(T.eol.includes("royale")) grank.forEach((idx,r)=>{if(T.points[idx]===phPts[idx])T.points[idx]=PTMAP[r]||0;});
    T.phasePoints.push(phPts);
    updatePtsTable();
    document.getElementById("pts-main").style.display="";
  }
  if(phase<T.maxPhases-1){
    T.phase=phase+1;
    if(T.modifiers.includes("koh")){T.kohPts=Array(T.N).fill(0);}
    setSt("wait",`Manche ${phase+1} terminée — cliquez ▶`);
    document.getElementById("btn-next").style.display="";
    document.getElementById("pbadge").style.display="none";
  } else {
    if(T.modifiers.includes("koh")) T.finalRanking=[...Array(T.N).keys()].sort((a,b)=>T.kohPts[b]-T.kohPts[a]);
    else if(T.structure==="bracket") T.finalRanking=buildBracketRanking();
    else T.finalRanking=[...Array(T.N).keys()].sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
    const weO=document.getElementById("world-event-overlay");if(weO){clearTimeout(worldEventOverlayTimeout);weO.style.display="none";}
    showFinal();
  }
}
function getGroups(){
  const {structure, eol, modifiers, phase, N, bracket} = T;
  if(structure==="bracket") return (bracket[phase]||[]).map(g=>g.group).filter(g=>g.length>0);
  if(eol.includes("survival")) return [[...Array(N).keys()].filter(i=>T.survHP[i]>0)];
  if(eol.includes("royale")) return [[...Array(N).keys()].filter(i=>T.strats[i].pop>0.5)];
  if(eol.includes("extinction")) return [T.extinctionAlive.filter(i=>T.strats[i].pop>0)];
  if(eol.includes("tsunami") || modifiers.includes("coalition")) return [[...Array(N).keys()].filter(i=>T.strats[i].pop>0)];
  if(structure==="duel" || structure==="duel2"){
    const groups=T.duelPairs.filter(p=>p[0]>=0).map(p=>p[1]>=0?[p[0],p[1]]:[p[0]]);
    if(structure==="duel2" && T.duelLBPairs.length>0){
      T.duelLBPairs.filter(p=>p[0]>=0&&p[1]>=0).forEach(p=>groups.push([p[0],p[1]]));
    }
    return groups;
  }
  return [[...Array(N).keys()]];
}
function simGroup(idxs,pay){
  const ss=idxs.map(i=>T.strats[i]);
  if(ss.length<2)return;
  ss.forEach(s=>{s.st.ml="coop";});
  const fit=new Float64Array(ss.length);
  const totalAll=T.strats.reduce((a,x)=>a+x.pop,0)||1;
  
 
  let activePay=pay;
  if(T.matrix==="eco" && T.coopHistory.length>0){
    const cr=T.coopHistory[T.coopHistory.length-1];
    const boost=cr>0.7?Math.min(1.6,1+(cr-0.7)*3):1;
    const rboost=cr<0.3?Math.min(1.5,1+(0.3-cr)*2.5):1;
    activePay={...pay,
      T:pay.T*boost, R:pay.R*rboost, P:pay.P, S:pay.S,
      coop:{coop:[pay.R*rboost,pay.R*rboost],betray:[pay.S,pay.T*boost]},
      betray:{coop:[pay.T*boost,pay.S],betray:[pay.P,pay.P]}
    };
    T.ecoT=activePay.T; T.ecoR=activePay.R;
    const infoEl=document.getElementById("eco-info");
    if(infoEl)infoEl.textContent=`Coop ${(cr*100).toFixed(0)}% · T=${activePay.T.toFixed(1)} R=${activePay.R.toFixed(1)}`;
  }
  for(let i=0;i<ss.length;i++){
    for(let j=0;j<ss.length;j++){
      if(i===j)continue;
      let score=playMatch(ss[i],ss[j],activePay);
      if(T.modifiers.includes("diplomacy") && T.diploLeader>=0){
        const isLeaderA=idxs[i]===T.diploLeader,isLeaderB=idxs[j]===T.diploLeader;
        if(!isLeaderA&&!isLeaderB)score+=0.4;
        if(isLeaderA)score-=0.2;
      }
      if(T.modifiers.includes("vendetta") && T.vendettaMatrix){
        const gi=idxs[i],gj=idxs[j];
        const bRate=1-ss[j].coopRate;
        T.vendettaMatrix[gi][gj]+=bRate*0.02;
        T.vendettaMatrix[gi][gj]=Math.min(T.vendettaMatrix[gi][gj],1.5);
        score-=T.vendettaMatrix[gj][gi]*0.15;
      }
      if(T.modifiers.includes("epidemie") && T.epidemicAggro){
        const gi=idxs[i];
        const aggroMod=T.epidemicAggro[gi];
        score+=aggroMod*0.1*(ss[j].coopRate>0.5?1:-0.5);
      }
      fit[i]+=score;
    }
    if(ss.length>1)fit[i]/=(ss.length-1);
    
    if(T.modifiers.includes("mirror")){
      const selfClone={...ss[i],st:{},coopRate:ss[i].coopRate};
      const selfScore=playMatch(ss[i],selfClone,activePay);
      fit[i]=fit[i]*0.7+selfScore*0.3;
    }
    if(T.modifiers.includes("coalition") && T.coalitions.length>0){
      const myCoal=T.coalitions.find(c=>c.includes(idxs[i]));
      if(myCoal){
        let allyScore=0,allyCount=0;
        ss.forEach((s2,j)=>{if(i!==j&&myCoal.includes(idxs[j])){allyScore+=playMatch(ss[i],s2,activePay);allyCount++;}});
        if(allyCount>0)fit[i]=fit[i]*0.75+(allyScore/allyCount)*0.25;
      }
    }
    if(T.modifiers.includes("civilisation") && T.civFactions){
      const myFac=T.civFactions.find(f=>f.members.includes(idxs[i]));
      if(myFac){
        let allyScore=0,allyCount=0;
        ss.forEach((s2,j)=>{if(i!==j&&myFac.members.includes(idxs[j])){allyScore+=fit[j];allyCount++;}});
        if(allyCount>0)fit[i]=fit[i]*0.82+(allyScore/allyCount)*0.18;
        ss.forEach((_,j)=>{
          if(i===j)return;
          const oppFac=T.civFactions.find(f=>f.members.includes(idxs[j]));
          if(oppFac&&myFac.id!==oppFac.id){
            const atWar=T.civWars.some(w=>(w[0]===myFac.id&&w[1]===oppFac.id)||(w[1]===myFac.id&&w[0]===oppFac.id));
            if(atWar)fit[i]*=0.87;
            const allied=T.civAlliances.some(a=>(a[0]===myFac.id&&a[1]===oppFac.id)||(a[1]===myFac.id&&a[0]===oppFac.id));
            if(allied)fit[i]*=1.10;
          }
        });
      }
    }
  }
  if(T.modifiers.includes("epidemie") && T.epidemicAggro){
    ss.forEach((s,i)=>{
      const gi=idxs[i];
      const betrayalRate=1-s.coopRate;
      if(betrayalRate>0.6&&Math.random()<0.4){
        ss.forEach((_,j)=>{if(j!==i&&Math.random()<0.3)T.epidemicAggro[idxs[j]]=Math.min(1,T.epidemicAggro[idxs[j]]+0.15);});
      }
      T.epidemicAggro[gi]*=0.97;
    });
    const avgAggro=(T.epidemicAggro.reduce((a,x)=>a+x,0)/T.N).toFixed(2);
    const infoEl=document.getElementById("epidemie-info");
    if(infoEl)infoEl.textContent=`Agression moy: ${avgAggro}`;
  }
  if(T.modifiers.includes("vendetta") && T.vendettaMatrix){
    let maxGrudge=0,mostHatedIdx=0;
    for(let i=0;i<T.N;i++){
      const totalRancune=T.vendettaMatrix.reduce((s,row)=>s+row[i],0);
      if(totalRancune>maxGrudge){maxGrudge=totalRancune;mostHatedIdx=i;}
    }
    const infoEl=document.getElementById("vendetta-info");
    if(infoEl&&T.strats[mostHatedIdx])infoEl.textContent=`Plus détesté: ${T.strats[mostHatedIdx].e}${T.strats[mostHatedIdx].name}`;
  }
  const tot=ss.reduce((a,x)=>a+x.pop,0)||1;
  const avg=ss.reduce((a,x,i)=>a+fit[i]*x.pop,0)/tot;
  ss.forEach((s,i)=>{
    let np=s.pop*(1+T.ALPHA*(fit[i]-avg));
    if(T.DRIFT>0)np+=(Math.random()*2-1)*T.DRIFT*tot*0.5;
    s.pop=Math.max(0.2,np);
  });
  const sum=ss.reduce((a,x)=>a+x.pop,0)||1;
  ss.forEach(s=>{s.pop=s.pop/sum*T.POP;if(s.pop>s.peakPop)s.peakPop=s.pop;});
  if(T.eol.includes("survival")){
    ss.forEach((s,i)=>{
      if(s.pop/T.POP<0.05){
        T.survHP[idxs[i]]=Math.max(0,(T.survHP[idxs[i]]||1)-0.016);
        if(T.survHP[idxs[i]]<=0&&!T.events.some(e=>e.includes(s.name)&&e.includes("éliminé")))
          addEvt("ek",`💀 <b>${s.name}</b> éliminé !`);
      }
    });
  }
  if(T.modifiers.includes("koh") || T.modifiers.includes("gauntlet")){
    const alive=[...Array(T.N).keys()].filter(i=>T.strats[i].pop>0.5);
    if(alive.length>0){
      const sorted=alive.sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
      const lidx=sorted[0];
      if(lidx===T.kohKing){T.kohReign++;if(T.kohReign>T.kohBest){T.kohBest=T.kohReign;T.kohBestWho=T.kohKing;}}
      else{if(T.gen>5)addEvt("ek2",`👑 <b>${T.strats[lidx].name}</b> prend le trône !`);T.kohKing=lidx;T.kohReign=1;}
      if(T.modifiers.includes("koh")){
        [4,2,1].forEach((pts,rank)=>{if(sorted[rank]!==undefined)T.kohPts[sorted[rank]]+=pts;});
      }
    }
    const ki=document.getElementById("kohKing");if(ki&&T.strats[T.kohKing])ki.textContent=`${T.strats[T.kohKing].e} ${T.strats[T.kohKing].name} · ${T.kohReign}g`;
  }
  if(T.modifiers.includes("diplomacy")){
    const allIdxs=[...Array(T.N).keys()];
    const dominant=allIdxs.reduce((b,i)=>T.strats[i].pop>T.strats[b].pop?i:b,allIdxs[0]);
    const pct=T.strats[dominant].pop/totalAll;
    if(pct>0.4){
      if(T.diploLeader!==dominant){
        addEvt("ea",`🤝 Coalition vs <b>${T.strats[dominant].name}</b> ! (${(pct*100).toFixed(0)}%)`);
        T.diploLeader=dominant;
        const diEl=document.getElementById("diplo-info");if(diEl)diEl.textContent=`Coalition vs ${T.strats[dominant].name}`;
      }
    } else {
      if(T.diploLeader>=0){addEvt("ec","Alliance dissoute");}
      T.diploLeader=-1;
      const diEl=document.getElementById("diplo-info");if(diEl)diEl.textContent="";
    }
  }
  if(T.modifiers.includes("invasion")){
    const me=[...Array(T.N).keys()].find(i=>T.strats[i].isMe);
    if(me!==undefined){
      const mePct=T.strats[me].pop/totalAll;
      const invEl=document.getElementById("invasion-pct");
      if(invEl)invEl.textContent=`${(mePct*100).toFixed(1)}% colonisé`;
      if(mePct>=0.5&&!T.invasionSuccess){
        T.invasionSuccess=true;addEvt("ek2","🦠 Invasion réussie ! Colonie établie !");
      } else if(mePct<0.01&&T.gen>20){
        addEvt("ek","🦠 Invasion échouée. Stratège éradiqué.");
      }
    }
  }
}
function playMatch(A,B,pay){
  A.st.ml=A.st.ml||"coop";B.st.ml=B.st.ml||"coop";
  let hA=[],hB=[],scA=0,coopsA=0,coopsB=0;
  const gp=T.POP;
  for(let i=0;i<T.RMATCH;i++){
    let a=A.fn(hB,i,A.st,A.pop,gp);
    let b=B.fn(hA,i,B.st,B.pop,gp);
    a=nMove(a);b=nMove(b);
    scA+=pay[a][b][0];
    if(a==="coop")coopsA++;
    if(b==="coop")coopsB++;
    hA.push(a);hB.push(b);
  }
  T.genCoopMoves+=coopsA+coopsB;
  T.genTotalMoves+=T.RMATCH*2;
  A.coopRate=A.coopRate*0.92+coopsA/T.RMATCH*0.08;
  B.coopRate=B.coopRate*0.92+coopsB/T.RMATCH*0.08;
  
  if(Math.random()<0.025){
    T.liveMatch={An:A.name,Ae:A.e,Ac:A.color,Bn:B.name,Be:B.e,Bc:B.color,
      ma:hA.slice(-18),mb:hB.slice(-18),sa:coopsA/T.RMATCH,sb:coopsB/T.RMATCH};
  }
  
  if(T.heatmapMatrix&&A.idx!==undefined&&B.idx!==undefined){
    T.heatmapMatrix[A.idx][B.idx]=(T.heatmapMatrix[A.idx][B.idx]*(T.heatmapCount[A.idx][B.idx])+scA/T.RMATCH)/(T.heatmapCount[A.idx][B.idx]+1);
    T.heatmapCount[A.idx][B.idx]++;
  }
  return scA/T.RMATCH;
}
function nMove(m){return T.NOISE>0&&Math.random()<T.NOISE?(m==="coop"?"betray":"coop"):m;}

function mkMatrix(boostT=1.0){
  const R=1.4+Math.random()*1.8,Tv=(R+0.6+Math.random()*2)*boostT,P=0.1+Math.random()*1.0,S=Math.random()*0.6;
  return{R,T:Tv,P,S,coop:{coop:[R,R],betray:[S,Tv]},betray:{coop:[Tv,S],betray:[P,P]}};
}
function interleave(groups){
  const maxL=Math.max(...groups.map(g=>g.ranked?.length||0));
  const res=[];
  for(let i=0;i<maxL;i++)groups.forEach(g=>{if(g.ranked&&i<g.ranked.length)res.push(g.ranked[i]);});
  return res;
}
function buildNextBracket(phase){
  if(!T.bracket)return;
  const N=T.N;
  const next=[];
  if(phase===0){
    
    const r=T.bracket[0][0].ranked;
    const half=Math.ceil(N/2);
    next.push({group:r.slice(0,half),done:false,ranked:[],track:"winners"});
    if(r.length>half)next.push({group:r.slice(half),done:false,ranked:[],track:"consolation"});
  } else {
    T.bracket[phase].forEach(g=>{
      const half=Math.ceil(g.ranked.length/2);
      const top=g.ranked.slice(0,half);
      const bot=g.ranked.slice(half);
      if(top.length>0){
        if(g.track==="winners"||g.track==="all"){
          next.push({group:top,done:false,ranked:[],track:"winners"});
          
          if(bot.length>0)next.push({group:bot,done:false,ranked:[],track:"consolation"});
        } else {
          
          next.push({group:top,done:false,ranked:[],track:"consolation"});
          if(bot.length>0)T.consolElim.push(...bot.reverse());
        }
      }
    });
    
    const winGroups=next.filter(g=>g.track==="winners");
    const consPlayers=next.filter(g=>g.track==="consolation").flatMap(g=>g.group);
    T.bracket[phase+1]=[...winGroups];
    if(consPlayers.length>1)T.bracket[phase+1].push({group:consPlayers,done:false,ranked:[],track:"consolation"});
    return;
  }
  T.bracket[phase+1]=next;
}
function buildBracketRanking(){
  
  const allPhases=T.bracket.filter(r=>r.length);
  const lastPhase=allPhases[allPhases.length-1]||[];
  const winPhase=lastPhase.filter(g=>g.track==="winners");
  const consPhase=lastPhase.filter(g=>g.track==="consolation");
  const winRanked=interleave(winPhase.length?winPhase:lastPhase);
  const consRanked=interleave(consPhase);
  const eliminated=T.consolElim||[];
  
  const combined=[...winRanked,...consRanked.filter(x=>!winRanked.includes(x)),...eliminated.filter(x=>!winRanked.includes(x)&&!consRanked.includes(x))];
  
  [...Array(T.N).keys()].forEach(i=>{if(!combined.includes(i))combined.push(i);});
  return combined;
}
function updateCoalitions(){
  if(!T||T.N<2)return;
  const allIdxs=[...Array(T.N).keys()].filter(i=>T.strats[i].pop>0);
  
  const factions=[];
  const assigned=new Set();
  const sorted=[...allIdxs].sort((a,b)=>(T.strats[b].coopRate||0.5)-(T.strats[a].coopRate||0.5));
  for(const i of sorted){
    if(assigned.has(i))continue;
    const faction=[i];assigned.add(i);
    for(const j of sorted){
      if(assigned.has(j))continue;
      if(Math.abs((T.strats[i].coopRate||0.5)-(T.strats[j].coopRate||0.5))<0.22){
        faction.push(j);assigned.add(j);
      }
    }
    factions.push(faction);
  }
  T.coalitions=factions;
  
  T.coalitionWars=[];
  for(let a=0;a<factions.length;a++){
    for(let b=a+1;b<factions.length;b++){
      const crA=factions[a].reduce((s,i)=>s+(T.strats[i].coopRate||0.5),0)/factions[a].length;
      const crB=factions[b].reduce((s,i)=>s+(T.strats[i].coopRate||0.5),0)/factions[b].length;
      if(Math.abs(crA-crB)>0.45){
        T.coalitionWars.push([a,b]);
        if(Math.random()<0.3)addEvt("ek",`⚔️ Guerre déclarée ! Faction coopératrice vs traîtres !`);
      }
    }
  }
  
  const infoEl=document.getElementById("coalition-info");
  if(infoEl)infoEl.textContent=`${factions.length} faction${factions.length>1?"s":""} · ${T.coalitionWars.length} guerre${T.coalitionWars.length>1?"s":""}`;
}
function checkRoyaleElim(){
  if(!T.eol.includes("royale") || T.gen===0 || T.gen%60!==0) return;
  const alive=[...Array(T.N).keys()].filter(i=>T.strats[i].pop>0.5);
  if(alive.length<=1) return;
  const loser=alive.reduce((b,i)=>T.strats[i].pop<T.strats[b].pop?i:b,alive[0]);
  T.strats[loser].pop=0;
  T.royaleElims.push(loser);
  addEvt("ek",`💥 <b>${T.strats[loser].name}</b> éliminé ! (${alive.length-1} restants)`);
  const ptmap=getPtMap(T.N);
  T.points[loser]+=(ptmap[T.N-T.royaleElims.length]||0);
}
function checkMilestones(){
  if(!T||T.history.length<2)return;
  const allIdxs=[...Array(T.N).keys()];
  const total=T.strats.reduce((s,x)=>s+x.pop,0)||1;
  
  const leader=allIdxs.reduce((b,i)=>T.strats[i].pop>T.strats[b].pop?i:b,0);
  if(leader!==T.lastLeader&&T.gen>5){
    T.milestones.push({gen:T.gen,txt:`👑 ${T.strats[leader].name} prend la tête !`,type:"lead"});
    T.lastLeader=leader;
  }
  
  allIdxs.forEach(i=>{
    const pct=T.strats[i].pop/total;
    if(pct>0.7){
      const key=`dom_${i}`;
      if(!T[key]){T[key]=true;addEvt("ek2",`☢️ <b>${T.strats[i].name}</b> DOMINE ! (${(pct*100).toFixed(0)}%)`);
      T.milestones.push({gen:T.gen,txt:`☢️ ${T.strats[i].name} domine à ${(pct*100).toFixed(0)}%`,type:"dom"});}
    } else {if(T[`dom_${i}`])delete T[`dom_${i}`];}
  });
  
  if(T.history.length>30){
    const old=T.history[T.history.length-30];
    allIdxs.forEach(i=>{
      let oldPct=0,newPct=T.strats[i].pop/total;
      old.groups.forEach(g=>{const pos=g.idxs.indexOf(i);if(pos>=0){const t=g.pops.reduce((a,x)=>a+x,0)||1;oldPct=g.pops[pos]/t;}});
      if(oldPct<0.05&&newPct>0.20){
        const key=`ph_${i}`;
        if(!T[key]){T[key]=true;addEvt("ea",`🦅 <b>${T.strats[i].name}</b> résurrection ! (${(oldPct*100).toFixed(0)}% → ${(newPct*100).toFixed(0)}%)`);
        T.milestones.push({gen:T.gen,txt:`🦅 ${T.strats[i].name} résurrection spectaculaire !`,type:"phoenix"});}
      } else {if(T[`ph_${i}`]&&newPct<0.1)delete T[`ph_${i}`];}
    });
  }
  
  if(T.N>=2&&T.gen%20===0){
    const sorted2=[...allIdxs].sort((a,b)=>T.strats[b].pop-T.strats[a].pop);
    const p0=T.strats[sorted2[0]].pop/total,p1=T.strats[sorted2[1]].pop/total;
    if(p0-p1<0.03&&p0>0.2){
      const key=`rival_${sorted2[0]}_${sorted2[1]}`;
      if(!T[key]){T[key]=true;addEvt("ea",`⚡ RIVALITÉ INTENSE ! <b>${T.strats[sorted2[0]].name}</b> vs <b>${T.strats[sorted2[1]].name}</b>`);
      T.milestones.push({gen:T.gen,txt:`⚡ Rivalité : ${T.strats[sorted2[0]].name} vs ${T.strats[sorted2[1]].name} (${(p0*100).toFixed(0)}% / ${(p1*100).toFixed(0)}%)`,type:"rivalry"});}
    } else {
      const key=`rival_${sorted2[0]}_${sorted2[1]}`;if(T[key])delete T[key];
    }
  }
  
  if(T.coopHistory.length>10){
    const cr=T.coopHistory[T.coopHistory.length-1];
    const crOld=T.coopHistory[T.coopHistory.length-10];
    if(crOld>0.6&&cr<0.35){
      const key="coopcr";
      if(!T[key]){T[key]=true;addEvt("ek",`📉 Effondrement coopératif ! Coop: ${(cr*100).toFixed(0)}%`);
      T.milestones.push({gen:T.gen,txt:`📉 Effondrement coopératif (${(crOld*100).toFixed(0)}%→${(cr*100).toFixed(0)}%)`,type:"collapse"});}
    } else if(cr>0.6){delete T["coopcr"];}
  }
  
  if(T.coopHistory.length>10){
    const cr=T.coopHistory[T.coopHistory.length-1];
    const crOld=T.coopHistory[T.coopHistory.length-10];
    if(crOld<0.35&&cr>0.65){
      const key="cooprise";
      if(!T[key]){T[key]=true;addEvt("ea",`🕊 Réconciliation générale ! Coop: ${(cr*100).toFixed(0)}%`);
      T.milestones.push({gen:T.gen,txt:`🕊 Réconciliation soudaine (${(crOld*100).toFixed(0)}%→${(cr*100).toFixed(0)}%)`,type:"phoenix"});}
    } else if(cr<0.5){delete T["cooprise"];}
  }
}
function checkMutation(){
  const total=T.strats.reduce((s,x)=>s+x.pop,0)||1;
  const candidates=[...Array(T.N).keys()].filter(i=>T.strats[i].pop/total<0.03);
  if(!candidates.length)return;
  const weakIdx=candidates.reduce((b,i)=>T.strats[i].pop<T.strats[b].pop?i:b,candidates[0]);
  const orig=T.strats[weakIdx];
  const noiseAdd=0.05+Math.random()*0.2;
  const forgive=Math.random()<0.5;
  const origFn=orig.fn;
  const mutant={...orig,name:orig.name.replace("*","")+"*",sid:orig.sid+"_m"+T.mutCount,
    fn:(h,r,st,sp,gp)=>{
      const base=origFn(h,r,st,sp,gp);
      if(Math.random()<noiseAdd)return base==="coop"?"betray":"coop";
      if(forgive&&base==="betray"&&Math.random()<0.25)return "coop";
      return base;
    }
  };
  T.strats[weakIdx]=mutant;T.mutCount++;
  T.mutHistory.push({gen:T.gen,orig:orig.name,mutant:mutant.name});
  addEvt("ea",`🧬 <b>${orig.name}</b> mute → <b>${mutant.name}</b>`);
  const mc=document.getElementById("mut-count");if(mc)mc.textContent=`${T.mutCount} mutation${T.mutCount>1?"s":""}`;
  updateLegend();
}
function checkCampaignSuccess(){
  const winner=T?.strats?.[T?.finalRanking?.[0]];
  if(!activeMission)return;
  const camp=loadCampaign();let success=false;
  const cond=activeMission.condition;
  if(cond.type==="winner"&&winner)success=true;
  if(cond.type==="winner_sid"&&winner?.sid===cond.value)success=true;
  if(cond.type==="top3"&&T.finalRanking.slice(0,3).some(i=>T.strats[i]?.isMe))success=true;
  if(cond.type==="invasion"&&T.invasionSuccess)success=true;
  if(success&&!camp[activeMission.id]){
    saveCampaignProgress(activeMission.id);buildMissionGrid();
    const toast=document.getElementById("ach-toast");
    if(toast){toast.innerHTML=`🎖 Mission accomplie ! <b>${activeMission.name}</b>`;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),4000);}
    playSoundEvent("win");activeMission=null;
  }
}
function addEvt(cls,txt){
  T.events.unshift(txt);if(T.events.length>20)T.events.pop();
  const el=document.getElementById("evts");if(!el)return;
  const d=document.createElement("div");d.className=`evt ${cls}`;d.innerHTML=txt;
  el.prepend(d);while(el.children.length>10)el.removeChild(el.lastChild);
}
function autoChronicleChapter(){
  if(!T)return;
  const idx=T.chronicleChapters.length;
  const name=CHAPTER_NAMES[idx%CHAPTER_NAMES.length];
  T.chronicleChapters.push({title:`Chapitre ${idx+1} : ${name}`,gen:T.gen});
  addChronicle(`Début du ${name.toLowerCase()}.`,"default",true);
}
function addChronicle(text,type="default",isChapter=false){
  if(!T||!T.chronicle)return;
  const chapterIdx=(T.chronicleChapters.length||1)-1;
  T.chronicle.push({gen:T.gen||0,text,type,chapterIdx,isChapter});
  
  if(T.chronicle.length>80)T.chronicle.shift();
}
function updateRivalries(){
  if(!T||T.N<2)return;
  const sorted=[...T.strats].sort((a,b)=>b.pop-a.pop);
  const top1=sorted[0].idx,top2=sorted[1]?.idx;
  if(top1===undefined||top2===undefined)return;
  const key=`${Math.min(top1,top2)}_${Math.max(top1,top2)}`;
  if(T.rivalryMap[key]!==undefined){
    const rv=T.rivalries[T.rivalryMap[key]];
    
    if(rv.lastLeader!==undefined&&rv.lastLeader!==top1){
      rv.swaps++;
      
      if(rv.swaps===3){
        addEvt("ea",`⚔️ <b>RIVALITÉ DÉCLARÉE</b> — ${T.strats[rv.a].e}${T.strats[rv.a].name} vs ${T.strats[rv.b].e}${T.strats[rv.b].name} : « ${rv.name} »`);
        triggerComment(`Rivalité : ${rv.name}`,"","dom");
      }
    }
    rv.lastLeader=top1;
    rv.totalGens=(T.gen-rv.gen0);
    if(top1===rv.a)rv.winA++;else rv.winB++;
  } else {
    
    const rv={a:top1,b:top2,name:getRivalryName(T.strats[top1],T.strats[top2]),
      swaps:0,lastLeader:top1,gen0:T.gen,totalGens:0,winA:1,winB:0};
    T.rivalryMap[key]=T.rivalries.length;
    T.rivalries.push(rv);
  }
}
function initTerritoire(){
  const N=T.N,side=Math.max(8,Math.round(Math.sqrt(N*12)));
  T.terrSize=side;
  const grid=[];
  for(let r=0;r<side;r++){grid.push([]);
    for(let c=0;c<side;c++){
      const z=Math.floor(r/side*Math.ceil(Math.sqrt(N)))*Math.ceil(Math.sqrt(N))+Math.floor(c/side*Math.ceil(Math.sqrt(N)));
      grid[r].push(Math.min(z,N-1));
    }
  }
  T.terrGrid=grid;
}
function terrStep(pay){
  const S=T.terrSize;if(!S||!T.terrGrid)return;
  const grid=T.terrGrid;
  const scores=Array.from({length:S},()=>new Float64Array(S));
  const dirs=[[-1,0],[1,0],[0,-1],[0,1]];
  for(let r=0;r<S;r++)for(let c=0;c<S;c++){
    const me=T.strats[grid[r][c]];let sc=0,cnt=0;
    dirs.forEach(([dr,dc])=>{const nr=r+dr,nc=c+dc;if(nr<0||nr>=S||nc<0||nc>=S)return;sc+=playMatch(me,T.strats[grid[nr][nc]],pay);cnt++;});
    scores[r][c]=cnt>0?sc/cnt:0;
  }
  const newGrid=grid.map(row=>[...row]);
  for(let r=0;r<S;r++)for(let c=0;c<S;c++){
    let bestScore=scores[r][c],bestIdx=grid[r][c];
    dirs.forEach(([dr,dc])=>{const nr=r+dr,nc=c+dc;if(nr<0||nr>=S||nc<0||nc>=S)return;if(scores[nr][nc]>bestScore){bestScore=scores[nr][nc];bestIdx=grid[nr][nc];}});
    newGrid[r][c]=bestIdx;
  }
  T.terrGrid=newGrid;
  const counts=new Float64Array(T.N);
  newGrid.forEach(row=>row.forEach(idx=>counts[idx]++));
  const total=S*S;
  T.strats.forEach((s,i)=>{s.pop=counts[i]/total*T.POP;});
}
function initReseau(){
  
  T.graph = [];
  for(let i=0; i<T.N; i++) T.graph[i] = new Set();
  
  
  for(let i=0; i<T.N; i++){
    T.graph[i].add((i+1)%T.N);
    T.graph[(i+1)%T.N].add(i);
  }
  
  for(let i=0; i<T.N; i++){
    if(Math.random()<0.3) {
      let target = Math.floor(Math.random()*T.N);
      if(target !== i) {
        T.graph[i].add(target);
        T.graph[target].add(i);
      }
    }
  }
  
  T.graph = T.graph.map(set => Array.from(set));
}
function reseauStep(pay){
  const N = T.N;
  const scores = new Float64Array(N);
  
  
  for(let i=0; i<N; i++){
    let sc = 0;
    let neighbors = T.graph[i];
    neighbors.forEach(n => {
      let localPay = pay;
      
      if(T.matrix === "quantique"){
          localPay = mkMatrix(1.0); 
      }
      sc += playMatch(T.strats[i], T.strats[n], localPay);
    });
    scores[i] = neighbors.length > 0 ? sc / neighbors.length : 0;
  }
  
  
  const avgScore = scores.reduce((a,b)=>a+b, 0) / N;
  const totalPop = T.strats.reduce((a,x)=>a+x.pop, 0) || 1;
  
  T.strats.forEach((s,i) => {
    
    let np = s.pop * (1 + T.ALPHA * (scores[i] - avgScore));
    
    if(T.DRIFT > 0) np += (Math.random() * 2 - 1) * T.DRIFT * totalPop * 0.5;
    s.pop = Math.max(0.2, np);
  });
  
  
  const newTotal = T.strats.reduce((a,x)=>a+x.pop, 0) || 1;
  T.strats.forEach(s => { 
    s.pop = (s.pop / newTotal) * T.POP; 
    if(s.pop > s.peakPop) s.peakPop = s.pop; 
  });
}
function updateCivilisation(){
  if(!T.civFactions)return;
  
  T.civFactions.forEach(f=>{
    f.score=f.members.reduce((s,i)=>s+(T.strats[i]?.pop||0),0)/T.POP*100;
    f.coopRate=f.members.length>0?f.members.reduce((s,i)=>s+(T.strats[i]?.coopRate||0.5),0)/f.members.length:0.5;
  });
  const total=T.civFactions.reduce((s,f)=>s+f.score,0)||100;
  
  T.civFactions.forEach(f=>{
    const target=f.score/total*100;
    f.territory=f.territory*0.85+target*0.15;
  });
  
  const tTotal=T.civFactions.reduce((s,f)=>s+f.territory,0);
  T.civFactions.forEach(f=>f.territory=f.territory/tTotal*100);
  
  T.civWars=[];T.civAlliances=[];
  for(let i=0;i<T.civFactions.length;i++){
    for(let j=i+1;j<T.civFactions.length;j++){
      const diff=Math.abs(T.civFactions[i].coopRate-T.civFactions[j].coopRate);
      const terrDiff=Math.abs(T.civFactions[i].territory-T.civFactions[j].territory);
      if(diff>0.30&&terrDiff>8){
        T.civWars.push([T.civFactions[i].id,T.civFactions[j].id]);
        if(Math.random()<0.3)addEvt("ek",`⚔️ Guerre ! ${T.civFactions[i].icon} ${T.civFactions[i].name} vs ${T.civFactions[j].icon} ${T.civFactions[j].name}`);
      } else if(diff<0.12){
        T.civAlliances.push([T.civFactions[i].id,T.civFactions[j].id]);
      }
    }
  }
  
  const leader=T.civFactions.reduce((a,b)=>b.territory>a.territory?b:a);
  const ls=document.getElementById("civ-leader-span");
  if(ls)ls.textContent=`${leader.icon} ${leader.name} (${leader.territory.toFixed(0)}%)`;
  const ws=document.getElementById("civ-war-span");
  if(ws)ws.textContent=`${T.civWars.length} guerre(s)`;
  
  if(leader.territory>60){
    addEvt("ea",`🏛 VICTOIRE : ${leader.icon} ${leader.name} contrôle ${leader.territory.toFixed(0)}% du territoire !`);
    T.civFactions.forEach((f,fi)=>{
      f.members.forEach(i=>{T.points[i]+=(4-fi)*10;});
    });
  }
}
function tickObservatoire(){
  T.obsArenas.forEach(arena=>{
    arena.gen++;
    const strats=arena.strats;
    const N=strats.length;
    const fit=new Float64Array(N);
    const pay=arena.pay;
    
    for(let i=0;i<N;i++){
      for(let j=i+1;j<N;j++){
        const A=strats[i],B=strats[j];
        let scA=0,scB=0;
        const rmatch=Math.min(8,T.RMATCH);
        let hA=[],hB=[];
        for(let r=0;r<rmatch;r++){
          let a=A.fn(hB,r,A.st,A.pop,T.POP);
          let b=B.fn(hA,r,B.st,B.pop,T.POP);
          a=nMoveObs(a,arena.noise);b=nMoveObs(b,arena.noise);
          scA+=pay[a][b][0];scB+=pay[a][b][1];
          hA.push(a);hB.push(b);
        }
        fit[i]+=scA/rmatch;fit[j]+=scB/rmatch;
        A.coopRate=A.coopRate*0.92+hA.filter(x=>x==="coop").length/rmatch*0.08;
        B.coopRate=B.coopRate*0.92+hB.filter(x=>x==="coop").length/rmatch*0.08;
      }
    }
    
    const avgFit=fit.reduce((s,x)=>s+x,0)/N;
    strats.forEach((s,i)=>{
      s.pop=Math.max(0.5,s.pop*(1+arena.alpha*(fit[i]-avgFit))+(Math.random()-0.5)*T.DRIFT*T.POP*0.5);
    });
    const totalPop=strats.reduce((s,x)=>s+x.pop,0);
    strats.forEach(s=>s.pop=s.pop/totalPop*T.POP);
    
    const ldr=strats.reduce((b,s)=>s.pop>b.pop?s:b,strats[0]);
    arena.leader=ldr.idx;
    if(arena.gen%10===0){
      arena.coopHistory.push(strats.reduce((s,x)=>s+x.coopRate,0)/N);
      if(arena.coopHistory.length>40)arena.coopHistory.shift();
    }
  });
  T.obsGens++;
  
  const wins=new Array(T.N).fill(0);
  T.obsArenas.forEach(a=>wins[a.leader]++);
  T.obsWins=wins;
  
  const metaLeader=wins.indexOf(Math.max(...wins));
  const ml=document.getElementById("obs-meta-leader");
  if(ml&&T.strats[metaLeader])ml.textContent=`${T.strats[metaLeader].e} ${T.strats[metaLeader].name}`;
}
function loadAch(){try{return JSON.parse(localStorage.getItem("axelrod_ach")||"{}");}catch{return {};}}
function saveAch(a){try{localStorage.setItem("axelrod_ach",JSON.stringify(a));}catch{}}
function unlockAch(id){
  const ach=loadAch();if(ach[id])return;
  ach[id]=Date.now();saveAch(ach);
  const def=ACHIEVEMENTS.find(a=>a.id===id);if(!def)return;
  const toast=document.getElementById("ach-toast");
  if(toast){toast.innerHTML=`${def.icon} Achievement débloqué ! <b>${def.name}</b>`;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),3500);}
  updateAchCount();playSoundEvent("dom");
  spawnDomination(0);
}
function checkAchievements(){
  if(!T)return;
  const total=T.strats.reduce((s,x)=>s+x.pop,0)||1;
  const winner=T.strats[T.finalRanking?.[0]];
  if(T.royaleElims?.length>0||T.survHP?.some(h=>h<=0))unlockAch("first_blood");
  if(winner?.sid.includes("custom"))unlockAch("custom_win");
  if(winner?.sid.includes("_mut"))unlockAch("mutation_win");
  if(T.matrix==="goat")unlockAch("goat_win");
  if(T.invasionSuccess)unlockAch("invasion_ok");
  if(T.milestones?.some(m=>m.type==="phoenix"))unlockAch("phoenix");
  if(T.milestones?.some(m=>m.type==="collapse"))unlockAch("collapse");
  if(T.milestones?.some(m=>m.type==="dom"))unlockAch("domination");
  const avgCoop=T.coopHistory.reduce((a,b)=>a+b,0)/(T.coopHistory.length||1);
  if(avgCoop>0.8)unlockAch("coop80");
  const minCoop=Math.min(...(T.coopHistory.length?T.coopHistory:[1]));
  if(minCoop<0.1)unlockAch("collapse");
  const allIdxs=[...Array(T.N).keys()];
  const maxPop=Math.max(...allIdxs.map(i=>T.strats[i].pop/total));
  if(maxPop>0.9)unlockAch("domination");
  if(winner?.tag?.toLowerCase().includes("coop")||winner?.name.includes("Pacifiste")||winner?.name.includes("AllC"))unlockAch("allc_win");
  if(winner?.name.includes("AllD")||winner?.name.includes("Despote")||winner?.name.includes("Implacable"))unlockAch("alld_win");
  
  const camps=loadCampaign();if(Object.keys(camps).length>=6)unlockAch("campaign_end");
}
function loadCampaign(){try{return JSON.parse(localStorage.getItem("axelrod_campaign")||"{}");}catch{return {};}}
function saveCampaignProgress(id){const c=loadCampaign();c[id]=Date.now();try{localStorage.setItem("axelrod_campaign",JSON.stringify(c));}catch{}}
function loadELO(){try{return JSON.parse(localStorage.getItem("axelrod_elo")||"{}");}catch{return{};}}
function saveELO(elo){try{localStorage.setItem("axelrod_elo",JSON.stringify(elo));}catch{}}
function updateELO(ranking){
  const elo=loadELO();
  const K=24;
  ranking.forEach((idx,rank)=>{
    const sid=T.strats[idx]?.sid;if(!sid)return;
    if(!elo[sid]){elo[sid]={rating:1200,games:0,wins:0,sid,name:T.strats[idx].name,e:T.strats[idx].e};}
    elo[sid].games++;
    if(rank===0)elo[sid].wins++;
    
    ranking.forEach((opp,oppRank)=>{
      if(opp===idx)return;
      const oppSid=T.strats[opp]?.sid;if(!oppSid)return;
      if(!elo[oppSid]){elo[oppSid]={rating:1200,games:0,wins:0,sid:oppSid,name:T.strats[opp].name,e:T.strats[opp].e};}
      const ea=1/(1+Math.pow(10,(elo[oppSid].rating-elo[sid].rating)/400));
      const sa=rank<oppRank?1:rank===oppRank?0.5:0;
      elo[sid].rating=Math.max(800,Math.round(elo[sid].rating+K*(sa-ea)));
    });
  });
  saveELO(elo);
}
function loadHOF(){try{return JSON.parse(localStorage.getItem("axelrod_hof")||"[]");}catch{return[];}}
function saveHOF(h){try{localStorage.setItem("axelrod_hof",JSON.stringify(h));}catch{}}
function recordHOF(){
  if(!T||!T.finalRanking?.length)return;
  const winner=T.strats[T.finalRanking[0]];if(!winner)return;
  const score=T.points[T.finalRanking[0]]||Math.round(winner.pop/T.POP*100);
  
  
  const sName = CONFIG_STRUCTURE.find(m=>m.id===T.structure)?.name || "Sandbox";
  const mName = CONFIG_MATRIX.find(m=>m.id===T.matrix)?.name || "Standard";
  
  const entry={
    name:winner.name,emoji:winner.e,color:winner.color,score,
    mode: `${sName} + ${mName}`, 
    N:T.N,gen:T.gen,
    avgCoop:T.coopHistory.length?Math.round(T.coopHistory.reduce((a,b)=>a+b,0)/T.coopHistory.length*100):0,
    date:new Date().toLocaleDateString("fr-FR")
  };
  const hof=loadHOF();
  hof.push(entry);
  hof.sort((a,b)=>b.score-a.score);
  saveHOF(hof.slice(0,10));
}
function clearHOF(){saveHOF([]);openHOF();}
function exportResults(){
  if(!T)return;
  const data={
    version:"v17_sandbox",date:new Date().toISOString(),
    
    structure:T.structure, matrix:T.matrix, eol:T.eol, modifiers:T.modifiers,
    N:T.N,generations:T.gen,
    matrixPayoffs:{T:T.pendingPayoff.T, R:T.pendingPayoff.R, P:T.pendingPayoff.P, S:T.pendingPayoff.S},
    finalRanking:(T.finalRanking||[]).map(i=>{
      const s=T.strats[i];
      return{rank:[...T.finalRanking].indexOf(i)+1,name:s.name,emoji:s.e,
        points:T.points[i]||0,coopRate:Math.round((s.coopRate||0.5)*100),
        finalPop:Math.round(s.pop/T.POP*100)};
    }),
    coopHistory:T.coopHistory.map(x=>Math.round(x*100)),
    milestones:(T.milestones||[]).map(m=>({gen:m.gen,type:m.type,txt:m.txt.replace(/<[^>]*>/g,"")})),
    params:{alpha:T.ALPHA,noise:T.NOISE,drift:T.DRIFT,pop:T.POP,rmatch:T.RMATCH}
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`axelrod_sandbox_${new Date().toISOString().slice(0,10)}.json`;
  a.click();URL.revokeObjectURL(url);
}

  
