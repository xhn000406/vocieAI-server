import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import meetingRoutes from './meeting';
import transcriptRoutes from './transcript';
import fileRoutes from './file';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/meetings', meetingRoutes);
router.use('/transcripts', transcriptRoutes);
router.use('/files', fileRoutes);

export default router;

