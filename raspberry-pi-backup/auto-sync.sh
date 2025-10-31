#!/bin/bash
# Auto-Sync: Pi to PC synchronization
LOG_FILE=$HOME/logs/auto-sync.log

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🔄 Auto-sync started"
log "📊 System: $(hostname) - $(uptime -p)"

# Create test sync directory
mkdir -p $HOME/sync-test
echo "Auto-sync test $(date)" > $HOME/sync-test/sync-status.txt

# Log completion
log "✅ Auto-sync completed successfully"