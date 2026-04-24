# Glitch Credentials Setup Guide

## Overview

This guide explains how to set up Glitch credentials for automated deployment of the MedMatch API via GitHub Actions.

## Background

The [deploy-glitch.yml](../.github/workflows/deploy-glitch.yml) GitHub workflow can automatically deploy the mock API to Glitch whenever changes are pushed to the `mock-api/` directory. However, this requires two GitHub secrets to be configured.

## Required Secrets

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `GLITCH_PROJECT_ID` | Your Glitch project identifier | From Glitch project settings or URL |
| `GLITCH_TOKEN` | Glitch Git API token | From Glitch "Export to GitHub" feature |

---

## Setup Steps

### Step 1: Create a Glitch Project

1. Go to [glitch.com](https://glitch.com)
2. Click **New Project**
3. Select **hello-express** template
4. Wait for the project to initialize

### Step 2: Get Your Glitch Project ID

The project ID is in your Glitch project URL:

```
https://glitch.com/edit/#!/your-project-name
                           ^^^^^^^^^^^^^^^^^^
                           This is your project ID
```

For example, if your project URL is:
```
https://glitch.com/edit/#!/medmatch-api
```

Then your `GLITCH_PROJECT_ID` is: `medmatch-api`

**Alternative method:**
1. In Glitch editor, click **Tools** → **Git, Import, and Export**
2. Look at the "Export to GitHub" section - the project name is shown there

### Step 3: Get Your Glitch Token

The token is used to authenticate Git pushes to Glitch.

1. In your Glitch project, click **Tools** → **Git, Import, and Export**
2. Click **Export to GitHub** (even if you don't use this feature, it reveals the token)
3. Look at the URL or command shown - it contains your token

The token format is:
```
https://[TOKEN]@api.glitch.com/git/[PROJECT_ID]
```

For example:
```
https://abcd1234-5678-90ef-ghij-klmnopqrstuv@api.glitch.com/git/medmatch-api
```

Your `GLITCH_TOKEN` is: `abcd1234-5678-90ef-ghij-klmnopqrstuv`

### Step 4: Add Secrets to GitHub

1. Go to the GitHub repository: https://github.com/explofish/medmatch
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add the first secret:
   - Name: `GLITCH_PROJECT_ID`
   - Value: Your project ID (e.g., `medmatch-api`)
6. Click **Add secret**
7. Click **New repository secret** again
8. Add the second secret:
   - Name: `GLITCH_TOKEN`
   - Value: Your token (the long string from Step 3)
9. Click **Add secret**

### Step 5: Test the Deployment

1. Make a small change to `mock-api/server.js` (e.g., update a comment)
2. Commit and push to the `master` branch:
   ```bash
   git add mock-api/server.js
   git commit -m "Test Glitch deployment"
   git push origin master
   ```
3. Go to GitHub Actions: https://github.com/explofish/medmatch/actions
4. You should see the "Deploy Mock API to Glitch" workflow running
5. Wait for it to complete (should take ~1-2 minutes)
6. Test your deployed API:
   ```
   https://medmatch-api.glitch.me/api/health
   ```
   Expected response:
   ```json
   {"status":"ok","timestamp":"...","service":"medmatch-api"}
   ```

---

## Quick Reference

### GitHub Secrets URL
```
https://github.com/explofish/medmatch/settings/secrets/actions
```

### Glitch Project URL Template
```
https://glitch.com/edit/#!/YOUR_PROJECT_NAME
```

### Health Check URL Template
```
https://YOUR_PROJECT_NAME.glitch.me/api/health
```

---

## Troubleshooting

### "No secrets found" in GitHub Actions
- Verify both secrets are added to **Repository** secrets (not Environment secrets)
- Secret names must be exactly: `GLITCH_PROJECT_ID` and `GLITCH_TOKEN`
- Secret names are case-sensitive

### "Authentication failed" in deployment
- The Glitch token may have expired or been regenerated
- Go back to Step 3 to get a fresh token
- Update the `GLITCH_TOKEN` secret in GitHub

### "Project not found" error
- Verify the project ID matches exactly (case-sensitive)
- Ensure the Glitch project exists and is not archived

---

## Security Notes

- The `GLITCH_TOKEN` grants write access to your Glitch project
- Keep it secret - never commit it to the repository
- GitHub secrets are encrypted and only exposed to GitHub Actions workflows
- If the token is compromised, regenerate it in Glitch and update the GitHub secret

---

## Alternative: Manual Deployment

If you prefer not to use automated deployment, you can manually deploy:

1. Go to https://glitch.com → New Project → Import from GitHub
2. Enter: `explofish/medmatch`
3. Set project path: `mock-api`
4. Rename project to: `medmatch-api`

See [GLITCH_DEPLOY.md](./GLITCH_DEPLOY.md) for detailed manual deployment instructions.

---

## Support

- Glitch Help: https://glitch.com/help
- GitHub Secrets Docs: https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions
