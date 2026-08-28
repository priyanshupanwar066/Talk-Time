// TalkTime backend server entry point (Express + Socket.IO)
import http from 'http';
import { createApp } from './src/app';
import { socketHandler } from './src/websocket/socketHandler';
import { config } from './src/config/env';
import { logger } from './src/utils/logger';
import { db } from './src/database/db';

async function startServer() {
  await db.connect();
  const app = createApp();
  const server = http.createServer(app);

  // Initialize Socket.IO with HTTP Server
  socketHandler.init(server);

  const PORT = config.port;
  const HOST = process.env.HOST || '0.0.0.0';

  server.listen(PORT, HOST, () => {
    logger.info('Server', `🚀 TalkTime server running at http://${HOST}:${PORT}`);
    logger.info('Server', `Environment: ${config.nodeEnv}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Server', 'Received termination signal, closing gracefully...');
    server.close(() => {
      db.close().then(() => {
        logger.info('Server', 'HTTP server and database closed.');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
