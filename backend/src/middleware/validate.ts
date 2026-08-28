import { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';

export const validate = (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    next(Object.assign(new Error('Invalid request body'), { statusCode: 400, code: 'VALIDATION_ERROR', details: result.error.flatten() }));
    return;
  }
  req.body = result.data;
  next();
};

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(128),
});
