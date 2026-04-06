const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

let wss = null;

function initWebSocket(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Authenticate via cookie or query param token
    const token = getTokenFromRequest(req);

    if (!token) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    } catch {
      ws.close(1008, 'Invalid token');
      return;
    }

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
      } catch {}
    });
  });

  // Heartbeat to detect dead connections
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));
  return wss;
}

function broadcast(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function getTokenFromRequest(req) {
  // Try cookie first
  const cookies = cookie.parse(req.headers.cookie || '');
  if (cookies.token) return cookies.token;

  // Try query param (for dev)
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get('token') || null;
}

module.exports = { initWebSocket, broadcast };
