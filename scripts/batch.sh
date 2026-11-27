#!/bin/bash
# Runs the contrast check for a small batch of routes with a fresh dev server,
# because this sandbox cannot hold Next dev + Chromium for a long sweep.
ROUTES="$@"
pkill -f "next dev" 2>/dev/null; sleep 1
nohup npx next dev -p 3000 > /tmp/batch-dev.log 2>&1 &
for i in $(seq 1 60); do
  c=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 5)
  [ "$c" = "200" ] && break
  sleep 2
done
for r in $ROUTES; do
  echo "=== $r ==="
  node scripts/one-route.mjs "$r" 2>&1 | grep -E "failures|:1 \(min" | head -6
done
pkill -f "next dev" 2>/dev/null
