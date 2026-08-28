// Notifications Routes
import { Router } from 'express';
import { listNotifications, markAsRead, markAllAsRead } from './notificationsController';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

export default router;
