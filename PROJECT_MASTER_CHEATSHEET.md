# 🎯 PROJECT4 MASTER CHEATSHEET
## Complete Project Management & Quick Reference Guide

---

## 📋 PROJECT OVERVIEW

### What is Project4?
- **JSON to Excel Converter PWA** (Next.js + TypeScript)
- **Multi-Pi Monitoring System** (Python-based dashboard)
- **Raspberry Pi Automation Suite** (30+ shell scripts)
- **Complete DevOps Infrastructure** (Docker, Cloudflare, Git automation)

### Current Production Status: ✅ FULLY OPERATIONAL
- 🟢 Main Pi (pixtra @ 192.168.1.143): **ONLINE**
- 🟢 Web Application: **RUNNING** → https://devtestenv.org
- 🟢 Cloudflare Tunnel: **ACTIVE** (systemd managed)
- 🟢 Monitoring Dashboard: **ACTIVE**
- 🟢 Auto-backup System: **ENABLED**

---

## 🚀 QUICK START COMMANDS

### Development Server
```bash
# Start Next.js development
cd "e:\Programming\Jukka\Geliştir\Project4"
npm run dev
```

### Pi Connection
```bash
# SSH to main Pi
ssh ekrem@192.168.1.143

# Check all services status
cd /home/ekrem/scripts && ./health-monitor.sh
```

### Monitoring Dashboard
```bash
# Start multi-Pi monitoring
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup"
python multi-pi-monitor.py
```

---

## 📁 CRITICAL FILE LOCATIONS

### Main Application
```
e:\Programming\Jukka\Geliştir\Project4\
├── src\app\page.tsx                    # Main app page
├── src\components\JsonToExcelApp.tsx   # Core component
├── src\utils\jsonProcessor.ts          # JSON processing logic
└── package.json                        # Dependencies
```

### Pi Scripts (Production)
```
/home/ekrem/scripts/
├── auto-sync.sh                        # Auto Git sync (runs every 5 min)
├── git-backup.sh                       # Git backup system
├── health-monitor.sh                   # System health checks
├── ip-monitor.sh                       # IP change monitoring
└── cluster-manager.sh                  # Multi-Pi management
```

### Documentation Hub
```
e:\Programming\Jukka\Geliştir\Project4\
├── README.md                           # Main project docs
├── RASPBERRY_PI_KURULUM_REHBERI.md     # Pi setup guide (Turkish)
├── SECURITY.md                         # Security documentation
├── raspberry-pi-backup\                # Pi automation files
│   ├── DEPLOYMENT_README.md            # Deployment guide
│   ├── ADVANCED_SETUP_GUIDE.md         # Advanced features
│   └── multi-pi-monitor.py             # Monitoring system (537 lines)
```

---

## ⚙️ SYSTEM MANAGEMENT

### Pi System Health
```bash
# Complete health check
ssh ekrem@192.168.1.143 "cd /home/ekrem/scripts && ./health-monitor.sh"

# Check running services
ssh ekrem@192.168.1.143 "systemctl --user status auto-sync"

# View system metrics
ssh ekrem@192.168.1.143 "htop"
```

### Git Operations
```bash
# Manual backup trigger
ssh ekrem@192.168.1.143 "cd /home/ekrem/scripts && ./git-backup.sh"

# Check sync status
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git status"

# View recent commits
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git log --oneline -10"
```

### Service Management
```bash
# Restart auto-sync service
ssh ekrem@192.168.1.143 "systemctl --user restart auto-sync"

# Check all timers
ssh ekrem@192.168.1.143 "systemctl --user list-timers"

# View service logs
ssh ekrem@192.168.1.143 "journalctl --user -u auto-sync -f"
```

---

## 🔧 CONFIGURATION FILES

### Next.js Configuration
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }
}
export default nextConfig
```

### Pi Service Configuration
```ini
# /home/ekrem/.config/systemd/user/auto-sync.service
[Unit]
Description=Auto Git Sync Service
After=network.target

[Service]
Type=oneshot
ExecStart=/home/ekrem/scripts/auto-sync.sh
WorkingDirectory=/home/ekrem/Project4-Pi-Backup

[Install]
WantedBy=default.target
```

### Crontab Entries
```bash
# Current Pi automation schedule
*/5 * * * * /home/ekrem/scripts/health-monitor.sh
0 */6 * * * /home/ekrem/scripts/git-backup.sh
*/15 * * * * /home/ekrem/scripts/ip-monitor.sh
```

---

## 🌐 NETWORKING & ACCESS

### Local Network
- **Pi IP**: 192.168.1.143
- **SSH Port**: 22 (default)
- **Web Port**: 3000 (Next.js dev)
- **Monitor Port**: 8080 (Python dashboard)

### Cloudflare Tunnel
```bash
# Check tunnel status
ssh ekrem@192.168.1.143 "sudo systemctl status cloudflare-tunnel"

# Restart tunnel
ssh ekrem@192.168.1.143 "sudo systemctl restart cloudflare-tunnel"

# View tunnel logs
ssh ekrem@192.168.1.143 "sudo journalctl -u cloudflare-tunnel -f"
```

### Firewall Settings
```bash
# Pi firewall status
ssh ekrem@192.168.1.143 "sudo ufw status"
```

---

## 📊 MONITORING FEATURES

### Multi-Pi Dashboard Features
- **Real-time Metrics**: CPU, Memory, Disk, Temperature
- **Service Status**: All running services per Pi
- **SSH Health**: Connection status monitoring
- **SQLite Database**: Historical data storage
- **Web Interface**: Professional dashboard at port 8080

### Dashboard Components
```python
# Key classes in multi-pi-monitor.py
@dataclass
class PiDevice:
    hostname: str
    ip_address: str
    ssh_port: int = 22
    # ... (full definition at line 15)

class PiMonitor:
    def __init__(self):
        # ... (initialization at line 70)
```

### Health Check Commands
```bash
# System overview
ssh ekrem@192.168.1.143 "df -h && free -h && uptime"

# Temperature check
ssh ekrem@192.168.1.143 "vcgencmd measure_temp"

# Service status
ssh ekrem@192.168.1.143 "systemctl --user is-active auto-sync"
```

---

## 🛠️ TROUBLESHOOTING

### Common Issues & Solutions

#### SSH Connection Problems
```bash
# Test connection
ssh -v ekrem@192.168.1.143

# Generate new SSH key if needed
ssh-keygen -t ed25519 -C "your_email@example.com"
ssh-copy-id ekrem@192.168.1.143
```

#### Service Not Running
```bash
# Restart specific service
ssh ekrem@192.168.1.143 "systemctl --user restart auto-sync"

# Check service logs
ssh ekrem@192.168.1.143 "journalctl --user -u auto-sync --since today"
```

#### Git Sync Issues
```bash
# Manual sync test
ssh ekrem@192.168.1.143 "cd /home/ekrem/scripts && ./auto-sync.sh"

# Check Git configuration
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git config --list"
```

#### Next.js Development Issues
```bash
# Clear npm cache
cd "e:\Programming\Jukka\Geliştir\Project4"
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 DOCUMENTATION QUICK ACCESS

### Essential Guides
1. **Setup Guide**: `RASPBERRY_PI_KURULUM_REHBERI.md`
2. **Deployment**: `raspberry-pi-backup\DEPLOYMENT_README.md`
3. **Advanced Features**: `raspberry-pi-backup\ADVANCED_SETUP_GUIDE.md`
4. **Security**: `SECURITY.md`
5. **Troubleshooting**: `PWA_TROUBLESHOOTING.md`

### Documentation Structure (56 files total)
```
Documentation Files:
├── Main Project Docs (5 files)
├── Raspberry Pi Guides (15 files)
├── PWA Documentation (8 files)
├── Security & Deployment (12 files)
├── Status Reports (10 files)
└── Troubleshooting (6 files)
```

---

## 🔐 SECURITY CHECKLIST

### SSH Security
- ✅ SSH keys configured (passwordless)
- ✅ Pi user account secured
- ✅ Firewall configured (ufw)

### Git Security
- ✅ Private repository access
- ✅ Secure token authentication
- ✅ Encrypted backups

### Network Security
- ✅ Local network only (no public exposure)
- ✅ Cloudflare tunnel ready (optional)
- ✅ Regular security updates

---

## 📈 PERFORMANCE MONITORING

### Key Metrics to Watch
- **CPU Usage**: Should stay below 70%
- **Memory Usage**: Should stay below 80%
- **Disk Usage**: Should stay below 85%
- **Temperature**: Should stay below 70°C

### Monitoring Commands
```bash
# Real-time monitoring
ssh ekrem@192.168.1.143 "htop"

# Disk usage
ssh ekrem@192.168.1.143 "df -h"

# Memory usage
ssh ekrem@192.168.1.143 "free -h"

# Temperature
ssh ekrem@192.168.1.143 "vcgencmd measure_temp"
```

---

## 🚨 EMERGENCY PROCEDURES

### If Pi Becomes Unresponsive
1. **Physical Access**: Check power and network cables
2. **Network Ping**: `ping 192.168.1.143`
3. **Router Check**: Verify Pi appears in router device list
4. **Physical Restart**: Power cycle the Pi

### If Services Stop Working
1. **SSH In**: `ssh ekrem@192.168.1.143`
2. **Check Services**: `systemctl --user list-units --failed`
3. **Restart Services**: `systemctl --user restart auto-sync`
4. **Check Logs**: `journalctl --user -xe`

### If Git Sync Fails
1. **Manual Test**: Run `./auto-sync.sh` manually
2. **Check Network**: Verify internet connectivity
3. **Git Status**: Check repository status
4. **Token Check**: Verify GitHub token validity

---

## 🎯 DAILY OPERATIONS

### Morning Checklist (5 minutes)
```bash
# 1. Check Pi status
ssh ekrem@192.168.1.143 "uptime && df -h"

# 2. Verify services
ssh ekrem@192.168.1.143 "systemctl --user is-active auto-sync"

# 3. Check recent backups
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git log --oneline -3"
```

### Weekly Maintenance (15 minutes)
```bash
# 1. System updates
ssh ekrem@192.168.1.143 "sudo apt update && sudo apt upgrade -y"

# 2. Check logs
ssh ekrem@192.168.1.143 "journalctl --user --since '1 week ago' | grep -i error"

# 3. Verify monitoring dashboard
python "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup\multi-pi-monitor.py"
```

---

## 📞 SUPPORT & CONTACT

### Key File Locations for Help
- **Main README**: `e:\Programming\Jukka\Geliştir\Project4\README.md`
- **Pi Setup Guide**: `RASPBERRY_PI_KURULUM_REHBERI.md`
- **Deployment Guide**: `raspberry-pi-backup\DEPLOYMENT_README.md`
- **This Cheatsheet**: `PROJECT_MASTER_CHEATSHEET.md`

### Configuration Files Requiring Manual Setup
1. **GitHub Token**: Update in Pi scripts for backup functionality
2. ~~**Cloudflare Tunnel**: Configure domain and DNS settings~~ ✅ **COMPLETED**
3. **Email Notifications**: Set up SMTP for alerts
4. **Network Settings**: Adjust IP addresses if network changes

### Cloudflare Tunnel - External Access
- 🌐 **Live URL**: https://devtestenv.org
- ✅ **Status**: Fully operational with systemd management
- 📚 **Fix Documentation**: See `CLOUDFLARE_TUNNEL_FIX.md` for complete setup details

---

*Last Updated: $(Get-Date)*
*Project Status: ✅ Production Ready*
*Total Files: 56 docs, 30 scripts, 4 Python modules*