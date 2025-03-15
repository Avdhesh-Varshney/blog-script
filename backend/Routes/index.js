import express from 'express';
import authRoutes from './api/auth.routes.js';
import mediaRoutes from './api/media.routes.js';
import projectRoutes from './api/project.routes.js';
import githubWebhookRoutes from './webhook/github.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);
router.use('/project', projectRoutes);
router.use('/webhook', githubWebhookRoutes);

export default router;
