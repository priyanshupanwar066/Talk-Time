// Conversations Routes
import { Router } from 'express';
import {
  listConversations,
  createConversation,
  getConversationById,
  updateConversation,
  addMembers,
  removeMember,
  markAsRead,
} from './conversationsController';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listConversations);
router.post('/', createConversation);
router.get('/:id', getConversationById);
router.put('/:id', updateConversation);
router.post('/:id/members', addMembers);
router.delete('/:id/members/:targetUserId', removeMember);
router.post('/:id/read', markAsRead);

export default router;
