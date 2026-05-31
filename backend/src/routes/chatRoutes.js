import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';
import {
  accessChat, fetchChats, createGroupChat, renameGroup,
  addToGroup, removeFromGroup, promoteAdmin, archiveChat,
  muteChat, updateGroupDescription
} from '../controllers/chatController.js';

const router = express.Router();

router.route('/').get(protect, fetchChats).post(protect, accessChat);
router.post('/group', protect, createGroupChat);
router.put('/group/:chatId/rename', protect, renameGroup);
router.put('/group/:chatId/description', protect, updateGroupDescription);
router.put('/group/:chatId/add', protect, addToGroup);
router.put('/group/:chatId/remove', protect, removeFromGroup);
router.put('/group/:chatId/promote', protect, promoteAdmin);
router.put('/:chatId/archive', protect, archiveChat);
router.put('/:chatId/mute', protect, muteChat);

export default router;
