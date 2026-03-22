'use strict';
/* ============================================================
   A. CONSTANTS & SKILL DATA
============================================================ */
const TOTAL_SP = 16, SMIN = 1, SMAX = 5;
const BASE_KP = 9, SKILL_N = 4, KVMIN = 1, KVMAX = 5;
const MAX_PL = 8, MIN_PL = 2, MAX_TURNS = 30;
const GAS_START = 15, GAS_SHRINK = 5, GAS_PCT = 0.1;
const AUTO_MOVE = 3;

const SK = {
  '이동 공격':  {
    cat:'공격', icon:'⚡',
    lv:[{dash:5,dmg:2,sp:0},{dash:8,dmg:3,sp:0},{dash:10,dmg:4,sp:3},
        {dash:13,dmg:5,sp:5},{dash:15,dmg:7,sp:7}],
    cap:s=>({dash:s.agi*3, dmg:s.str*2})
  },
  '근거리 공격':{
    cat:'공격', icon:'🗡️',
    lv:[{r:3,dmg:3},{r:4,dmg:5},{r:5,dmg:6},{r:7,dmg:8},{r:10,dmg:11}],
    cap:s=>({r:s.str*2, dmg:s.str*2+1})
  },
  '원거리 공격':{
    cat:'공격', icon:'🏹',
    lv:[{rng:10,dmg:2,sp:0},{rng:14,dmg:3,sp:0},{rng:18,dmg:4,sp:3},
        {rng:22,dmg:5,sp:5},{rng:9999,dmg:7,sp:7}],
    cap:s=>({rng:s.agi*4, dmg:s.str*2})
  },
  '데미지 감소':{
    cat:'방어', icon:'🛡️',
    lv:[{red:2},{red:4},{red:6},{red:8},{red:10}],
    cap:s=>({red:s.hp_stat*2})
  },
  '이펙트 파괴':{
    cat:'방어', icon:'💫',
    lv:[{r:5,cnt:1},{r:8,cnt:1},{r:12,cnt:2},{r:15,cnt:3},{r:20,cnt:99}],
    cap:s=>({r:s.agi*3})
  },
  '회복':{
    cat:'특수', icon:'💚',
    lv:[{hp:3},{hp:6},{hp:9},{hp:12},{hp:15}],
    cap:s=>({hp:s.int*3})
  },
  '회피':{
    cat:'특수', icon:'💨',
    lv:[{prob:20,mv:5},{prob:30,mv:7},{prob:40,mv:10},{prob:55,mv:12},{prob:70,mv:15}],
    cap:s=>({prob:s.luk*15, mv:s.agi*3})
  }
};
const SK_NAMES = Object.keys(SK);

function skData(name, lv, stats) {
  const s = SK[name]; if (!s) return {};
  const base = {...s.lv[lv-1]};
  const caps = s.cap(stats);
  for (const [k,v] of Object.entries(caps)) if (base[k]!==undefined) base[k]=Math.min(base[k],v);
  return base;
}

function skDesc(name, lv, stats) {
  const d = skData(name, lv, stats);
  switch(name) {
    case '이동 공격':  return `돌진 ${d.dash} | 피해 ${d.dmg}${lv>=3?' | 범위R'+d.sp:''}${lv===5?' | 밀어내기':''}`;
    case '근거리 공격': return `반경 ${d.r} | 피해 ${d.dmg}${lv>=3?' | 전체 타격':''}${lv===5?' | 넉백':''}`;
    case '원거리 공격': return `사거리 ${lv===5?'∞':d.rng} | 피해 ${d.dmg}${lv>=3?' | 범위R'+d.sp:''}${lv===5?' | 관통':''}`;
    case '데미지 감소': return `감소량 ${d.red}${lv===5?' | 다음턴+5':''}`;
    case '이펙트 파괴': return `반경 ${d.r} | ${lv===5?'전부':d.cnt+'개'} 차단${lv===5?' | 반사50%':''}`;
    case '회복':       return `회복 ${d.hp}${lv===5?' | 다음턴+5':''}`;
    case '회피':       return `확률 ${d.prob}% | 이동 ${d.mv}${lv===5?' | 잔상':''}`;
    default: return '';
  }
}

/* ── UTILS ── */
const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
const dir  = (a,b) => { const d=dist(a,b); return d<.001?{x:1,y:0}:{x:(b.x-a.x)/d,y:(b.y-a.y)/d}; };
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const rnd   = (a,b)   => Math.floor(Math.random()*(b-a+1))+a;
function wRand(w) { let r=Math.random()*w.reduce((a,b)=>a+b,0); for(let i=0;i<w.length;i++){r-=w[i];if(r<=0)return i;} return w.length-1; }
const arenaR = n => n<=2?50:n<=4?70:n<=6?90:110;
function startPos(n,R) { return Array.from({length:n},(_,i)=>{ const a=(2*Math.PI*i/n)-Math.PI/2; return {x:Math.cos(a)*R*.75,y:Math.sin(a)*R*.75}; }); }
const maxHP = hp => hp*20;
const skPts = i  => BASE_KP+i;
function skProbs(pri, luk) { return pri.map((_,i)=>Math.max(5,25+[luk*3,luk*1,-luk*1,-luk*3][i])); }

const COLORS = ['#ff4d6d','#7b5ea7','#2ec4b6','#f4a261','#56cfe1','#c77dff','#95d5b2','#f9c74f'];

/* ── STORAGE ── */
const Stor = {
  g(k,d){ try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;} },
  s(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch{} },
  chars()   { return this.g('bs_chars',[]); },
  saveC(l)  { this.s('bs_chars',l); },
  records() { return this.g('bs_recs',[]); },
  addRec(r) { const a=this.records(); a.unshift(r); if(a.length>50)a.pop(); this.s('bs_recs',a); }
};

/* ── TOAST ── */
function toast(msg) {
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},2200);
}

/* ── SCREENS ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('s-'+id).classList.add('active');
}
function goMain()    { showScreen('main'); }
function goCreate()  { CharCreator.open(); showScreen('create'); }
function goLobby()   { if(typeof BattleRenderer!=='undefined'&&BattleRenderer.autoTimer){clearInterval(BattleRenderer.autoTimer);BattleRenderer.autoTimer=null;} Lobby.render(); showScreen('lobby'); }
function goRecords() { Records.render(); showScreen('records'); }

/* ============================================================
   B. CHARACTER CREATOR
============================================================ */
const CharCreator = {
  d: null,

  open(existing) {
    this.d = existing
      ? JSON.parse(JSON.stringify(existing))
      : { name:'Player', stats:{hp_stat:3,str:3,agi:4,luk:3,int:3},
          skills:[{name:'근거리 공격',lv:3},{name:'이동 공격',lv:3},{name:'데미지 감소',lv:2},{name:'회복',lv:2}],
          priority:[0,1,2,3] };
    document.getElementById('char-name').value = this.d.name;
    this.render();
  },

  usedSP()  { return Object.values(this.d.stats).reduce((a,b)=>a+b,0); },
  remSP()   { return TOTAL_SP - this.usedSP(); },
  totalKP() { return skPts(this.d.stats.int); },
  usedKP()  { return this.d.skills.reduce((a,s)=>a+s.lv,0); },
  remKP()   { return this.totalKP() - this.usedKP(); },

  setStat(k, v) {
    v = clamp(v, SMIN, SMAX);
    const diff = v - this.d.stats[k];
    if (diff > 0 && this.remSP() < diff) return;
    this.d.stats[k] = v;
    this.render();
  },
  setSkName(i, n) { this.d.skills[i].name = n; this.render(); },
  setSkLv(i, v) {
    v = clamp(v, KVMIN, KVMAX);
    const diff = v - this.d.skills[i].lv;
    if (diff > 0 && this.remKP() < diff) return;
    this.d.skills[i].lv = v;
    this.render();
  },
  setPri(rank, idx) {
    const old = this.d.priority.indexOf(idx);
    const dis = this.d.priority[rank];
    this.d.priority[rank] = idx;
    if (old >= 0) this.d.priority[old] = dis;
    this.render();
  },

  render() { this.rStats(); this.rSkills(); this.rPri(); },

  rStats() {
    const DEFS = [['hp_stat','체력'],['str','힘'],['agi','민첩'],['luk','운'],['int','지능']];
    const g = document.getElementById('stat-grid');
    g.innerHTML = '';
    DEFS.forEach(([k,lbl]) => {
      const v = this.d.stats[k];
      const row = document.createElement('div');
      row.className = 'stat-row';
      row.innerHTML =
        `<span class="stat-lbl">${lbl}</span>
         <div class="stat-controls">
           <button class="stat-btn" onclick="CharCreator.setStat('${k}',${v-1})">−</button>
           <div class="pips">${[1,2,3,4,5].map(i=>`<div class="pip${v>=i?' on':''}" onclick="CharCreator.setStat('${k}',${i})"></div>`).join('')}</div>
           <button class="stat-btn" onclick="CharCreator.setStat('${k}',${v+1})">+</button>
           <span class="stat-num">${v}</span>
         </div>`;
      g.appendChild(row);
    });
    const rem = this.remSP();
    const b = document.getElementById('stat-pts');
    b.textContent = `남은 ${rem} / 16`;
    b.className = 'badge' + (rem===0?' ok':rem<0?' over':'');
    const s = this.d.stats;
    document.getElementById('stat-summary').innerHTML =
      `<b>HP</b> ${maxHP(s.hp_stat)} &nbsp;<b>공격+</b>${s.str-1} &nbsp;<b>치명타</b>${s.luk*5}% &nbsp;<b>AGI</b>${s.agi} &nbsp;<b>스킬PT</b>${this.totalKP()}`;
    // skill pts badge도 갱신
    const sk = document.getElementById('skill-pts');
    if(sk){ const r=this.remKP(); sk.textContent=`남은 ${r} / ${this.totalKP()}`; sk.className='badge'+(r===0?' ok':r<0?' over':''); }
  },

  rSkills() {
    const c = document.getElementById('skill-slots');
    c.innerHTML = '';
    const rem = this.remKP();
    const b = document.getElementById('skill-pts');
    b.textContent = `남은 ${rem} / ${this.totalKP()}`;
    b.className = 'badge' + (rem===0?' ok':rem<0?' over':'');
    this.d.skills.forEach((sk,i) => {
      const desc = skDesc(sk.name, sk.lv, this.d.stats);
      const div = document.createElement('div');
      div.className = 'skill-card';
      div.innerHTML =
        `<div class="skill-card-head">
           <span class="skill-num">스킬 ${i+1}</span>
           <select class="sk-select" onchange="CharCreator.setSkName(${i},this.value)">
             ${SK_NAMES.map(n=>`<option value="${n}"${n===sk.name?' selected':''}>${SK[n].icon} ${n}</option>`).join('')}
           </select>
           <span class="sk-cat">${SK[sk.name]?.cat||''}</span>
         </div>
         <div class="skill-card-lv">
           <span class="sk-lv-lbl">Lv</span>
           <div class="pips">${[1,2,3,4,5].map(j=>`<div class="pip sk${sk.lv>=j?' on':''}" onclick="CharCreator.setSkLv(${i},${j})"></div>`).join('')}</div>
           <button class="stat-btn" onclick="CharCreator.setSkLv(${i},${sk.lv-1})">−</button>
           <span class="sk-lv-num">${sk.lv}</span>
           <button class="stat-btn" onclick="CharCreator.setSkLv(${i},${sk.lv+1})">+</button>
         </div>
         <div class="skill-desc">${desc}</div>`;
      c.appendChild(div);
    });
  },

  rPri() {
    const c = document.getElementById('priority-list');
    c.innerHTML = '';
    const probs = skProbs(this.d.priority, this.d.stats.luk);
    ['1순위','2순위','3순위','4순위'].forEach((lbl,rank) => {
      const idx = this.d.priority[rank];
      const sk  = this.d.skills[idx];
      const div = document.createElement('div');
      div.className = 'priority-row';
      div.innerHTML =
        `<span class="pri-rank">${lbl}</span>
         <select class="sk-select" onchange="CharCreator.setPri(${rank},parseInt(this.value))">
           ${this.d.skills.map((s,j)=>`<option value="${j}"${j===idx?' selected':''}>${SK[s.name]?.icon||'?'} 스킬${j+1} ${s.name}</option>`).join('')}
         </select>
         <span class="pri-prob">${probs[rank]}%</span>`;
      c.appendChild(div);
    });
  },

  save() {
    const name = (document.getElementById('char-name').value||'').trim() || 'Player';
    if (this.remSP() !== 0) { showErrMsg(`스탯 포인트를 모두 사용하세요 (남은: ${this.remSP()})`); return; }
    if (this.remKP() < 0)   { showErrMsg('스킬 포인트 초과!'); return; }
    this.d.name = name;
    const list = Stor.chars();
    const ei = list.findIndex(c=>c.name===name);
    if (ei>=0) list[ei]={...this.d}; else list.push({...this.d});
    Stor.saveC(list);
    toast(`"${name}" 저장!`);
    Lobby.addPlayerChar(this.d);
    goLobby();
  }
};

function showErrMsg(m) {
  const el=document.getElementById('create-msg');
  if(!el)return; el.textContent=m; setTimeout(()=>{el.textContent='';},3000);
}

/* ============================================================
   C. LOBBY
============================================================ */
const AI_PRE = [
  {name:'AI-닌자',    stats:{hp_stat:1,str:2,agi:5,luk:5,int:3}, skills:[{name:'회피',lv:5},{name:'원거리 공격',lv:3},{name:'이동 공격',lv:2},{name:'회복',lv:2}], priority:[0,1,2,3]},
  {name:'AI-파이터', stats:{hp_stat:3,str:5,agi:4,luk:3,int:1}, skills:[{name:'근거리 공격',lv:4},{name:'이동 공격',lv:3},{name:'근거리 공격',lv:2},{name:'데미지 감소',lv:1}], priority:[0,1,2,3]},
  {name:'AI-탱커',   stats:{hp_stat:5,str:3,agi:1,luk:2,int:5}, skills:[{name:'데미지 감소',lv:5},{name:'회복',lv:5},{name:'근거리 공격',lv:3},{name:'데미지 감소',lv:1}], priority:[0,1,2,3]},
  {name:'AI-저격수', stats:{hp_stat:2,str:4,agi:5,luk:2,int:3}, skills:[{name:'원거리 공격',lv:5},{name:'원거리 공격',lv:3},{name:'회피',lv:2},{name:'이펙트 파괴',lv:2}], priority:[0,1,2,3]},
  {name:'AI-마법사', stats:{hp_stat:2,str:2,agi:3,luk:3,int:5}, skills:[{name:'원거리 공격',lv:4},{name:'회복',lv:5},{name:'이펙트 파괴',lv:3},{name:'회피',lv:2}], priority:[0,1,2,3]},
  {name:'AI-광전사', stats:{hp_stat:4,str:5,agi:3,luk:3,int:1}, skills:[{name:'이동 공격',lv:4},{name:'근거리 공격',lv:3},{name:'이동 공격',lv:2},{name:'데미지 감소',lv:1}], priority:[0,1,2,3]},
];

const Lobby = {
  slots: [],

  addPlayerChar(c) {
    // 같은 이름이면 교체, 아니면 첫 번째 플레이어 슬롯 교체 또는 추가
    const pi = this.slots.findIndex(s=>s.isPlayer && s.name===c.name);
    const clone = {...c, skills:c.skills.map(s=>({...s})), priority:[...c.priority], isPlayer:true};
    if (pi>=0) { this.slots[pi]=clone; return; }
    // 플레이어가 없으면 추가, 있으면 첫 플레이어 교체
    const fi = this.slots.findIndex(s=>s.isPlayer);
    if (fi>=0) this.slots[fi]=clone;
    else if (this.slots.length<MAX_PL) this.slots.push(clone);
  },

  render() {
    // 슬롯 비어있으면 저장 캐릭터로 초기화
    if (this.slots.length===0) {
      const chars = Stor.chars();
      if (chars.length>0) {
        const c=chars[0];
        this.slots=[{...c,skills:c.skills.map(s=>({...s})),priority:[...c.priority],isPlayer:true}];
      }
    }
    const list = document.getElementById('lobby-list');
    list.innerHTML='';
    document.getElementById('lobby-count').textContent=`${this.slots.length}/8`;
    for(let i=0;i<MAX_PL;i++){
      const div=document.createElement('div');
      if(i<this.slots.length){
        const c=this.slots[i], s=c.stats;
        div.className='lslot filled';
        div.innerHTML=
          `<span class="lslot-num" style="color:${COLORS[i]}">${i+1}</span>
           <div class="lslot-info">
             <div class="lslot-name">${c.name} <span class="badge ${c.isPlayer?'bp':'ba'}">${c.isPlayer?'PLAYER':'AI'}</span></div>
             <div class="lslot-stats">HP:${maxHP(s.hp_stat)} STR:${s.str} AGI:${s.agi} LUK:${s.luk} INT:${s.int}</div>
             <div class="lslot-skills">${c.skills.map(sk=>`${SK[sk.name]?.icon||'?'}${sk.name}Lv${sk.lv}`).join(' · ')}</div>
           </div>
           <div class="lslot-btns">
             ${c.isPlayer?`<button class="btn ghost sm" onclick="Lobby.edit(${i})">편집</button>`:''}
             <button class="btn danger sm" onclick="Lobby.remove(${i})">✕</button>
           </div>`;
      } else {
        div.className='lslot empty';
        div.innerHTML=`<span class="lslot-num" style="opacity:.25">${i+1}</span><span class="empty-txt">— 대기 중 —</span>`;
      }
      list.appendChild(div);
    }
    const can = this.slots.length>=MIN_PL;
    document.getElementById('btn-start').disabled = !can;
    document.getElementById('lobby-msg').textContent = can?'':'최소 2명 이상이어야 합니다';
  },

  addAI() {
    if(this.slots.length>=MAX_PL){toast('최대 8명');return;}
    const p=AI_PRE[this.slots.length%AI_PRE.length];
    this.slots.push({...p,skills:p.skills.map(s=>({...s})),priority:[...p.priority],isPlayer:false});
    this.render();
  },

  remove(i) { this.slots.splice(i,1); this.render(); },

  edit(i) {
    CharCreator.open(this.slots[i]);
    showScreen('create');
  },

  start() {
    if(this.slots.length<MIN_PL)return;
    BattleEngine.start(this.slots);
    showScreen('battle');
  },

  rematch() {
    this.render();
    showScreen('lobby');
  }
};

/* ============================================================
   D. BATTLE ENGINE
============================================================ */
const BattleEngine = {
  F:[],   // fighters
  turn:0, arenaR:0, curR:0,
  log:[], totalDmg:0,

  start(slots) {
    this.turn=0; this.log=[]; this.totalDmg=0;
    this.arenaR = arenaR(slots.length);
    this.curR   = this.arenaR;
    const pos = startPos(slots.length, this.arenaR);
    this.F = slots.map((c,i)=>({
      id:i, name:c.name, color:COLORS[i], isPlayer:c.isPlayer,
      stats:{...c.stats},
      skills:c.skills.map(s=>({...s})),
      priority:[...c.priority],
      hp:maxHP(c.stats.hp_stat), maxHp:maxHP(c.stats.hp_stat),
      x:pos[i].x, y:pos[i].y,
      alive:true, deathTurn:null, deathCause:'',
      shieldNow:0,   // 이번 턴 방어막
      shieldNext:0,  // 다음 턴 carry-over
      healNext:0,    // 다음 턴 회복
      dodgeChance:0, // 이번 턴 회피 확률
      evadeBonus:0,  // 잔상 보너스 (다음 턴)
      destroyReady:null, // 이펙트 파괴 준비
      movedThisTurn:false,
    }));
    BattleRenderer.init();
    this.pushLog('sys','⚔️ 전투 시작! ' + slots.length + '명 참가');
  },

  alive() { return this.F.filter(f=>f.alive); },

  isDone() {
    const a = this.alive().length;
    return a<=1 || this.turn>=MAX_TURNS;
  },

  doTurn() {
    if(this.isDone()){ this.endBattle(); return; }
    this.turn++;
    this.pushLog('sys',`━━━━ 턴 ${this.turn} ━━━━`);

    /* 1. 턴 시작 지속 효과 */
    this.alive().forEach(f=>{
      f.shieldNow  = f.shieldNext; f.shieldNext=0;
      f.destroyReady = null;
      f.movedThisTurn = false;
      f.dodgeChance = f.evadeBonus/100; f.evadeBonus=0;
      if(f.healNext>0){
        const h=Math.min(f.healNext, f.maxHp-f.hp);
        f.hp+=h;
        if(h>0) this.pushLog('heal',`  ${f.name} 지속 회복 +${h}`);
        f.healNext=0;
      }
    });

    /* 2. 스킬 선택 */
    this.alive().forEach(f=>{
      const probs = skProbs(f.priority, f.stats.luk);
      const rank  = wRand(probs);
      f._sk = f.skills[f.priority[rank]];
    });

    /* 3. 행동 순서 (AGI→LUK→랜덤) */
    const order = [...this.alive()].sort((a,b)=>{
      if(b.stats.agi!==a.stats.agi) return b.stats.agi-a.stats.agi;
      if(b.stats.luk!==a.stats.luk) return b.stats.luk-a.stats.luk;
      return Math.random()-.5;
    });

    /* 4. 스킬 실행 */
    order.forEach(f=>{ if(f.alive) this.execSkill(f, f._sk); });

    /* 5. 독가스 (턴 15+) */
    if(this.turn>=GAS_START){
      this.curR = Math.max(20, this.arenaR-(this.turn-GAS_START+1)*GAS_SHRINK);
      this.alive().forEach(f=>{
        this.clamp(f);
        if(Math.hypot(f.x,f.y)>this.curR){
          const d=Math.ceil(f.maxHp*GAS_PCT);
          f.hp=Math.max(0,f.hp-d); this.totalDmg+=d;
          this.pushLog('gas',`☠️ ${f.name} 독가스 -${d}`);
          if(f.hp<=0) this.kill(f,'독가스');
        }
      });
    }

    /* 6. 자동 접근 (이동 스킬 미사용자) */
    this.alive().forEach(f=>{
      if(!f.movedThisTurn){
        const en=this.alive().filter(e=>e.id!==f.id);
        if(!en.length)return;
        const near=en.reduce((a,b)=>dist(f,a)<dist(f,b)?a:b);
        const d=dir(f,near); f.x+=d.x*AUTO_MOVE; f.y+=d.y*AUTO_MOVE;
        this.clamp(f);
      }
    });

    BattleRenderer.renderTurn();
    if(this.isDone()) setTimeout(()=>this.endBattle(), 400);
  },

  execSkill(actor, sk) {
    if(!actor.alive||!sk)return;
    const {name,lv}=sk;
    const d=skData(name,lv,actor.stats);
    const icon=SK[name]?.icon||'';
    this.pushLog('action',`[${actor.name}] ${icon} ${name} Lv${lv}`);
    switch(name){
      case '이동 공격':  this.skDash(actor,lv,d); break;
      case '근거리 공격': this.skMelee(actor,lv,d); break;
      case '원거리 공격': this.skRanged(actor,lv,d); break;
      case '데미지 감소': this.skShield(actor,lv,d); break;
      case '이펙트 파괴': this.skDestroy(actor,lv,d); break;
      case '회복':       this.skHeal(actor,lv,d); break;
      case '회피':       this.skDodge(actor,lv,d); break;
    }
  },

  /* ---- 이동 공격 ---- */
  skDash(actor,lv,d){
    const en=this.alive().filter(f=>f.id!==actor.id);
    if(!en.length)return;
    const tgt=en.reduce((a,b)=>dist(actor,a)<dist(actor,b)?a:b);
    const mov=Math.min(d.dash, dist(actor,tgt));
    const dv=dir(actor,tgt);
    actor.x+=dv.x*mov; actor.y+=dv.y*mov; this.clamp(actor);
    actor.movedThisTurn=true;
    this.dealDmg(actor,tgt,d.dmg,'이동 공격');
    if(lv>=3&&d.sp>0)
      this.alive().filter(f=>f.id!==actor.id&&f.id!==tgt.id&&dist(actor,f)<=d.sp)
        .forEach(f=>this.dealDmg(actor,f,Math.floor(d.dmg*.7),'이동 공격(범위)'));
    if(lv===5){
      this.alive().filter(f=>f.id!==actor.id&&dist(actor,f)<=8).forEach(f=>{
        const pd=dir(actor,f); f.x+=pd.x*8; f.y+=pd.y*8; this.clamp(f);
      });
      this.pushLog('special','  └ 밀어내기!');
    }
  },

  /* ---- 근거리 공격 ---- */
  skMelee(actor,lv,d){
    let en=this.alive().filter(f=>f.id!==actor.id&&dist(actor,f)<=d.r);
    if(!en.length){
      // 범위 밖이면 가장 가까운 1명
      const near=this.alive().filter(f=>f.id!==actor.id);
      if(!near.length)return;
      const t=near.reduce((a,b)=>dist(actor,a)<dist(actor,b)?a:b);
      this.dealDmg(actor,t,d.dmg,'근거리 공격'); return;
    }
    if(lv<3){ const t=en.reduce((a,b)=>dist(actor,a)<dist(actor,b)?a:b); this.dealDmg(actor,t,d.dmg,'근거리 공격'); }
    else en.forEach(e=>this.dealDmg(actor,e,d.dmg,'근거리 공격'));
    if(lv===5){
      en.filter(e=>e.alive).forEach(e=>{
        const pd=dir(actor,e); e.x+=pd.x*10; e.y+=pd.y*10; this.clamp(e);
      });
      this.pushLog('special','  └ 넉백!');
    }
  },

  /* ---- 원거리 공격 ---- */
  skRanged(actor,lv,d){
    const en=this.alive().filter(f=>f.id!==actor.id);
    if(!en.length)return;
    const inRng=en.filter(e=>dist(actor,e)<=d.rng);
    if(!inRng.length){ this.pushLog('miss',`  └ 사거리 부족`); return; }
    const tgt=inRng.reduce((a,b)=>a.hp<b.hp?a:b);
    // 이펙트 파괴 체크 (타겟이 이미 발동했으면)
    if(tgt.destroyReady){
      const dr=tgt.destroyReady;
      if(dr.cnt>0&&dist(actor,tgt)<=dr.r){
        dr.cnt--;
        this.pushLog('defend',`  └ ${tgt.name}의 이펙트 파괴로 차단!`);
        if(dr.reflect) this.dealDmg(tgt,actor,Math.floor(d.dmg*.5),'이펙트 반사');
        return;
      }
    }
    this.dealDmg(actor,tgt,d.dmg,'원거리 공격');
    if(lv>=3&&d.sp>0)
      this.alive().filter(f=>f.id!==actor.id&&f.id!==tgt.id&&dist(tgt,f)<=d.sp)
        .forEach(f=>this.dealDmg(actor,f,Math.floor(d.dmg*.7),'원거리(범위)'));
    if(lv===5){
      const dv=dir(actor,tgt);
      this.alive().filter(f=>f.id!==actor.id&&f.id!==tgt.id).forEach(f=>{
        const dx=f.x-actor.x, dy=f.y-actor.y;
        const dot=dx*dv.x+dy*dv.y;
        if(dot>0&&Math.abs(dx*dv.y-dy*dv.x)<12)
          this.dealDmg(actor,f,Math.floor(d.dmg*.5),'원거리(관통)');
      });
    }
  },

  /* ---- 데미지 감소 ---- */
  skShield(actor,lv,d){
    actor.shieldNow=d.red;
    if(lv===5) actor.shieldNext=5;
    this.pushLog('defend',`  └ ${actor.name} 방어막 ${d.red} 활성화`);
  },

  /* ---- 이펙트 파괴 ---- */
  skDestroy(actor,lv,d){
    const cnt=SK['이펙트 파괴'].lv[lv-1].cnt;
    actor.destroyReady={r:d.r, cnt, reflect:lv===5};
    this.pushLog('defend',`  └ ${actor.name} 이펙트 파괴 준비 (R${d.r})`);
  },

  /* ---- 회복 ---- */
  skHeal(actor,lv,d){
    const prev=actor.hp;
    actor.hp=Math.min(actor.maxHp, actor.hp+d.hp);
    const actual=actor.hp-prev;
    if(lv===5) actor.healNext=5;
    this.pushLog('heal',`  └ ${actor.name} +${actual} 회복 (${actor.hp}/${actor.maxHp})`);
  },

  /* ---- 회피 ---- */
  skDodge(actor,lv,d){
    const en=this.alive().filter(f=>f.id!==actor.id);
    if(en.length){
      const near=en.reduce((a,b)=>dist(actor,a)<dist(actor,b)?a:b);
      const away=dir(near,actor);
      actor.x+=away.x*d.mv; actor.y+=away.y*d.mv; this.clamp(actor);
    }
    actor.movedThisTurn=true;
    actor.dodgeChance=Math.min(d.prob/100, 0.95);
    if(lv===5) actor.evadeBonus=10;
    this.pushLog('evade',`  └ ${actor.name} 회피 ${d.prob}% 이동 ${d.mv}`);
  },

  /* ---- 데미지 적용 ---- */
  dealDmg(attacker, target, base, skName){
    if(!target.alive)return 0;
    // 회피
    if(target.dodgeChance>0&&Math.random()<target.dodgeChance){
      this.pushLog('evade',`  └ ${target.name} 회피 성공! (${skName})`);
      return 0;
    }
    const crit=Math.random()<attacker.stats.luk*0.05;
    let dmg=base+(attacker.stats.str-1);
    if(crit) dmg=Math.floor(dmg*1.5);
    dmg=Math.max(1,dmg);
    // 방어막
    const blocked=Math.min(target.shieldNow, dmg);
    const final=Math.max(0,dmg-blocked);
    target.hp=Math.max(0,target.hp-final);
    this.totalDmg+=final;
    let msg=`  └ ${target.name}에게 ${final} 피해`;
    if(crit) msg+=' 💥치명타';
    if(blocked>0) msg+=` (방어 -${blocked})`;
    this.pushLog(crit?'crit':'dmg', msg);
    if(target.hp<=0&&target.alive) this.kill(target, skName);
    return final;
  },

  kill(f, cause){
    f.alive=false; f.deathTurn=this.turn; f.deathCause=cause;
    this.pushLog('death',`💀 ${f.name} 사망 (${cause})`);
  },

  clamp(f){
    const d=Math.hypot(f.x,f.y);
    if(d>this.curR){f.x=(f.x/d)*this.curR; f.y=(f.y/d)*this.curR;}
  },

  pushLog(type,msg){ this.log.push({type,msg}); if(this.log.length>300)this.log.shift(); },

  endBattle(){
    const alive=this.alive();
    if(alive.length===1) this.pushLog('sys',`🏆 ${alive[0].name} 승리!`);
    else this.pushLog('sys','⏱️ 전투 종료! HP 비율로 순위 결정');
    BattleRenderer.renderTurn();
    setTimeout(()=>Results.show(),800);
  }
};

/* ============================================================
   E. BATTLE RENDERER
============================================================ */
const BattleRenderer = {
  canvas:null, ctx:null, autoTimer:null,

  init(){
    this.canvas=document.getElementById('arena');
    this.ctx=this.canvas.getContext('2d');
    if(this.autoTimer){clearInterval(this.autoTimer);this.autoTimer=null;}
    document.getElementById('btn-auto').textContent='⏩ 자동';
    document.getElementById('battle-turn-lbl').textContent='턴 0';
    document.getElementById('battle-gas-lbl').textContent='';
    document.getElementById('battle-gas-lbl').classList.remove('on');
    document.getElementById('battle-log').innerHTML='';
    this.renderTurn();
  },

  renderTurn(){
    this.updateHP();
    this.drawArena();
    this.flushLog();
    document.getElementById('battle-turn-lbl').textContent=`턴 ${BattleEngine.turn}`;
    const gas=document.getElementById('battle-gas-lbl');
    if(BattleEngine.turn>=GAS_START){
      gas.textContent=`☠️ 독가스 R${BattleEngine.curR}`;
      gas.classList.add('on');
    }
  },

  updateHP(){
    document.getElementById('hp-panel').innerHTML=BattleEngine.F.map(f=>{
      const pct=Math.max(0,f.hp/f.maxHp*100);
      const c=pct>50?'#22c55e':pct>25?'#eab308':'#ef4444';
      return `<div class="hp-entry ${f.alive?'':'dead'}">
        <div class="hp-name" style="color:${f.color}">${f.name}</div>
        <div class="hp-bar"><div class="hp-fill" style="width:${pct}%;background:${c}"></div></div>
        <div class="hp-num">${Math.max(0,f.hp)}/${f.maxHp}</div>
      </div>`;
    }).join('');
  },

  drawArena(){
    const cv=this.canvas, ctx=this.ctx;
    const W=cv.width, H=cv.height;
    const cx=W/2, cy=H/2;
    const E=BattleEngine;
    const scale=Math.min(W,H)/((E.arenaR+22)*2);

    ctx.clearRect(0,0,W,H);

    // 배경 그라데이션
    const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,W*.6);
    bg.addColorStop(0,'#0e0e20'); bg.addColorStop(1,'#06060f');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // 격자
    ctx.strokeStyle='#ffffff06'; ctx.lineWidth=1;
    for(let x=cx%32;x<W;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=cy%32;y<H;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

    // 독가스 외부 영역 표시
    if(E.turn>=GAS_START){
      ctx.save();
      ctx.fillStyle='rgba(100,200,50,.07)';
      ctx.beginPath(); ctx.rect(0,0,W,H);
      ctx.arc(cx,cy,E.curR*scale,0,Math.PI*2,true);
      ctx.fill(); ctx.restore();
    }

    // 아레나 경계
    ctx.shadowBlur=E.turn>=GAS_START?14:0;
    ctx.shadowColor='#84cc16';
    ctx.strokeStyle=E.turn>=GAS_START?'#84cc16':'#2a3a5a';
    ctx.lineWidth=E.turn>=GAS_START?2:1.5;
    ctx.beginPath(); ctx.arc(cx,cy,E.curR*scale,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;

    // 최대 반경 (점선)
    if(E.curR<E.arenaR){
      ctx.setLineDash([5,5]); ctx.strokeStyle='#ffffff12'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(cx,cy,E.arenaR*scale,0,Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // 캐릭터
    E.F.forEach((f,i)=>{
      const sx=cx+f.x*scale, sy=cy+f.y*scale;
      if(!f.alive){
        ctx.globalAlpha=.2;
        ctx.font='16px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle='#fff'; ctx.fillText('💀',sx,sy);
        ctx.globalAlpha=1; return;
      }
      // 글로우
      ctx.shadowBlur=16; ctx.shadowColor=f.color;
      // 배경원
      ctx.beginPath(); ctx.arc(sx,sy,15,0,Math.PI*2);
      ctx.fillStyle=f.color+'30'; ctx.fill();
      // 외곽선
      ctx.strokeStyle=f.color; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(sx,sy,15,0,Math.PI*2); ctx.stroke();
      ctx.shadowBlur=0;
      // 번호
      ctx.fillStyle='#fff'; ctx.font='bold 12px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(i+1,sx,sy);
      // 이름
      ctx.fillStyle=f.color; ctx.font='9px sans-serif';
      ctx.fillText(f.name.slice(0,6),sx,sy-24);
      // HP바
      const bw=30,bh=4,bx=sx-bw/2,by=sy+19;
      const pct=f.hp/f.maxHp;
      const bc=pct>.5?'#22c55e':pct>.25?'#eab308':'#ef4444';
      ctx.fillStyle='#000'; ctx.fillRect(bx-1,by-1,bw+2,bh+2);
      ctx.fillStyle='#1a1a30'; ctx.fillRect(bx,by,bw,bh);
      ctx.fillStyle=bc; ctx.fillRect(bx,by,bw*pct,bh);
    });
  },

  flushLog(){
    const colors={
      sys:'#555577',system:'#2dd4bf',action:'#dde1ff',
      dmg:'#f87171',crit:'#f59e0b',defend:'#60a5fa',
      heal:'#4ade80',evade:'#fbbf24',death:'#ff4d6d',
      gas:'#84cc16',miss:'#666888',special:'#c084fc'
    };
    const el=document.getElementById('battle-log');
    el.innerHTML=BattleEngine.log.slice(-80).map(l=>
      `<div style="color:${colors[l.type]||'#dde1ff'}">${l.msg}</div>`
    ).join('');
    el.scrollTop=el.scrollHeight;
  },

  toggleAuto(){
    const btn=document.getElementById('btn-auto');
    if(this.autoTimer){
      clearInterval(this.autoTimer); this.autoTimer=null;
      btn.textContent='⏩ 자동';
    } else {
      btn.textContent='⏸ 정지';
      this.autoTimer=setInterval(()=>{
        if(BattleEngine.isDone()){
          clearInterval(this.autoTimer); this.autoTimer=null;
          btn.textContent='⏩ 자동';
          BattleEngine.endBattle();
        } else {
          BattleEngine.doTurn();
        }
      },500);
    }
  }
};

/* ============================================================
   F. RESULTS & RECORDS & INIT
============================================================ */
const Results = {
  show(){
    showScreen('results');
    const F=BattleEngine.F, T=BattleEngine.turn, D=BattleEngine.totalDmg;
    const ranked=[...F].sort((a,b)=>{
      if(a.alive&&!b.alive)return -1;
      if(!a.alive&&b.alive)return 1;
      if(a.alive&&b.alive)return(b.hp/b.maxHp)-(a.hp/a.maxHp);
      if(a.deathTurn!==b.deathTurn)return b.deathTurn-a.deathTurn;
      return 0;
    });
    const m=['🥇','🥈','🥉'];
    document.getElementById('results-body').innerHTML=ranked.map((f,i)=>{
      const turn=f.alive?`${T}턴 생존`:`${f.deathTurn}턴 사망`;
      return `<tr class="${i<3?'rank'+(i+1):''}">
        <td>${m[i]||''} ${i+1}위</td>
        <td><span style="color:${f.color}">■</span> ${f.name}</td>
        <td>${turn}</td>
        <td>${f.alive?'최후 생존':f.deathCause}</td>
      </tr>`;
    }).join('');
    document.getElementById('results-info').textContent=`총 ${T}턴 · 총 피해 ${D}`;
    Stor.addRec({date:new Date().toLocaleString('ko-KR'),winner:ranked[0].name,turns:T,damage:D,players:ranked.map(f=>f.name)});
  }
};

const Records = {
  render(){
    const recs=Stor.records();
    const el=document.getElementById('records-list');
    if(!recs.length){el.innerHTML='<div class="no-data">전적이 없습니다. 전투를 먼저 해보세요!</div>';return;}
    el.innerHTML=recs.map((r,i)=>
      `<div class="record-card">
        <div class="rc-head"><span>#${i+1}</span><span>${r.date}</span></div>
        <div class="rc-winner">🏆 ${r.winner} 승리</div>
        <div class="rc-detail">${(r.players||[]).join(' · ')} | ${r.turns}턴 | 피해 ${r.damage}</div>
      </div>`
    ).join('');
  }
};

/* ── 초기화 ── */
window.addEventListener('DOMContentLoaded',()=>{
  if(!Stor.chars().length){
    Stor.saveC([{
      name:'Player',
      stats:{hp_stat:3,str:3,agi:4,luk:3,int:3},
      skills:[{name:'근거리 공격',lv:3},{name:'이동 공격',lv:3},{name:'데미지 감소',lv:2},{name:'회복',lv:2}],
      priority:[0,1,2,3]
    }]);
  }
  Lobby.render();
  showScreen('main');
});
