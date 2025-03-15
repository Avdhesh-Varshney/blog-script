# GitHub Webhook Setup for Project Integration

This document explains how to set up GitHub webhooks to integrate with our project workflow system.

## Overview

Our workflow integrates GitHub Pull Requests with the project blog system:

1. Contributors draft a project on the website
2. Contributors get their project ID from the website
3. Contributors raise a PR and include the project ID in the PR title: `[PID-xxxxxxxx] Title of project`
4. PR is automatically linked to project draft through webhook
5. Website reviewers approve the PR directly on the website
6. Once approved by enough reviewers (or an admin), the PR is automatically merged
7. After merging, contributors can choose to publish their project

## Setup Instructions

### 1. Generate API Tokens

You need two tokens for this integration:

1. **Webhook Secret**: Used to verify webhook payloads
   ```bash
   # On Linux/Mac
   openssl rand -hex 20
   ```

2. **GitHub API Token**: Create a Personal Access Token with `repo` scope to allow merging PRs
   - Go to GitHub → Settings → Developer Settings → Personal Access Tokens
   - Generate a new token with `repo` scope

### 2. Configure Environment Variables

Add the following variables to your `.env` file:

```
GITHUB_WEBHOOK_SECRET=your_generated_secret
GITHUB_API_TOKEN=your_github_personal_access_token
VITE_SERVER_DOMAIN=https://your-production-server.com
CRON_SECRET=another_random_string
```

### 3. Set Up the GitHub Webhook

1. Go to your GitHub repository
2. Click on "Settings" → "Webhooks" → "Add webhook"
3. Configure the webhook:
   - Payload URL: `https://your-production-server.com/api/webhook/github`
   - Content type: `application/json`
   - Secret: Enter the same secret you used for `GITHUB_WEBHOOK_SECRET`
   - Events: Select "Pull requests" events only
   - Active: Check this box

4. Click "Add webhook"

### 4. Test the Webhook

1. Create a draft project on the website
2. Note the project ID (format: PID-xxxxxxxx)
3. Create a test PR with title format: `[PID-xxxxxxxx] Your project title`
4. Check your server logs to verify that the webhook is receiving events
5. Verify in the database that the PR is now linked to your project

## Workflow Details

### Project Creation Flow

1. Contributors create a draft project on the website
2. They get their unique project ID (PID-xxxxxxxx)
3. They raise a PR with the ID in the title: `[PID-xxxxxxxx] Project Title`
4. The webhook automatically links the PR to their draft project

### PR Title Format

The PR title must include the project ID in square brackets:

```
[PID-xxxxxxxx] Your descriptive PR title
```

If the PR is created without the project ID, it will not be linked until the title is edited to include it.

### PR Review Process on Website

1. Reviewers can approve PRs directly on the website
2. A minimum of 2-3 approvals are required for automatic merging
3. Admins can override and force-approve a PR
4. After approval, the PR is automatically merged on GitHub

### Publication Process

1. After PR is merged, the contributors decide whether to publish their project
2. Publishing is optional and controlled by the contributors
3. Contributors can publish through the website interface

### Multiple PRs and Contributors

- Multiple PRs can be linked to a single project
- Multiple contributors can be associated with a project
- Each PR event updates the project status accordingly

## API Endpoints

Your application provides the following webhook-related endpoints:

- `POST /api/webhook/github` - Receives GitHub webhook events
- `POST /api/webhook/cleanup-drafts` - Cleans up old drafts (triggered by cron)
- `POST /api/webhook/approve-pr` - Endpoint for approving PRs from the website
- `POST /api/webhook/publish-project` - Endpoint for publishing approved projects

## Troubleshooting

- Check server logs for webhook events
- Verify the webhook secret matches in GitHub and your server
- Ensure your server is accessible from GitHub
- For PR linking issues, check that the project ID format in the PR title is correct
- For approval issues, ensure reviewers have proper permissions

For any issues, contact the system administrator. 