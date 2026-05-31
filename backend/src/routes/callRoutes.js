import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { initiateCall, updateCallStatus, getCallHistory } from '../controllers/callController.js';

const router = express.Router();

router.post('/', protect, initiateCall);
router.put('/:id', protect, updateCallStatus);
router.get('/history', protect, getCallHistory);

export default router;
