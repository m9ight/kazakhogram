const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { stmts, db } = require('../db/database');
const { authenticate } = require('./auth');

const BOSSES = [
  { id:'b1', name:'Кракен',          emoji:'🦑', hp:1500,  atk:60,  def:25, xp:300,  loot:'epic',      level:5  },
  { id:'b2', name:'Огненный Феникс', emoji:'🦅', hp:2500,  atk:85,  def:40, xp:500,  loot:'legendary', level:15 },
  { id:'b3', name:'Ледяной Дракон',  emoji:'🐉', hp:4000,  atk:110, def:60, xp:800,  loot:'legendary', level:25 },
  { id:'b4', name:'Тьма Вальхаллы', emoji:'💀', hp:7000,  atk:150, def:90, xp:1500, loot:'mythic',    level:40 },
  { id:'b5', name:'Отец Бегемотов',  emoji:'🦛', hp:15000, atk:250, def:180,xp:5000, loot:'mythic',    level:99 },
];

// GET /api/bossfights/bosses
router.get('/bosses', (req, res) => {
  res.json(BOSSES);
});

// POST /api/bossfights/create - create squad lobby
router.post('/create', authenticate, (req, res) => {
  const { boss_id, max_players } = req.body;
  
  const boss = BOSSES.find(b => b.id === boss_id);
  if (!boss) return res.status(400).json({ error: 'Босс не найден' });
  
  const id = uuidv4();
  const invite_code = Math.random().toString(36).substr(2, 8).toUpperCase();
  
  const members = [{ player_id: req.user.id, username: req.user.username, ready: false, joined_at: Date.now() }];
  
  stmts.createBossLobby.run(id, req.user.id, boss_id, invite_code, JSON.stringify(members));
  
  res.json({ 
    success: true, 
    lobby_id: id,
    invite_code,
    boss,
    invite_url: `${req.protocol}://${req.get('host')}/bossfight?invite=${invite_code}`
  });
});

// POST /api/bossfights/join/:invite_code
router.post('/join/:invite_code', authenticate, (req, res) => {
  const lobby = stmts.getBossLobbyByInvite.get(req.params.invite_code);
  if (!lobby) return res.status(404).json({ error: 'Лобби не найдено' });
  if (lobby.status !== 'waiting') return res.status(400).json({ error: 'Лобби уже началось или закрыто' });
  
  const members = JSON.parse(lobby.members);
  if (members.length >= lobby.max_players) return res.status(400).json({ error: 'Лобби заполнено' });
  if (members.find(m => m.player_id === req.user.id)) return res.status(400).json({ error: 'Ты уже в лобби' });
  
  members.push({ player_id: req.user.id, username: req.user.username, ready: false, joined_at: Date.now() });
  stmts.updateBossLobby.run('waiting', JSON.stringify(members), null, lobby.id);
  
  const boss = BOSSES.find(b => b.id === lobby.boss_id);
  
  res.json({ success: true, lobby: { ...lobby, members, boss } });
});

// POST /api/bossfights/:id/ready - toggle ready
router.post('/:id/ready', authenticate, (req, res) => {
  const lobby = stmts.getBossLobby.get(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Лобби не найдено' });
  
  const members = JSON.parse(lobby.members);
  const me = members.find(m => m.player_id === req.user.id);
  if (!me) return res.status(403).json({ error: 'Тебя нет в лобби' });
  
  me.ready = !me.ready;
  stmts.updateBossLobby.run(lobby.status, JSON.stringify(members), lobby.started_at, lobby.id);
  
  res.json({ success: true, members, all_ready: members.every(m => m.ready) });
});

// POST /api/bossfights/:id/start - start the boss fight
router.post('/:id/start', authenticate, (req, res) => {
  const lobby = stmts.getBossLobby.get(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Лобби не найдено' });
  if (lobby.host_id !== req.user.id) return res.status(403).json({ error: 'Только хост может начать' });
  
  const members = JSON.parse(lobby.members);
  if (members.length < 1) return res.status(400).json({ error: 'Нужен хотя бы 1 игрок' });
  
  // Get hippos for all members
  const squad = [];
  for (const m of members) {
    const hippos = stmts.getHipposByOwner.all(m.player_id);
    const best = hippos.sort((a,b) => {
      const sa = JSON.parse(a.stats), sb = JSON.parse(b.stats);
      return (sb.str + sb.vit) - (sa.str + sa.vit);
    })[0];
    if (best) {
      squad.push({ ...best, stats: JSON.parse(best.stats), mutations: JSON.parse(best.mutations), ownerName: m.username });
    }
  }
  
  const boss = BOSSES.find(b => b.id === lobby.boss_id);
  
  // Simulate boss fight
  const result = simulateBossFight(squad, boss);
  
  // Give rewards
  const rewards = [];
  if (result.won) {
    for (const m of members) {
      const coinReward = boss.xp * 2 + Math.floor(Math.random() * 200);
      db.prepare(`UPDATE players SET coins=coins+?, wins=wins+1 WHERE id=?`).run(coinReward, m.player_id);
      rewards.push({ player_id: m.player_id, coins: coinReward, xp: boss.xp });
      
      stmts.createNotification.run(uuidv4(), m.player_id, 'boss_reward', JSON.stringify({
        boss_name: boss.name, coins: coinReward, xp: boss.xp, won: true
      }));
    }
  }
  
  stmts.updateBossLobby.run('finished', JSON.stringify(members), new Date().toISOString(), lobby.id);
  
  res.json({ success: true, result, boss, squad, rewards });
});

// GET /api/bossfights/:id - get lobby info
router.get('/:id', authenticate, (req, res) => {
  const lobby = stmts.getBossLobby.get(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Лобби не найдено' });
  
  const boss = BOSSES.find(b => b.id === lobby.boss_id);
  const members = JSON.parse(lobby.members);
  
  res.json({ ...lobby, members, boss });
});

function simulateBossFight(squad, boss) {
  let bossHp = boss.hp * (1 + squad.length * 0.3); // Scale boss HP
  const log = [];
  let round = 0;
  
  // Calculate squad total power
  const squadStats = squad.map(h => ({
    ...h,
    hp: 100 + h.stats.vit * 5,
    maxHp: 100 + h.stats.vit * 5,
    atk: h.stats.str,
  }));
  
  while (round < 50 && bossHp > 0 && squadStats.some(h => h.hp > 0)) {
    round++;
    
    // Squad attacks boss
    for (const fighter of squadStats) {
      if (fighter.hp <= 0) continue;
      const dmg = Math.max(1, fighter.atk - boss.def * 0.3 + Math.random() * 15);
      bossHp -= dmg;
      log.push({ round, text: `${fighter.emoji} ${fighter.name} (${fighter.ownerName}) наносит ${Math.floor(dmg)} урона!`, type: 'attack' });
      if (bossHp <= 0) break;
    }
    
    if (bossHp <= 0) break;
    
    // Boss attacks random squad member
    const alive = squadStats.filter(h => h.hp > 0);
    if (!alive.length) break;
    
    const target = alive[Math.floor(Math.random() * alive.length)];
    const bossDmg = boss.atk * (0.8 + Math.random() * 0.4) / squad.length;
    target.hp -= bossDmg;
    log.push({ round, text: `${boss.emoji} Босс бьёт ${target.name} на ${Math.floor(bossDmg)}!`, type: 'boss_attack' });
  }
  
  const won = bossHp <= 0;
  return {
    won,
    rounds: round,
    log: log.slice(-30),
    boss_hp_remaining: Math.max(0, bossHp),
    squad_survived: squadStats.filter(h => h.hp > 0).length,
  };
}

module.exports = router;
