require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const app = require('./app');
const { createServer } = require('http');
const { initWebSocket } = require('./ws/wsServer');
const { initDB } = require('./db/database');
const { startCollector } = require('./collector');

const PORT = process.env.PORT || 3500;
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  // Init SQLite database
  await initDB();
  console.log('✅ Database initialized');

  // Create HTTP server from Express app
  const httpServer = createServer(app);

  // Init WebSocket server attached to same HTTP server
  initWebSocket(httpServer);
  console.log('✅ WebSocket server initialized');

  // Start metrics collector
  startCollector();
  console.log('✅ Metrics collector started');

  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 Server running at http://${HOST}:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

main().catch((err) => {
  console.error('❌ Fatal error during startup:', err);
  process.exit(1);
});
