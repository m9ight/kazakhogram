const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { stmts, db } = require('../db/database');
const { authenticate } = require('./auth');

// Admin middleware
function adminOnly(req, res, next) {
  authenticate(req, res, () => {
    const player = stmts.getPlayerById.get(req.user.id);
    if (!player || !player.is_admin) return res.status(403).json({ error: 'Нет доступа' });
    next();
  });
}

// GET /api/admin/stats
router.get('/stats', adminOnly, (req, res) => {
  const stats = stmts.getStats.get();
  res.json(stats);
});

// GET /api/admin/players
router.get('/players', adminOnly, (req, res) => {
  const players = stmts.getAllPlayers.all();
  res.json(players);
});

// POST /api/admin/players/:id/ban
router.post('/players/:id/ban', adminOnly, (req, res) => {
  const { banned } = req.body;
  stmts.setBanned.run(banned ? 1 : 0, req.params.id);
  res.json({ success: true });
});

// POST /api/admin/players/:id/admin
router.post('/players/:id/admin', adminOnly, (req, res) => {
  const { isAdmin } = req.body;
  stmts.setAdmin.run(isAdmin ? 1 : 0, req.params.id);
  res.json({ success: true });
});

// POST /api/admin/players/:id/give
router.post('/players/:id/give', adminOnly, (req, res) => {
  const { coins, gems } = req.body;
  if (coins) stmts.giveCoins.run(parseInt(coins), req.params.id);
  if (gems) stmts.giveGems.run(parseInt(gems), req.params.id);
  res.json({ success: true });
});

// DELETE /api/admin/players/:id
router.delete('/players/:id', adminOnly, (req, res) => {
  const player = stmts.getPlayerById.get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Игрок не найден' });
  if (player.is_admin) return res.status(400).json({ error: 'Нельзя удалить админа' });
  db.prepare('DELETE FROM hippos WHERE owner_id=?').run(req.params.id);
  db.prepare('DELETE FROM inventory WHERE owner_id=?').run(req.params.id);
  stmts.deletePlayer.run(req.params.id);
  res.json({ success: true });
});

// POST /api/admin/broadcast — send notification to all
router.post('/broadcast', adminOnly, (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Нет сообщения' });
  const players = db.prepare('SELECT id FROM players').all();
  for (const p of players) {
    stmts.createNotification.run(uuidv4(), p.id, 'broadcast', JSON.stringify({ message, from: 'Admin' }));
  }
  res.json({ success: true, sent: players.length });
});

// POST /api/admin/players - create player manually
router.post('/players', adminOnly, async (req, res) => {
  try {
    const { username, password, coins, gems, is_admin } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Нужны логин и пароль' });
    const existing = stmts.getPlayerByUsername.get(username);
    if (existing) return res.status(400).json({ error: 'Имя занято' });
    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    stmts.createPlayer.run(id, username, hash, null);
    if (coins) stmts.giveCoins.run(parseInt(coins), id);
    if (gems) stmts.giveGems.run(parseInt(gems), id);
    if (is_admin) stmts.setAdmin.run(1, id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
