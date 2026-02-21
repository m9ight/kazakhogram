const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { stmts, db } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'hippowars_secret_2025';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Имя и пароль обязательны' });
    if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Имя: 3-20 символов' });
    if (password.length < 4) return res.status(400).json({ error: 'Пароль минимум 4 символа' });

    const existing = stmts.getPlayerByUsername.get(username);
    if (existing) return res.status(400).json({ error: 'Имя занято' });

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    stmts.createPlayer.run(id, username, hash, email || null);

    const starterHippo = generateStarterHippo(id);
    stmts.createHippo.run(
      starterHippo.id, id, starterHippo.name, starterHippo.emoji,
      starterHippo.rarity, JSON.stringify(starterHippo.stats),
      JSON.stringify(starterHippo.mutations), JSON.stringify(starterHippo.equipped)
    );

    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, player: { id, username, level: 1, coins: 500, gems: 50 } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Заполни все поля' });

    const player = stmts.getPlayerByUsername.get(username);
    if (!player) return res.status(401).json({ error: 'Неверные данные' });

    const ok = await bcrypt.compare(password, player.password_hash);
    if (!ok) return res.status(401).json({ error: 'Неверные данные' });

    const token = jwt.sign({ id: player.id, username: player.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, player: sanitizePlayer(player) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const player = stmts.getPlayerById.get(req.user.id);
    if (!player) return res.status(404).json({ error: 'Игрок не найден' });

    // FIX: use .all() not .get() for arrays
    const hippos = stmts.getHipposByOwner.all(player.id);
    const inventory = stmts.getInventory.all(player.id);
    const expeditions = stmts.getExpeditions.all(player.id);

    res.json({
      player: sanitizePlayer(player),
      hippos: hippos || [],
      inventory: inventory || [],
      expeditions: expeditions || [],
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Middleware
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Нет авторизации' });
  try {
    const token = header.replace('Bearer ', '');
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

function sanitizePlayer(p) {
  const { password_hash, ...safe } = p;
  return safe;
}

function generateStarterHippo(ownerId) {
  return {
    id: 'h_' + uuidv4(),
    owner_id: ownerId,
    name: 'Стартер',
    emoji: '🦛',
    rarity: 'uncommon',
    stats: { str: 25, agi: 20, int: 18, vit: 22, lck: 15 },
    mutations: [],
    equipped: { weapon: null, armor: null, accessory: null, artifact: null },
  };
}

module.exports = { router, authenticate };
