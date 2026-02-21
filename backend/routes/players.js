const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { stmts, db } = require('../db/database');
const { authenticate } = require('./auth');

// GET /api/players/search?q=username
router.get('/search', authenticate, (req, res) => {
  const q = req.query.q?.trim();
  if (!q || q.length < 2) return res.json([]);
  const results = stmts.searchPlayers.all(`%${q}%`);
  res.json(results.filter(p => p.id !== req.user.id));
});

// GET /api/players/leaderboard
router.get('/leaderboard', (req, res) => {
  const type = req.query.type || 'elo';
  let rows;
  if (type === 'wins') rows = stmts.getLeaderboardByWins.all();
  else if (type === 'level') rows = stmts.getLeaderboardByLevel.all();
  else rows = stmts.getLeaderboard.all();
  res.json(rows);
});

// POST /api/players/save - save game state
router.post('/save', authenticate, (req, res) => {
  try {
    const { player, hippos } = req.body;
    stmts.updatePlayer.run(
      player.level, player.xp, player.xp_needed,
      player.coins, player.gems, player.elo,
      player.wins, player.losses, player.avatar || '🦛',
      player.theme || 'default', req.user.id
    );
    if (hippos) {
      for (const h of hippos) {
        const existing = db.prepare('SELECT id FROM hippos WHERE id=? AND owner_id=?').get(h.id, req.user.id);
        if (existing) {
          stmts.updateHippo.run(h.name, h.level, h.xp||0, h.deaths||0, h.wins||0, h.losses||0,
            JSON.stringify(h.stats), JSON.stringify(h.mutations||[]),
            JSON.stringify(h.equipped||{}), h.inValhalla?1:0, h.id);
        } else {
          stmts.createHippo.run(h.id, req.user.id, h.name, h.emoji||'🦛', h.rarity||'common',
            JSON.stringify(h.stats), JSON.stringify(h.mutations||[]), JSON.stringify(h.equipped||{}));
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

// POST /api/players/friends/add
router.post('/friends/add', authenticate, (req, res) => {
  const { friend_id } = req.body;
  if (!friend_id) return res.status(400).json({ error: 'friend_id обязателен' });
  if (friend_id === req.user.id) return res.status(400).json({ error: 'Нельзя добавить себя' });
  const friend = stmts.getPlayerById.get(friend_id);
  if (!friend) return res.status(404).json({ error: 'Игрок не найден' });
  try {
    stmts.addFriend.run(uuidv4(), req.user.id, friend_id, req.user.id);
    stmts.createNotification.run(uuidv4(), friend_id, 'friend_request',
      JSON.stringify({ from_id: req.user.id, from_name: req.user.username }));
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Уже отправлен запрос' });
  }
});

// GET /api/players/friends/list
router.get('/friends/list', authenticate, (req, res) => {
  const id = req.user.id;
  const rows = stmts.getFriendships.all(id, id, id);
  // Attach sender_id info
  const friends = rows.map(f => ({
    ...f,
    status: f.status,
    sender_id: f.sender_id,
  }));
  res.json({ friends });
});

// POST /api/players/friends/respond
router.post('/friends/respond', authenticate, (req, res) => {
  const { friendship_id, action } = req.body;
  const status = action === 'accept' ? 'accepted' : 'rejected';
  stmts.updateFriendship.run(status, friendship_id);
  res.json({ success: true });
});

// GET /api/players/notifications
router.get('/notifications', authenticate, (req, res) => {
  const notifs = stmts.getNotifications.all(req.user.id);
  res.json(notifs.map(n => ({ ...n, data: JSON.parse(n.data) })));
});

// POST /api/players/notifications/read
router.post('/notifications/read', authenticate, (req, res) => {
  stmts.markAllNotifsRead.run(req.user.id);
  res.json({ success: true });
});

// GET /api/players/:id - public profile (put LAST to not shadow other routes)
router.get('/:id', authenticate, (req, res) => {
  const player = stmts.getPlayerById.get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Игрок не найден' });
  const hippos = stmts.getHipposByOwner.all(player.id);
  const { password_hash, email, ...safe } = player;
  res.json({ player: safe, hippos, hippo_count: hippos.length });
});

module.exports = router;