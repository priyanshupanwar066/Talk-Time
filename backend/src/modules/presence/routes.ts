// Presence Routes
import { Router } from 'express';
import { getPresence, getMultiplePresences } from './presenceController';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getMultiplePresences);
router.get('/:userId', getPresence);

export default router;
