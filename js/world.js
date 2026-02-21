// ========================
// HOME
// ========================
function renderHome() {
  updateHeader();
  const h = G.hippos[0];
  document.getElementById('home-hippo-emoji').textContent = h ? h.emoji : '🦛';
  document.getElementById('home-player-name').textContent = G.playerName;
  document.getElementById('home-xp').textContent = G.xp + ' / ' + G.xpNeeded;
  document.getElementById('home-xp-bar').style.width = (G.xp / G.xpNeeded * 100) + '%';
  document.getElementById('home-wins').textContent = G.wins;
  document.getElementById('home-losses').textContent = G.losses;
  document.getElementById('home-elo').textContent = G.elo;
  document.getElementById('home-hippos').textContent = G.hippos.length;
  const titles = ['Новобранец','Воин','Ветеран','Чемпион','Легенда','Бог бегемотов'];
  document.getElementById('home-player-title').textContent = titles[Math.min(Math.floor(G.level/10), titles.length-1)];
  if (!G.quests.length || G.questsDate !== new Date().toDateString()) {
    G.quests = [
      { emoji:'⚔️', name:'Победить в 3 боях', goal:3, progress:0, reward:100, done:false },
      { emoji:'📦', name:'Открыть 2 кейса', goal:2, progress:0, reward:50, done:false },
      { emoji:'🌍', name:'Исследовать локацию', goal:1, progress:0, reward:75, done:false },
      { emoji:'💪', name:'Улучшить характеристику', goal:1, progress:0, reward:60, done:false },
    ];
    G.questsDate = new Date().toDateString();
    saveGame();
  }
  document.getElementById('daily-quests').innerHTML = G.quests.map((q, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:10px;margin-bottom:8px">
      <div style="font-size:22px">${q.emoji}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${q.name}</div>
        <div style="font-size:11px;color:var(--text2)">${q.progress}/${q.goal}</div>
        <div class="progress-bar" style="margin-top:3px"><div class="progress-fill xp" style="width:${Math.min(100,q.progress/q.goal*100)}%"></div></div>
      </div>
      <div style="text-align:right;font-size:12px">
        <div style="color:var(--gold)">🪙 ${q.reward}</div>
        ${q.done ? '<div style="color:var(--success);font-weight:700">✓</div>' : `<button class="btn btn-xs btn-primary" onclick="claimQuest(${i})" ${q.progress<q.goal?'disabled':''}>Забрать</button>`}
      </div>
    </div>
  `).join('');
  const events = [
    { emoji:'🌋', text:'Вулкан активен! +50% лута', color:'#ff6b00' },
    { emoji:'☀️', text:'Двойной опыт!', color:'var(--gold)' },
    { emoji:'🏆', text:'Сезон 1 заканчивается через 3 дня', color:'var(--accent)' },
  ];
  document.getElementById('world-events').innerHTML = events.map(e => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:10px;margin-bottom:6px;border-left:3px solid ${e.color}">
      <span style="font-size:20px">${e.emoji}</span><span style="font-size:12px">${e.text}</span>
    </div>
  `).join('');
}

function claimQuest(i) {
  const q = G.quests[i];
  if (!q || q.done || q.progress < q.goal) return;
  q.done = true; G.coins += q.reward;
  toast(`🎉 +${q.reward} монет`, 'success');
  saveGame(); renderHome();
}

// ========================
// CASES
// ========================
function renderCases() {
  document.getElementById('cases-grid').innerHTML = CASES_DEF.map(c => `
    <div class="case-card" onclick="openCase('${c.id}')">
      <span class="case-emoji">${c.emoji}</span>
      <div class="case-name">${c.name}</div>
      <div class="case-price">${c.currency==='coins'?'🪙':'💎'} ${c.price}</div>
      <div class="case-odds">${c.desc}</div>
    </div>
  `).join('');
  document.getElementById('total-opens').textContent = G.totalOpens;
  document.getElementById('legendary-opens').textContent = G.legendaryOpens;
  document.getElementById('mythic-opens').textContent = G.mythicOpens;
}

function openCase(caseId) {
  const def = CASES_DEF.find(c => c.id === caseId);
  if (!def) return;
  const balance = def.currency === 'coins' ? G.coins : G.gems;
  if (balance < def.price) { toast(`Нужно ${def.price} ${def.currency==='coins'?'монет':'гемов'}!`, 'error'); return; }
  if (def.currency === 'coins') G.coins -= def.price; else G.gems -= def.price;
  const rarity = rollRarity(def.rarities);
  const hippo = generateHippo(rarity);
  if (caseId === 'mutant' && !hippo.mutations.length) hippo.mutations.push(MUTATIONS[Math.floor(Math.random()*MUTATIONS.length)].id);
  G.hippos.push(hippo); G.totalOpens++;
  if (rarity==='legendary') G.legendaryOpens++;
  if (rarity==='mythic') G.mythicOpens++;
  addXP(10); updateHeader(); saveGame();
  const mutHtml = hippo.mutations.map(mId => { const m=MUTATIONS.find(x=>x.id===mId); return m?`<span style="font-size:20px">${m.emoji}</span>`:''; }).join('');
  openModal(`${def.emoji} Открытие кейса!`, `
    <div style="text-align:center;padding:16px">
      ${['legendary','mythic'].includes(rarity)?'<div style="font-size:24px;margin-bottom:8px;animation:vsPulse 1s infinite">⭐⭐⭐</div>':''}
      <div style="font-size:72px;margin-bottom:10px;animation:float 2s ease-in-out infinite">${hippo.emoji}</div>
      <div style="font-family:var(--font-title);font-size:20px;font-weight:900;margin-bottom:6px">${hippo.name}</div>
      <div style="color:${getRarityColor(rarity)};font-size:14px;font-weight:700;margin-bottom:14px">✦ ${getRarityName(rarity)} ✦</div>
      <div style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin-bottom:14px">
        <span class="stat-tag str">💪 ${hippo.stats.str}</span><span class="stat-tag agi">⚡ ${hippo.stats.agi}</span>
        <span class="stat-tag int">🧠 ${hippo.stats.int}</span><span class="stat-tag vit">❤️ ${hippo.stats.vit}</span><span class="stat-tag lck">🍀 ${hippo.stats.lck}</span>
      </div>
      ${hippo.mutations.length?`<div style="margin-bottom:12px"><div style="font-size:11px;color:var(--text2);margin-bottom:4px">🧬 Мутации:</div>${mutHtml}</div>`:''}
      <button class="btn btn-primary" onclick="closeModal()">🎉 Отлично!</button>
    </div>
  `);
  if (G.quests[1]) G.quests[1].progress = Math.min(G.quests[1].goal, (G.quests[1].progress||0)+1);
}

// ========================
// INVENTORY
// ========================
let invFilter = 'all';
function renderInventory() { renderInventoryGrid(); renderEquipSlots(); renderEquipHippoSelect(); }
function filterInventory(t) { invFilter = t; renderInventoryGrid(); }

function renderInventoryGrid() {
  const grid = document.getElementById('inventory-grid');
  const items = G.inventory.filter(i => invFilter==='all' || i.type===invFilter);
  if (!items.length) { grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">🎒</span><div class="empty-text">Пусто</div><button class="btn btn-sm btn-primary" onclick="setTabByName('shop')" style="margin-top:10px">🛒 Магазин</button></div>`; return; }
  grid.innerHTML = items.map((item, idx) => `
    <div class="shop-item" onclick="selectUpgradeItem(${idx})" style="cursor:pointer;border:2px solid ${G.selectedUpgradeItem===idx?'var(--accent)':'var(--border)'}">
      <span class="item-emoji">${item.emoji}</span>
      <div class="item-name">${item.name}</div>
      <div style="font-size:9px;color:${getRarityColor(item.rarity)};font-weight:700;margin-bottom:3px">${getRarityName(item.rarity)}</div>
      <div class="item-stat">${Object.entries(item.bonus||{}).map(([k,v])=>`+${v} ${k}`).join(' ')}</div>
      <div style="font-size:10px;color:var(--text3)">Ур.${item.upgradeLevel||0}</div>
      <button class="btn btn-xs btn-secondary" onclick="event.stopPropagation();equipItemToHippo('${item.id}')" style="margin-top:5px">Надеть</button>
    </div>
  `).join('');
}

function renderEquipHippoSelect() {
  const div = document.getElementById('equip-hippo-select');
  if (!div) return;
  div.innerHTML = G.hippos.map((h,i) => `<button class="btn btn-xs ${G.equippedHippo===i?'btn-primary':'btn-secondary'}" onclick="G.equippedHippo=${i};renderInventory()" style="margin:3px">${h.emoji} ${h.name}</button>`).join('');
}

function renderEquipSlots() {
  const hippo = G.hippos[G.equippedHippo||0];
  if (!hippo) return;
  ['weapon','armor','accessory','artifact'].forEach(slot => {
    const el = document.getElementById('slot-'+slot);
    if (!el) return;
    const item = hippo.equipped?.[slot] ? G.inventory.find(i=>i.id===hippo.equipped[slot]) : null;
    el.textContent = item ? `${item.emoji} ${item.name}` : 'Пусто';
  });
  const statsDiv = document.getElementById('equipped-stats');
  if (statsDiv) {
    const bonus = getEquipBonus(hippo);
    statsDiv.innerHTML = Object.entries(hippo.stats).map(([k,v]) => `
      <div class="stat-mini"><span>${{str:'💪',agi:'⚡',int:'🧠',vit:'❤️',lck:'🍀'}[k]} ${k.toUpperCase()}</span>
      <span style="font-weight:700">${v}${bonus[k]?`<span style="color:var(--success)"> +${bonus[k]}</span>`:''}</span></div>
    `).join('');
  }
}

function equipItemToHippo(itemId) {
  const item = G.inventory.find(i=>i.id===itemId);
  if (!item) return;
  const hippo = G.hippos[G.equippedHippo||0];
  if (!hippo) { toast('Выбери бегемота!','error'); return; }
  if (!hippo.equipped) hippo.equipped = {};
  hippo.equipped[item.type] = itemId;
  saveGame(); renderEquipSlots();
  toast(`✅ ${item.emoji} надет на ${hippo.name}`, 'success');
}

function selectUpgradeItem(idx) {
  G.selectedUpgradeItem = idx;
  const item = G.inventory[idx];
  if (!item) return;
  const el = document.getElementById('selected-upgrade-item');
  if (el) el.innerHTML = `<div class="upgrade-item-row"><span class="upgrade-item-emoji">${item.emoji}</span><div class="upgrade-item-info"><div class="upgrade-item-name">${item.name}</div><div class="upgrade-item-level">+${item.upgradeLevel||0}</div></div></div>`;
  const chance = Math.max(10, 75-(item.upgradeLevel||0)*8);
  const el2 = document.getElementById('upgrade-chance-val');
  if (el2) el2.textContent = chance+'%';
  const btn = document.getElementById('upgrade-btn');
  if (btn) btn.disabled = false;
  renderInventoryGrid();
}

function upgradeItem() {
  const idx = G.selectedUpgradeItem;
  if (idx===null||idx===undefined) return;
  const item = G.inventory[idx];
  if (!item) return;
  const cost = 100+(item.upgradeLevel||0)*50;
  if (G.coins < cost) { toast(`Нужно 🪙 ${cost}`,'error'); return; }
  G.coins -= cost;
  const chance = Math.max(10, 75-(item.upgradeLevel||0)*8)/100;
  G.upgradePity = (G.upgradePity||0)+1;
  if (Math.random() < chance || G.upgradePity >= 10) {
    item.upgradeLevel = (item.upgradeLevel||0)+1;
    Object.entries(item.bonus||{}).forEach(([k,v])=>{item.bonus[k]=v+1;});
    G.upgradePity = 0;
    toast(`⚡ +${item.upgradeLevel}!`, 'success');
    if (G.quests[3]) G.quests[3].progress = 1;
  } else {
    toast('💔 Не удалось!', 'error');
  }
  saveGame(); updateHeader(); renderInventory();
}

// ========================
// HIPPOS
// ========================
function renderHippos() {
  const grid = document.getElementById('hippos-grid');
  if (!G.hippos.length) { grid.innerHTML=`<div class="empty-state"><span class="empty-icon">🦛</span><div class="empty-text">Нет бегемотов</div><button class="btn btn-primary btn-sm" onclick="setTabByName('cases')" style="margin-top:10px">📦 Кейсы</button></div>`; return; }
  grid.innerHTML = G.hippos.map((h,i) => `
    <div class="hippo-card rarity-${h.rarity} ${selectedHippo===i?'selected':''}" onclick="showHippoDetail(${i})">
      <span class="hippo-emoji">${h.emoji}</span>
      <div class="hippo-name">${h.name}</div>
      <div class="rarity-badge">${getRarityName(h.rarity)}</div>
      <div class="hippo-level">Ур.${h.level} | HP:${getHippoHP(h)}</div>
      ${['str','agi','vit'].map(k=>`<div class="stat-mini"><span>${{str:'💪',agi:'⚡',vit:'❤️'}[k]}</span><span>${h.stats[k]}</span></div><div class="stat-bar"><div class="stat-bar-fill" style="width:${Math.min(100,h.stats[k]/50*100)}%;background:${{str:'#f87171',agi:'#60d4f8',vit:'#10b981'}[k]}"></div></div>`).join('')}
      <div class="hippo-badges">${h.mutations.map(mId=>{const m=MUTATIONS.find(x=>x.id===mId);return m?`<span title="${m.name}">${m.emoji}</span>`:''}).join('')}</div>
      ${h.inValhalla?'<div style="color:#ff6600;font-size:10px;margin-top:4px">💀 Вальхалла</div>':''}
    </div>
  `).join('');
}

function showHippoDetail(idx) {
  selectedHippo = idx;
  const h = G.hippos[idx];
  if (!h) return;
  const panel = document.getElementById('hippo-detail-panel');
  const mutHtml = h.mutations.map(mId=>{const m=MUTATIONS.find(x=>x.id===mId);return m?`<div style="display:flex;align-items:center;gap:8px;padding:6px;background:var(--bg3);border-radius:8px;font-size:11px;margin-bottom:4px">${m.emoji}<div><div style="font-weight:600">${m.name}</div><div style="color:var(--text2)">${m.desc}</div></div></div>`:''}).join('');
  panel.innerHTML = `
    <div class="card">
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:56px">${h.emoji}</div>
        <div style="font-family:var(--font-title);font-size:15px;font-weight:700;margin:5px 0">${h.name}</div>
        <div style="color:${getRarityColor(h.rarity)};font-weight:700;font-size:12px">✦ ${getRarityName(h.rarity)} ✦</div>
        <div style="font-size:11px;color:var(--text2);margin-top:3px">Ур.${h.level} | Смертей: ${h.deaths}/20 | ${h.wins}W/${h.losses}L</div>
        ${h.deaths>=15?'<div style="color:var(--danger);font-size:10px;margin-top:2px">⚠️ Опасно!</div>':''}
        ${h.inValhalla?'<div style="color:#ff6600;font-size:11px;font-weight:700;margin-top:3px">💀 Вальхалла</div>':''}
      </div>
      <div class="card-title" style="font-size:12px">📊 Характеристики</div>
      ${Object.entries(h.stats).map(([k,v])=>`
        <div class="stat-mini"><span>${{str:'💪 Сила',agi:'⚡ Лов.',int:'🧠 Инт.',vit:'❤️ Вын.',lck:'🍀 Удача'}[k]}</span><span style="font-weight:700">${v}</span></div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${Math.min(100,v/50*100)}%;background:${{str:'#f87171',agi:'#60d4f8',int:'#a855f7',vit:'#10b981',lck:'#f59e0b'}[k]}"></div></div>
      `).join('')}
      <div class="divider"></div>
      <div class="card-title" style="font-size:12px">⚡ Прокачка</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">
        ${Object.keys(h.stats).map(k=>`<button class="btn btn-xs btn-secondary" onclick="upgradeHippoStat(${idx},'${k}')">+${k.toUpperCase()} (🪙${100+h.level*20})</button>`).join('')}
      </div>
      <div class="card-title" style="font-size:12px">🧬 Мутации</div>
      ${mutHtml||'<div style="font-size:12px;color:var(--text3)">Нет мутаций</div>'}
      ${h.mutations.length<3?`<button class="btn btn-xs btn-purple" onclick="tryMutation(${idx})" style="margin-top:6px">🧬 Мутация (💎50)</button>`:''}
      <div class="divider"></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="setTabByName('arena')">⚔️ Арена</button>
        <button class="btn btn-sm btn-secondary" onclick="sendExpedition(${idx})">🧭 Экспедиция</button>
        <button class="btn btn-sm btn-danger" onclick="releaseHippo(${idx})">🗑️ Отпустить</button>
      </div>
    </div>
  `;
  renderHippos();
}

function upgradeHippoStat(hippoIdx, stat) {
  const h = G.hippos[hippoIdx];
  if (!h) return;
  const cost = 100+h.level*20;
  if (G.coins<cost) { toast(`Нужно 🪙 ${cost}`,'error'); return; }
  G.coins -= cost; h.stats[stat]++;
  addXP(5); saveGame(); showHippoDetail(hippoIdx);
  toast(`✅ ${stat.toUpperCase()} → ${h.stats[stat]}`, 'success');
  if (G.quests[3]) G.quests[3].progress = 1;
}

function tryMutation(hippoIdx) {
  const h = G.hippos[hippoIdx];
  if (!h) return;
  if (G.gems<50) { toast('Нужно 💎 50','error'); return; }
  G.gems -= 50;
  if (Math.random()<0.4) {
    const available = MUTATIONS.filter(m=>!h.mutations.includes(m.id));
    if (!available.length) { toast('Все мутации есть!','success'); return; }
    const mut = available[Math.floor(Math.random()*available.length)];
    h.mutations.push(mut.id);
    toast(`🧬 ${mut.emoji} ${mut.name}!`, 'legendary');
  } else { toast('🧬 Не прошла...','error'); }
  saveGame(); updateHeader(); showHippoDetail(hippoIdx);
}

function releaseHippo(idx) {
  if (!confirm('Отпустить бегемота?')) return;
  const h = G.hippos.splice(idx,1)[0];
  G.coins += {common:50,uncommon:100,rare:250,epic:500,legendary:1000,mythic:5000}[h.rarity]||50;
  toast(`${h.name} отпущен`,'success');
  saveGame(); selectedHippo=null; renderHippos();
  document.getElementById('hippo-detail-panel').innerHTML='<div class="empty-state"><span class="empty-icon">🦛</span><div class="empty-text">Выберите бегемота</div></div>';
}

// ========================
// WORLD
// ========================
function renderWorld() {
  document.getElementById('world-map-grid').innerHTML = G.regions.map(r=>`
    <div class="map-region ${r.locked?'locked':''} ${r.pvp?'pvp-zone':''}" onclick="${r.locked?`toast('Нужен уровень ${r.level}!','error')`:`openRegion('${r.id}')`}">
      ${r.king?`<div class="region-king">👑</div>`:''}
      <div class="region-level">Ур.${r.level}</div>
      <span class="region-icon">${r.emoji}</span>
      <div class="region-name">${r.name}</div>
      <div class="region-desc">${r.desc}</div>
      ${r.pvp?'<div style="margin-top:4px"><span class="tag tag-pvp">⚔️ PvP</span></div>':''}
      ${r.locked?'<div style="font-size:10px;color:var(--danger);margin-top:3px">🔒</div>':''}
    </div>
  `).join('');
  renderExpeditions();
}

function openRegion(regionId) {
  const r = G.regions.find(r=>r.id===regionId);
  if (!r) return;
  if (G.level<r.level) { toast(`Нужен уровень ${r.level}!`,'error'); return; }
  openModal(`${r.emoji} ${r.name}`,`
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:52px;margin-bottom:6px">${r.emoji}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px">${r.desc}</div>
      ${r.pvp?'<div style="color:var(--danger);font-size:12px;margin-bottom:8px">⚠️ PvP зона!</div>':''}
      ${r.king?`<div style="font-size:12px;margin-bottom:8px">👑 Король: <strong style="color:var(--gold)">${r.king}</strong></div>`:''}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-primary btn-full" onclick="sendExpeditionToRegion('${regionId}');closeModal()">🧭 Экспедиция (30 мин)</button>
      <button class="btn btn-secondary btn-full" onclick="sendExpeditionToRegion('${regionId}',true);closeModal()">⚡ Мгновенно (💎20)</button>
      ${r.pvp?`<button class="btn btn-danger btn-full" onclick="closeModal();startArena('casual')">⚔️ PvP бой</button>`:''}
      ${!r.king?`<button class="btn btn-gold btn-full" onclick="claimKingdom('${regionId}');closeModal()">👑 Стать королём (💎100)</button>`:''}
    </div>
  `);
}

function sendExpeditionToRegion(regionId, instant=false) {
  if (!G.hippos.length) { toast('Нужен бегемот!','error'); return; }
  if (instant && G.gems<20) { toast('Нужно 💎 20','error'); return; }
  if (instant) G.gems -= 20;
  const r = G.regions.find(r=>r.id===regionId);
  const hippo = G.hippos[0];
  const endTime = Date.now()+(instant?0:30*60*1000);
  G.expeditions.push({id:'exp_'+Date.now(),hippoName:hippo.name,hippoEmoji:hippo.emoji,regionName:r?.name||regionId,regionEmoji:r?.emoji||'🗺️',endTime,claimed:false});
  if (instant) setTimeout(()=>claimExpedition(G.expeditions.length-1),100);
  else toast(`🧭 ${hippo.name} в ${r?.name||regionId}!`,'success');
  if (G.quests[2]) G.quests[2].progress=1;
  saveGame(); renderWorld();
}

function sendExpedition(hippoIdx) {
  const available = G.regions.filter(r=>!r.locked && G.level>=r.level);
  if (!available.length) return;
  sendExpeditionToRegion(available[Math.floor(Math.random()*available.length)].id);
}

function claimExpedition(idx) {
  const exp = G.expeditions[idx];
  if (!exp||exp.claimed) return;
  if (Date.now()<exp.endTime) { toast('Ещё не готово!','error'); return; }
  exp.claimed = true;
  const coins = 50+Math.floor(Math.random()*150);
  G.coins += coins; addXP(30);
  if (Math.random()<0.4) {
    const item = {...ALL_ITEMS[Math.floor(Math.random()*ALL_ITEMS.length)],id:'inv_'+Date.now(),upgradeLevel:0};
    G.inventory.push(item);
    toast(`🎁 +${coins}🪙 + ${item.emoji} ${item.name}!`,'success');
  } else { toast(`🎁 +${coins}🪙`,'success'); }
  saveGame(); renderWorld();
}

function renderExpeditions() {
  const list = document.getElementById('expeditions-list');
  const active = G.expeditions.filter(e=>!e.claimed);
  if (!active.length) { list.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px">Нет экспедиций</div>'; return; }
  list.innerHTML = active.map(exp=>{
    const timeLeft = Math.max(0,exp.endTime-Date.now());
    const mins = Math.floor(timeLeft/60000);
    const secs = Math.floor((timeLeft%60000)/1000);
    const done = timeLeft<=0;
    const realIdx = G.expeditions.indexOf(exp);
    return `<div class="expedition-card">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:28px">${exp.hippoEmoji}</span>
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">${exp.hippoName} → ${exp.regionEmoji} ${exp.regionName}</div>
          <div class="expedition-timer">${done?'✅ Готово!':`${mins}:${String(secs).padStart(2,'0')}`}</div>
        </div>
        <button class="btn btn-sm ${done?'btn-primary':'btn-secondary'}" onclick="claimExpedition(${realIdx})" ${done?'':'disabled'}>${done?'🎁 Забрать':'⏳'}</button>
      </div>
    </div>`;
  }).join('');
}

function claimKingdom(regionId) {
  if (G.gems<100) { toast('Нужно 💎 100','error'); return; }
  G.gems -= 100;
  const r = G.regions.find(r=>r.id===regionId);
  if (r) { r.king=G.playerName; toast(`👑 Ты король ${r.name}!`,'legendary',5000); }
  saveGame(); updateHeader(); renderWorld();
}

// ========================
// CLANS
// ========================
function renderClans() {
  const myClanDiv = document.getElementById('my-clan-info');
  const clanListDiv = document.getElementById('clan-list');
  const warDiv = document.getElementById('clan-war-info');
  if (!G.clan) {
    myClanDiv.innerHTML=`<div class="empty-state"><span class="empty-icon">🏰</span><div class="empty-text">Ты не в клане</div><button class="btn btn-primary btn-sm" onclick="createClan()" style="margin-top:10px">+ Создать (💎50)</button></div>`;
  } else {
    myClanDiv.innerHTML=`<div style="text-align:center;padding:12px"><div style="font-size:44px">${G.clan.emoji}</div><div style="font-family:var(--font-title);font-size:16px;font-weight:700;margin:5px 0">${G.clan.name}</div><div style="color:var(--text2);font-size:12px">Лидер: ${G.clan.leader}</div></div><button class="btn btn-sm btn-danger" style="margin-top:6px" onclick="G.clan=null;saveGame();renderClans()">🚪 Выйти</button>`;
  }
  clanListDiv.innerHTML = DEMO_CLANS.map(c=>`
    <div class="clan-card" onclick="joinClan('${c.id}')">
      <span class="clan-emoji">${c.emoji}</span>
      <div style="flex:1"><div class="clan-name">${c.name}</div><div class="clan-sub">👤 ${c.members} | ${c.leader}${c.war?' <span class="tag tag-hot">⚔️ Война</span>':''}</div></div>
      <div class="clan-power">⚡${(c.power/1000).toFixed(0)}K</div>
    </div>
  `).join('');
  warDiv.innerHTML=`<div style="text-align:center;margin-bottom:14px"><div style="font-size:40px">⚔️</div><div style="font-family:var(--font-title);font-size:13px;font-weight:700;margin:5px 0">Война кланов</div><div style="font-size:11px;color:var(--text2)">Осталось 2 дня</div></div>${DEMO_CLANS.filter(c=>c.war).map(c=>`<div style="background:var(--bg3);border-radius:10px;padding:10px;margin-bottom:6px;display:flex;align-items:center;gap:10px"><span style="font-size:20px">${c.emoji}</span><div style="flex:1"><div style="font-weight:700;font-size:12px">${c.name}</div></div><div style="font-family:var(--font-title);font-weight:700;color:var(--gold)">#${DEMO_CLANS.filter(d=>d.war).indexOf(c)+1}</div></div>`).join('')}<button class="btn btn-danger btn-sm btn-full" style="margin-top:8px" onclick="toast('Нужно быть в клане!','error')">⚔️ Атаковать</button>`;
}

function createClan() {
  openModal('🏰 Создать клан',`<div class="form-group"><label class="form-label">Название</label><input class="form-input" id="new-clan-name" placeholder="Степные Волки..."></div><div class="form-group"><label class="form-label">Эмодзи</label><input class="form-input" id="new-clan-emoji" placeholder="🐺" maxlength="2"></div><div style="color:var(--text2);font-size:12px;margin-bottom:12px">Стоимость: 💎 50</div><button class="btn btn-primary btn-full" onclick="confirmCreateClan()">Создать</button>`);
}

function confirmCreateClan() {
  const name = document.getElementById('new-clan-name')?.value.trim();
  const emoji = document.getElementById('new-clan-emoji')?.value.trim()||'🏰';
  if (!name) { toast('Введите название!','error'); return; }
  if (G.gems<50) { toast('Нужно 💎 50','error'); return; }
  G.gems -= 50; G.clan={name,emoji,leader:G.playerName,power:100,members:1};
  saveGame(); closeModal(); updateHeader(); renderClans();
  toast(`🏰 Клан "${name}" создан!`,'success');
}

function joinClan(clanId) {
  const clan = DEMO_CLANS.find(c=>c.id===clanId);
  if (!clan) return;
  G.clan = {...clan,members:clan.members+1};
  saveGame(); renderClans();
  toast(`Ты в клане ${clan.name}!`,'success');
}

// ========================
// LEADERBOARD
// ========================
async function loadLeaderboard(type) {
  const list = document.getElementById('leaderboard-list');
  list.innerHTML='<div style="text-align:center;padding:20px"><div class="queue-spinner" style="margin:0 auto 8px"></div><div style="font-size:12px;color:var(--text2)">Загрузка...</div></div>';
  let entries = [];
  if (G.token) {
    try {
      const res = await fetch(`/api/players/leaderboard?type=${type}`,{headers:{'Authorization':'Bearer '+G.token}});
      if (res.ok) entries = await res.json();
    } catch {}
  }
  if (!entries.length) {
    const myEntry = {username:G.playerName,elo:G.elo,wins:G.wins,losses:G.losses,level:G.level,avatar:G.avatar||'🦛',isMe:true};
    entries = [myEntry,...AI_PLAYERS.map(ai=>({username:ai.name,elo:ai.elo,wins:ai.wins,losses:ai.losses,level:Math.floor(ai.elo/100),avatar:'🤖'}))];
  } else {
    entries = entries.map(e=>({...e,avatar:e.avatar||'🦛',isMe:e.id===G.playerId}));
  }
  entries.sort((a,b)=>b[type]-a[type]);
  const medals=['🥇','🥈','🥉'],rankCls=['gold','silver','bronze'];
  list.innerHTML = entries.slice(0,30).map((e,i)=>`
    <div class="leader-row" style="${e.isMe?'border:1px solid var(--accent);':''}">
      <div class="leader-rank ${rankCls[i]||''}">${medals[i]||(i+1)}</div>
      <div class="leader-emoji">${e.avatar||'🦛'}</div>
      <div class="leader-info"><div class="leader-name">${e.username} ${e.isMe?'<span style="color:var(--accent);font-size:10px">(Ты)</span>':''}</div><div class="leader-sub">⚔️ ${e.wins||0}W | Ур.${e.level||1}</div></div>
      <div class="leader-score">${type==='elo'?'🏆 '+e.elo:type==='wins'?'⚔️ '+e.wins:'Ур.'+e.level}</div>
    </div>
  `).join('');
}

// ========================
// SHOP
// ========================
function renderShop() {
  renderShopSec('shop-weapons', WEAPONS);
  renderShopSec('shop-armor', ARMORS);
  renderShopSec('shop-artifacts', ARTIFACTS);
  document.getElementById('shop-resources').innerHTML=[
    {emoji:'🪙',name:'500 монет',price:50,cur:'gems',fn:`G.coins+=500;toast('+500!','success')`},
    {emoji:'🪙',name:'2000 монет',price:150,cur:'gems',fn:`G.coins+=2000;toast('+2000!','success')`},
    {emoji:'💎',name:'50 гемов',price:500,cur:'coins',fn:`G.gems+=50;toast('+50💎!','success')`},
    {emoji:'⚡',name:'Сброс КД Босса',price:30,cur:'gems',fn:`G.bossCD=0;toast('КД сброшен!','success')`},
  ].map((item,i)=>`<div class="shop-item"><span class="item-emoji">${item.emoji}</span><div class="item-name">${item.name}</div><div class="item-price">${item.cur==='gems'?'💎':'🪙'} ${item.price}</div><button class="btn btn-xs btn-primary" style="margin-top:6px" onclick="buySpecialItem(${i})">Купить</button></div>`).join('');
}

function buySpecialItem(i) {
  const items=[
    {price:50,cur:'gems',fn:()=>{G.coins+=500;toast('+500 монет!','success');}},
    {price:150,cur:'gems',fn:()=>{G.coins+=2000;toast('+2000 монет!','success');}},
    {price:500,cur:'coins',fn:()=>{G.gems+=50;toast('+50 гемов!','success');}},
    {price:30,cur:'gems',fn:()=>{G.bossCD=0;toast('КД сброшен!','success');}},
  ];
  const item=items[i];
  if (!item) return;
  if (item.cur==='gems'&&G.gems<item.price){toast(`Нужно 💎 ${item.price}`,'error');return;}
  if (item.cur==='coins'&&G.coins<item.price){toast(`Нужно 🪙 ${item.price}`,'error');return;}
  if (item.cur==='gems') G.gems-=item.price; else G.coins-=item.price;
  item.fn(); updateHeader(); saveGame();
}

function renderShopSec(elId, items) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = items.map(item=>`
    <div class="shop-item">
      <span class="item-emoji">${item.emoji}</span>
      <div class="item-name">${item.name}</div>
      <div style="font-size:9px;color:${getRarityColor(item.rarity)};font-weight:700;margin-bottom:3px">${getRarityName(item.rarity)}</div>
      <div class="item-stat">${Object.entries(item.bonus||{}).map(([k,v])=>`+${v} ${k}`).join(' ')}</div>
      <div class="item-price">🪙 ${item.price}</div>
      <button class="btn btn-xs btn-primary" style="margin-top:6px" onclick="buyShopItem('${item.id}')">Купить</button>
    </div>
  `).join('');
}

function buyShopItem(itemId) {
  const item = ALL_ITEMS.find(i=>i.id===itemId);
  if (!item) return;
  if (G.coins<item.price) { toast(`Нужно 🪙 ${item.price}`,'error'); return; }
  G.coins -= item.price;
  G.inventory.push({...item,id:'inv_'+Date.now(),upgradeLevel:0});
  toast(`✅ ${item.emoji} ${item.name} куплен!`,'success');
  addXP(10); updateHeader(); saveGame();
}

// ========================
// VALHALLA
// ========================
function renderValhalla() {
  const valHippos = G.hippos.filter(h=>h.inValhalla);
  document.getElementById('valhalla-hippos').innerHTML = valHippos.length
    ? valHippos.map(h=>`<div style="display:inline-block;background:rgba(255,102,0,0.1);border:1px solid rgba(255,102,0,0.3);border-radius:10px;padding:5px 12px;margin:3px;font-size:12px">${h.emoji} ${h.name} — ${h.deaths}/20</div>`).join('')
    : '<div style="color:var(--text3);font-size:12px">Нет бегемотов в Вальхалле 🙏</div>';
  document.getElementById('valhalla-bosses').innerHTML = VALHALLA_BOSSES.map((boss,i)=>`
    <div class="arena-mode-card" onclick="fightValhallaBoss(${i})" style="background:linear-gradient(135deg,rgba(139,0,0,0.2),rgba(0,0,0,0.5))">
      <span class="arena-mode-icon">${boss.emoji}</span>
      <div class="arena-mode-name" style="color:#ff6600">${boss.name}</div>
      <div class="arena-mode-desc">HP: ${boss.hp} | ATK: ${boss.atk}</div>
      <div style="margin-top:8px"><span class="tag tag-hot">Победи — выйди!</span></div>
    </div>
  `).join('');
}

function fightValhallaBoss(bossIdx) {
  const valHippos = G.hippos.filter(h=>h.inValhalla);
  if (!valHippos.length) { toast('Нет бегемотов в Вальхалле!','error'); return; }
  const boss = VALHALLA_BOSSES[bossIdx];
  const hippo = valHippos[0];
  const hippoScore = getHippoHP(hippo)+getHippoATK(hippo)*(0.8+Math.random()*0.4)*3;
  const bossScore = boss.hp+boss.atk*(0.8+Math.random()*0.4)*3;
  if (hippoScore>bossScore) {
    hippo.inValhalla=false; hippo.deaths=0; G.coins+=500; addXP(200);
    toast(`⚡ ${hippo.name} вышел из Вальхаллы! +500🪙`,'legendary',5000);
  } else { toast(`💀 ${boss.name} сильнее!`,'error'); }
  saveGame(); renderValhalla();
}

// ========================
// PROFILE
// ========================
function renderProfile() {
  const div = document.getElementById('tab-profile');
  if (!div) return;
  div.innerHTML = `
    <div class="section-title">👤 Мой профиль</div>
    <div class="grid-2">
      <div class="card">
        <div style="text-align:center;padding:14px">
          <div class="profile-avatar">${G.avatar||'🦛'}</div>
          <div style="font-family:var(--font-title);font-size:18px;font-weight:700;margin-bottom:3px">${G.playerName}</div>
          <div style="color:var(--text2);font-size:12px;margin-bottom:14px">Уровень ${G.level}</div>
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:3px"><span>Опыт</span><span>${G.xp}/${G.xpNeeded}</span></div>
            <div class="progress-bar"><div class="progress-fill xp" style="width:${G.xp/G.xpNeeded*100}%"></div></div>
          </div>
          <div class="grid-2" style="gap:8px">
            <div style="background:var(--bg3);padding:10px;border-radius:10px"><div style="font-size:18px;font-weight:700;color:var(--success)">${G.wins}</div><div style="font-size:10px;color:var(--text2)">Победы</div></div>
            <div style="background:var(--bg3);padding:10px;border-radius:10px"><div style="font-size:18px;font-weight:700;color:var(--danger)">${G.losses}</div><div style="font-size:10px;color:var(--text2)">Поражения</div></div>
            <div style="background:var(--bg3);padding:10px;border-radius:10px"><div style="font-size:18px;font-weight:700;color:var(--gold)">${G.elo}</div><div style="font-size:10px;color:var(--text2)">ELO</div></div>
            <div style="background:var(--bg3);padding:10px;border-radius:10px"><div style="font-size:18px;font-weight:700;color:var(--rare)">${G.hippos.length}</div><div style="font-size:10px;color:var(--text2)">Бегемотов</div></div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="card-title" style="font-size:12px">🐾 Аватар</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          ${['🦛','🦏','🐘','🦬','🐗','🦣','🦁','🐯'].map(e=>`<button style="font-size:22px;background:${G.avatar===e?'var(--accent3)':'var(--bg3)'};border:2px solid ${G.avatar===e?'var(--accent)':'var(--border)'};border-radius:8px;padding:5px 8px;cursor:pointer" onclick="G.avatar='${e}';saveGame();renderProfile()">${e}</button>`).join('')}
        </div>
        <div class="card-title" style="font-size:12px">🎨 Тема</div>
        <div class="theme-switch-bar">
          <button class="theme-btn ${!G.theme||G.theme==='default'?'active':''}" data-theme="default" onclick="applyTheme('default')">🌑 Дефолт</button>
          <button class="theme-btn ${G.theme==='african'?'active':''}" data-theme="african" onclick="applyTheme('african')">🌍 Африка</button>
          <button class="theme-btn ${G.theme==='naruto'?'active':''}" data-theme="naruto" onclick="applyTheme('naruto')">🍥 Наруто</button>
        </div>
        ${G.token?`<div class="divider"></div><div style="font-size:12px;color:var(--text2);margin-bottom:10px">@${G.playerName}</div><button class="btn btn-danger btn-sm" onclick="logoutPlayer()">🚪 Выйти</button>`:`<div class="divider"></div><a href="/" class="btn btn-primary btn-full">🔐 Войти / Зарегистрироваться</a>`}
      </div>
      <div>
        <div class="card">
          <div class="card-title">🏆 Достижения</div>
          ${[
            {emoji:'⚔️',name:'Первая победа',desc:'Выиграй 1 бой',done:G.wins>=1},
            {emoji:'🔥',name:'10 побед',desc:'Выиграй 10 боёв',done:G.wins>=10},
            {emoji:'🦛',name:'Коллекционер',desc:'5 бегемотов',done:G.hippos.length>=5},
            {emoji:'💎',name:'Богатей',desc:'1000 монет',done:G.coins>=1000},
            {emoji:'🏆',name:'ELO 1500',desc:'Достигни ELO 1500',done:G.elo>=1500},
            {emoji:'👑',name:'Король',desc:'Стань королём региона',done:G.regions.some(r=>r.king===G.playerName)},
          ].map(a=>`<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg3);border-radius:10px;margin-bottom:6px;opacity:${a.done?1:0.5}"><span style="font-size:20px">${a.emoji}</span><div style="flex:1"><div style="font-size:12px;font-weight:600">${a.name}</div><div style="font-size:10px;color:var(--text2)">${a.desc}</div></div>${a.done?'<span style="color:var(--success);font-weight:700;font-size:16px">✓</span>':'<span style="color:var(--text3);font-size:12px">🔒</span>'}</div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// ========================
// SEARCH
// ========================
function renderSearch() {
  const div = document.getElementById('tab-search');
  if (!div) return;
  div.innerHTML = `
    <div class="section-title">🔍 Поиск игроков</div>
    <div class="card">
      <input id="search-input" type="text" class="input" placeholder="Введи имя игрока..." style="width:100%;margin-bottom:14px" oninput="doSearch(this.value)">
      <div id="search-results"></div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="card-title">👥 Друзья</div>
      <div id="friends-list"><div style="color:var(--text2);font-size:12px;padding:8px">Загрузка...</div></div>
    </div>
  `;
  loadFriendsList();
}

async function loadFriendsList() {
  const div = document.getElementById('friends-list');
  if (!div || !G.token) {
    if (div) div.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:8px">Войди чтобы видеть друзей</div>';
    return;
  }
  try {
    const res = await fetch('/api/players/friends/list', { headers: {'Authorization':'Bearer '+G.token} });
    const data = await res.json();
    if (!data.friends?.length) { div.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px">Нет друзей пока 😔</div>'; return; }
    div.innerHTML = data.friends.map(f=>`
      <div class="search-result-row">
        <div style="font-size:24px">${f.avatar||'🦛'}</div>
        <div style="flex:1"><div style="font-weight:700;font-size:13px">${f.username}</div><div style="font-size:11px;color:var(--text2)">ELO: ${f.elo} | ⚔️ ${f.wins}W</div></div>
        <span style="font-size:10px;color:${f.status==='accepted'?'var(--success)':'var(--text3)'}">${f.status==='accepted'?'✅ Друг':f.sender_id===G.playerId?'⏳ Ожидает':'👥 Входящий'}</span>
        ${f.status==='pending'&&f.sender_id!==G.playerId?`<button class="btn btn-xs btn-primary" onclick="respondFriend('${f.id}','accept')">✓</button>`:''}
      </div>
    `).join('');
  } catch { div.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px">Ошибка загрузки</div>'; }
}

async function respondFriend(id, action) {
  if (!G.token) return;
  try {
    const r = await fetch('/api/players/friends/respond',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+G.token},body:JSON.stringify({friendship_id:id,action})});
    const d = await r.json();
    toast(d.success?'✅ Готово!':d.error, d.success?'success':'error');
    loadFriendsList();
  } catch { toast('Ошибка','error'); }
}

let searchTimeout = null;
async function doSearch(q) {
  clearTimeout(searchTimeout);
  const res_div = document.getElementById('search-results');
  if (!q||q.length<2) { if (res_div) res_div.innerHTML=''; return; }
  searchTimeout = setTimeout(async ()=>{
    if (res_div) res_div.innerHTML='<div style="color:var(--text2);font-size:12px;padding:8px">Поиск...</div>';
    let players = [];
    if (G.token) {
      try {
        const r = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`,{headers:{'Authorization':'Bearer '+G.token}});
        if (r.ok) players = await r.json();
      } catch {}
    }
    if (!players.length) {
      players = AI_PLAYERS.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())).map(p=>({username:p.name,elo:p.elo,wins:p.wins,level:Math.floor(p.elo/100),avatar:'🤖',id:null}));
    }
    if (!players.length&&res_div) { res_div.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px">Никого не найдено</div>'; return; }
    if (res_div) res_div.innerHTML = players.map(p=>`
      <div class="search-result-row">
        <div style="font-size:26px">${p.avatar||'🦛'}</div>
        <div style="flex:1"><div style="font-weight:700;font-size:13px">${p.username}</div><div style="font-size:11px;color:var(--text2)">Ур.${p.level||1} | ELO: ${p.elo} | ⚔️ ${p.wins||0}W</div></div>
        <div style="display:flex;gap:5px">
          ${G.token&&p.id?`<button class="btn btn-xs btn-secondary" onclick="addFriendById('${p.id}','${p.username}')">👥</button>`:''}
        </div>
      </div>
    `).join('');
  }, 400);
}

async function addFriendById(id, username) {
  if (!G.token) return;
  try {
    const r = await fetch('/api/players/friends/add',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+G.token},body:JSON.stringify({friend_id:id})});
    const d = await r.json();
    toast(d.success?`👥 Запрос отправлен ${username}!`:d.error,'success');
  } catch { toast('Ошибка','error'); }
}

// ========================
// BOSS FIGHT TAB
// ========================
async function renderBossFightTab() {
  const div = document.getElementById('tab-bossfight');
  if (!div) return;

  div.innerHTML = `
    <div class="section-title">👹 Босс-файт сквадом</div>
    <div class="grid-2">
      <div>
        <div class="card">
          <div class="card-title">⚔️ Выбери босса</div>
          ${BOSSES.map(b=>`
            <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bg3);border:1.5px solid var(--border);border-radius:14px;margin-bottom:10px;cursor:pointer;transition:border-color 0.2s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" onclick="createBossLobby('${b.id}')">
              <span style="font-size:40px">${b.emoji}</span>
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px">${b.name}</div>
                <div style="font-size:11px;color:var(--text2)">HP: ${b.hp.toLocaleString()} | ATK: ${b.atk} | Ур.${b.level}+</div>
                <div style="font-size:10px;color:var(--rare);margin-top:2px">💎 Лут: ${b.loot}</div>
              </div>
              <button class="btn btn-sm btn-primary">Создать</button>
            </div>
          `).join('')}
        </div>
      </div>
      <div>
        <div class="card" id="boss-lobby-panel">
          <div class="empty-state">
            <span class="empty-icon">👹</span>
            <div class="empty-text">Создай лобби или введи код</div>
            <div style="margin-top:14px">
              <input class="form-input" id="invite-code-input" placeholder="Код приглашения (8 символов)..." style="margin-bottom:8px">
              <button class="btn btn-secondary btn-full" onclick="joinBossLobbyByCode()">🔑 Присоединиться</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

let currentLobbyId = null;

async function createBossLobby(bossId) {
  if (!G.token) { toast('Войди в аккаунт для мультиплеера!','error'); return; }
  try {
    const res = await fetch('/api/bossfights/create',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+G.token},body:JSON.stringify({boss_id:bossId,max_players:4})});
    const data = await res.json();
    if (!data.success) { toast(data.error,'error'); return; }
    currentLobbyId = data.lobby_id;
    showBossLobby(data.lobby_id, data.invite_code, data.boss, true);
    if (window.hwSocket) window.hwSocket.emit('join_boss_lobby',{lobby_id:data.lobby_id});
  } catch { toast('Ошибка соединения','error'); }
}

async function joinBossLobbyByCode() {
  const code = document.getElementById('invite-code-input')?.value.trim().toUpperCase();
  if (!code||code.length<4) { toast('Введи код!','error'); return; }
  if (!G.token) { toast('Войди в аккаунт!','error'); return; }
  try {
    const res = await fetch(`/api/bossfights/join/${code}`,{method:'POST',headers:{'Authorization':'Bearer '+G.token}});
    const data = await res.json();
    if (!data.success) { toast(data.error,'error'); return; }
    currentLobbyId = data.lobby.id;
    const members = JSON.parse(data.lobby.members||'[]');
    showBossLobby(data.lobby.id, code, data.lobby.boss, false, members);
    if (window.hwSocket) window.hwSocket.emit('join_boss_lobby',{lobby_id:data.lobby.id});
  } catch { toast('Лобби не найдено!','error'); }
}

function showBossLobby(lobbyId, inviteCode, boss, isHost, members=[]) {
  const panel = document.getElementById('boss-lobby-panel');
  if (!panel) return;
  
  const membersHtml = members.length ? members.map(m=>`
    <div class="lobby-member ${m.ready?'ready':''}">
      <div style="font-size:24px">🦛</div>
      <div style="flex:1"><div style="font-weight:700;font-size:13px">@${m.username}</div><div style="font-size:11px;color:var(--text2)">Игрок</div></div>
      <div class="ready-badge">${m.ready?'✅':'⏳'}</div>
    </div>
  `).join('') : `<div class="lobby-member"><div style="font-size:24px">🦛</div><div style="flex:1"><div style="font-weight:700;font-size:13px">@${G.playerName}</div></div><div class="ready-badge">⏳</div></div>`;

  panel.innerHTML = `
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:52px;margin-bottom:6px">${boss.emoji}</div>
      <div style="font-family:var(--font-title);font-size:16px;font-weight:700;margin-bottom:4px">${boss.name}</div>
      <div style="font-size:11px;color:var(--text2)">HP: ${boss.hp.toLocaleString()} | ATK: ${boss.atk} | DEF: ${boss.def}</div>
    </div>
    <div style="background:var(--bg3);border-radius:10px;padding:10px;margin-bottom:14px;text-align:center">
      <div style="font-size:11px;color:var(--text2);margin-bottom:4px">🔑 Код приглашения</div>
      <div style="font-family:var(--font-title);font-size:20px;font-weight:700;color:var(--accent);letter-spacing:3px">${inviteCode}</div>
      <button class="btn btn-xs btn-secondary" style="margin-top:6px" onclick="navigator.clipboard.writeText('${inviteCode}').then(()=>toast('Скопировано!','success'))">📋 Скопировать</button>
    </div>
    <div class="card-title" style="font-size:12px">👥 Участники сквада</div>
    <div id="lobby-members">${membersHtml}</div>
    <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
      ${isHost?`<button class="btn btn-primary btn-full" id="start-boss-btn" onclick="startBossFight('${lobbyId}')">⚔️ Начать бой!</button>`:'<div style="font-size:13px;color:var(--text2);text-align:center;padding:10px">Ждём хоста...</div>'}
      <button class="btn btn-secondary btn-full" onclick="toast('Готов!','success');if(window.hwSocket)window.hwSocket.emit('boss_lobby_ready',{lobby_id:'${lobbyId}',ready:true})">✅ Готов</button>
    </div>
  `;
}

async function startBossFight(lobbyId) {
  if (!G.token) return;
  const btn = document.getElementById('start-boss-btn');
  if (btn) { btn.disabled=true; btn.textContent='⏳ Идёт бой...'; }
  try {
    const res = await fetch(`/api/bossfights/${lobbyId}/start`,{method:'POST',headers:{'Authorization':'Bearer '+G.token}});
    const data = await res.json();
    if (!data.success) { toast(data.error,'error'); if (btn){btn.disabled=false;btn.textContent='⚔️ Начать бой!';} return; }
    showBossFightResult(data);
  } catch { toast('Ошибка','error'); if (btn){btn.disabled=false;btn.textContent='⚔️ Начать бой!';} }
}

function showBossFightResult(data) {
  const panel = document.getElementById('boss-lobby-panel');
  if (!panel) return;
  const { result, boss, squad, rewards } = data;
  const myReward = rewards?.find(r=>r.player_id===G.playerId);
  if (myReward) { G.coins += myReward.coins; addXP(myReward.xp); saveGame(); updateHeader(); }

  panel.innerHTML = `
    <div style="text-align:center;padding:20px;background:${result.won?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)'};border:2px solid ${result.won?'var(--success)':'var(--danger)'};border-radius:16px;margin-bottom:14px">
      <div style="font-size:52px;margin-bottom:8px">${result.won?'🏆':'💀'}</div>
      <div style="font-family:var(--font-title);font-size:18px;font-weight:900;color:${result.won?'var(--success)':'var(--danger)'}">${result.won?'ПОБЕДА!':'ПОРАЖЕНИЕ'}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:8px">Раундов: ${result.rounds} | Выживших: ${result.squad_survived}/${squad?.length||1}</div>
      ${myReward&&result.won?`<div style="margin-top:10px;font-size:14px;font-weight:700;color:var(--gold)">+${myReward.coins}🪙 +${myReward.xp}XP</div>`:''}
    </div>
    <div class="card-title" style="font-size:12px">📋 Лог боя</div>
    <div style="background:var(--bg3);border-radius:10px;padding:12px;max-height:200px;overflow-y:auto;font-size:11px">
      ${(result.log||[]).map(l=>`<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:${l.type==='boss_attack'?'var(--danger)':l.type==='attack'?'var(--accent)':'var(--text2)'}">${l.text}</div>`).join('')}
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:12px" onclick="renderBossFightTab()">← Назад</button>
  `;
  toast(result.won?'🏆 Победа над боссом!':'💀 Босс победил...', result.won?'legendary':'error', 5000);
}
