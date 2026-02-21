// Node.js 22.5+ has built-in SQLite — no installation needed!
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'hippowars.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ========================
// SCHEMA
// ========================
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    avatar TEXT DEFAULT '🦛',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    xp_needed INTEGER DEFAULT 100,
    coins INTEGER DEFAULT 500,
    gems INTEGER DEFAULT 50,
    elo INTEGER DEFAULT 1000,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    clan_id TEXT,
    theme TEXT DEFAULT 'default',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_online DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS hippos (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '🦛',
    rarity TEXT DEFAULT 'common',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    stats TEXT NOT NULL DEFAULT '{}',
    mutations TEXT DEFAULT '[]',
    equipped TEXT DEFAULT '{}',
    in_valhalla INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_data TEXT NOT NULL,
    upgrade_level INTEGER DEFAULT 0,
    equipped_to TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS battles (
    id TEXT PRIMARY KEY,
    player1_id TEXT NOT NULL,
    player2_id TEXT,
    mode TEXT NOT NULL,
    winner_id TEXT,
    log TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clans (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    emoji TEXT DEFAULT '🏰',
    leader_id TEXT NOT NULL,
    power INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clan_members (
    clan_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (clan_id, player_id)
  );

  CREATE TABLE IF NOT EXISTS boss_lobbies (
    id TEXT PRIMARY KEY,
    host_id TEXT NOT NULL,
    boss_id TEXT NOT NULL,
    status TEXT DEFAULT 'waiting',
    max_players INTEGER DEFAULT 4,
    invite_code TEXT UNIQUE NOT NULL,
    members TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    FOREIGN KEY (host_id) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS matchmaking_queue (
    player_id TEXT PRIMARY KEY,
    elo INTEGER NOT NULL,
    mode TEXT NOT NULL,
    hippo_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS expeditions (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    hippo_id TEXT NOT NULL,
    hippo_name TEXT,
    hippo_emoji TEXT,
    region_id TEXT NOT NULL,
    region_name TEXT,
    region_emoji TEXT,
    end_time INTEGER NOT NULL,
    claimed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    sender_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT DEFAULT '{}',
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ========================
// PREPARED STATEMENTS
// node:sqlite has same API as better-sqlite3
// .get(...args), .all(...args), .run(...args)
// ========================
const stmts = {
  // Players
  createPlayer: db.prepare(`INSERT INTO players (id, username, password_hash, email) VALUES (?, ?, ?, ?)`),
  getPlayerById: db.prepare(`SELECT * FROM players WHERE id = ?`),
  getPlayerByUsername: db.prepare(`SELECT * FROM players WHERE username = ?`),
  updatePlayer: db.prepare(`UPDATE players SET level=?, xp=?, xp_needed=?, coins=?, gems=?, elo=?, wins=?, losses=?, avatar=?, theme=?, last_online=CURRENT_TIMESTAMP WHERE id=?`),
  searchPlayers: db.prepare(`SELECT id, username, avatar, level, elo, wins, last_online FROM players WHERE username LIKE ? LIMIT 20`),
  getLeaderboard: db.prepare(`SELECT id, username, avatar, level, elo, wins, losses FROM players ORDER BY elo DESC LIMIT 50`),
  getLeaderboardByWins: db.prepare(`SELECT id, username, avatar, level, elo, wins, losses FROM players ORDER BY wins DESC LIMIT 50`),
  getLeaderboardByLevel: db.prepare(`SELECT id, username, avatar, level, elo, wins, losses FROM players ORDER BY level DESC LIMIT 50`),

  // Hippos
  createHippo: db.prepare(`INSERT INTO hippos (id, owner_id, name, emoji, rarity, stats, mutations, equipped) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
  getHipposByOwner: db.prepare(`SELECT * FROM hippos WHERE owner_id = ?`),
  updateHippo: db.prepare(`UPDATE hippos SET name=?, level=?, xp=?, deaths=?, wins=?, losses=?, stats=?, mutations=?, equipped=?, in_valhalla=? WHERE id=?`),
  deleteHippo: db.prepare(`DELETE FROM hippos WHERE id = ? AND owner_id = ?`),

  // Inventory
  addInventoryItem: db.prepare(`INSERT INTO inventory (id, owner_id, item_id, item_data) VALUES (?, ?, ?, ?)`),
  getInventory: db.prepare(`SELECT * FROM inventory WHERE owner_id = ?`),
  updateInventoryItem: db.prepare(`UPDATE inventory SET upgrade_level=?, equipped_to=? WHERE id=? AND owner_id=?`),
  deleteInventoryItem: db.prepare(`DELETE FROM inventory WHERE id=? AND owner_id=?`),

  // Clans
  createClan: db.prepare(`INSERT INTO clans (id, name, emoji, leader_id) VALUES (?, ?, ?, ?)`),
  getClanById: db.prepare(`SELECT * FROM clans WHERE id = ?`),
  getAllClans: db.prepare(`SELECT c.*, COUNT(cm.player_id) as member_count FROM clans c LEFT JOIN clan_members cm ON c.id = cm.clan_id GROUP BY c.id`),
  addClanMember: db.prepare(`INSERT OR REPLACE INTO clan_members (clan_id, player_id, role) VALUES (?, ?, ?)`),
  removeClanMember: db.prepare(`DELETE FROM clan_members WHERE clan_id=? AND player_id=?`),

  // Boss Lobbies
  createBossLobby: db.prepare(`INSERT INTO boss_lobbies (id, host_id, boss_id, invite_code, members) VALUES (?, ?, ?, ?, ?)`),
  getBossLobby: db.prepare(`SELECT * FROM boss_lobbies WHERE id = ?`),
  getBossLobbyByInvite: db.prepare(`SELECT * FROM boss_lobbies WHERE invite_code = ?`),
  updateBossLobby: db.prepare(`UPDATE boss_lobbies SET status=?, members=?, started_at=? WHERE id=?`),

  // Matchmaking
  addToQueue: db.prepare(`INSERT OR REPLACE INTO matchmaking_queue (player_id, elo, mode, hippo_id) VALUES (?, ?, ?, ?)`),
  removeFromQueue: db.prepare(`DELETE FROM matchmaking_queue WHERE player_id=?`),
  findMatch: db.prepare(`SELECT * FROM matchmaking_queue WHERE mode=? AND player_id != ? AND ABS(elo - ?) < 300 ORDER BY joined_at ASC LIMIT 1`),

  // Expeditions
  createExpedition: db.prepare(`INSERT INTO expeditions (id, owner_id, hippo_id, hippo_name, hippo_emoji, region_id, region_name, region_emoji, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  getExpeditions: db.prepare(`SELECT * FROM expeditions WHERE owner_id=? AND claimed=0`),
  claimExpedition: db.prepare(`UPDATE expeditions SET claimed=1 WHERE id=? AND owner_id=?`),

  // Friends
  addFriend: db.prepare(`INSERT INTO friendships (id, player_id, friend_id, sender_id, status) VALUES (?, ?, ?, ?, 'pending')`),
  getFriendships: db.prepare(`
    SELECT f.*, p.username, p.avatar, p.level, p.elo, p.wins
    FROM friendships f
    JOIN players p ON p.id = CASE WHEN f.player_id=? THEN f.friend_id ELSE f.player_id END
    WHERE f.player_id=? OR f.friend_id=?
  `),
  updateFriendship: db.prepare(`UPDATE friendships SET status=? WHERE id=?`),
  getFriendshipById: db.prepare(`SELECT * FROM friendships WHERE id=?`),

  // Notifications
  createNotification: db.prepare(`INSERT INTO notifications (id, player_id, type, data) VALUES (?, ?, ?, ?)`),
  getNotifications: db.prepare(`SELECT * FROM notifications WHERE player_id=? AND read=0 ORDER BY created_at DESC LIMIT 20`),
  markNotifRead: db.prepare(`UPDATE notifications SET read=1 WHERE id=? AND player_id=?`),
  markAllNotifsRead: db.prepare(`UPDATE notifications SET read=1 WHERE player_id=?`),
};

module.exports = { db, stmts };