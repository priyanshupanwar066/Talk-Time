// Messages Routes
import { Router } from 'express';
import multer from 'multer';
import {
  getMessages,
  sendMessage,
  uploadAttachment,
  editMessage,
  deleteMessage,
  searchMessages,
} from './messagesController';
import { authenticate } from '../../middleware/auth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB attachment limit
  fileFilter: (_req, file, cb) => cb(null, /^(image\/|application\/pdf|text\/plain|application\/zip)/.test(file.mimetype)),
});

const router = Router();

router.use(authenticate);

router.get('/search', searchMessages);
router.post('/upload', upload.single('file'), uploadAttachment);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);

export default router;
