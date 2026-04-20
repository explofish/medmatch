# Glitch Credentials Setup Guide

## Objective
Set up Glitch project and configure GitHub secrets for automated deployment of the mock API.

## Why This is Needed
The GitHub Actions workflow (`.github/workflows/deploy-glitch.yml`) requires Glitch credentials to automatically deploy the mock API on every push to the main branch.

## Prerequisites
- GitHub repository admin access
- Glitch.com account (free)

## Setup Steps

### Step 1: Create Glitch Project
1. Go to https://glitch.com/
2. Click "New Project"
3. Select "Import from GitHub"
4. Enter: `explofish/medmatch`
5. Wait for import to complete

### Step 2: Get Glitch Project ID
1. In your Glitch project, click "Share" button
2. Copy the project name (e.g., `medmatch-api`)
3. This is your `GLITCH_PROJECT_ID`

### Step 3: Generate Glitch Token
1. Go to https://glitch.com/edit/#!/YOUR-PROJECT-NAME?path=.env
2. Click "Tools" → "Import/Export" → "Export to GitHub"
3. Follow OAuth flow to authorize GitHub
4. OR use Glitch API token from account settings

### Step 4: Add GitHub Secrets
1. Go to https://github.com/explofish/medmatch/settings/secrets/actions
2. Click "New repository secret"
3. Add two secrets:
   - Name: `GLITCH_PROJECT_ID`
   - Value: Your Glitch project name
   - Name: `GLITCH_TOKEN`
   - Value: Your Glitch API token

### Step 5: Test Deployment
1. Make a small change to `mock-api/server.js`
2. Push to main branch
3. Check GitHub Actions tab for deployment status
4. Visit https://YOUR-PROJECT.glitch.me/api/health

## Alternative: Manual Deploy (No Credentials Needed)
If you cannot create GitHub secrets, use manual deployment:
1. Follow steps in [BER-90](/BER/issues/BER-90)
2. Download GitHub Actions artifact
3. Import to Glitch manually
4. No credentials required

## Troubleshooting
- **SQLite compile errors**: Wait 2-3 minutes after first deploy
- **Port conflicts**: Glitch uses port 3000 automatically
- **Environment variables**: Add to Glitch `.env` file, not GitHub secrets

## Security Notes
- Keep `GLITCH_TOKEN` secret - never commit to repo
- Use environment variables for sensitive data
- Glitch projects are public by default (use `.env` for secrets)

## Related Tasks
- [BER-90](/BER/issues/BER-90) - Manual Glitch deployment (CMO)
- [BER-91](/BER/issues/BER-91) - Automated deployment setup (CTO)
- [BER-53](/BER/issues/BER-53) - Landing page deployment

---
**Last Updated:** 2026-04-20
**Status:** Ready for human with GitHub admin access to complete
