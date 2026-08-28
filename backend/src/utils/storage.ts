// Storage layer abstraction for TalkTime (Local filesystem with AWS S3 interface compatibility)
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';
import { logger } from './logger';
import { PutObjectCommand, S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadedFileResult {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  path: string;
}

export interface IStorageProvider {
  saveFile(file: Express.Multer.File): Promise<UploadedFileResult>;
  deleteFile(filepath: string): Promise<boolean>;
  getFileUrl(filename: string): string;
}

export class LocalStorageProvider implements IStorageProvider {
  private uploadPath: string;

  constructor() {
    this.uploadPath = path.resolve(process.cwd(), config.uploadDir);
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
      logger.info('Storage', `Created upload directory at ${this.uploadPath}`);
    }
  }

  async saveFile(file: Express.Multer.File): Promise<UploadedFileResult> {
    const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const destination = path.join(this.uploadPath, filename);

    if (file.buffer) {
      await fs.promises.writeFile(destination, file.buffer);
    } else if (file.path && file.path !== destination) {
      await fs.promises.copyFile(file.path, destination);
    }

    return {
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${filename}`,
      path: destination,
    };
  }

  async deleteFile(filename: string): Promise<boolean> {
    try {
      const cleanName = path.basename(filename);
      const target = path.join(this.uploadPath, cleanName);
      if (fs.existsSync(target)) {
        await fs.promises.unlink(target);
        return true;
      }
      return false;
    } catch (err: any) {
      logger.error('Storage', `Failed to delete file ${filename}: ${err.message}`);
      return false;
    }
  }

  getFileUrl(filename: string): string {
    const cleanName = path.basename(filename);
    return `/uploads/${cleanName}`;
  }
}

class S3StorageProvider implements IStorageProvider {
  private readonly client: S3Client;
  constructor(private readonly bucket: string) {
    this.client = new S3Client({
      region: config.s3Region,
      ...(config.s3Endpoint ? { endpoint: config.s3Endpoint, forcePathStyle: true } : {}),
      ...(config.s3AccessKeyId && config.s3SecretAccessKey
        ? { credentials: { accessKeyId: config.s3AccessKeyId, secretAccessKey: config.s3SecretAccessKey } }
        : {}),
    });
  }
  async saveFile(file: Express.Multer.File): Promise<UploadedFileResult> {
    const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: filename, Body: file.buffer, ContentType: file.mimetype,
    }));
    const url = await getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: filename }), { expiresIn: 3600 });
    return { filename, originalName: file.originalname, mimetype: file.mimetype, size: file.size, url, path: filename };
  }
  async deleteFile(filename: string): Promise<boolean> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: path.basename(filename) }));
    return true;
  }
  getFileUrl(filename: string): string {
    if (config.s3Endpoint) return `${config.s3Endpoint.replace(/\/$/, '')}/${this.bucket}/${encodeURIComponent(path.basename(filename))}`;
    return `https://${this.bucket}.s3.${config.s3Region}.amazonaws.com/${encodeURIComponent(path.basename(filename))}`;
  }
}

export const storage = config.isProduction && config.s3Bucket
  ? new S3StorageProvider(config.s3Bucket)
  : new LocalStorageProvider();
