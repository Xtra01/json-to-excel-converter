#!/bin/bash
# Nginx Log Rotation Script
# /opt/scraper/scripts/rotate_nginx_logs.sh

set -e

LOG_DIR="/opt/scraper/nginx/logs"
ARCHIVE_DIR="$LOG_DIR/archive"
MAX_AGE_DAYS=30
MAX_SIZE_MB=100

# Create archive directory if not exists
mkdir -p "$ARCHIVE_DIR"

echo "[$(date)] Starting nginx log rotation..."

# Rotate access log if it exists and is large
if [ -f "$LOG_DIR/access.log" ]; then
    SIZE=$(du -m "$LOG_DIR/access.log" | cut -f1)
    echo "Access log size: ${SIZE}MB"
    
    if [ $SIZE -gt $MAX_SIZE_MB ]; then
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        echo "Rotating access.log to archive..."
        
        # Compress and move to archive
        gzip -c "$LOG_DIR/access.log" > "$ARCHIVE_DIR/access_$TIMESTAMP.log.gz"
        
        # Truncate original log
        truncate -s 0 "$LOG_DIR/access.log"
        
        # Signal nginx to reopen log files
        docker exec scraper_prod_nginx nginx -s reopen 2>/dev/null || true
        
        echo "✅ Rotated access.log -> access_$TIMESTAMP.log.gz"
    fi
fi

# Rotate error log if it exists and is large
if [ -f "$LOG_DIR/error.log" ]; then
    SIZE=$(du -m "$LOG_DIR/error.log" | cut -f1)
    echo "Error log size: ${SIZE}MB"
    
    if [ $SIZE -gt $MAX_SIZE_MB ]; then
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        echo "Rotating error.log to archive..."
        
        # Compress and move to archive
        gzip -c "$LOG_DIR/error.log" > "$ARCHIVE_DIR/error_$TIMESTAMP.log.gz"
        
        # Truncate original log
        truncate -s 0 "$LOG_DIR/error.log"
        
        # Signal nginx to reopen log files
        docker exec scraper_prod_nginx nginx -s reopen 2>/dev/null || true
        
        echo "✅ Rotated error.log -> error_$TIMESTAMP.log.gz"
    fi
fi

# Delete old archives (older than MAX_AGE_DAYS)
echo "Cleaning old archives (>$MAX_AGE_DAYS days)..."
find "$ARCHIVE_DIR" -name "*.log.gz" -mtime +$MAX_AGE_DAYS -delete
DELETED_COUNT=$(find "$ARCHIVE_DIR" -name "*.log.gz" -mtime +$MAX_AGE_DAYS 2>/dev/null | wc -l)
echo "Deleted $DELETED_COUNT old archive files"

# Summary
ARCHIVE_COUNT=$(ls -1 "$ARCHIVE_DIR"/*.log.gz 2>/dev/null | wc -l)
ARCHIVE_SIZE=$(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1)
echo ""
echo "📊 Log Summary:"
echo "   Archive files: $ARCHIVE_COUNT"
echo "   Archive size: $ARCHIVE_SIZE"
echo "   Max age: $MAX_AGE_DAYS days"
echo ""
echo "[$(date)] Log rotation completed!"
