#!/bin/bash
# Quick Staging Deployment Script
# Run this to deploy to staging URLs

set -e

echo "🚀 MedMatch Staging Deployment"
echo "================================"

# Check prerequisites
if ! command -v git &> /dev/null; then
    echo "❌ Git not installed"
    exit 1
fi

if ! command -v gh &> /dev/null && ! command -v vercel &> /dev/null; then
    echo "⚠️  Install GitHub CLI (gh) or Vercel CLI for automated deployment"
    echo "   - GitHub CLI: https://cli.github.com/"
    echo "   - Vercel CLI: npm i -g vercel"
fi

echo ""
echo "📋 Manual Deployment Steps:"
echo "==========================="
echo ""
echo "1. Create GitHub Repository:"
echo "   - Go to https://github.com/new"
echo "   - Name: medmatch"
echo "   - Make it public or private"
echo ""
echo "2. Initialize and Push Code:"
echo "   cd /home/explofish/.paperclip/instances/default/workspaces/ddd672a9-8bb3-4658-bd28-b42c7ea19ebc"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit - staging ready'"
echo "   git branch -M main"
echo "   git remote add origin https://github.com/YOUR_USERNAME/medmatch.git"
echo "   git push -u origin main"
echo ""
echo "3. Deploy Backend to Render:"
echo "   - Go to https://dashboard.render.com/"
echo "   - Click 'New +'")
echo "   - Select 'Blueprint'")
echo "   - Connect GitHub repo")
echo "   - Select render.staging.yaml")
echo "   - Click 'Apply'")
echo "   - Wait for deployment (~5 min)")
echo ""
echo "4. Deploy Frontend to Vercel:"
echo "   - Go to https://vercel.com/new")
echo "   - Import GitHub repo")
echo "   - Root Directory: landing-page")
echo "   - Framework: Next.js")
echo "   - Build Command: npm run build")
echo "   - Output: dist")
echo "   - Add Environment Variables:"
echo "     BACKEND_URL=https://medmatch-api-staging.onrender.com")
echo "     NEXT_PUBLIC_BACKEND_URL=https://medmatch-api-staging.onrender.com")
echo ""
echo "5. Configure CORS:"
echo "   - In Render dashboard, add env var:")
echo "     CORS_ORIGINS=https://medmatch-demo.vercel.app")
echo ""
echo "6. Test Deployment:"
echo "   curl https://medmatch-api-staging.onrender.com/api/health")
echo ""
echo "📍 Staging URLs:"
echo "   Landing Page: https://medmatch-demo.vercel.app")
echo "   API: https://medmatch-api-staging.onrender.com")
echo ""
echo "📧 Provide these URLs to CMO for campaign testing")
