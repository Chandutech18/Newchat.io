import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';
import {
  sendMessage, allMessages, editMessage,
  deleteForMe, deleteForEveryone, reactToMessage,
  pinMessage, starMessage, searchMessages,
  markChatRead, markMessageDelivered
} from '../controllers/messageController.js';

const router = express.Router();

router.post('/', protect, upload.single('file'), sendMessage);
router.get('/search', protect, searchMessages);
router.put('/:chatId/read', protect, markChatRead);
router.get('/:chatId', protect, allMessages);
router.put('/:id', protect, editMessage);
router.put('/:id/delivered', protect, markMessageDelivered);
router.delete('/:id/me', protect, deleteForMe);
router.delete('/:id/everyone', protect, deleteForEveryone);
router.post('/:id/react', protect, reactToMessage);
router.post('/:id/pin', protect, pinMessage);
router.post('/:id/star', protect, starMessage);

export default router;
