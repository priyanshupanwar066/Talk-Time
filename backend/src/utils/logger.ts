// Structured Server Logger for TalkTime

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private formatMessage(level: LogLevel, context: string, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const safeMeta = meta ? this.sanitize(meta) : '';
    const metaStr = safeMeta ? ` ${JSON.stringify(safeMeta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${metaStr}`;
  }

  private sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized: any = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
      const lower = key.toLowerCase();
      if (lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('authorization')) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = this.sanitize(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  }

  info(context: string, message: string, meta?: any) {
    console.log(this.formatMessage('info', context, message, meta));
  }

  warn(context: string, message: string, meta?: any) {
    console.warn(this.formatMessage('warn', context, message, meta));
  }

  error(context: string, message: string, meta?: any) {
    console.error(this.formatMessage('error', context, message, meta));
  }

  debug(context: string, message: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', context, message, meta));
    }
  }
}

export const logger = new Logger();
