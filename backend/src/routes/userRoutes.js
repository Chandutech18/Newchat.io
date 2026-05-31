import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  searchUsers, getAllUsers, banUser, getUserById, getUserByUsername,
  getMyProfile, updateProfileSettings, requestConnection, acceptConnection,
  removeConnection, toggleBlockUser
} from '../controllers/userController.js';

const router = express.Router();

router.get('/', protect, searchUsers);
router.get('/all', protect, getAllUsers);
router.get('/me/profile', protect, getMyProfile);
router.put('/me/settings', protect, updateProfileSettings);
router.get('/profile/:username', getUserByUsername);
router.post('/:id/connect', protect, requestConnection);
router.post('/:id/accept', protect, acceptConnection);
router.delete('/:id/connect', protect, removeConnection);
router.put('/:id/block', protect, toggleBlockUser);
router.get('/:id', protect, getUserById);
router.put('/:id/ban', protect, banUser);

export default router;
