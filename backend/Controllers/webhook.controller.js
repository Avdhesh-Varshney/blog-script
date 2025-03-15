import Project from "../Models/project.model.js";
import User from "../Models/user.model.js";
import crypto from 'crypto';
import axios from 'axios';

// GitHub webhook secret (should be stored in environment variables in production)
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'your-webhook-secret';
const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN;

/**
 * Verify the webhook signature from GitHub
 */
const verifyGithubWebhook = (req) => {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        return false;
    }

    const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
    const calculatedSignature = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature));
};

/**
 * Extract project ID from PR title
 * Format: [PID-xxxxxxxx] Title of project
 */
const extractProjectId = (title) => {
    const match = title.match(/\[(PID-[a-z0-9]+)\]/i);
    return match ? match[1] : null;
};

/**
 * Handle GitHub webhook events related to pull requests
 */
export const githubWebhookHandler = async (req, res) => {
    try {
        // Verify webhook signature
        if (!verifyGithubWebhook(req)) {
            return res.status(401).json({ error: "Invalid webhook signature" });
        }

        const event = req.headers['x-github-event'];
        const payload = req.body;

        // Handle only pull request events
        if (event !== 'pull_request') {
            return res.status(200).json({ message: "Event ignored" });
        }

        const {
            action,
            pull_request: {
                number,
                title,
                html_url,
                user: { login },
                merged,
                state,
                created_at,
                merged_at,
                base: { repo: { full_name } }
            }
        } = payload;

        // Extract project ID from PR title
        const projectId = extractProjectId(title);
        if (!projectId && action !== 'edited') {
            console.log(`No project ID found in PR title: "${title}"`);
            return res.status(200).json({ message: "No project ID found in PR title" });
        }

        // Find the user by GitHub username
        const user = await User.findOne({ username: login });

        if (!user) {
            return res.status(404).json({ error: `User with GitHub username ${login} not found` });
        }

        // Get the repository name and owner from full_name (owner/repo)
        const [owner, repo] = full_name.split('/');

        // Handle different PR actions
        switch (action) {
            case 'opened':
                // PR opened with project ID in title
                if (projectId) {
                    await handlePROpened(number, projectId, user._id, owner, repo);
                }
                break;

            case 'edited':
                // Check if title was changed and now contains a project ID
                if (payload.changes && payload.changes.title) {
                    const oldTitle = payload.changes.title.from;
                    const oldProjectId = extractProjectId(oldTitle);

                    if (projectId && projectId !== oldProjectId) {
                        // Title was changed and now contains a different or new project ID
                        await handlePRTitleChanged(number, projectId, oldProjectId, user._id, owner, repo);
                    }
                }
                break;

            case 'closed':
                if (merged) {
                    // PR merged
                    await handlePRMerged(number, projectId, user._id, owner, repo, merged_at);
                } else {
                    // PR closed without merging
                    await handlePRClosed(number, projectId, user._id, owner, repo);
                }
                break;

            case 'reopened':
                // PR reopened
                if (projectId) {
                    await handlePRReopened(number, projectId, user._id, owner, repo);
                }
                break;

            default:
                // Ignore other PR actions
                break;
        }

        return res.status(200).json({ message: "Webhook processed successfully" });
    } catch (error) {
        console.error("Webhook error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Handle when a PR title is changed and now contains a project ID
 */
const handlePRTitleChanged = async (prNumber, newProjectId, oldProjectId, userId, owner, repo) => {
    try {
        // If the PR was previously linked to a different project, unlink it
        if (oldProjectId) {
            const oldProject = await Project.findOne({ project_id: oldProjectId });
            if (oldProject) {
                await Project.findByIdAndUpdate(oldProject._id, {
                    $pull: { pr: { number: prNumber } }
                });
                console.log(`Unlinked PR #${prNumber} from project ${oldProjectId}`);
            }
        }

        // Link to the new project ID
        const project = await Project.findOne({ project_id: newProjectId });
        if (!project) {
            console.log(`No project found with ID ${newProjectId} for PR #${prNumber}`);
            return;
        }

        // Check if this PR is already linked to this project
        const prExists = project.pr.some(pr => pr.number === prNumber);
        if (prExists) {
            console.log(`PR #${prNumber} is already linked to project ${newProjectId}`);
            return;
        }

        // Update the project with PR information
        await Project.findByIdAndUpdate(project._id, {
            $push: {
                pr: {
                    number: prNumber,
                    status: 'pending',
                    raisedBy: userId,
                    createdAt: new Date()
                }
            }
        });

        console.log(`PR #${prNumber} linked to project ${newProjectId} after title change`);
    } catch (error) {
        console.error(`Error handling PR title change:`, error);
    }
};

/**
 * Handle when a PR is opened
 */
const handlePROpened = async (prNumber, projectId, userId, owner, repo) => {
    try {
        // Find project with matching project_id
        const project = await Project.findOne({
            project_id: projectId,
            draft: true
        });

        if (!project) {
            console.log(`No draft project found with ID ${projectId} for PR #${prNumber}`);
            return;
        }

        // Update the project with PR information
        await Project.findByIdAndUpdate(project._id, {
            $push: {
                pr: {
                    number: prNumber,
                    status: 'pending',
                    raisedBy: userId,
                    createdAt: new Date()
                }
            }
        });

        console.log(`PR #${prNumber} linked to project ${project.title} (${projectId})`);
    } catch (error) {
        console.error(`Error handling PR opened:`, error);
    }
};

/**
 * Handle when a PR is merged
 */
const handlePRMerged = async (prNumber, projectId, userId, owner, repo, mergedAt) => {
    try {
        // Find project with matching project_id and PR number
        const project = await Project.findOne({
            'pr.number': prNumber,
            project_id: projectId
        });

        if (!project) {
            console.log(`No project found with ID ${projectId} for PR #${prNumber}`);
            return;
        }

        // Update PR status to merged and set mergedAt date
        // Note: We don't automatically set draft=false because publishing is optional
        await Project.findByIdAndUpdate(project._id, {
            $set: {
                'pr.$[elem].status': 'merged',
                'pr.$[elem].mergedAt': new Date(mergedAt)
            }
        }, {
            arrayFilters: [{ 'elem.number': prNumber }]
        });

        console.log(`PR #${prNumber} marked as merged for project ${project.title}`);
    } catch (error) {
        console.error(`Error handling PR merged:`, error);
    }
};

/**
 * Handle when a PR is closed without merging
 */
const handlePRClosed = async (prNumber, projectId, userId, owner, repo) => {
    try {
        // Find project with matching project_id and PR number
        const project = await Project.findOne({
            'pr.number': prNumber,
            project_id: projectId
        });

        if (!project) {
            console.log(`No project found with ID ${projectId} for PR #${prNumber}`);
            return;
        }

        // Update PR status to rejected
        await Project.findByIdAndUpdate(project._id, {
            $set: {
                'pr.$[elem].status': 'rejected'
            }
        }, {
            arrayFilters: [{ 'elem.number': prNumber }]
        });

        console.log(`PR #${prNumber} marked as rejected for project ${project.title}`);
    } catch (error) {
        console.error(`Error handling PR closed:`, error);
    }
};

/**
 * Handle when a PR is reopened
 */
const handlePRReopened = async (prNumber, projectId, userId, owner, repo) => {
    try {
        // Find project with matching project_id and PR number
        const project = await Project.findOne({
            'pr.number': prNumber,
            project_id: projectId
        });

        if (!project) {
            console.log(`No project found with ID ${projectId} for PR #${prNumber}`);
            return;
        }

        // Update PR status back to pending
        await Project.findByIdAndUpdate(project._id, {
            $set: {
                'pr.$[elem].status': 'pending'
            }
        }, {
            arrayFilters: [{ 'elem.number': prNumber }]
        });

        console.log(`PR #${prNumber} marked as pending for project ${project.title}`);
    } catch (error) {
        console.error(`Error handling PR reopened:`, error);
    }
};

/**
 * Clean up old draft projects
 * This should be called by a scheduled job/cron
 */
export const cleanupOldDraftProjects = async (req, res) => {
    try {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        // Find all draft projects with PRs older than 2 weeks that are still pending or rejected
        const oldDraftProjects = await Project.find({
            draft: true,
            'pr.createdAt': { $lt: twoWeeksAgo },
            'pr.status': { $in: ['pending', 'rejected'] }
        });

        const projectIds = oldDraftProjects.map(project => project._id);

        // Delete the old draft projects
        const result = await Project.deleteMany({
            _id: { $in: projectIds }
        });

        return res.status(200).json({
            message: `Cleaned up ${result.deletedCount} old draft projects`,
            projectIds
        });
    } catch (error) {
        console.error("Error cleaning up old draft projects:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Approve a PR from the website
 * This can be called by reviewers from the website
 */
export const approvePR = async (req, res) => {
    try {
        const { projectId, prNumber, reviewerId, isAdmin = false } = req.body;

        if (!projectId || !prNumber || !reviewerId) {
            return res.status(400).json({ error: "Missing required parameters" });
        }

        // Find the project
        const project = await Project.findOne({ project_id: projectId });
        if (!project) {
            return res.status(404).json({ error: `Project with ID ${projectId} not found` });
        }

        // Find the PR in the project
        const prIndex = project.pr.findIndex(pr => pr.number === parseInt(prNumber, 10));
        if (prIndex === -1) {
            return res.status(404).json({ error: `PR #${prNumber} not found in project ${projectId}` });
        }

        // Find the reviewer
        const reviewer = await User.findById(reviewerId);
        if (!reviewer) {
            return res.status(404).json({ error: `Reviewer not found` });
        }

        // Update the PR with the approval
        const pr = project.pr[prIndex];

        // If the PR doesn't have reviewers array, add it
        if (!pr.reviewers) {
            pr.reviewers = [];
        }

        // Check if reviewer has already approved
        const reviewerIndex = pr.reviewers.findIndex(r => r.reviewer.toString() === reviewerId);
        if (reviewerIndex !== -1) {
            // Update existing approval
            pr.reviewers[reviewerIndex].approved = true;
            pr.reviewers[reviewerIndex].updatedAt = new Date();
        } else {
            // Add new approval
            pr.reviewers.push({
                reviewer: reviewerId,
                approved: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        // Save the project with updated PR information
        await project.save();

        // If admin override or all reviewers (at least 2-3) have approved, merge the PR
        const totalApprovals = pr.reviewers.filter(r => r.approved).length;
        const shouldMerge = isAdmin || totalApprovals >= 2; // Requiring at least 2 approvals

        if (shouldMerge) {
            // Update PR status to approved
            project.pr[prIndex].status = 'approved';
            await project.save();

            // Merge the PR on GitHub if it's not already merged
            if (pr.status !== 'merged' && shouldMerge) {
                await mergePR(prNumber, project.repository);
            }

            return res.status(200).json({
                message: `PR #${prNumber} approved and will be merged`,
                merged: true,
                project
            });
        }

        return res.status(200).json({
            message: `PR #${prNumber} approved by ${reviewer.fullname || reviewer.username}`,
            merged: false,
            approvalsCount: totalApprovals,
            project
        });

    } catch (error) {
        console.error("Error approving PR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Merge a PR on GitHub
 */
const mergePR = async (prNumber, repositoryUrl) => {
    try {
        // Extract owner and repo from repository URL
        // Format: https://github.com/owner/repo
        const urlParts = repositoryUrl.split('/');
        const owner = urlParts[urlParts.length - 2];
        const repo = urlParts[urlParts.length - 1];

        if (!GITHUB_API_TOKEN) {
            console.error('GITHUB_API_TOKEN not configured');
            return;
        }

        // GitHub API endpoint for merging PR
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`;

        // Make API request to merge PR
        const response = await axios.put(
            apiUrl,
            {
                commit_title: `Merge PR #${prNumber}`,
                commit_message: `Approved via website review process`,
                merge_method: 'merge'
            },
            {
                headers: {
                    Authorization: `Bearer ${GITHUB_API_TOKEN}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            }
        );

        console.log(`PR #${prNumber} successfully merged`, response.data);
        return true;
    } catch (error) {
        console.error(`Error merging PR #${prNumber}:`, error.response?.data || error.message);
        return false;
    }
};

/**
 * Publish a project (make it non-draft)
 * This can be called by the contributor to publish their project
 */
export const publishProject = async (req, res) => {
    try {
        const { projectId, userId } = req.body;

        if (!projectId || !userId) {
            return res.status(400).json({ error: "Missing required parameters" });
        }

        // Find the project
        const project = await Project.findOne({
            project_id: projectId,
            author: userId,
            draft: true
        });

        if (!project) {
            return res.status(404).json({
                error: `Draft project with ID ${projectId} not found or you are not the author`
            });
        }

        // Check if at least one PR is merged
        const hasMergedPR = project.pr.some(pr => pr.status === 'merged');

        if (!hasMergedPR) {
            return res.status(400).json({
                error: `Cannot publish project because no PR has been merged yet`
            });
        }

        // Publish the project
        project.draft = false;
        await project.save();

        return res.status(200).json({
            message: `Project ${projectId} has been published successfully`,
            project
        });

    } catch (error) {
        console.error("Error publishing project:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
