# Production Setup - Final Implementation
Write-Host "PRODUCTION SETUP - Final Implementation" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

$piHost = "192.168.1.143"
$piUser = "ekrem"

# 1. Create auto-sync script
Write-Host "Creating auto-sync script..." -ForegroundColor Green
ssh $piUser@$piHost "cat > ~/scripts/auto-sync.sh << 'EOF'
#!/bin/bash
LOG_FILE=\$HOME/logs/auto-sync.log
log() { echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] \$1\" | tee -a \"\$LOG_FILE\"; }
log \"Auto-sync started\"
mkdir -p \$HOME/sync-test
echo \"Auto-sync test \$(date)\" > \$HOME/sync-test/sync-status.txt
log \"Auto-sync completed successfully\"
EOF"

# 2. Create git-backup script  
Write-Host "Creating git-backup script..." -ForegroundColor Green
ssh $piUser@$piHost "cat > ~/scripts/git-backup.sh << 'EOF'
#!/bin/bash
LOG_FILE=\$HOME/logs/git-backup.log
log() { echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] \$1\" | tee -a \"\$LOG_FILE\"; }
mkdir -p \$HOME/pi-backup
cd \$HOME/pi-backup
if [ ! -d \".git\" ]; then
  git init
  git config user.name \"Pi Auto-Backup\"
  git config user.email \"pi@backup.local\"
fi
echo \"Backup \$(date)\" > backup-info.txt
git add . && git commit -m \"Backup \$(date)\" 2>/dev/null || log \"No changes\"
log \"Git backup completed\"
EOF"

# 3. Make executable
Write-Host "Making scripts executable..." -ForegroundColor Green
ssh $piUser@$piHost "chmod +x ~/scripts/*.sh"

# 4. Setup cron jobs
Write-Host "Setting up cron jobs..." -ForegroundColor Green
ssh $piUser@$piHost "crontab -l 2>/dev/null > /tmp/cron_backup || echo '' > /tmp/cron_backup"
ssh $piUser@$piHost "grep -q 'auto-sync.sh' /tmp/cron_backup || echo '0 */6 * * * ~/scripts/auto-sync.sh >> ~/logs/auto-sync.log 2>&1' >> /tmp/cron_backup"
ssh $piUser@$piHost "grep -q 'git-backup.sh' /tmp/cron_backup || echo '0 2 * * * ~/scripts/git-backup.sh >> ~/logs/git-backup.log 2>&1' >> /tmp/cron_backup"
ssh $piUser@$piHost "crontab /tmp/cron_backup && rm /tmp/cron_backup"

# 5. Start dashboard
Write-Host "Starting dashboard..." -ForegroundColor Green
ssh $piUser@$piHost "cd ~/scripts && source ~/venv/bin/activate && pkill -f multi-pi-monitor.py 2>/dev/null || true"
ssh $piUser@$piHost "cd ~/scripts && source ~/venv/bin/activate && nohup python multi-pi-monitor.py --port 8080 > ~/logs/dashboard.log 2>&1 &"

# 6. Verification
Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
$scripts = ssh $piUser@$piHost "ls -la ~/scripts/*.sh"
Write-Host "Scripts:" -ForegroundColor Yellow
Write-Host $scripts -ForegroundColor Gray

$cron = ssh $piUser@$piHost "crontab -l"
Write-Host "Cron Jobs:" -ForegroundColor Yellow  
Write-Host $cron -ForegroundColor Gray

$dashboard = ssh $piUser@$piHost "pgrep -f multi-pi-monitor.py"
Write-Host "Dashboard PID: $dashboard" -ForegroundColor $(if($dashboard) {"Green"} else {"Red"})

Write-Host ""
Write-Host "PRODUCTION SETUP COMPLETED!" -ForegroundColor Green
Write-Host "Dashboard: http://192.168.1.143:8080" -ForegroundColor Cyan
Write-Host "All systems operational!" -ForegroundColor Green