// ========================
// SOCKET.IO MULTIPLAYER
// ========================

let onlineCount = 0;

function initSocket() {
  if (!G.token) return; // Only connect if logged in
  
  const socket = io({
    auth: { token: G.token },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 2000,
    reconnectionAttempts: 5,
  });
  
  window.hwSocket = socket;
  
  socket.on('connect', () => {
    console.log('🔌 Connected to HippoWars server');
    updateOnlineDisplay();
  });
  
  socket.on('disconnect', () => {
    console.log('🔴 Disconnected');
    updateOnlineDisplay();
  });
  
  socket.on('connect_error', (err) => {
    console.log('Connection error:', err.message);
    // Game works offline too
  });
  
  // Online count
  socket.on('online_count', (count) => {
    onlineCount = count;
    window.onlineCount = count;
    const el = document.getElementById('online-count-display');
    if (el) el.textContent = count;
  });
  
  // Matchmaking
  socket.on('queue_joined', ({ mode, position }) => {
    console.log(`In queue: ${mode}, position ${position}`);
  });
  
  socket.on('match_found', (data) => {
    console.log('Match found!', data);
    onMatchFound(data);
  });
  
  socket.on('battle_update', (data) => {
    onPvPBattleUpdate(data);
  });
  
  // Boss lobby
  socket.on('lobby_updated', (data) => {
    onBossLobbyUpdate(data);
  });
  
  // Social
  socket.on('friend_request', (data) => {
    toast(`👥 Запрос от @${data.from_name}!`, 'success');
    showNotifBadge();
  });
  
  socket.on('challenge_received', (data) => {
    toast(`⚔️ @${data.from_name} вызывает на бой! (ELO ${data.from_elo})`);
    // Could show accept/decline dialog
  });
  
  socket.on('queue_left', () => {
    console.log('Left queue');
  });
}

function onBossLobbyUpdate(data) {
  const membersDiv = document.getElementById('lobby-members');
  if (!membersDiv) return;
  
  let msg = '';
  if (data.type === 'player_joined') msg = `✅ @${data.username} присоединился`;
  else if (data.type === 'player_left') msg = `❌ @${data.username} вышел`;
  else if (data.type === 'player_ready') msg = `${data.ready?'✅':'⏳'} @${data.username} ${data.ready?'готов':'не готов'}`;
  
  if (msg) toast(msg, 'success');
}

function updateOnlineDisplay() {
  const el = document.getElementById('online-count-display');
  if (el) el.textContent = window.hwSocket?.connected ? (onlineCount || '?') : '—';
}

function showNotifBadge() {
  const btn = document.getElementById('notif-btn');
  if (btn && !btn.querySelector('.notif-dot')) {
    const dot = document.createElement('div');
    dot.className = 'notif-dot';
    btn.style.position = 'relative';
    btn.appendChild(dot);
  }
}

async function loadNotifications() {
  if (!G.token) return;
  try {
    const res = await fetch('/api/players/notifications', {
      headers: { 'Authorization': 'Bearer ' + G.token }
    });
    const notifs = await res.json();
    return notifs;
  } catch { return []; }
}

function toggleNotifPanel() {
  let panel = document.getElementById('notif-panel-popup');
  if (panel) { panel.remove(); return; }
  
  panel = document.createElement('div');
  panel.id = 'notif-panel-popup';
  panel.className = 'notif-panel';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-weight:700;font-size:13px">🔔 Уведомления</div>
      <button style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:16px" onclick="document.getElementById('notif-panel-popup').remove()">✕</button>
    </div>
    <div id="notif-list"><div style="color:var(--text3);font-size:12px;padding:8px">Загрузка...</div></div>
  `;
  document.getElementById('game-header').appendChild(panel);
  
  loadNotifications().then(notifs => {
    const list = document.getElementById('notif-list');
    if (!list) return;
    if (!notifs.length) { list.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:8px">Нет новых уведомлений</div>'; return; }
    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read?'':'unread'}">
        <div style="font-size:12px;font-weight:600">${getNotifTitle(n.type)}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">${getNotifText(n)}</div>
      </div>
    `).join('');
    
    // Mark as read
    if (G.token) fetch('/api/players/notifications/read', { method:'POST', headers:{'Authorization':'Bearer '+G.token} });
    const btn = document.getElementById('notif-btn');
    if (btn) { const dot = btn.querySelector('.notif-dot'); if (dot) dot.remove(); }
  });
}

function getNotifTitle(type) {
  return { friend_request:'👥 Запрос дружбы', boss_reward:'👹 Босс-файт', challenge:'⚔️ Вызов на бой' }[type] || '🔔 Уведомление';
}

function getNotifText(n) {
  if (n.type === 'friend_request') return `@${n.data.from_name} хочет стать другом`;
  if (n.type === 'boss_reward') return n.data.won ? `+${n.data.coins}🪙 за победу над ${n.data.boss_name}` : `Поражение от ${n.data.boss_name}`;
  return JSON.stringify(n.data);
}
