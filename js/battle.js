// ========================
// ARENA RENDER
// ========================
function renderArena() {
  document.getElementById('arena-elo').textContent = G.elo;
  document.getElementById('arena-select').style.display = 'grid';
  document.getElementById('arena-battle-view').style.display = 'none';
  document.getElementById('arena-colosseum-view').style.display = 'none';

  const cdText = G.bossCD > Date.now() ? `${Math.ceil((G.bossCD - Date.now())/60000)} мин` : 'Готов!';
  document.getElementById('boss-cd').textContent = cdText;
}

// ========================
// MATCHMAKING MODAL
// ========================
function startArena(mode) {
  if (!G.hippos.length) { toast('Нужен хотя бы один бегемот!', 'error'); setTabByName('cases'); return; }

  if (mode === 'colosseum') {
    document.getElementById('arena-select').style.display = 'none';
    document.getElementById('arena-colosseum-view').style.display = 'block';
    document.getElementById('colosseum-bracket').innerHTML = '';
    document.getElementById('colosseum-result').innerHTML = '';
    return;
  }

  if (mode === 'bounty') { showBountyBoard(); return; }
  if (mode === 'boss') {
    if (G.bossCD > Date.now()) { toast('Босс ещё не восстановился!', 'error'); return; }
  }

  // Show opponent selection modal
  openModal(`⚔️ Выбор противника — ${modeLabel(mode)}`, `
    <div style="text-align:center;margin-bottom:20px;color:var(--text2);font-size:13px">
      Как хочешь сразиться?
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <button class="btn btn-primary btn-full" onclick="closeModal();beginFight('${mode}', 'bot')">
        🤖 Против бота
        <span style="font-size:11px;opacity:0.7;margin-left:auto">Быстро, всегда доступно</span>
      </button>
      <button class="btn btn-danger btn-full" onclick="closeModal();beginFight('${mode}', 'pvp')">
        🌐 Против реального игрока
        <span style="font-size:11px;opacity:0.7;margin-left:auto">Живой PvP через интернет</span>
      </button>
    </div>
    <div style="margin-top:16px;font-size:11px;color:var(--text3);text-align:center">
      Онлайн: <span id="modal-online-count">-</span> игроков
    </div>
  `);
  
  // Update online count in modal
  if (window.hwSocket) {
    document.getElementById('modal-online-count').textContent = window.onlineCount || '?';
  }
}

function modeLabel(mode) {
  return { casual:'Обычный бой', ranked:'Рейтинговый', boss:'Босс-файт', team:'2 на 2', bounty:'Баунти' }[mode] || mode;
}

function beginFight(mode, opponentType) {
  currentArenaMode = mode;

  if (opponentType === 'pvp' && window.hwSocket) {
    startPvPMatchmaking(mode);
    return;
  }

  // Bot fight
  let playerHippo = G.hippos[0];
  let enemy;

  if (mode === 'boss') {
    const boss = BOSSES[Math.min(Math.floor(G.level/10), BOSSES.length-1)];
    enemy = {
      id: boss.id, name: boss.name, emoji: boss.emoji, isBoss: true,
      hp: boss.hp, maxHp: boss.hp, atk: boss.atk, def: boss.def,
      mutations: ['berserk'],
      stats: { str: boss.atk, agi: 20, int: 10, vit: boss.hp/5, lck: 5 },
    };
  } else {
    const ai = AI_PLAYERS[Math.floor(Math.random() * AI_PLAYERS.length)];
    const enemyHippo = generateHippo(rollRarity());
    enemy = { ...enemyHippo, ownerName: ai.name, maxHp: getHippoHP(enemyHippo), hp: getHippoHP(enemyHippo) };
  }

  battleState = {
    mode, isPvP: false,
    player: { ...playerHippo, hp: getHippoHP(playerHippo), maxHp: getHippoHP(playerHippo) },
    enemy: { ...enemy, hp: enemy.maxHp, maxHp: enemy.maxHp },
    turn: 0, log: [], started: false, active: false,
  };

  document.getElementById('arena-select').style.display = 'none';
  document.getElementById('arena-battle-view').style.display = 'block';

  renderBattle();
  renderBattleActions();
}

// ========================
// PVP MATCHMAKING
// ========================
function startPvPMatchmaking(mode) {
  if (!window.hwSocket) { toast('Сервер недоступен', 'error'); return; }

  document.getElementById('arena-select').style.display = 'none';
  document.getElementById('arena-battle-view').style.display = 'block';

  const hippo = G.hippos[0];
  document.getElementById('battle-arena-box').innerHTML = `
    <div class="pvp-waiting">
      <span class="big-icon">⚔️</span>
      <div style="font-family:var(--font-title);font-size:18px;font-weight:700;margin-bottom:8px">Поиск противника...</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Режим: ${modeLabel(mode)} | ELO: ${G.elo}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:20px">
        <div class="queue-spinner"></div>
        <span style="font-size:13px;color:var(--text2)" id="queue-timer">0 сек</span>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:16px">Твой боец: ${hippo.emoji} ${hippo.name} (HP:${getHippoHP(hippo)} | ATK:${getHippoATK(hippo)})</div>
      <button class="btn btn-danger btn-sm" onclick="cancelMatchmaking()">✕ Отмена</button>
    </div>
  `;
  document.getElementById('battle-action-btns').innerHTML = '';

  window.queueStartTime = Date.now();
  window.queueInterval = setInterval(() => {
    const el = document.getElementById('queue-timer');
    if (el) el.textContent = Math.floor((Date.now() - window.queueStartTime)/1000) + ' сек';
  }, 1000);

  window.hwSocket.emit('join_queue', { mode, hippo: serializeHippoForPvP(hippo) });
}

function cancelMatchmaking() {
  if (window.hwSocket) window.hwSocket.emit('leave_queue');
  clearInterval(window.queueInterval);
  renderArena();
  document.getElementById('arena-select').style.display = 'grid';
  document.getElementById('arena-battle-view').style.display = 'none';
}

function serializeHippoForPvP(h) {
  return {
    id: h.id, name: h.name, emoji: h.emoji, rarity: h.rarity,
    stats: h.stats, mutations: h.mutations,
    hp: getHippoHP(h), maxHp: getHippoHP(h), atk: getHippoATK(h),
  };
}

// Called by socket event
function onMatchFound({ battle_id, opponent, side }) {
  clearInterval(window.queueInterval);
  window.pvpBattleId = battle_id;
  window.pvpSide = side;
  window.pvpOpponent = opponent;

  toast(`⚔️ Найден противник: ${opponent.username}!`, 'success', 4000);

  const myHippo = G.hippos[0];
  const p1 = side === 'player1' ? myHippo : opponent.hippo;
  const p2 = side === 'player1' ? opponent.hippo : myHippo;

  battleState = {
    mode: currentArenaMode, isPvP: true,
    player: { ...myHippo, hp: getHippoHP(myHippo), maxHp: getHippoHP(myHippo), ownerName: G.playerName },
    enemy: { ...opponent.hippo, hp: opponent.hippo.maxHp, ownerName: opponent.username },
    turn: 0, log: [], started: false, active: false,
  };

  renderBattle();
  renderBattleActions();
}

// Called by socket event
function onPvPBattleUpdate(data) {
  if (!battleState) return;

  const mySide = window.pvpSide;
  if (mySide === 'player1') {
    battleState.player.hp = data.player1_hp;
    battleState.enemy.hp = data.player2_hp;
  } else {
    battleState.player.hp = data.player2_hp;
    battleState.enemy.hp = data.player1_hp;
  }
  battleState.log = data.log;
  battleState.turn = data.turn;

  if (data.ended) {
    const iWon = (data.winner === 'player1' && mySide === 'player1') || (data.winner === 'player2' && mySide === 'player2');
    endBattle(iWon, true);
  } else {
    renderBattle();
    renderBattleActions();
  }
}

// ========================
// BATTLE RENDER
// ========================
function renderBattle() {
  if (!battleState) return;
  const { player, enemy } = battleState;

  const pHpPct = Math.max(0, player.hp / player.maxHp * 100);
  const eHpPct = Math.max(0, enemy.hp / enemy.maxHp * 100);

  document.getElementById('battle-arena-box').innerHTML = `
    <div class="battle-fighters">
      <div class="fighter-side">
        <span class="fighter-emoji">${player.emoji}</span>
        <div class="fighter-name">${player.name}</div>
        <div style="font-size:11px;color:var(--accent);margin-bottom:8px">@${G.playerName}</div>
        <div class="fighter-hp-bar"><div class="fighter-hp-fill ${pHpPct<30?'low':''}" style="width:${pHpPct}%"></div></div>
        <div class="fighter-hp-text">${Math.max(0,Math.floor(player.hp))} / ${player.maxHp} HP</div>
        <div style="margin-top:6px">
          <span class="stat-tag str">⚔️ ${getHippoATK(player)}</span>
          <span class="stat-tag vit">🛡️ ${Math.floor(player.stats.vit/2)}</span>
        </div>
        <div style="margin-top:5px">${(player.mutations||[]).map(mId => {
          const m = MUTATIONS.find(x => x.id === mId);
          return m ? `<span title="${m.desc}">${m.emoji}</span>` : '';
        }).join('')}</div>
      </div>

      <div class="vs-badge">VS</div>

      <div class="fighter-side">
        <span class="fighter-emoji">${enemy.emoji}</span>
        <div class="fighter-name">${enemy.name}</div>
        <div style="font-size:11px;color:var(--danger);margin-bottom:8px">${enemy.isBoss ? '👹 БОСС' : `👤 ${enemy.ownerName || 'AI'}`}</div>
        <div class="fighter-hp-bar"><div class="fighter-hp-fill ${eHpPct<30?'low':''}" style="width:${eHpPct}%"></div></div>
        <div class="fighter-hp-text">${Math.max(0,Math.floor(enemy.hp))} / ${enemy.maxHp} HP</div>
        <div style="margin-top:6px">
          <span class="stat-tag str">⚔️ ${enemy.isBoss ? enemy.atk : getHippoATK(enemy)}</span>
          <span class="stat-tag vit">🛡️ ${enemy.isBoss ? enemy.def : Math.floor((enemy.stats?.vit||10)/2)}</span>
        </div>
        <div style="margin-top:5px">${(enemy.mutations||[]).map(mId => {
          const m = MUTATIONS.find(x => x.id === mId);
          return m ? `<span title="${m.desc}">${m.emoji}</span>` : '';
        }).join('')}</div>
      </div>
    </div>

    <div class="battle-log" id="battle-log-inner">
      ${battleState.log.slice(-20).map(entry => `
        <div class="battle-log-entry ${entry.class||''}">
          <span class="turn">Ход ${entry.turn}:</span>
          <span>${entry.text}</span>
        </div>
      `).join('')}
    </div>
  `;

  const log = document.getElementById('battle-log-inner');
  if (log) log.scrollTop = log.scrollHeight;
}

function renderBattleActions() {
  const btns = document.getElementById('battle-action-btns');
  if (!battleState || battleState.ended) {
    btns.innerHTML = `
      <button class="btn btn-primary" onclick="renderArena();document.getElementById('arena-select').style.display='grid';document.getElementById('arena-battle-view').style.display='none'">← Назад</button>
      <button class="btn btn-gold" onclick="beginFight(currentArenaMode, 'bot')">🔄 Ещё раз (бот)</button>
    `;
    return;
  }

  if (battleState.active) {
    btns.innerHTML = '<div style="color:var(--text2);font-size:13px;display:flex;align-items:center;gap:8px"><div class="queue-spinner"></div> Бой идёт...</div>';
    return;
  }

  // PvP - just show action buttons
  if (battleState.isPvP) {
    btns.innerHTML = `
      <button class="btn btn-primary" onclick="pvpAction('attack')">⚔️ Атака</button>
      <button class="btn btn-purple" onclick="pvpAction('heal')">💚 Лечение</button>
      <button class="btn btn-danger" onclick="pvpAction('skill')">🌀 Спецудар</button>
    `;
    return;
  }

  btns.innerHTML = `
    <button class="btn btn-primary" onclick="autoBattle()">⚡ Авто-бой</button>
    <button class="btn btn-secondary" onclick="doPlayerAttack()">⚔️ Атака</button>
    <button class="btn btn-purple" onclick="doHeal()">💚 Лечение</button>
    <button class="btn btn-danger" onclick="doSkill()">🌀 Спецудар</button>
    <button class="btn btn-secondary btn-sm" onclick="renderArena();document.getElementById('arena-select').style.display='grid';document.getElementById('arena-battle-view').style.display='none'">🏃 Сбежать</button>
  `;
}

function pvpAction(action) {
  if (!window.pvpBattleId || !window.hwSocket) return;
  window.hwSocket.emit('battle_action', { battle_id: window.pvpBattleId, action });
  // Disable buttons while waiting
  document.getElementById('battle-action-btns').innerHTML = `
    <div style="color:var(--text2);font-size:13px;display:flex;align-items:center;gap:8px">
      <div class="queue-spinner"></div> Ожидаем ответа...
    </div>
  `;
}

// ========================
// BOT BATTLE LOGIC
// ========================
function calcDamage(attacker, defender, isSpecial=false) {
  const baseAtk = attacker.isBoss ? attacker.atk : getHippoATK(attacker);
  const def = defender.isBoss ? (defender.def||0) : Math.floor((defender.stats?.vit||10)/2);
  const lck = attacker.stats?.lck || 10;

  let dmg = Math.max(1, baseAtk - def * 0.3 + Math.random() * 10 - 5);
  if (isSpecial) dmg *= 1.8;

  // Berserk
  if (attacker.mutations?.includes('berserk') && attacker.hp / attacker.maxHp < 0.3) dmg *= 1.4;

  const critChance = lck / 100 + (attacker.mutations?.includes('lucky') ? 0.15 : 0);
  const isCrit = Math.random() < critChance;
  if (isCrit) dmg *= 2;

  const defAgi = defender.stats?.agi || 10;
  const missChance = defAgi / 200 + (defender.mutations?.includes('ghost') ? 0.2 : 0);
  const isMiss = Math.random() < missChance;

  return { dmg: Math.floor(dmg), isCrit, isMiss };
}

function applyTurnEffects(state) {
  if (state.player.mutations?.includes('regen')) {
    const heal = 5;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
    state.log.push({ turn: state.turn, text: `💚 ${state.player.name} регенерирует ${heal} HP`, class:'heal-entry' });
  }
  if (state.enemy.mutations?.includes('regen')) {
    state.enemy.hp = Math.min(state.enemy.maxHp, state.enemy.hp + 5);
  }
  if (state.enemy.mutations?.includes('venom') && state.player.hp > 0) {
    state.player.hp -= 10;
    state.log.push({ turn: state.turn, text: `☠️ Яд! -10 HP`, class:'hit-enemy' });
  }
  if (state.player.mutations?.includes('venom') && state.enemy.hp > 0) {
    state.enemy.hp -= 10;
    state.log.push({ turn: state.turn, text: `☠️ Яд врага! -10 HP`, class:'hit-player' });
  }
}

function doPlayerAttack(isSpecial=false) {
  if (!battleState || battleState.ended) return;
  battleState.turn++;
  applyTurnEffects(battleState);

  const { dmg, isCrit, isMiss } = calcDamage(battleState.player, battleState.enemy, isSpecial);

  if (isMiss) {
    battleState.log.push({ turn: battleState.turn, text: `${battleState.enemy.name} уклонился!`, class:'hit-player' });
  } else {
    if (battleState.player.mutations?.includes('vampire')) {
      battleState.player.hp = Math.min(battleState.player.maxHp, battleState.player.hp + Math.floor(dmg * 0.2));
    }
    battleState.enemy.hp -= dmg;
    battleState.log.push({
      turn: battleState.turn,
      text: isCrit ? `💥 КРИТ! ${battleState.player.name} → ${dmg} урона!` : `${battleState.player.name} атакует → ${dmg}`,
      class: isCrit ? 'critical-entry' : 'hit-player'
    });
  }

  if (battleState.enemy.hp <= 0) { endBattle(true); return; }

  enemyAttack();
  renderBattle();
  renderBattleActions();
  if (!battleState.ended) checkBattleEnd();
}

function enemyAttack() {
  const { dmg, isCrit, isMiss } = calcDamage(battleState.enemy, battleState.player);
  if (!isMiss) {
    battleState.player.hp -= dmg;
    battleState.log.push({
      turn: battleState.turn,
      text: isCrit ? `💥 КРИТ! ${battleState.enemy.name} → ${dmg}!` : `${battleState.enemy.name} → ${dmg}`,
      class: isCrit ? 'critical-entry' : 'hit-enemy'
    });
  } else {
    battleState.log.push({ turn: battleState.turn, text: `${battleState.player.name} уклонился!`, class:'heal-entry' });
  }
  if (battleState.enemy.mutations?.includes('swift') && Math.random() < 0.25) {
    const { dmg: dmg2 } = calcDamage(battleState.enemy, battleState.player);
    battleState.player.hp -= dmg2;
    battleState.log.push({ turn: battleState.turn, text: `⚡ Молниеносная +${dmg2}!`, class:'hit-enemy' });
  }
}

function doHeal() {
  if (!battleState || battleState.ended) return;
  const healAmt = Math.floor(battleState.player.maxHp * 0.2);
  battleState.player.hp = Math.min(battleState.player.maxHp, battleState.player.hp + healAmt);
  battleState.log.push({ turn: battleState.turn, text: `💚 Лечение +${healAmt} HP`, class:'heal-entry' });
  battleState.turn++;
  enemyAttack();
  renderBattle();
  renderBattleActions();
  checkBattleEnd();
}

function doSkill() { doPlayerAttack(true); }

function checkBattleEnd() {
  if (battleState.player.hp <= 0) endBattle(false);
  else if (battleState.enemy.hp <= 0) endBattle(true);
}

function autoBattle() {
  if (!battleState || battleState.ended || battleState.active) return;
  battleState.active = true;
  renderBattleActions();
  const interval = setInterval(() => {
    if (!battleState || battleState.ended) { clearInterval(interval); battleState && (battleState.active = false); renderBattleActions(); return; }
    doPlayerAttack();
  }, 500);
}

function endBattle(won, isPvP=false) {
  if (!battleState) return;
  battleState.ended = true;
  battleState.active = false;
  const mode = battleState.mode;
  const isBoss = battleState.enemy?.isBoss;

  if (won) {
    G.wins++;
    let coins = isBoss ? 500 : { casual:30, ranked:60, team:80, bounty:150 }[mode] || 30;
    let xp = isBoss ? 200 : 50;
    if (mode === 'ranked') {
      const gain = isPvP ? 25 : Math.floor(20 + Math.random() * 15);
      G.elo += gain;
      battleState.log.push({ turn: battleState.turn + 1, text: `🏆 ELO +${gain}! Рейтинг: ${G.elo}`, class:'critical-entry' });
    }
    G.coins += coins;
    addXP(xp);
    if (Math.random() < 0.3 || isBoss) {
      const pool = ALL_ITEMS.filter(i => ['rare','epic','legendary'].includes(i.rarity));
      const item = { ...pool[Math.floor(Math.random() * pool.length)], id: 'inv_'+Date.now(), upgradeLevel: 0 };
      G.inventory.push(item);
      battleState.log.push({ turn: battleState.turn + 1, text: `🎁 Предмет: ${item.emoji} ${item.name}!`, class:'critical-entry' });
    }
    if (isBoss) G.bossCD = Date.now() + 30 * 60 * 1000;
    const h = G.hippos[0];
    if (h) h.wins++;
    battleState.log.push({ turn: battleState.turn + 1, text: `🎉 ПОБЕДА! +${coins}🪙 +${xp}XP`, class:'critical-entry' });
    toast(`⚔️ Победа! +${coins} 🪙`, 'success');
  } else {
    G.losses++;
    if (mode === 'ranked') {
      const loss = isPvP ? 20 : Math.floor(15 + Math.random() * 10);
      G.elo = Math.max(0, G.elo - loss);
      battleState.log.push({ turn: battleState.turn + 1, text: `📉 ELO -${loss}. Рейтинг: ${G.elo}`, class:'hit-enemy' });
    }
    const h = G.hippos[0];
    if (h) {
      h.losses++;
      h.deaths = (h.deaths||0) + 1;
      if (h.deaths >= 20 && !h.inValhalla) {
        h.inValhalla = true;
        toast(`💀 ${h.name} попал в Вальхаллу!`, 'legendary', 5000);
      }
    }
    battleState.log.push({ turn: battleState.turn + 1, text: `💀 ПОРАЖЕНИЕ. Попробуй снова!`, class:'hit-enemy' });
    toast('💀 Поражение...', 'error');
  }

  // Update daily quest
  if (G.quests[0]) G.quests[0].progress = Math.min(G.quests[0].goal, (G.quests[0].progress||0) + (won?1:0));
  saveGame();
  updateHeader();
  renderBattle();
  renderBattleActions();
}

// ========================
// COLOSSEUM
// ========================
function startColosseum(size) {
  const ph = G.hippos[0];
  if (!ph) { toast('Нужен бегемот!', 'error'); return; }

  const participants = [{ ...ph, ownerName: G.playerName, isPlayer: true }];
  for (let i = 1; i < size; i++) {
    const ai = AI_PLAYERS[i % AI_PLAYERS.length];
    participants.push({ ...generateHippo(rollRarity()), ownerName: ai.name });
  }

  let round = participants.slice();
  let allMatches = [];
  let roundNum = 1;
  while (round.length > 1) {
    const nextRound = [];
    const matches = [];
    for (let i = 0; i < round.length; i += 2) {
      if (i + 1 >= round.length) { nextRound.push(round[i]); break; }
      const a = round[i], b = round[i+1];
      const aScore = getHippoHP(a) + getHippoATK(a) * (0.8 + Math.random() * 0.4) * 3;
      const bScore = getHippoHP(b) + getHippoATK(b) * (0.8 + Math.random() * 0.4) * 3;
      const winner = aScore >= bScore ? a : b;
      matches.push({ a, b, winner });
      nextRound.push(winner);
    }
    allMatches.push({ round: roundNum++, matches });
    round = nextRound;
  }

  const champion = round[0];
  const playerWon = champion.isPlayer;

  document.getElementById('colosseum-bracket').innerHTML = allMatches.map(r => `
    <div style="font-size:11px;color:var(--text3);margin:6px 0 3px;font-weight:700">РАУНД ${r.round}</div>
    ${r.matches.map(m => `
      <div class="bracket-match">
        <span>${m.a.emoji} ${m.a.name}</span>
        <span class="bracket-vs">VS</span>
        <span>${m.b.emoji} ${m.b.name}</span>
        <span class="bracket-winner">→ ${m.winner.emoji} ${m.winner.name}</span>
      </div>
    `).join('')}
  `).join('');

  const resultDiv = document.getElementById('colosseum-result');
  if (playerWon) {
    const prize = size * 50;
    G.coins += prize; G.wins++;
    addXP(size * 20);
    resultDiv.innerHTML = `<div style="text-align:center;padding:20px;background:rgba(245,158,11,0.1);border:2px solid var(--gold);border-radius:16px">
      <div style="font-size:48px">🏆</div>
      <div style="font-family:var(--font-title);font-size:18px;font-weight:900;color:var(--gold)">ЧЕМПИОН!</div>
      <div style="margin-top:8px;color:var(--text2)">Приз: 🪙 ${prize}</div>
    </div>`;
    toast(`🏆 Чемпион Колизея! +${prize} монет`, 'legendary', 5000);
  } else {
    resultDiv.innerHTML = `<div style="text-align:center;padding:20px;background:rgba(239,68,68,0.1);border:2px solid var(--danger);border-radius:16px">
      <div style="font-size:48px">💀</div>
      <div style="font-family:var(--font-title);font-size:16px;font-weight:700;color:var(--danger)">Победитель: ${champion.emoji} ${champion.name}</div>
      <div style="color:var(--text2);font-size:12px;margin-top:4px">@${champion.ownerName}</div>
    </div>`;
    toast('Не в этот раз...', 'error');
  }
  saveGame();
}

// ========================
// BOUNTY BOARD
// ========================
function showBountyBoard() {
  const targets = AI_PLAYERS.map(ai => ({ ...ai, bounty: Math.floor(ai.elo * 0.5 + Math.random() * 200) }));
  openModal('🎯 Доска Баунти', `
    <div style="font-size:12px;color:var(--text2);margin-bottom:14px">Охоться на игроков! Победа = их баунти.</div>
    ${targets.map((t, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:10px;margin-bottom:6px">
        <div style="font-size:24px">🎯</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">@${t.name}</div>
          <div style="font-size:11px;color:var(--text2)">ELO: ${t.elo} | 🏆 ${t.wins}W</div>
        </div>
        <div style="text-align:right">
          <div style="color:var(--gold);font-weight:700">🪙 ${t.bounty}</div>
          <button class="btn btn-xs btn-danger" onclick="huntTarget(${i},${t.bounty})" style="margin-top:3px">⚔️ Охота</button>
        </div>
      </div>
    `).join('')}
  `);
}

function huntTarget(idx, bounty) {
  closeModal();
  const won = Math.random() > 0.4;
  if (won) {
    G.coins += bounty; G.wins++;
    addXP(60);
    toast(`🎯 Цель поймана! +${bounty} 🪙`, 'success');
  } else {
    toast('🎯 Цель сбежала!', 'error');
    G.losses++;
  }
  saveGame(); updateHeader();
}
