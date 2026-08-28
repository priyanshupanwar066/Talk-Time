// TalkTime Express Application Setup
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Module routes
import authRoutes from './modules/auth/routes';
import usersRoutes from './modules/users/routes';
import conversationsRoutes from './modules/conversations/routes';
import messagesRoutes from './modules/messages/routes';
import notificationsRoutes from './modules/notifications/routes';
import presenceRoutes from './modules/presence/routes';
import { db } from './database/db';
import { redisService } from './database/redis';

export function createApp(): express.Application {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
  }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

  // Basic middleware
  app.use(cors({
    origin: config.clientUrl,
    credentials: true,
  }));
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Request logger middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (!req.originalUrl.startsWith('/@') && !req.originalUrl.startsWith('/node_modules')) {
        logger.debug('HTTP', `${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Static uploads directory
  const uploadsPath = path.resolve(process.cwd(), config.uploadDir);
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsPath));

  // Health and Readiness endpoints (probes for containers & Kubernetes)
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      service: 'TalkTime Backend API',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/ready', (req: Request, res: Response) => {
    const isDbReady = db.isReady();
    const isRedisReady = redisService.isReady();
    const isStorageReady = fs.existsSync(uploadsPath);

    if (isDbReady && isRedisReady && isStorageReady) {
      res.status(200).json({
        status: 'ready',
        checks: {
          database: 'healthy',
          redis: 'healthy',
          storage: 'healthy',
          websocket: 'healthy',
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        checks: {
          database: isDbReady ? 'healthy' : 'unhealthy',
          redis: isRedisReady ? 'healthy' : 'unhealthy',
          storage: isStorageReady ? 'healthy' : 'unhealthy',
        },
      });
    }
  });

  // REST API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/conversations', conversationsRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/presence', presenceRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
