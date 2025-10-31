# Production Setup - Simple Version
Write-Host "PRODUCTION SETUP - Advanced Features" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

$piHost = "192.168.1.143"
$piUser = "ekrem"

# 1. Create directories on Pi
Write-Host "Setting up directories..." -ForegroundColor Green
ssh $piUser@$piHost "mkdir -p ~/scripts ~/logs ~/backups ~/monitoring"

# 2. Upload scripts
Write-Host "Uploading scripts..." -ForegroundColor Green
if (Test-Path "auto-sync.sh") { scp auto-sync.sh ${piUser}@${piHost}:~/scripts/ }
if (Test-Path "git-backup.sh") { scp git-backup.sh ${piUser}@${piHost}:~/scripts/ }
if (Test-Path "multi-pi-monitor.py") { scp multi-pi-monitor.py ${piUser}@${piHost}:~/scripts/ }
if (Test-Path "cluster-manager.sh") { scp cluster-manager.sh ${piUser}@${piHost}:~/scripts/ }

# 3. Make scripts executable
Write-Host "Making scripts executable..." -ForegroundColor Green
ssh $piUser@$piHost "chmod +x ~/scripts/*.sh"

# 4. Install Python packages
Write-Host "Installing Python packages..." -ForegroundColor Green
ssh $piUser@$piHost "python3 -m pip install --user aiohttp paramiko jinja2"

# 5. System status
Write-Host ""
Write-Host "=== SYSTEM STATUS ===" -ForegroundColor Yellow
$systemInfo = ssh $piUser@$piHost "hostname && uptime -p"
Write-Host $systemInfo -ForegroundColor Blue

# 6. Service status
Write-Host ""
Write-Host "=== SERVICES ===" -ForegroundColor Yellow
$services = ssh $piUser@$piHost "systemctl is-active cloudflare-tunnel docker ssh"
Write-Host $services -ForegroundColor Blue

# 7. Scripts verification
Write-Host ""
Write-Host "=== DEPLOYED SCRIPTS ===" -ForegroundColor Yellow
$scripts = ssh $piUser@$piHost "ls -la ~/scripts/"
Write-Host $scripts -ForegroundColor Gray

Write-Host ""
Write-Host "DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "All advanced features are now available on Pi:" -ForegroundColor Cyan
Write-Host "- Auto-Sync: ~/scripts/auto-sync.sh" 
Write-Host "- Git Backup: ~/scripts/git-backup.sh"
Write-Host "- Monitoring: ~/scripts/multi-pi-monitor.py"
Write-Host "- Cluster Manager: ~/scripts/cluster-manager.sh"