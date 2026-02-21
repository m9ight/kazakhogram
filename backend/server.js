const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { stmts, db } = require('./db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'hippowars_secret_2025';
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Routes
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/players', require('./routes/players'));
app.use('/api/bossfights', require('./routes/bossfights'));
app.use('/api/clans', require('./routes/clans'));

// Serve frontend
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));
app.get('/game', (req, res) => res.sendFile(path.join(__dirname, '..', 'game.html')));
app.get('/bossfight', (req, res) => res.sendFile(path.join(__dirname, '..', 'game.html')));

// ========================
// SOCKET.IO MULTIPLAYER
// ========================

// Active sessions: socket.id -> { player_id, username, elo }
const activeSessions = new Map();
// Matchmaking queues: mode -> [{socket_id, player_id, username, elo, hippo}]
const matchQueues = { casual: [], ranked: [], team: [] };
// Active PvP battles: battle_id -> {player1, player2, state}
const activeBattles = new Map();
// Boss lobbies realtime: lobby_id -> Set of socket_ids
const bossLobbyRooms = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { id: player_id, username } = socket.user;
  const player = stmts.getPlayerById.get(player_id);
  if (!player) { socket.disconnect(); return; }
  
  activeSessions.set(socket.id, { player_id, username, elo: player.elo });
  
  // Join personal room
  socket.join(`player:${player_id}`);
  
  // Broadcast online count
  io.emit('online_count', activeSessions.size);
  
  console.log(`🟢 ${username} connected (${activeSessions.size} online)`);

  // ========================
  // MATCHMAKING
  // ========================
  socket.on('join_queue', ({ mode, hippo }) => {
    const q = matchQueues[mode];
    if (!q) return;
    
    // Remove from other queues
    for (const [m, queue] of Object.entries(matchQueues)) {
      const idx = queue.findIndex(e => e.socket_id === socket.id);
      if (idx !== -1) queue.splice(idx, 1);
    }
    
    const entry = { socket_id: socket.id, player_id, username, elo: player.elo, hippo };
    q.push(entry);
    
    socket.emit('queue_joined', { mode, position: q.length });
    
    // Try to match
    if (q.length >= 2) {
      // Find best match by ELO
      const opponent = q.find(e => e.socket_id !== socket.id && Math.abs(e.elo - player.elo) < 400);
      if (opponent) {
        q.splice(q.indexOf(entry), 1);
        q.splice(q.indexOf(opponent), 1);
        
        const battleId = uuidv4();
        const battleState = initBattleState(entry, opponent, mode);
        activeBattles.set(battleId, battleState);
        
        io.to(entry.socket_id).emit('match_found', { battle_id: battleId, opponent: { username: opponent.username, elo: opponent.elo, hippo: opponent.hippo }, side: 'player1' });
        io.to(opponent.socket_id).emit('match_found', { battle_id: battleId, opponent: { username: entry.username, elo: entry.elo, hippo: entry.hippo }, side: 'player2' });
      }
    }
  });

  socket.on('leave_queue', () => {
    for (const queue of Object.values(matchQueues)) {
      const idx = queue.findIndex(e => e.socket_id === socket.id);
      if (idx !== -1) queue.splice(idx, 1);
    }
    socket.emit('queue_left');
  });

  // ========================
  // PVP BATTLE ACTIONS
  // ========================
  socket.on('battle_action', ({ battle_id, action }) => {
    const battle = activeBattles.get(battle_id);
    if (!battle) return;
    
    const myRole = battle.player1.socket_id === socket.id ? 'player1' : 'player2';
    const opponentRole = myRole === 'player1' ? 'player2' : 'player1';
    
    // Process action
    const result = processBattleAction(battle, myRole, action);
    
    // Send update to both
    const mySocket = socket;
    const opSocket = io.sockets.sockets.get(battle[opponentRole].socket_id);
    
    mySocket.emit('battle_update', { ...result, your_side: myRole });
    if (opSocket) opSocket.emit('battle_update', { ...result, your_side: opponentRole });
    
    if (result.ended) {
      activeBattles.delete(battle_id);
      
      // Update DB stats
      const winnerId = result.winner === 'player1' ? battle.player1.player_id : battle.player2.player_id;
      const loserId = result.winner === 'player1' ? battle.player2.player_id : battle.player1.player_id;
      
      if (battle.mode === 'ranked') {
        db.prepare(`UPDATE players SET wins=wins+1, elo=elo+20 WHERE id=?`).run(winnerId);
        db.prepare(`UPDATE players SET losses=losses+1, elo=MAX(0,elo-15) WHERE id=?`).run(loserId);
      } else {
        db.prepare(`UPDATE players SET wins=wins+1 WHERE id=?`).run(winnerId);
        db.prepare(`UPDATE players SET losses=losses+1 WHERE id=?`).run(loserId);
      }
    }
  });

  // ========================
  // BOSS LOBBY REALTIME
  // ========================
  socket.on('join_boss_lobby', ({ lobby_id }) => {
    socket.join(`boss:${lobby_id}`);
    if (!bossLobbyRooms.has(lobby_id)) bossLobbyRooms.set(lobby_id, new Set());
    bossLobbyRooms.get(lobby_id).add(socket.id);
    
    io.to(`boss:${lobby_id}`).emit('lobby_updated', { type: 'player_joined', username });
  });

  socket.on('boss_lobby_ready', ({ lobby_id, ready }) => {
    io.to(`boss:${lobby_id}`).emit('lobby_updated', { type: 'player_ready', username, ready });
  });

  socket.on('leave_boss_lobby', ({ lobby_id }) => {
    socket.leave(`boss:${lobby_id}`);
    io.to(`boss:${lobby_id}`).emit('lobby_updated', { type: 'player_left', username });
  });

  // ========================
  // SOCIAL
  // ========================
  socket.on('send_friend_request', ({ to_id }) => {
    io.to(`player:${to_id}`).emit('friend_request', { from_id: player_id, from_name: username });
  });

  socket.on('challenge', ({ to_id }) => {
    io.to(`player:${to_id}`).emit('challenge_received', { from_id: player_id, from_name: username, from_elo: player.elo });
  });

  // ========================
  // DISCONNECT
  // ========================
  socket.on('disconnect', () => {
    activeSessions.delete(socket.id);
    for (const queue of Object.values(matchQueues)) {
      const idx = queue.findIndex(e => e.socket_id === socket.id);
      if (idx !== -1) queue.splice(idx, 1);
    }
    io.emit('online_count', activeSessions.size);
    console.log(`🔴 ${username} disconnected (${activeSessions.size} online)`);
  });
});

// ========================
// BATTLE HELPERS
// ========================
function initBattleState(p1, p2, mode) {
  const h1 = p1.hippo, h2 = p2.hippo;
  const hp1 = 100 + h1.stats.vit * 5;
  const hp2 = 100 + h2.stats.vit * 5;
  
  return {
    mode,
    player1: { ...p1, hp: hp1, maxHp: hp1 },
    player2: { ...p2, hp: hp2, maxHp: hp2 },
    turn: 0,
    log: [],
    ended: false,
  };
}

function processBattleAction(battle, attackerRole, action) {
  const defRole = attackerRole === 'player1' ? 'player2' : 'player1';
  const attacker = battle[attackerRole];
  const defender = battle[defRole];
  battle.turn++;
  
  let dmg = 0, text = '';
  
  if (action === 'attack' || action === 'skill') {
    const base = attacker.hippo.stats.str;
    dmg = Math.max(1, base * (action === 'skill' ? 1.8 : 1) - defender.hippo.stats.vit * 0.3 + Math.random() * 10 - 5);
    const isCrit = Math.random() < 0.15;
    if (isCrit) dmg *= 2;
    dmg = Math.floor(dmg);
    defender.hp -= dmg;
    text = `${isCrit ? '💥 КРИТ! ' : ''}${attacker.username} → ${dmg} урона`;
  } else if (action === 'heal') {
    const heal = Math.floor(attacker.maxHp * 0.2);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    text = `💚 ${attacker.username} лечится: +${heal} HP`;
  }
  
  battle.log.push({ turn: battle.turn, text, attacker: attackerRole });
  
  let ended = false, winner = null;
  if (defender.hp <= 0) {
    ended = true;
    winner = attackerRole;
    battle.ended = true;
    battle.log.push({ turn: battle.turn + 1, text: `🏆 ${attacker.username} ПОБЕДИЛ!` });
  }
  
  return {
    turn: battle.turn,
    player1_hp: battle.player1.hp,
    player1_maxHp: battle.player1.maxHp,
    player2_hp: battle.player2.hp,
    player2_maxHp: battle.player2.maxHp,
    log: battle.log.slice(-20),
    ended,
    winner,
    last_text: text,
  };
}

server.listen(PORT, () => {
  console.log(`
🦛 HippoWars Server running on port ${PORT}
🌐 Frontend: http://localhost:${PORT}
🔌 Socket.IO: enabled
📦 Database: SQLite
  `);
});
