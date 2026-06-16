#!/bin/bash
# Local scraper: runs build-database.js on this Mac, then pushes data to GitHub
# Runs via local cron since CI can't bypass yuyu-tei's Cloudflare

set -e
cd "$(dirname "$0")/.."
LOCK_FILE="/tmp/huntercard-scrape.lock"
LOG_FILE="$HOME/.hermes/logs/huntercard-scrape-$(date +%Y%m%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Prevent concurrent execution
if ! mkdir "$LOCK_FILE" 2>/dev/null; then
  echo "[$(date)] ⚠️ Scrape already running, skipping this instance" >> "$LOG_FILE"
  exit 0
fi
trap 'rm -rf "$LOCK_FILE"' EXIT

echo "[$(date)] Starting hunterCard local scrape..." >> "$LOG_FILE"

# 0. Check for new official series (fast, ~30s)
echo "[$(date)] Running official site scraper..." >> "$LOG_FILE"
cd scripts
node scrape-official-cards.js >> "$LOG_FILE" 2>&1
cd ..

# 1. Pull latest from main
git pull origin main >> "$LOG_FILE" 2>&1

# 2. Run the scraper
cd scripts
node build-database.js >> "$LOG_FILE" 2>&1
SCRAPE_EXIT=$?
cd ..

if [ $SCRAPE_EXIT -ne 0 ]; then
  echo "[$(date)] ❌ Scrape failed (exit $SCRAPE_EXIT)" >> "$LOG_FILE"
  exit 1
fi

# 3. Check if data changed
if git diff --stat -- 'data/database.json' 'data/images/' 'data/official/' | grep -q .; then
  echo "[$(date)] Data changed, committing and pushing..." >> "$LOG_FILE"
  git add data/database.json data/images/ data/official/cardList_*.json
  git -c user.name="hunterCard Scraper" -c user.email="bot@huntercard.app" \
    commit -m "chore: update database $(date +%Y-%m-%d)" >> "$LOG_FILE" 2>&1
  git push origin main >> "$LOG_FILE" 2>&1
  echo "[$(date)] ✅ Pushed to GitHub" >> "$LOG_FILE"

  # 4. Trigger Vercel deploy hook
  echo "[$(date)] Triggering Vercel deploy hook..." >> "$LOG_FILE"
  DEPLOY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "https://api.vercel.com/v1/integrations/deploy/prj_Ki8VkQfL0eA3MAXBTGmq3GGDZ0zX/nKb6TOGH7C")
  echo "[$(date)] Vercel deploy hook responded: $DEPLOY_RESPONSE" >> "$LOG_FILE"
else
  echo "[$(date)] No data changes, skipping push" >> "$LOG_FILE"
fi

echo "[$(date)] ✅ Done" >> "$LOG_FILE"