# Advanced Features Setup Guide

Bu rehber, gelişmiş özelliklerin kurulumu ve kullanımı için detaylı açıklamalar içerir.

## 🔄 Automated Sync System

### Kurulum
1. **PC'de SSH Server Aktif Et:**
```bash
# Ubuntu/Debian
sudo systemctl enable ssh
sudo systemctl start ssh

# Windows (OpenSSH)
# Settings > Apps > Optional Features > OpenSSH Server
```

2. **Pi'de Auto-Sync Konfigürasyonu:**
```bash
# auto-sync.sh dosyasını düzenle
nano ~/scripts/auto-sync.sh

# Bu satırları güncelle:
REMOTE_PC_IP="192.168.1.100"        # PC'nin IP'si
REMOTE_PC_USER="your_username"       # PC'deki kullanıcı adı
REMOTE_BACKUP_PATH="/path/to/backup" # PC'deki backup klasörü
```

3. **SSH Key Setup (Pi → PC):**
```bash
# Pi'de SSH key oluştur
ssh-keygen -t rsa -b 4096

# PC'ye SSH key kopyala
ssh-copy-id your_username@192.168.1.100
```

4. **Cron Job Aktif Et:**
```bash
# Pi'de crontab düzenle
crontab -e

# Bu satırı ekle (4 saatte bir sync)
0 */4 * * * ~/scripts/auto-sync.sh >/dev/null 2>&1
```

### Kullanım
```bash
# Manuel sync
./auto-sync.sh

# Sync durumu kontrol
tail -f ~/logs/auto-sync.log

# Hash dosyası sıfırla (force sync)
rm ~/.sync_hashes
```

---

## 📦 Git Version Control

### İlk Kurulum
1. **GitHub Repository Oluştur:**
```bash
# GitHub'da yeni repository oluştur: pi-backup-repo
```

2. **Git Backup Konfigürasyonu:**
```bash
nano ~/scripts/git-backup.sh

# Bu satırları güncelle:
GIT_REMOTE="https://github.com/username/pi-backup-repo.git"
GIT_USER_NAME="Pi Auto-Backup"
GIT_USER_EMAIL="backup@yourdomain.com"
```

3. **Git Repository Initialize:**
```bash
./git-backup.sh init
```

### Git Operations
```bash
# Manual backup
./git-backup.sh

# Git status kontrol
./git-backup.sh status

# Git log görüntüle
./git-backup.sh log

# Eski versiyonları temizle
./git-backup.sh cleanup
```

### GitHub Token Setup (Private Repos)
```bash
# Personal Access Token oluştur
# GitHub > Settings > Developer settings > Personal access tokens

# Git credentials setup
git config --global credential.helper store
echo "https://username:token@github.com" > ~/.git-credentials
```

---

## 🖥️ Multi-Pi Management Dashboard

### Kurulum
1. **Python Dependencies:**
```bash
# PC'de Python packages kur
pip3 install aiohttp paramiko sqlite3

# Ubuntu/Debian
sudo apt install python3-aiohttp python3-paramiko python3-sqlite3
```

2. **Cluster Configuration:**
```bash
# pi_config.json dosyasını düzenle
nano pi_config.json

# Device'ları ekle:
{
  "devices": [
    {
      "hostname": "pi1-main",
      "ip_address": "192.168.1.143",
      "ssh_user": "ekrem",
      "ssh_key_path": "~/.ssh/id_rsa",
      "description": "Main Server",
      "tunnel_url": "https://devtestenv.org"
    }
  ]
}
```

3. **SSH Keys Setup:**
```bash
# SSH key oluştur
ssh-keygen -t rsa -b 4096

# Tüm Pi'lere SSH key kopyala
ssh-copy-id ekrem@192.168.1.143
ssh-copy-id ekrem@192.168.1.144
```

### Cluster Management
```bash
# İlk kurulum
./cluster-manager.sh setup

# Scripts'i tüm Pi'lere deploy
./cluster-manager.sh deploy

# Dashboard başlat
./cluster-manager.sh start-dashboard

# Cluster durumu
./cluster-manager.sh status
```

### Dashboard Features
- **URL:** http://localhost:8080
- **Auto-refresh:** 60 saniye
- **Mobile responsive:** Telefon/tablet uyumlu
- **Real-time monitoring:** Anlık sistem metrikleri

---

## 🔧 Advanced Configuration

### Telegram Bot Setup
1. **Bot Oluştur:**
```
1. @BotFather'a mesaj gönder
2. /newbot komutunu kullan
3. Bot token'ı al
```

2. **Chat ID Al:**
```bash
# Bot'a mesaj gönder, sonra:
curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
```

3. **Scripts'lerde Token Güncelle:**
```bash
# Tüm script dosyalarında güncelle:
TELEGRAM_BOT_TOKEN="your_bot_token"
TELEGRAM_CHAT_ID="your_chat_id"
```

### Custom Service Monitoring
```bash
# system-check.sh'a custom service ekle
echo 'systemctl is-active your-service && echo "✓ Your Service: RUNNING" || echo "✗ Your Service: NOT RUNNING"' >> system-check.sh
```

### Log Rotation Setup
```bash
# Pi'de logrotate konfigürasyonu
sudo nano /etc/logrotate.d/pi-monitoring

# İçerik:
/home/ekrem/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 ekrem ekrem
}
```

---

## 📊 Monitoring Thresholds

### Alert Thresholds (pi_config.json)
```json
"alert_thresholds": {
  "cpu_usage": 80.0,      # CPU > 80%
  "memory_usage": 90.0,   # Memory > 90%
  "disk_usage": 85.0,     # Disk > 85%
  "temperature": 70.0     # Temp > 70°C
}
```

### Custom Monitoring Scripts
```bash
# CPU temperature monitor
echo '#!/bin/bash
temp=$(vcgencmd measure_temp | cut -d"=" -f2 | cut -d"'"'"'" -f1)
if (( $(echo "$temp > 75" | bc -l) )); then
    echo "High temperature: ${temp}°C" | ~/scripts/telegram-notify.sh
fi' > ~/scripts/temp-monitor.sh

chmod +x ~/scripts/temp-monitor.sh

# Cron'a ekle (5 dakikada bir)
echo "*/5 * * * * ~/scripts/temp-monitor.sh" | crontab -
```

---

## 🚨 Troubleshooting

### Common Issues

1. **SSH Connection Failed:**
```bash
# SSH key permissions kontrol
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# SSH agent restart
eval $(ssh-agent)
ssh-add ~/.ssh/id_rsa
```

2. **Sync Failed:**
```bash
# PC connectivity test
ping 192.168.1.100

# SSH test
ssh username@192.168.1.100 "echo 'test'"

# Rsync test
rsync -av /tmp/ username@192.168.1.100:/tmp/test/
```

3. **Dashboard Not Loading:**
```bash
# Python dependencies check
python3 -c "import aiohttp, paramiko"

# Port check
netstat -tulpn | grep 8080

# Logs check
tail -f dashboard.log
```

4. **Git Push Failed:**
```bash
# Credentials check
git config --list | grep credential

# Token test
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

### Diagnostic Commands
```bash
# Full system check
./system-check.sh

# Cluster health
./cluster-manager.sh health

# Service status
./cluster-manager.sh exec 'systemctl status cloudflared-tunnel'

# Disk usage
./cluster-manager.sh exec 'df -h'

# Process monitoring
./cluster-manager.sh exec 'htop -n 1'
```

---

Bu gelişmiş özellikler ile Pi cluster'ını professional seviyede yönetebilirsin! 🚀