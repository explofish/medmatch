#!/bin/bash
# Quick deployment script for MedMatch API
# Usage: ./quick-deploy.sh API_URL

API_URL="${1:-}"

if [ -z "$API_URL" ]; then
    echo "Usage: ./quick-deploy.sh <API_URL>"
    echo "Example: ./quick-deploy.sh https://medmatch-api.glitch.me"
    exit 1
fi

echo "🚀 MedMatch API Quick Deployment"
echo "================================"
echo "API URL: $API_URL"
echo ""

# Update frontend config
echo "1. Updating frontend API configuration..."

# Check if index.html exists
if [ -f "index.html" ]; then
    # Backup original
    cp index.html index.html.backup
    
    # Update API URL in JavaScript (simple sed replacement)
    # This assumes the pattern exists in index.html
    sed -i "s|const API_BASE_URL = .*|const API_BASE_URL = '$API_URL';|g" index.html
    
    echo "   ✅ Updated index.html with new API URL"
else
    echo "   ⚠️  index.html not found in current directory"
fi

# Verify API is accessible
echo ""
echo "2. Testing API connectivity..."
HEALTH_RESPONSE=$(curl -s "$API_URL/api/health" 2>/dev/null)

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo "   ✅ API health check passed"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "   ⚠️  API health check failed or not yet ready"
    echo "   Response: $HEALTH_RESPONSE"
fi

# Test CORS
echo ""
echo "3. Testing CORS configuration..."
CORS_TEST=$(curl -s -X OPTIONS "$API_URL/api/auth/register" \
    -H "Origin: https://explofish.github.io" \
    -H "Access-Control-Request-Method: POST" \
    -I 2>/dev/null | grep -i "access-control-allow-origin")

if [ -n "$CORS_TEST" ]; then
    echo "   ✅ CORS headers present"
else
    echo "   ⚠️  CORS headers not detected (may need verification)"
fi

# Test signup endpoint
echo ""
echo "4. Testing signup endpoint..."
SIGNUP_TEST=$(curl -s -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@deploy.check","firstName":"Deploy","lastName":"Test"}' 2>/dev/null)

if echo "$SIGNUP_TEST" | grep -q '"success":true'; then
    echo "   ✅ Signup endpoint working"
    echo "   Response: $SIGNUP_TEST"
else
    echo "   ⚠️  Signup test failed"
    echo "   Response: $SIGNUP_TEST"
fi

echo ""
echo "================================"
echo "📋 Next Steps:"
echo "1. Commit changes: git add index.html && git commit -m 'Update API URL'"
echo "2. Push to GitHub: git push origin master"
echo "3. Wait 1-2 minutes for GitHub Pages to update"
echo "4. Test signup form at: https://explofish.github.io/medmatch/"
echo ""
echo "🔗 API Admin Panel: $API_URL/api/signups"
