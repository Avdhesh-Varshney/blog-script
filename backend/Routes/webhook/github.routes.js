import express from 'express';
import {
    githubWebhookHandler,
    cleanupOldDraftProjects,
    approvePR,
    publishProject
} from '../../Controllers/webhook.controller.js';
import { authenticateUser } from '../../Middlewares/auth.middleware.js';

const githubWebhookRoutes = express.Router();

// Handle GitHub webhook events
githubWebhookRoutes.post('/github', githubWebhookHandler);

// Endpoint to trigger cleanup of old draft projects (can be triggered by a cron job)
githubWebhookRoutes.post('/cleanup-drafts', cleanupOldDraftProjects);

// Endpoint for approving PRs from the website
githubWebhookRoutes.post('/approve-pr', authenticateUser, approvePR);

// Endpoint for publishing a project after PR approval
githubWebhookRoutes.post('/publish-project', authenticateUser, publishProject);

export default githubWebhookRoutes;
