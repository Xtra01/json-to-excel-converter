# 🎮 PROJECT4 COPY-PASTE MANAGEMENT CONSOLE
## Complete Project Control Center

---

## 🚀 **INSTANT ACCESS COMMANDS**

### **💻 Development Environment**
```bash
# Start Next.js Development Server
cd "e:\Programming\Jukka\Geliştir\Project4"
npm run dev
# Access: http://localhost:3000

# Start Monitoring Dashboard
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup"
python multi-pi-monitor.py
# Access: http://localhost:8080

# Open VS Code in Project
code "e:\Programming\Jukka\Geliştir\Project4"
```

### **🔗 Pi System Access**
```bash
# SSH to Main Pi
ssh ekrem@192.168.1.143

# Quick System Status
ssh ekrem@192.168.1.143 "uptime && df -h && free -h"

# Check All Services
ssh ekrem@192.168.1.143 "cd /home/ekrem/scripts && ./health-monitor.sh"

# Real-time System Monitor
ssh ekrem@192.168.1.143 "htop"
```

---

## 🔧 **SERVICE MANAGEMENT**

### **🟢 Start Services**
```bash
# Start Auto-sync Service
ssh ekrem@192.168.1.143 "systemctl --user start auto-sync"

# Start All Timers
ssh ekrem@192.168.1.143 "systemctl --user start auto-sync.timer"

# Enable Service on Boot
ssh ekrem@192.168.1.143 "systemctl --user enable auto-sync"
```

### **🔴 Stop Services**
```bash
# Stop Auto-sync Service
ssh ekrem@192.168.1.143 "systemctl --user stop auto-sync"

# Stop All Timers
ssh ekrem@192.168.1.143 "systemctl --user stop auto-sync.timer"

# Disable Service on Boot
ssh ekrem@192.168.1.143 "systemctl --user disable auto-sync"
```

### **🔄 Restart Services**
```bash
# Restart Auto-sync
ssh ekrem@192.168.1.143 "systemctl --user restart auto-sync"

# Restart All User Services
ssh ekrem@192.168.1.143 "systemctl --user daemon-reload && systemctl --user restart auto-sync"

# Restart System Services
ssh ekrem@192.168.1.143 "sudo systemctl restart ssh"
```

### **📊 Service Status**
```bash
# Check Specific Service
ssh ekrem@192.168.1.143 "systemctl --user status auto-sync"

# Check Cloudflare Tunnel (System Service)
ssh ekrem@192.168.1.143 "sudo systemctl status cloudflare-tunnel"

# Check Docker Container Service
ssh ekrem@192.168.1.143 "sudo systemctl status json2excel-container"

# List All User Services
ssh ekrem@192.168.1.143 "systemctl --user list-units"

# List All Timers
ssh ekrem@192.168.1.143 "systemctl --user list-timers"

# Check Failed Services
ssh ekrem@192.168.1.143 "systemctl --user list-units --failed"
```

---

## 📊 **MONITORING & DIAGNOSTICS**

### **📈 System Metrics**
```bash
# CPU and Memory Usage
ssh ekrem@192.168.1.143 "top -n 1"

# Disk Usage Details
ssh ekrem@192.168.1.143 "df -h && du -sh /home/ekrem/* | sort -hr"

# Network Connections
ssh ekrem@192.168.1.143 "ss -tuln"

# Temperature Check
ssh ekrem@192.168.1.143 "vcgencmd measure_temp"

# System Load Average
ssh ekrem@192.168.1.143 "cat /proc/loadavg"
```

### **📋 Log Analysis**
```bash
# Auto-sync Service Logs (Real-time)
ssh ekrem@192.168.1.143 "journalctl --user -u auto-sync -f"

# Recent System Logs
ssh ekrem@192.168.1.143 "journalctl --since today | tail -50"

# Error Logs Only
ssh ekrem@192.168.1.143 "journalctl --user --since today | grep -i error"

# Service Boot Logs
ssh ekrem@192.168.1.143 "journalctl --user -u auto-sync --since boot"

# All User Service Logs
ssh ekrem@192.168.1.143 "journalctl --user --since '1 hour ago'"
```

### **🔍 Process Monitoring**
```bash
# Find Running Processes
ssh ekrem@192.168.1.143 "ps aux | grep -E '(auto-sync|python|node)'"

# Monitor Specific Process
ssh ekrem@192.168.1.143 "pgrep -f auto-sync && echo 'Running' || echo 'Not running'"

# Kill Specific Process (if needed)
ssh ekrem@192.168.1.143 "pkill -f 'process-name'"

# System Resource Usage
ssh ekrem@192.168.1.143 "iostat -x 1 3"
```

---

## 💾 **GIT & BACKUP MANAGEMENT**

### **📤 Git Operations**
```bash
# Manual Backup Trigger
ssh ekrem@192.168.1.143 "cd /home/ekrem/scripts && ./git-backup.sh"

# Check Git Status
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git status"

# View Recent Commits
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git log --oneline -10"

# Show Git Configuration
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git config --list"

# Force Push (if needed)
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git push --force-with-lease origin main"
```

### **🔄 Sync Operations**
```bash
# Manual Auto-sync Run
ssh ekrem@192.168.1.143 "cd /home/ekrem/scripts && ./auto-sync.sh"

# Check Sync Status
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git diff --stat"

# Reset to Clean State
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git reset --hard HEAD"

# Pull Latest Changes
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git pull origin main"
```

### **📁 File Management**
```bash
# List Script Files
ssh ekrem@192.168.1.143 "ls -la /home/ekrem/scripts/"

# Check Script Permissions
ssh ekrem@192.168.1.143 "ls -la /home/ekrem/scripts/*.sh"

# Make Scripts Executable
ssh ekrem@192.168.1.143 "chmod +x /home/ekrem/scripts/*.sh"

# Backup Configuration Files
ssh ekrem@192.168.1.143 "tar -czf /home/ekrem/config-backup-$(date +%Y%m%d).tar.gz /home/ekrem/.config/"
```

---

## 🔒 **SECURITY & ACCESS**

### **🔑 SSH Management**
```bash
# Test SSH Connection
ssh -v ekrem@192.168.1.143

# Copy SSH Key (if needed)
ssh-copy-id ekrem@192.168.1.143

# Check SSH Agent
ssh-add -l

# Generate New SSH Key (if needed)
ssh-keygen -t ed25519 -C "your_email@example.com"
```

### **🛡️ Firewall Status**
```bash
# Check Firewall Status
ssh ekrem@192.168.1.143 "sudo ufw status"

# List Open Ports
ssh ekrem@192.168.1.143 "sudo netstat -tlnp"

# Check SSH Configuration
ssh ekrem@192.168.1.143 "sudo sshd -T | grep -E '(Port|PermitRootLogin|PasswordAuthentication)'"
```

### **🔐 Permission Management**
```bash
# Fix Script Permissions
ssh ekrem@192.168.1.143 "chmod 755 /home/ekrem/scripts/*.sh"

# Fix Configuration Permissions
ssh ekrem@192.168.1.143 "chmod 644 /home/ekrem/.config/systemd/user/*.service"

# Check File Ownership
ssh ekrem@192.168.1.143 "ls -la /home/ekrem/ | head -10"
```

---

## 🚨 **EMERGENCY PROCEDURES**

### **🔄 System Recovery**
```bash
# Emergency System Restart
ssh ekrem@192.168.1.143 "sudo reboot"

# Force Process Kill
ssh ekrem@192.168.1.143 "sudo pkill -9 -f 'problematic-process'"

# Emergency Service Reset
ssh ekrem@192.168.1.143 "systemctl --user daemon-reload && systemctl --user reset-failed"

# Clear Logs (if disk full)
ssh ekrem@192.168.1.143 "sudo journalctl --vacuum-time=1d"
```

### **📞 Network Recovery**
```bash
# Check Network Connectivity
ping 192.168.1.143

# Restart Network Interface
ssh ekrem@192.168.1.143 "sudo systemctl restart dhcpcd"

# Check Router Connection
ssh ekrem@192.168.1.143 "ping -c 3 192.168.1.1"

# DNS Resolution Test
ssh ekrem@192.168.1.143 "nslookup google.com"
```

### **💾 Data Recovery**
```bash
# Locate Backup Files
ssh ekrem@192.168.1.143 "find /home/ekrem -name '*backup*' -type f"

# Check Disk Space
ssh ekrem@192.168.1.143 "df -h && du -sh /home/ekrem/* | sort -hr"

# Emergency File Copy
scp ekrem@192.168.1.143:/home/ekrem/important-file.txt ./backup/
```

---

## 🔧 **MAINTENANCE OPERATIONS**

### **🔄 System Updates**
```bash
# Update Pi System
ssh ekrem@192.168.1.143 "sudo apt update && sudo apt upgrade -y"

# Update Node.js Dependencies
cd "e:\Programming\Jukka\Geliştir\Project4"
npm update

# Update Python Packages
ssh ekrem@192.168.1.143 "pip3 install --upgrade -r requirements.txt"

# Clean Package Cache
ssh ekrem@192.168.1.143 "sudo apt autoremove && sudo apt autoclean"
```

### **🧹 Cleanup Operations**
```bash
# Clear Temporary Files
ssh ekrem@192.168.1.143 "sudo rm -rf /tmp/* && sudo rm -rf /var/tmp/*"

# Clear Old Logs
ssh ekrem@192.168.1.143 "sudo journalctl --vacuum-time=30d"

# Clear NPM Cache
cd "e:\Programming\Jukka\Geliştir\Project4"
npm cache clean --force

# Clean Git Repository
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git gc --prune=now"
```

### **🔍 Health Checks**
```bash
# Complete System Health Check
ssh ekrem@192.168.1.143 "cd /home/ekrem/scripts && ./health-monitor.sh"

# Quick Health Status
ssh ekrem@192.168.1.143 "uptime && df -h / && free -h && vcgencmd measure_temp"

# Service Health Check
ssh ekrem@192.168.1.143 "systemctl --user is-active auto-sync && echo 'Service OK' || echo 'Service FAILED'"

# Network Health Check
ssh ekrem@192.168.1.143 "ping -c 3 google.com && echo 'Network OK' || echo 'Network FAILED'"
```

---

## 📱 **DEVELOPMENT WORKFLOW**

### **🛠️ Local Development**
```bash
# Start Development Environment
cd "e:\Programming\Jukka\Geliştir\Project4"
npm run dev

# Build for Production
cd "e:\Programming\Jukka\Geliştir\Project4"
npm run build

# Test Production Build
cd "e:\Programming\Jukka\Geliştir\Project4"
npm run start

# Install New Dependencies
cd "e:\Programming\Jukka\Geliştir\Project4"
npm install package-name
```

### **🔄 Code Synchronization**
```bash
# Sync Local Changes to Pi
cd "e:\Programming\Jukka\Geliştir\Project4"
git add . && git commit -m "Update" && git push

# Check if Pi Picked Up Changes
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git pull && git log --oneline -3"

# Force Sync (if needed)
ssh ekrem@192.168.1.143 "cd /home/ekrem/scripts && ./auto-sync.sh"
```

### **🧪 Testing & Validation**
```bash
# Test Next.js Application
cd "e:\Programming\Jukka\Geliştir\Project4"
npm test

# Test Pi Scripts
ssh ekrem@192.168.1.143 "cd /home/ekrem/scripts && bash -n *.sh && echo 'Scripts OK'"

# Test Monitoring Dashboard
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup"
python -m py_compile multi-pi-monitor.py && echo "Python OK"

# Test SSH Connections
ssh ekrem@192.168.1.143 "echo 'SSH Connection OK'"
```

---

## 📊 **PROJECT STATISTICS**

### **📈 Quick Project Overview**
```bash
# Count Project Files
cd "e:\Programming\Jukka\Geliştir\Project4"
echo "TypeScript files: $(find . -name '*.tsx' -o -name '*.ts' | wc -l)"
echo "Documentation files: $(find . -name '*.md' | wc -l)"
echo "Configuration files: $(find . -name '*.json' -o -name '*.js' -o -name '*.mjs' | wc -l)"

# Pi Script Statistics
ssh ekrem@192.168.1.143 "echo 'Shell scripts: $(ls /home/ekrem/scripts/*.sh | wc -l)'"
ssh ekrem@192.168.1.143 "echo 'Service files: $(ls /home/ekrem/.config/systemd/user/*.service | wc -l)'"

# Git Statistics
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git rev-list --count HEAD"
```

### **🔍 System Information**
```bash
# Pi System Information
ssh ekrem@192.168.1.143 "echo 'Pi Model:' && cat /proc/device-tree/model && echo"
ssh ekrem@192.168.1.143 "echo 'OS Version:' && cat /etc/os-release | grep PRETTY_NAME"
ssh ekrem@192.168.1.143 "echo 'Kernel:' && uname -a"

# Network Information
ssh ekrem@192.168.1.143 "echo 'IP Address:' && hostname -I"
ssh ekrem@192.168.1.143 "echo 'Network interfaces:' && ip link show"

# Service Information
ssh ekrem@192.168.1.143 "echo 'Active services:' && systemctl --user list-units --state=active | wc -l"
```

---

## 🎯 **FREQUENTLY USED COMMANDS**

### **⚡ One-Liners**
```bash
# Complete Status Check
ssh ekrem@192.168.1.143 "uptime && systemctl --user is-active auto-sync && df -h / | tail -1 && vcgencmd measure_temp"

# Quick Service Restart
ssh ekrem@192.168.1.143 "systemctl --user restart auto-sync && systemctl --user status auto-sync"

# Development + Monitoring Start
cd "e:\Programming\Jukka\Geliştir\Project4" && npm run dev &
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup" && python multi-pi-monitor.py &

# Emergency Reset
ssh ekrem@192.168.1.143 "systemctl --user daemon-reload && systemctl --user restart auto-sync && cd /home/ekrem/scripts && ./health-monitor.sh"
```

### **📋 Daily Checklist Commands**
```bash
# Morning Health Check (Copy all at once)
ssh ekrem@192.168.1.143 "echo '=== DAILY HEALTH CHECK ===' && date && uptime && systemctl --user status auto-sync | head -3 && df -h / | tail -1 && free -h | head -2 && vcgencmd measure_temp && echo '=== CHECK COMPLETE ==='"

# Evening Backup Verification
ssh ekrem@192.168.1.143 "cd /home/ekrem/Project4-Pi-Backup && git status && git log --oneline -3 && echo 'Last backup:' && git log -1 --format='%cd' --date=local"
```

---

*🎮 Management Console Status: ✅ Ready*  
*🕒 Last Updated: $(Get-Date)*  
*📊 Total Commands: 150+ copy-paste commands*  
*⚡ System Control: Complete*