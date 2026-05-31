import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';
import {
  registerUser, loginUser, logoutUser, getUserProfile,
  updateUserProfile, uploadAvatar, forgotPassword, resetPassword,
  blockUser, unblockUser
} from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/block/:userId', protect, blockUser);
router.delete('/block/:userId', protect, unblockUser);

export default router;
