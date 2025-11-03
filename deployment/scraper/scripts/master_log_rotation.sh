#!/bin/bash
# Master Log Rotation Cron Job
# Add to crontab: 0 2 * * * /opt/scraper/scripts/master_log_rotation.sh

set -e

SCRIPT_DIR="/opt/scraper/scripts"
LOG_FILE="/opt/scraper/logs/rotation_$(date +%Y%m).log"

echo "=======================================" >> "$LOG_FILE"
echo "[$(date)] Starting master log rotation" >> "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"

# 1. Rotate Nginx logs
if [ -f "$SCRIPT_DIR/rotate_nginx_logs.sh" ]; then
    echo "Rotating Nginx logs..." >> "$LOG_FILE"
    bash "$SCRIPT_DIR/rotate_nginx_logs.sh" >> "$LOG_FILE" 2>&1
fi

# 2. Clean up Docker logs (optional - Docker already handles this)
echo "Checking Docker log sizes..." >> "$LOG_FILE"
for container in scraper_prod_backend scraper_prod_nginx scraper_prod_worker; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        SIZE=$(docker logs "$container" 2>&1 | wc -c)
        SIZE_MB=$((SIZE / 1024 / 1024))
        echo "  $container: ${SIZE_MB}MB" >> "$LOG_FILE"
    fi
done

# 3. Clean up old application logs (Python logs)
echo "Cleaning old application logs..." >> "$LOG_FILE"
find /opt/scraper/backend/logs -name "*.log.*" -mtime +30 -delete 2>> "$LOG_FILE"
DELETED_COUNT=$(find /opt/scraper/backend/logs -name "*.log.*" -mtime +30 2>/dev/null | wc -l)
echo "Deleted $DELETED_COUNT old application log files" >> "$LOG_FILE"

# 4. Compress old nginx archived logs
echo "Compressing old nginx archives..." >> "$LOG_FILE"
find /opt/scraper/nginx/logs/archive -name "*.log" -mtime +7 -exec gzip {} \; 2>> "$LOG_FILE"

# 5. Summary
echo "" >> "$LOG_FILE"
echo "Summary:" >> "$LOG_FILE"
echo "  Nginx logs: $(ls -lh /opt/scraper/nginx/logs/*.log 2>/dev/null | wc -l) active files" >> "$LOG_FILE"
echo "  Archives: $(ls -lh /opt/scraper/nginx/logs/archive/*.gz 2>/dev/null | wc -l) compressed files" >> "$LOG_FILE"
echo "  Total archive size: $(du -sh /opt/scraper/nginx/logs/archive 2>/dev/null | cut -f1)" >> "$LOG_FILE"

echo "[$(date)] Log rotation completed!" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Keep only last 3 months of rotation logs
find /opt/scraper/logs -name "rotation_*.log" -mtime +90 -delete 2>/dev/null
