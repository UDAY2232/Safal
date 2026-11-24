#!/bin/bash
set -e

echo "=== [1/5] FETCHING LATEST CODE FROM MAIN ==="
cd /opt/safal
git fetch origin main
git reset --hard origin/main
CURRENT_COMMIT=$(git log -1 --oneline)
echo "Current commit: $CURRENT_COMMIT"

echo "=== [2/5] BUILDING FRONTEND ==="
cd /opt/safal/frontend
npm install
npm run build

echo "=== [3/5] COPYING ASSETS TO /var/www/safal ==="
sudo rm -rf /var/www/safal/assets
sudo cp -rf /opt/safal/frontend/dist/* /var/www/safal/
sudo chmod -R 755 /var/www/safal

echo "=== [4/5] BUILDING BACKEND & RESTARTING PM2 ==="
cd /opt/safal/backend
npm install
npm run build
pm2 restart all || sudo pm2 restart all || true

echo "=== [5/5] RELOADING NGINX ==="
sudo systemctl reload nginx

echo ""
echo "============================================="
echo "   SAFAL DEPLOYED SUCCESSFULLY TO LIVE!     "
echo "   Commit: $CURRENT_COMMIT                   "
ACTIVE_JS=$(grep -oP 'assets/index-[^"]+\.js' /var/www/safal/index.html 2>/dev/null || true)
echo "   Active Web Asset: $ACTIVE_JS              "
echo "============================================="
