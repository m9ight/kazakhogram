const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { stmts, db } = require('../db/database');
const { authenticate } = require('./auth');

// GET /api/clans
router.get('/', (req, res) => {
  const clans = stmts.getAllClans.all();
  res.json(clans);
});

// POST /api/clans/create
router.post('/create', authenticate, (req, res) => {
  const { name, emoji, description } = req.body;
  
  const player = stmts.getPlayerById.get(req.user.id);
  if (player.gems < 50) return res.status(400).json({ error: 'Нужно 💎 50' });
  
  if (!name || name.length < 2 || name.length > 30) return res.status(400).json({ error: 'Название: 2-30 символов' });
  
  const id = uuidv4();
  try {
    stmts.createClan.run(id, name, emoji || '🏰', req.user.id);
    stmts.addClanMember.run(id, req.user.id, 'leader');
    db.prepare(`UPDATE players SET gems=gems-50, clan_id=? WHERE id=?`).run(id, req.user.id);
    
    res.json({ success: true, clan_id: id });
  } catch {
    res.status(400).json({ error: 'Название занято' });
  }
});

// POST /api/clans/:id/join
router.post('/:id/join', authenticate, (req, res) => {
  const clan = stmts.getClanById.get(req.params.id);
  if (!clan) return res.status(404).json({ error: 'Клан не найден' });
  
  stmts.addClanMember.run(req.params.id, req.user.id, 'member');
  db.prepare(`UPDATE players SET clan_id=? WHERE id=?`).run(req.params.id, req.user.id);
  
  res.json({ success: true });
});

// POST /api/clans/:id/leave
router.post('/:id/leave', authenticate, (req, res) => {
  stmts.removeClanMember.run(req.params.id, req.user.id);
  db.prepare(`UPDATE players SET clan_id=NULL WHERE id=?`).run(req.user.id);
  res.json({ success: true });
});

module.exports = router;
