import cron from 'node-cron';
import axios from 'axios';

/**
 * Initialize cron jobs for the application
 * @param {Object} app - Express app instance
 */
export const initCronJobs = (app) => {
	// Create a function to call the cleanup endpoint
	const cleanupOldDrafts = async () => {
		try {
			console.log('Running scheduled cleanup of old draft projects...');

			// Get server's base URL from config, or construct it
			const baseUrl = process.env.VITE_SERVER_DOMAIN || `http://localhost:${process.env.PORT || 8000}`;

			// Make request to cleanup endpoint
			const response = await axios.post(`${baseUrl}/api/webhook/cleanup-drafts`, {
				// Add any authentication or validation as needed
				secret: process.env.CRON_SECRET
			});

			console.log('Cleanup complete:', response.data);
		} catch (error) {
			console.error('Error in draft projects cleanup cron:', error);
		}
	};

	// Schedule cleanup job to run daily at midnight
	cron.schedule('0 0 * * *', cleanupOldDrafts);

	console.log('Cron jobs initialized successfully');
};
