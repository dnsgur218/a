/* ============================================================
   PART 1: CONSTANTS & SKILL DATA
============================================================ */

const SKILL_TREE = {
  '공격': {
    '이동 공격': {
      icon: '⚡',
      levels: [
        { dash: 5,  dmg: 2, radius: 0,  special: '' },
        { dash: 8,  dmg: 3, radius: 0,  special: '' },
        { dash: 10, dmg: 4, radius: 3,  special: '범위' },
        { dash: 13, dmg: 5, radius: 5,  special: '범위' },
        { dash: 15, dmg: 7, radius: 7,  special: '밀어내기' },
      ],
      cap: (s) => ({ dash: s.agi * 3, dmg: s.str * 2 }),
      desc: (lv, s) => {
        const c = cap_skill('이동 공격', lv, s);
        return `돌진 ${c.dash} | 데미지 ${c.dmg}${lv >= 3 ? ' | 범위 ' + SKILL_TREE['공격']['이동 공격'].levels[lv-1].radius : ''}`;
      }
    },
    '근거리 공격': {
      icon: '🗡️',
      levels: [
        { radius: 3,  dmg: 3,  special: '' },
        { radius: 4,  dmg: 5,  special: '' },
        { radius: 5,  dmg: 6,  special: '전체' },
        { radius: 7,  dmg: 8,  special: '전체' },
        { radius: 10, dmg: 11, special: '넉백' },
      ],
      cap: (s) => ({ dmg: s.str * 2 + 1, radius: s.str * 2 }),
      desc: (lv, s) => {
        const c = cap_skill('근거리 공격', lv, s);
        return `반경 ${c.radius} | 데미지 ${c.dmg}${lv >= 3 ? ' | 범위 타격' : ''}`;
      }
    },
    '원거리 공격': {
      icon: '🏹',
      levels: [
        { range: 10, dmg: 2, radius: 0, special: '' },
        { range: 14, dmg: 3, radius: 0, special: '' },
        { range: 18, dmg: 4, radius: 3, special: '범위' },
        { range: 22, dmg: 5, radius: 5, special: '범위' },
        { range: 999,dmg: 7, radius: 7, special: '관통' },
      ],
      cap: (s) => ({ range: s.agi * 4, dmg: s.str * 2 }),
      desc: (lv, s) => {
        const c = cap_skill('원거리 공격', lv, s);
        const rng = lv === 5 ? '전체' : c.range;
        return `사거리 ${rng} | 데미지 ${c.dmg}${lv >= 3 ? ' | 범위 ' + SKILL_TREE['공격']['원거리 공격'].levels[lv-1].radius : ''}`;
      }
    }
  },
  '방어': {
    '데미지 감소': {
      icon: '🛡️',
      levels: [
        { reduce: 2,  special: '' },
        { reduce: 4,  special: '' },
        { reduce: 6,  special: '' },
        { reduce: 8,  special: '' },
        { reduce: 10, special: '지속' },
      ],
      cap: (s) => ({ reduce: s.hp_stat * 2 }),
      desc: (lv, s) => {
        const c = cap_skill('데미지 감소', lv, s);
        return `감소량 ${c.reduce}${lv === 5 ? ' | 다음 턴 +5 지속' : ''}`;
      }
    },
    '이펙트 파괴': {
      icon: '💫',
      levels: [
        { radius: 5,  count: 1, special: '' },
        { radius: 8,  count: 1, special: '' },
        { radius: 12, count: 2, special: '' },
        { radius: 15, count: 3, special: '' },
        { radius: 20, count: 99,special: '반사' },
      ],
      cap: (s) => ({ radius: s.agi * 3 }),
      desc: (lv, s) => {
        const c = cap_skill('이펙트 파괴', lv, s);
        const cnt = lv === 5 ? '전부' : SKILL_TREE['방어']['이펙트 파괴'].levels[lv-1].count + '개';
        return `파괴 반경 ${c.radius} | 투사체 ${cnt}${lv === 5 ? ' | 반사 50%' : ''}`;
      }
    }
  },
  '특수': {
    '회복': {
      icon: '💚',
      levels: [
        { heal: 3,  special: '' },
        { heal: 6,  special: '' },
        { heal: 9,  special: '' },
        { heal: 12, special: '' },
        { heal: 15, special: '지속' },
      ],
      cap: (s) => ({ heal: s.int * 3 }),
      desc: (lv, s) => {
        const c = cap_skill('회복', lv, s);
        return `회복량 ${c.heal}${lv === 5 ? ' | 다음 턴 +5 지속' : ''}`;
      }
    },
    '회피': {
      icon: '💨',
      levels: [
        { prob: 20, move: 5,  special: '' },
        { prob: 30, move: 7,  special: '' },
        { prob: 40, move: 10, special: '' },
        { prob: 55, move: 12, special: '' },
        { prob: 70, move: 15, special: '잔상' },
      ],
      cap: (s) => ({ prob: s.luk * 15, move: s.agi * 3 }),
      desc: (lv, s) => {
        const c = cap_skill('회피', lv, s);
        return `회피 ${c.prob}% | 이동 ${c.move}${lv === 5 ? ' | 잔상' : ''}`;
      }
    }
  }
};

// 모든 소분류 이름 목록
const ALL_SUBTYPES = [];
for (const cat of Object.keys(SKILL_TREE)) {
  for (const sub of Object.keys(SKILL_TREE[cat])) ALL_SUBTYPES.push(sub);
}

// 소분류 → 대분류
function getCategory(subtype) {
  for (const [cat, subs] of Object.entries(SKILL_TREE)) {
    if (subs[subtype]) return cat;
  }
  return null;
}

// 스킬 수치 계산 (캡 적용)
function cap_skill(subtype, lv, stats) {
  const node = SKILL_TREE[getCategory(subtype)][subtype];
  const base = node.levels[lv - 1];
  const caps = node.cap(stats);
  const result = { ...base };
  for (const [k, v] of Object.entries(caps)) {
    if (result[k] !== undefined) result[k] = Math.min(result[k], v);
  }
  return result;
}

// HP 계산
function calcMaxHP(hp_stat) { return hp_stat * 20; }

// 스킬 발동 확률
function calcSkillProbs(priority_order, luk) {
  const base = [25, 25, 25, 25];
  const bonus = [luk * 3, luk * 1, -luk * 1, -luk * 3];
  return priority_order.map((_, i) => Math.max(5, base[i] + bonus[i]));
}

// 거리 계산
function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// 방향 벡터 (단위)
function dir(from, to) {
  const d = dist(from, to);
  if (d === 0) return { x: 1, y: 0 };
  return { x: (to.x - from.x) / d, y: (to.y - from.y) / d };
}

// 아레나 반경
function arenaRadius(n) {
  if (n <= 2) return 50;
  if (n <= 4) return 70;
  if (n <= 6) return 90;
  return 110;
}

// 시작 위치 (정다각형)
function startPositions(n, radius) {
  const pos = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    pos.push({ x: Math.cos(angle) * radius * 0.75, y: Math.sin(angle) * radius * 0.75 });
  }
  return pos;
}

// 저장소
const Storage = {
  getChars() { try { return JSON.parse(localStorage.getItem('brawl_chars') || '[]'); } catch { return []; } },
  saveChars(list) { localStorage.setItem('brawl_chars', JSON.stringify(list)); },
  getRecords() { try { return JSON.parse(localStorage.getItem('brawl_records') || '[]'); } catch { return []; } },
  addRecord(r) {
    const records = this.getRecords();
    records.unshift(r);
    if (records.length > 30) records.pop();
    localStorage.setItem('brawl_records', JSON.stringify(records));
  }
};

// 랜덤 정수 [a, b]
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// 가중 랜덤 선택
function weightedRandom(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

// 캐릭터 색상
const CHAR_COLORS = ['#f75a6a','#7c6af7','#2dd4bf','#f59e0b','#4ade80','#f472b6','#60a5fa','#fb923c'];

console.log('[Brawl] Part 1 loaded: Constants & Skill Data');

/* ============================================================
   PART 2: SCREEN MANAGER & CHARACTER EDITOR
============================================================ */

const Screen = {
  show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + id).classList.add('active');
    if (id === 'character') CharEditor.init();
    if (id === 'lobby') Lobby.init();
    if (id === 'records') Records.render();
  }
};

/* ---- Character Editor ---- */
const CharEditor = {
  stats: { hp_stat: 3, str: 3, agi: 3, luk: 3, int: 4 },
  skills: [
    { subtype: '이동 공격', lv: 1 },
    { subtype: '근거리 공격', lv: 1 },
    { subtype: '데미지 감소', lv: 1 },
    { subtype: '회복', lv: 1 },
  ],
  priority: [0, 1, 2, 3], // 스킬 인덱스 순서

  init() {
    this.renderStats();
    this.renderSkills();
    this.renderPriority();
  },

  totalStatPoints() { return Object.values(this.stats).reduce((a, b) => a + b, 0); },
  remainStats() { return 16 - this.totalStatPoints(); },

  totalSkillPoints() { return 9 + this.stats.int; },
  usedSkillPoints() { return this.skills.reduce((a, sk) => a + sk.lv, 0); },
  remainSkill() { return this.totalSkillPoints() - this.usedSkillPoints(); },

  renderStats() {
    const STAT_NAMES = [
      ['hp_stat', '체력'], ['str', '힘'], ['agi', '민첩'], ['luk', '운'], ['int', '지능']
    ];
    const grid = document.getElementById('stat-grid');
    grid.innerHTML = '';
    STAT_NAMES.forEach(([key, label]) => {
      const val = this.stats[key];
      const row = document.createElement('div');
      row.className = 'stat-row';
      row.innerHTML = `
        <span class="stat-name">${label}</span>
        <button class="stat-btn" onclick="CharEditor.adjStat('${key}',-1)">−</button>
        <div class="stat-dots">${[1,2,3,4,5].map(i =>
          `<div class="stat-dot ${val >= i ? 'filled' : ''}" onclick="CharEditor.setStat('${key}',${i})"></div>`
        ).join('')}</div>
        <button class="stat-btn" onclick="CharEditor.adjStat('${key}',1)">+</button>
        <span class="stat-val">${val}</span>
      `;
      grid.appendChild(row);
    });
    const rem = this.remainStats();
    document.getElementById('stat-remaining').textContent = `남은: ${rem} / 16`;
    document.getElementById('stat-remaining').style.color = rem === 0 ? '#4ade80' : rem < 0 ? '#f87171' : '';
    // summary
    const s = this.stats;
    document.getElementById('stat-summary').innerHTML = `
      <span>HP: <span>${calcMaxHP(s.hp_stat)}</span></span>
      <span>ATK 보정: <span>+${s.str - 1}</span></span>
      <span>치명타: <span>${s.luk * 5}%</span></span>
      <span>AGI: <span>${s.agi}</span></span>
      <span>스킬PT: <span>${this.totalSkillPoints()}</span></span>
    `;
    this.renderSkills();
    this.renderPriority();
  },

  setStat(key, val) {
    const diff = val - this.stats[key];
    if (diff > 0 && this.remainStats() < diff) return;
    if (val < 1 || val > 5) return;
    this.stats[key] = val;
    this.renderStats();
  },
  adjStat(key, delta) { this.setStat(key, this.stats[key] + delta); },

  renderSkills() {
    const container = document.getElementById('skill-slots');
    container.innerHTML = '';
    const rem = this.remainSkill();
    document.getElementById('skill-remaining').textContent = `남은: ${rem} / ${this.totalSkillPoints()}`;
    document.getElementById('skill-remaining').style.color = rem === 0 ? '#4ade80' : rem < 0 ? '#f87171' : '';

    this.skills.forEach((sk, idx) => {
      const cat = getCategory(sk.subtype);
      const node = SKILL_TREE[cat][sk.subtype];
      const desc = node.desc(sk.lv, this.stats);
      const slot = document.createElement('div');
      slot.className = 'skill-slot';
      slot.innerHTML = `
        <div class="skill-slot-header">
          <span class="skill-label">스킬 ${idx + 1}</span>
          <select class="skill-select" onchange="CharEditor.setSkillType(${idx}, this.value)">
            ${ALL_SUBTYPES.map(st => `<option value="${st}" ${st === sk.subtype ? 'selected' : ''}>${SKILL_TREE[getCategory(st)][st].icon} ${st}</option>`).join('')}
          </select>
        </div>
        <div class="skill-level-row">
          <span style="font-size:11px;color:var(--text-dim)">Lv</span>
          <div class="skill-dots">${[1,2,3,4,5].map(i =>
            `<div class="skill-dot ${sk.lv >= i ? 'filled' : ''}" onclick="CharEditor.setSkillLv(${idx},${i})"></div>`
          ).join('')}</div>
          <span class="skill-lv-val">${sk.lv}</span>
          <button class="stat-btn" onclick="CharEditor.adjSkillLv(${idx},-1)">−</button>
          <button class="stat-btn" onclick="CharEditor.adjSkillLv(${idx},1)">+</button>
        </div>
        <div class="skill-info">${desc}</div>
      `;
      container.appendChild(slot);
    });
  },

  setSkillType(idx, subtype) {
    this.skills[idx].subtype = subtype;
    this.renderSkills();
    this.renderPriority();
  },
  setSkillLv(idx, lv) {
    const diff = lv - this.skills[idx].lv;
    if (diff > 0 && this.remainSkill() < diff) return;
    if (lv < 1 || lv > 5) return;
    this.skills[idx].lv = lv;
    this.renderSkills();
  },
  adjSkillLv(idx, delta) { this.setSkillLv(idx, this.skills[idx].lv + delta); },

  renderPriority() {
    const container = document.getElementById('priority-list');
    container.innerHTML = '';
    const luk = this.stats.luk;
    const probs = calcSkillProbs(this.priority, luk);
    const labels = ['1순위', '2순위', '3순위', '4순위'];

    this.priority.forEach((skillIdx, rankIdx) => {
      const sk = this.skills[skillIdx];
      const item = document.createElement('div');
      item.className = 'priority-item';
      item.innerHTML = `
        <span class="priority-rank">${labels[rankIdx]}</span>
        <select class="priority-select" onchange="CharEditor.setPriority(${rankIdx}, parseInt(this.value))">
          ${this.skills.map((s, i) => `<option value="${i}" ${i === skillIdx ? 'selected' : ''}>${SKILL_TREE[getCategory(s.subtype)][s.subtype].icon} 스킬${i+1} ${s.subtype}</option>`).join('')}
        </select>
        <span class="priority-prob">${probs[rankIdx]}%</span>
      `;
      container.appendChild(item);
    });
  },

  setPriority(rankIdx, skillIdx) {
    // 중복 방지: 기존 위치와 swap
    const oldPos = this.priority.indexOf(skillIdx);
    const displaced = this.priority[rankIdx];
    this.priority[rankIdx] = skillIdx;
    this.priority[oldPos] = displaced;
    this.renderPriority();
  },

  save() {
    if (this.remainStats() !== 0) { alert('스탯 포인트를 모두 사용해야 합니다.'); return; }
    if (this.remainSkill() < 0) { alert('스킬 포인트 초과입니다.'); return; }

    const name = document.getElementById('char-name').value.trim() || 'Player';
    const chars = Storage.getChars();
    const existing = chars.findIndex(c => c.name === name);
    const char = {
      name,
      stats: { ...this.stats },
      skills: this.skills.map(s => ({ ...s })),
      priority: [...this.priority],
      isPlayer: true
    };
    if (existing >= 0) chars[existing] = char;
    else chars.push(char);
    Storage.saveChars(chars);
    alert(`"${name}" 저장 완료!`);
    Screen.show('lobby');
  }
};

console.log('[Brawl] Part 2 loaded: Screen & CharEditor');

/* ============================================================
   PART 3: LOBBY & AI GENERATION
============================================================ */

const AI_BUILDS = [
  { name: 'AI-닌자',    stats:{hp_stat:1,str:2,agi:5,luk:5,int:3}, skills:[{subtype:'회피',lv:5},{subtype:'원거리 공격',lv:3},{subtype:'이동 공격',lv:2},{subtype:'회복',lv:2}], priority:[0,1,2,3] },
  { name: 'AI-파이터', stats:{hp_stat:3,str:5,agi:4,luk:3,int:1}, skills:[{subtype:'근거리 공격',lv:4},{subtype:'이동 공격',lv:3},{subtype:'근거리 공격',lv:2},{subtype:'데미지 감소',lv:1}], priority:[0,1,2,3] },
  { name: 'AI-탱커',   stats:{hp_stat:5,str:3,agi:1,luk:2,int:5}, skills:[{subtype:'데미지 감소',lv:5},{subtype:'회복',lv:5},{subtype:'근거리 공격',lv:3},{subtype:'데미지 감소',lv:1}], priority:[0,1,2,3] },
  { name: 'AI-저격수', stats:{hp_stat:2,str:4,agi:5,luk:2,int:3}, skills:[{subtype:'원거리 공격',lv:5},{subtype:'원거리 공격',lv:3},{subtype:'회피',lv:2},{subtype:'이펙트 파괴',lv:2}], priority:[0,1,2,3] },
  { name: 'AI-마법사', stats:{hp_stat:2,str:2,agi:3,luk:3,int:5}, skills:[{subtype:'원거리 공격',lv:4},{subtype:'회복',lv:5},{subtype:'이펙트 파괴',lv:3},{subtype:'회피',lv:2}], priority:[0,1,2,3] },
  { name: 'AI-광전사', stats:{hp_stat:4,str:5,agi:3,luk:3,int:1}, skills:[{subtype:'이동 공격',lv:4},{subtype:'근거리 공격',lv:3},{subtype:'이동 공격',lv:2},{subtype:'데미지 감소',lv:1}], priority:[0,1,2,3] },
];

const Lobby = {
  slots: [], // 최대 8개

  init() {
    // 저장된 캐릭터 자동 추가 (최초 1개)
    if (this.slots.length === 0) {
      const chars = Storage.getChars();
      if (chars.length > 0) this.slots = [{ ...chars[0], isPlayer: true }];
    }
    this.render();
  },

  render() {
    const list = document.getElementById('lobby-list');
    list.innerHTML = '';
    document.getElementById('lobby-count').textContent = this.slots.length;

    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      if (i < this.slots.length) {
        const c = this.slots[i];
        const s = c.stats;
        slot.className = 'lobby-slot';
        slot.innerHTML = `
          <span class="lobby-slot-num" style="color:${CHAR_COLORS[i]}">${i+1}</span>
          <div class="lobby-slot-info">
            <div class="lobby-slot-name">${c.name} <span class="lobby-slot-badge ${c.isPlayer ? 'badge-player' : 'badge-ai'}">${c.isPlayer ? 'PLAYER' : 'AI'}</span></div>
            <div class="lobby-slot-stats">HP:${calcMaxHP(s.hp_stat)} STR:${s.str} AGI:${s.agi} LUK:${s.luk} INT:${s.int} | ${c.skills.map(sk => SKILL_TREE[getCategory(sk.subtype)][sk.subtype].icon + sk.subtype.slice(0,2) + 'Lv' + sk.lv).join(' ')}</div>
          </div>
          <div class="lobby-slot-actions">
            ${c.isPlayer ? `<button class="btn btn-secondary btn-small" onclick="Lobby.editChar(${i})">편집</button>` : ''}
            <button class="btn btn-danger btn-small" onclick="Lobby.removeSlot(${i})">✕</button>
          </div>
        `;
      } else {
        slot.className = 'lobby-slot empty';
        slot.innerHTML = `<span class="lobby-slot-num" style="color:var(--border)">${i+1}</span><span style="padding:4px 8px">대기 중...</span>`;
      }
      list.appendChild(slot);
    }

    const startBtn = document.getElementById('btn-start');
    startBtn.disabled = this.slots.length < 2;
    startBtn.style.opacity = this.slots.length < 2 ? '0.4' : '1';
    document.getElementById('lobby-msg').textContent = this.slots.length < 2 ? '최소 2명 이상 참가해야 시작 가능합니다.' : '';
  },

  addAI() {
    if (this.slots.length >= 8) { document.getElementById('lobby-msg').textContent = '최대 8명입니다.'; return; }
    const pick = AI_BUILDS[this.slots.length % AI_BUILDS.length];
    this.slots.push({ ...pick, skills: pick.skills.map(s => ({...s})), priority: [...pick.priority], isPlayer: false });
    this.render();
  },

  removeSlot(idx) {
    this.slots.splice(idx, 1);
    this.render();
  },

  editChar(idx) {
    const c = this.slots[idx];
    CharEditor.stats = { ...c.stats };
    CharEditor.skills = c.skills.map(s => ({...s}));
    CharEditor.priority = [...c.priority];
    document.getElementById('char-name').value = c.name;
    Screen.show('character');
  },

  startBattle() {
    if (this.slots.length < 2) return;
    Battle.init(this.slots.map((c, i) => ({
      ...c,
      id: i,
      color: CHAR_COLORS[i],
      hp: calcMaxHP(c.stats.hp_stat),
      maxHp: calcMaxHP(c.stats.hp_stat),
      x: 0, y: 0,
      alive: true,
      deathTurn: null,
      deathHp: 0,
      deathCause: '',
      shieldNext: 0,    // 다음 턴 지속 방어
      healNext: 0,      // 다음 턴 지속 회복
      evadeBonus: 0,    // 잔상 보너스
      projectiles: [],  // 비행 중 투사체
    })));
    Screen.show('battle');
  },

  rematch() {
    this.render();
    Screen.show('lobby');
  }
};

console.log('[Brawl] Part 3 loaded: Lobby & AI');

/* ============================================================
   PART 4: BATTLE ENGINE
============================================================ */

const Battle = {
  fighters: [],
  turn: 0,
  maxRadius: 0,
  currentRadius: 0,
  logs: [],
  autoTimer: null,
  totalDamage: 0,
  projectiles: [], // 투사체 배열 {from, to, x, y, dmg, radius, owner, pierce}

  init(fighters) {
    this.fighters = fighters;
    this.turn = 0;
    this.logs = [];
    this.projectiles = [];
    this.totalDamage = 0;
    this.autoTimer = null;

    const n = fighters.length;
    this.maxRadius = arenaRadius(n);
    this.currentRadius = this.maxRadius;

    // 시작 위치
    const positions = startPositions(n, this.maxRadius);
    fighters.forEach((f, i) => {
      f.x = positions[i].x;
      f.y = positions[i].y;
      f.alive = true;
      f.hp = f.maxHp;
      f.shieldNext = 0;
      f.healNext = 0;
      f.evadeBonus = 0;
      f.deathTurn = null;
    });

    this.renderHP();
    this.drawArena();
    document.getElementById('battle-log').innerHTML = '';
    this.addLog('system', `⚔️ 전투 시작! ${n}명 참가`);
    document.getElementById('btn-auto').textContent = '⏩ 자동 진행';
  },

  alive() { return this.fighters.filter(f => f.alive); },

  // ---- 스킬 선택 ----
  pickSkill(fighter) {
    const luk = fighter.stats.luk;
    const probs = calcSkillProbs(fighter.priority, luk);
    const idx = weightedRandom(probs);
    return fighter.skills[fighter.priority[idx]];
  },

  // ---- 타겟 선택 ----
  pickTarget(actor, subtype) {
    const enemies = this.alive().filter(f => f.id !== actor.id);
    if (enemies.length === 0) return null;
    if (subtype === '원거리 공격') {
      // 사거리 내에서 HP 가장 낮은 적
      const sk = actor.skills.find(s => s.subtype === subtype);
      const cap = cap_skill(subtype, sk.lv, actor.stats);
      const inRange = enemies.filter(e => dist(actor, e) <= cap.range);
      const pool = inRange.length > 0 ? inRange : enemies;
      return pool.reduce((a, b) => a.hp < b.hp ? a : b);
    }
    return enemies.reduce((a, b) => dist(actor, a) < dist(actor, b) ? a : b);
  },

  // ---- 데미지 계산 ----
  calcDamage(actor, baseDmg, isCrit) {
    let dmg = baseDmg + (actor.stats.str - 1);
    if (isCrit) dmg = Math.floor(dmg * 1.5);
    return dmg;
  },

  isCrit(actor) {
    return Math.random() < actor.stats.luk * 0.05;
  },

  // ---- 데미지 적용 ----
  applyDamage(target, dmg, attacker, skillName, isCrit) {
    if (!target.alive) return 0;
    let reduced = dmg;
    if (target.shieldNext > 0) {
      const block = Math.min(target.shieldNext, reduced);
      reduced = Math.max(0, reduced - target.shieldNext);
      if (block > 0) this.addLog('defend', `  └ ${target.name}의 방어 발동! ${block} 경감 → 실피해 ${reduced}`);
    }
    const actual = Math.max(0, reduced);
    target.hp = Math.max(0, target.hp - actual);
    this.totalDamage += actual;

    let msg = `${attacker.name} → ${skillName}`;
    if (isCrit) msg += ' 💥치명타!';
    msg += ` → ${target.name}에게 <b>${actual}</b> 데미지`;
    this.addLog('attack', msg);

    if (target.hp <= 0 && target.alive) {
      target.alive = false;
      target.deathTurn = this.turn;
      target.deathHp = 0;
      target.deathCause = skillName;
      this.addLog('death', `💀 ${target.name} 사망! (${skillName})`);
    }
    return actual;
  },

  // ---- 스킬 실행 ----
  execSkill(actor, skill) {
    if (!actor.alive) return;
    const { subtype, lv } = skill;
    const cap = cap_skill(subtype, lv, actor.stats);
    const node = SKILL_TREE[getCategory(subtype)][subtype];
    const icon = node.icon;

    this.addLog('turn', `[턴${this.turn}] ${actor.name} → ${icon} ${subtype} Lv${lv}`);

    switch (subtype) {
      case '이동 공격': this.execDash(actor, lv, cap); break;
      case '근거리 공격': this.execMelee(actor, lv, cap); break;
      case '원거리 공격': this.execRanged(actor, lv, cap); break;
      case '데미지 감소': this.execShield(actor, lv, cap); break;
      case '이펙트 파괴': this.execDestroy(actor, lv, cap); break;
      case '회복': this.execHeal(actor, lv, cap); break;
      case '회피': this.execEvade(actor, lv, cap); break;
    }
  },

  execDash(actor, lv, cap) {
    const target = this.pickTarget(actor, '이동 공격');
    if (!target) return;
    const d = dist(actor, target);
    const dashDist = Math.min(cap.dash, d);
    const direction = dir(actor, target);
    actor.x += direction.x * dashDist;
    actor.y += direction.y * dashDist;
    this.addLog('special', `  돌진 → ${target.name} 방향 ${dashDist.toFixed(1)} 이동`);

    const crit = this.isCrit(actor);
    const baseDmg = cap.dmg;
    // 메인 타겟
    this.applyDamage(target, this.calcDamage(actor, baseDmg, crit), actor, '이동 공격', crit);
    // 범위 (Lv3+)
    if (lv >= 3 && cap.radius > 0) {
      const splashRadius = SKILL_TREE['공격']['이동 공격'].levels[lv-1].radius;
      this.alive().filter(f => f.id !== actor.id && f.id !== target.id && dist(actor, f) <= splashRadius).forEach(f => {
        this.applyDamage(f, this.calcDamage(actor, baseDmg, false), actor, '이동 공격(범위)', false);
      });
    }
    // Lv5 밀어내기
    if (lv === 5) {
      this.alive().filter(f => f.id !== actor.id && dist(actor, f) <= 7).forEach(f => {
        const pushDir = dir(actor, f);
        f.x += pushDir.x * 8;
        f.y += pushDir.y * 8;
        this.clampToArena(f);
      });
      this.addLog('special', '  └ 주변 적 밀어내기!');
    }
  },

  execMelee(actor, lv, cap) {
    const enemies = this.alive().filter(f => f.id !== actor.id && dist(actor, f) <= cap.radius);
    if (enemies.length === 0) { this.addLog('special', '  └ 범위 내 적 없음'); return; }
    const crit = this.isCrit(actor);
    if (lv < 3) {
      const target = enemies.reduce((a, b) => dist(actor, a) < dist(actor, b) ? a : b);
      this.applyDamage(target, this.calcDamage(actor, cap.dmg, crit), actor, '근거리 공격', crit);
    } else {
      enemies.forEach(e => this.applyDamage(e, this.calcDamage(actor, cap.dmg, crit), actor, '근거리 공격', crit));
    }
    // Lv5 넉백
    if (lv === 5) {
      enemies.forEach(e => {
        const pushDir = dir(actor, e);
        e.x += pushDir.x * 10;
        e.y += pushDir.y * 10;
        this.clampToArena(e);
      });
      this.addLog('special', '  └ 넉백!');
    }
  },

  execRanged(actor, lv, cap) {
    const target = this.pickTarget(actor, '원거리 공격');
    if (!target) return;
    const d = dist(actor, target);
    if (d > cap.range) { this.addLog('special', `  └ 사거리 부족 (거리 ${d.toFixed(1)} > ${cap.range})`); return; }

    const crit = this.isCrit(actor);
    const splashR = SKILL_TREE['공격']['원거리 공격'].levels[lv-1].radius;

    // 이펙트 파괴 체크
    const destroyer = this.checkEffectDestroy(actor, target, lv, cap);
    if (destroyer) return;

    this.applyDamage(target, this.calcDamage(actor, cap.dmg, crit), actor, '원거리 공격', crit);
    // 범위
    if (lv >= 3) {
      this.alive().filter(f => f.id !== actor.id && f.id !== target.id && dist(target, f) <= splashR).forEach(f => {
        this.applyDamage(f, this.calcDamage(actor, cap.dmg, false), actor, '원거리(범위)', false);
      });
    }
    // Lv5 관통
    if (lv === 5) {
      // 경로 상 모든 적
      this.alive().filter(f => f.id !== actor.id && f.id !== target.id).forEach(f => {
        const dot = (f.x - actor.x) * (target.x - actor.x) + (f.y - actor.y) * (target.y - actor.y);
        if (dot > 0) this.applyDamage(f, this.calcDamage(actor, Math.floor(cap.dmg * 0.5), false), actor, '원거리(관통)', false);
      });
    }
  },

  checkEffectDestroy(attacker, target, atkLv, atkCap) {
    const destroySkill = target.skills.find(s => s.subtype === '이펙트 파괴');
    if (!destroySkill || !target.alive) return false;
    // 이펙트 파괴가 이번 턴 발동될 확률 — 여기선 이미 발동된 턴으로 처리
    // (간소화: 같은 턴에 발동했으면 파괴)
    return false; // 실제 발동은 execDestroy에서 처리
  },

  execShield(actor, lv, cap) {
    actor.shieldNext = cap.reduce;
    this.addLog('defend', `  ${actor.name} 방어막 ${cap.reduce} 발동 (이번 턴 적용)`);
    if (lv === 5) { actor.shieldNext += 5; /* 다음 턴도 5 */ }
  },

  execDestroy(actor, lv, cap) {
    // 자신에게 날아오는 원거리 투사체 찾아 파괴
    const maxCount = SKILL_TREE['방어']['이펙트 파괴'].levels[lv-1].count;
    let destroyed = 0;
    // 이번 턴 원거리 공격자 중 자신을 타겟으로 한 것 막기
    this.pendingProjectiles = (this.pendingProjectiles || []).filter(p => {
      if (p.targetId === actor.id && destroyed < maxCount && dist(actor, {x: p.x, y: p.y}) <= cap.radius) {
        destroyed++;
        this.addLog('defend', `  ${actor.name}이 투사체 파괴! (${p.fromName}의 공격)`);
        if (lv === 5) {
          const from = this.fighters.find(f => f.id === p.fromId);
          if (from && from.alive) this.applyDamage(from, Math.floor(p.dmg * 0.5), actor, '이펙트 반사', false);
        }
        return false;
      }
      return true;
    });
    if (destroyed === 0) this.addLog('defend', `  ${actor.name} 이펙트 파괴 대기 중...`);
  },

  execHeal(actor, lv, cap) {
    const prev = actor.hp;
    actor.hp = Math.min(actor.maxHp, actor.hp + cap.heal);
    const actual = actor.hp - prev;
    this.addLog('heal', `  ${actor.name} +${actual} 회복 (${actor.hp}/${actor.maxHp})`);
    if (lv === 5) actor.healNext = 5;
  },

  execEvade(actor, lv, cap) {
    const target = this.pickTarget(actor, '회피');
    // 이동: 가장 가까운 적 반대 방향
    if (target) {
      const away = dir(target, actor);
      const moveDist = cap.move;
      actor.x += away.x * moveDist;
      actor.y += away.y * moveDist;
      this.clampToArena(actor);
      this.addLog('evade', `  ${actor.name} ${moveDist} 이동 (도주)`);
    }
    const evadeChance = Math.min(cap.prob, 100) / 100;
    if (lv === 5 && actor.evadeBonus > 0) {
      actor.evadeBonus = 0;
    }
    // 이번 턴 회피 플래그 설정
    actor._evadeThisTurn = evadeChance;
    if (lv === 5) actor.evadeBonus = 10;
    this.addLog('evade', `  회피 확률 ${Math.floor(evadeChance*100)}% 설정`);
  },

  clampToArena(f) {
    const r = this.currentRadius;
    const d = Math.sqrt(f.x ** 2 + f.y ** 2);
    if (d > r) {
      f.x = (f.x / d) * r;
      f.y = (f.y / d) * r;
    }
  },

  // ---- 비이동 자동 접근 ----
  autoApproach(actor, usedMoveSkill) {
    if (usedMoveSkill) return;
    const target = this.alive().filter(f => f.id !== actor.id).reduce((a, b) => dist(actor, a) < dist(actor, b) ? a : b, null);
    if (!target) return;
    const d = dir(actor, target);
    actor.x += d.x * 3;
    actor.y += d.y * 3;
    this.clampToArena(actor);
  },

  isMoveSkill(subtype) {
    return ['이동 공격', '회피'].includes(subtype);
  },

  // ---- 한 턴 실행 ----
  nextTurn() {
    const aliveList = this.alive();
    if (aliveList.length <= 1) { this.endBattle(); return; }

    this.turn++;
    document.getElementById('battle-turn').textContent = `턴: ${this.turn}`;
    this.addLog('system', `━━━━━━ 턴 ${this.turn} ━━━━━━`);

    // 지속 효과 (이전 턴 부여)
    aliveList.forEach(f => {
      if (f.healNext > 0) {
        f.hp = Math.min(f.maxHp, f.hp + f.healNext);
        this.addLog('heal', `  ${f.name} 지속 회복 +${f.healNext}`);
        f.healNext = 0;
      }
    });

    // 스킬 선택
    aliveList.forEach(f => { f._chosenSkill = this.pickSkill(f); f._evadeThisTurn = 0; });

    // 행동 순서 정렬 (AGI → LUK → 랜덤)
    const order = [...aliveList].sort((a, b) => {
      if (b.stats.agi !== a.stats.agi) return b.stats.agi - a.stats.agi;
      if (b.stats.luk !== a.stats.luk) return b.stats.luk - a.stats.luk;
      return Math.random() - 0.5;
    });

    // 스킬 실행
    order.forEach(actor => {
      if (!actor.alive) return;
      // 방어 초기화 (매 턴)
      if (actor.shieldNext > 0) { /* 이번 턴 방어는 유지 */ } else { actor.shieldNext = 0; }
      this.execSkill(actor, actor._chosenSkill);
      this.autoApproach(actor, this.isMoveSkill(actor._chosenSkill.subtype));
    });

    // 방어막 소모
    aliveList.forEach(f => { if (f.shieldNext > 0) f.shieldNext = 0; });

    // 독가스 (턴 15+)
    if (this.turn >= 15) {
      this.currentRadius = Math.max(20, this.maxRadius - (this.turn - 14) * 5);
      document.getElementById('battle-gas').textContent = `독가스: 반경 ${this.currentRadius}`;
      document.getElementById('battle-gas').className = 'gas-indicator active';
      this.alive().forEach(f => {
        this.clampToArena(f);
        const outside = Math.sqrt(f.x**2 + f.y**2) > this.currentRadius;
        if (outside) {
          const gasDmg = Math.floor(f.maxHp * 0.1);
          f.hp = Math.max(0, f.hp - gasDmg);
          this.addLog('attack', `  ☠️ ${f.name} 독가스 ${gasDmg} 피해`);
          if (f.hp <= 0 && f.alive) {
            f.alive = false; f.deathTurn = this.turn; f.deathCause = '독가스';
            this.addLog('death', `💀 ${f.name} 독가스로 사망!`);
          }
        }
      });
    }

    // 최대 턴 30
    if (this.turn >= 30) { this.endBattle(); return; }

    const survivors = this.alive();
    if (survivors.length <= 1) { this.endBattle(); return; }

    this.renderHP();
    this.drawArena();
    this.scrollLog();
  },

  // ---- 전투 종료 ----
  endBattle() {
    if (this.autoTimer) { clearInterval(this.autoTimer); this.autoTimer = null; }
    const survivors = this.alive();
    if (survivors.length === 1) {
      this.addLog('system', `🏆 ${survivors[0].name} 승리!`);
    } else if (survivors.length === 0) {
      this.addLog('system', '⚔️ 전원 동시 사망! 최후 HP 비율로 결정');
    } else {
      this.addLog('system', '⏱️ 최대 턴 도달! HP 비율로 순위 결정');
    }
    this.renderHP();
    this.drawArena();
    this.scrollLog();
    setTimeout(() => Results.show(this.fighters, this.turn, this.totalDamage), 600);
  },

  toggleAuto() {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
      document.getElementById('btn-auto').textContent = '⏩ 자동 진행';
    } else {
      document.getElementById('btn-auto').textContent = '⏸ 일시정지';
      this.autoTimer = setInterval(() => {
        const survivors = this.alive();
        if (survivors.length <= 1 || this.turn >= 30) {
          clearInterval(this.autoTimer); this.autoTimer = null;
          document.getElementById('btn-auto').textContent = '⏩ 자동 진행';
          this.endBattle();
        } else {
          this.nextTurn();
        }
      }, 600);
    }
  },

  addLog(type, msg) {
    this.logs.push({ type, msg });
  },

  scrollLog() {
    const el = document.getElementById('battle-log');
    el.innerHTML = this.logs.slice(-60).map(l =>
      `<div class="log-${l.type}">${l.msg}</div>`
    ).join('');
    el.scrollTop = el.scrollHeight;
  },

  renderHP() {
    const panel = document.getElementById('hp-panel');
    panel.innerHTML = this.fighters.map(f => {
      const pct = Math.max(0, f.hp / f.maxHp * 100);
      const barColor = pct > 50 ? 'var(--hp-green)' : pct > 25 ? 'var(--hp-yellow)' : 'var(--hp-red)';
      return `<div class="hp-card ${f.alive ? '' : 'dead'}">
        <div class="hp-card-name"><span style="color:${f.color}">${f.name}</span><span>${f.alive ? '' : '💀'}</span></div>
        <div class="hp-bar-outer"><div class="hp-bar-inner" style="width:${pct}%;background:${barColor}"></div></div>
        <div class="hp-val">${Math.max(0,f.hp)} / ${f.maxHp}</div>
      </div>`;
    }).join('');
    this.scrollLog();
  },

  // ---- Canvas 렌더 ----
  drawArena() {
    const canvas = document.getElementById('arena-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) / (this.maxRadius * 2 + 20);

    ctx.clearRect(0, 0, W, H);

    // 배경
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, W, H);

    // 격자
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // 아레나 경계
    ctx.strokeStyle = this.turn >= 15 ? '#84cc16' : '#2a2a45';
    ctx.lineWidth = this.turn >= 15 ? 2 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, this.currentRadius * scale, 0, Math.PI * 2);
    ctx.stroke();

    // 최대 반경 (희미)
    if (this.currentRadius < this.maxRadius) {
      ctx.strokeStyle = '#1a2a1a';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, this.maxRadius * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 캐릭터
    this.fighters.forEach((f, i) => {
      const sx = cx + f.x * scale;
      const sy = cy + f.y * scale;

      if (!f.alive) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }

      // 원
      ctx.fillStyle = f.color + '33';
      ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.stroke();

      // 번호
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i + 1, sx, sy);

      // 이름
      ctx.fillStyle = f.color;
      ctx.font = '9px sans-serif';
      ctx.fillText(f.name.slice(0, 6), sx, sy - 18);

      // HP 바
      const barW = 26;
      const hpPct = f.hp / f.maxHp;
      const barColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(sx - barW/2, sy + 14, barW, 4);
      ctx.fillStyle = barColor;
      ctx.fillRect(sx - barW/2, sy + 14, barW * hpPct, 4);
    });
  }
};

console.log('[Brawl] Part 4 loaded: Battle Engine');

/* ============================================================
   PART 5: RESULTS, RECORDS & INIT
============================================================ */

const Results = {
  show(fighters, totalTurns, totalDamage) {
    Screen.show('results');

    // 순위 계산
    const ranked = [...fighters].sort((a, b) => {
      if (a.alive && !b.alive) return -1;
      if (!a.alive && b.alive) return 1;
      if (a.alive && b.alive) return b.hp / b.maxHp - a.hp / a.maxHp;
      // 둘 다 사망: 생존 턴 내림차순 → 남은 HP% 내림차순
      if (a.deathTurn !== b.deathTurn) return b.deathTurn - a.deathTurn;
      return (b.deathHp / b.maxHp) - (a.deathHp / a.maxHp);
    });

    const medals = ['🥇', '🥈', '🥉'];
    const tbody = document.getElementById('results-body');
    tbody.innerHTML = '';
    ranked.forEach((f, i) => {
      const tr = document.createElement('tr');
      tr.className = i < 3 ? `rank-${i+1}` : '';
      const medal = medals[i] || `${i+1}위`;
      const survivedTurn = f.alive ? totalTurns : (f.deathTurn || '?');
      const cause = f.alive ? '최후 생존' : (f.deathCause || '전투 중 사망');
      tr.innerHTML = `
        <td>${medal} ${i+1}위</td>
        <td><span style="color:${f.color}">${f.name}</span></td>
        <td>${survivedTurn}턴</td>
        <td>${cause}</td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('results-stats').textContent =
      `총 ${totalTurns}턴 | 총 피해량 ${totalDamage}`;

    // 전적 저장
    Storage.addRecord({
      date: new Date().toLocaleDateString('ko-KR'),
      winner: ranked[0].name,
      participants: ranked.map(f => f.name),
      turns: totalTurns,
      damage: totalDamage
    });
  }
};

const Records = {
  render() {
    const records = Storage.getRecords();
    const container = document.getElementById('records-content');
    if (records.length === 0) {
      container.innerHTML = '<div class="no-records">전적이 없습니다. 전투를 시작해보세요!</div>';
      return;
    }
    container.innerHTML = records.map((r, i) => `
      <div class="record-item">
        <div class="record-header">
          <span>#${i+1}</span><span>${r.date}</span>
        </div>
        <div class="record-result">🏆 ${r.winner} 승리</div>
        <div style="font-size:12px;color:var(--text-dim);margin-top:4px">
          참가: ${r.participants.join(', ')} | ${r.turns}턴 | 총 피해 ${r.damage}
        </div>
      </div>
    `).join('');
  }
};

/* ---- 초기화 ---- */
window.addEventListener('DOMContentLoaded', () => {
  // 기본 캐릭터 없으면 샘플 추가
  if (Storage.getChars().length === 0) {
    Storage.saveChars([{
      name: 'Player',
      stats: { hp_stat: 3, str: 3, agi: 4, luk: 3, int: 3 },
      skills: [
        { subtype: '근거리 공격', lv: 3 },
        { subtype: '이동 공격', lv: 3 },
        { subtype: '데미지 감소', lv: 2 },
        { subtype: '회복', lv: 2 },
      ],
      priority: [0, 1, 2, 3],
      isPlayer: true
    }]);
  }
  Screen.show('main');
  console.log('[Brawl] Game ready!');
});

console.log('[Brawl] Part 5 loaded: Results & Records');
