#!/bin/bash
# Git Backup: Version controlled backup system
LOG_FILE=$HOME/logs/git-backup.log

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "📦 Git backup started"

# Initialize git repository if not exists
BACKUP_DIR="$HOME/pi-backup"
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

if [ ! -d ".git" ]; then
    log "🔧 Initializing git repository..."
    git init
    git config user.name "Pi Auto-Backup"
    git config user.email "pi@backup.local"
fi

# Create system info file
cat > SYSTEM_INFO.md << EOF
# Raspberry Pi Backup - $(date '+%Y-%m-%d %H:%M:%S')

**Hostname:** $(hostname)
**Uptime:** $(uptime -p)
**IP Address:** $(hostname -I | awk '{print $1}')

## Services Status
- Cloudflare Tunnel: $(systemctl is-active cloudflare-tunnel 2>/dev/null || echo "inactive")
- Docker: $(systemctl is-active docker 2>/dev/null || echo "inactive") 
- SSH: $(systemctl is-active ssh 2>/dev/null || echo "inactive")

## System Resources
- Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')
- Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')

Backup created: $(date)
EOF

# Add and commit changes
git add .
if git commit -m "Backup $(date '+%Y-%m-%d %H:%M:%S') - $(hostname)" 2>/dev/null; then
    # Create version tag
    VERSION_TAG="backup-$(date '+%Y%m%d-%H%M%S')"
    git tag "$VERSION_TAG"
    log "✅ Git backup completed - Tag: $VERSION_TAG"
else
    log "ℹ️ No changes to commit"
fi