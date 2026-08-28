// TalkTime Configuration
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const localEnv = path.resolve(process.cwd(), '.env');
const parentEnv = path.resolve(process.cwd(), '..', '.env');
dotenv.config({path: fs.existsSync(localEnv) ? localEnv : parentEnv});

const nodeEnv = process.env.NODE_ENV || 'development';
const mongodbUri = nodeEnv === 'test'
  ? process.env.TEST_MONGODB_URI || ''
  : process.env.MONGODB_URI || '';
const mongodbDb = process.env.MONGODB_DB || 'talktime';
const jwtSecret = process.env.JWT_SECRET || '';
const s3Bucket = process.env.S3_BUCKET || '';
const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

if (nodeEnv === 'production' && (!mongodbUri || !process.env.MONGODB_DB || !jwtSecret || !s3Bucket)) {
  throw new Error('MONGODB_URI, MONGODB_DB, JWT_SECRET, and S3_BUCKET are required in production');
}
if (nodeEnv === 'test' && !mongodbUri) {
  throw new Error('TEST_MONGODB_URI is required when running tests');
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: jwtSecret || 'development-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  clientUrl: clientUrls[0] || 'http://localhost:5173',
  clientUrls,
  nodeEnv,
  isProduction: nodeEnv === 'production',
  mongodbUri,
  mongodbDb,
  s3Bucket,
  s3Region: process.env.S3_REGION || 'us-east-1',
  s3Endpoint: process.env.S3_ENDPOINT || '',
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
};
