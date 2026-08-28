// Users Routes
import { Router } from 'express';
import multer from 'multer';
import { listUsers, searchUsers, getUserById, updateUser, uploadAvatar } from './usersController';
import { authenticate } from '../../middleware/auth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => cb(null, /^(image\/jpeg|image\/png|image\/webp)$/.test(file.mimetype)),
});

const router = Router();

router.use(authenticate);

router.get('/', listUsers);
router.get('/search', searchUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.post('/avatar', upload.single('avatar'), uploadAvatar);

export default router;
