# Raspberry Pi JSON to Excel Converter - Deployment Package

Bu backup paketi, JSON to Excel PWA'nın Raspberry Pi üzerindeki tam konfigürasyonunu içerir. Yeni bir Pi kurulumu için her şey hazır durumdadır.

## 📦 Paket İçeriği

### 1. Sistem Konfigürasyonları
- **systemd service dosyaları**: `/etc/systemd/system/`
- **Cloudflare tunnel konfigürasyonu**: `/.cloudflared/`
- **Shell scripts**: `/home/ekrem/` (monitoring, IP management, notification)

### 2. Proje Dosyaları
- **JSON to Excel PWA**: `/home/ekrem/json-to-excel/`
- **Docker yapılandırması**: `docker-compose.backup.yml`
- **Node.js dependencies**: Tam node_modules backup

### 3. Monitoring ve Otomasyon
- **Health check**: 5 dakikada bir site kontrolü
- **IP monitoring**: Dinamik IP değişiklik tespiti
- **DDNS integration**: Otomatik DNS güncelleme
- **Telegram notifications**: Anlık bildirimler

## 🚀 Yeni Pi Kurulumu

### Adım 1: Temel Sistem Hazırlığı
```bash
# Sistem güncellemesi
sudo apt update && sudo apt upgrade -y

# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ekrem

# Node.js kurulumu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Adım 2: Cloudflare Tunnel Kurulumu
```bash
# Cloudflared kurulumu
wget -O cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb

# Konfigürasyon dosyalarını kopyala
sudo mkdir -p /home/ekrem/.cloudflared
sudo cp .cloudflared/* /home/ekrem/.cloudflared/
sudo chown -R ekrem:ekrem /home/ekrem/.cloudflared
```

### Adım 3: Proje Deployment
```bash
# Proje dosyalarını kopyala
cp -r home/ekrem/json-to-excel /home/ekrem/
cd /home/ekrem/json-to-excel

# Dependencies kurulumu
npm install

# Docker container başlatma
docker-compose -f docker-compose.backup.yml up -d
```

### Adım 4: Systemd Services
```bash
# Service dosyalarını kopyala
sudo cp etc/systemd/system/cloudflared-tunnel.service /etc/systemd/system/

# Services'i etkinleştir
sudo systemctl daemon-reload
sudo systemctl enable cloudflared-tunnel
sudo systemctl start cloudflared-tunnel
```

### Adım 5: Monitoring ve Automation
```bash
# Script dosyalarını kopyala
cp home/ekrem/*.sh /home/ekrem/
chmod +x /home/ekrem/*.sh

# Cron jobs ekle
crontab -e
# Aşağıdaki satırları ekle:
# */5 * * * * /home/ekrem/health-check.sh
# */5 * * * * /home/ekrem/ip-monitor.sh
```

## 🔧 Konfigürasyon Gereksinimleri

### Router Port Forwarding
- **Port 80**: HTTP trafiği için
- **Port 443**: HTTPS trafiği için
- **Port 22**: SSH erişimi için (opsiyonel)

### Cloudflare Tunnel
- **Domain**: devtestenv.org
- **Tunnel ID**: 7c125fd6-3645-44ed-a248-e727ba5ddd28
- **Credentials**: `.cloudflared/` klasöründe mevcut

### Telegram Bot
- **Bot Token**: Script içerisinde tanımlı
- **Chat ID**: Notification için gerekli

## 📊 Monitoring Özellikleri

### 1. Health Check
- **Frekans**: 5 dakikada bir
- **Kontrol edilen**: Site erişilebilirliği
- **Log**: `/home/ekrem/logs/health-check.log`

### 2. IP Monitoring
- **Frekans**: 5 dakikada bir
- **Özellikler**:
  - IP değişiklik tespiti
  - Otomatik DDNS güncelleme
  - Telegram bildirimi
  - Port forwarding kontrolü

### 3. System Monitoring
- **Docker container durumu**
- **Cloudflare tunnel durumu**
- **Disk kullanımı**
- **Memory kullanımı**

## 🔍 Troubleshooting

### Servis Kontrolü
```bash
# Cloudflare tunnel durumu
sudo systemctl status cloudflared-tunnel

# Docker container durumu
docker ps

# Log kontrolleri
journalctl -u cloudflared-tunnel -f
tail -f /home/ekrem/logs/health-check.log
```

### Common Issues
1. **Tunnel bağlantı sorunu**: Cloudflare credentials kontrol et
2. **Port erişim sorunu**: Router port forwarding kontrol et
3. **DNS çözümleme**: DDNS provider ayarları kontrol et

## 🛡️ Güvenlik Notları

- SSH key authentication kullan
- Firewall kurallarını aktif et
- Regular backup al
- Log dosyalarını monitoring et

## 📈 Performance Optimization

- Docker container'ları izle
- Node.js memory kullanımını kontrol et
- Disk temizliği düzenli yap
- Log rotation aktif et

---

## � Advanced Features (NEW!)

### 1. **Automated Sync System**
```bash
# Pi'den PC'ye otomatik senkronizasyon
./auto-sync.sh

# Konfigürasyon
REMOTE_PC_IP="192.168.1.100"
REMOTE_PC_USER="your_username"
```

**Özellikler:**
- ✅ **Incremental Sync**: Sadece değişen dosyalar
- ✅ **Change Detection**: SHA256 hash kontrolü
- ✅ **Smart Retry**: Bağlantı hatalarında otomatik tekrar
- ✅ **Telegram Notifications**: Sync durumu bildirimleri
- ✅ **Cron Integration**: 4 saatte bir otomatik sync

### 2. **Git Version Control**
```bash
# Backup'ları Git ile versiyon kontrolü
./git-backup.sh

# Manual operations
./git-backup.sh init      # Repository başlat
./git-backup.sh commit    # Changes commit et
./git-backup.sh push      # Remote'a gönder
```

**Özellikler:**
- ✅ **Automatic Versioning**: Timestamp-based tags
- ✅ **Change Tracking**: Detailed commit messages
- ✅ **Remote Backup**: GitHub/GitLab integration
- ✅ **System Info**: Hardware/software versioning
- ✅ **Cleanup**: Eski versiyonları otomatik temizle

### 3. **Multi-Pi Management Dashboard**
```bash
# Cluster yönetimi başlat
./cluster-manager.sh setup
./cluster-manager.sh start-dashboard

# Dashboard: http://localhost:8080
```

**Özellikler:**
- ✅ **Real-time Monitoring**: CPU, Memory, Disk, Temperature
- ✅ **Service Status**: Cloudflared, Docker, custom services
- ✅ **Cluster Health**: Tüm Pi'lerin durumu tek bakışta
- ✅ **Remote Management**: SSH üzerinden komut çalıştırma
- ✅ **Auto-refresh**: 60 saniyede bir güncelleme

## 🌐 Multi-Pi Cluster Setup

### Cluster Konfigürasyonu (pi_config.json)
```json
{
  "devices": [
    {
      "hostname": "pi1-main",
      "ip_address": "192.168.1.143",
      "description": "Main JSON to Excel PWA Server",
      "tunnel_url": "https://devtestenv.org"
    },
    {
      "hostname": "pi2-backup", 
      "ip_address": "192.168.1.144",
      "description": "Backup/Development Server"
    }
  ]
}
```

### Cluster Commands
```bash
# Cluster setup
./cluster-manager.sh setup              # SSH keys + dependencies
./cluster-manager.sh deploy             # Scripts'i tüm Pi'lere deploy

# Monitoring
./cluster-manager.sh start-dashboard    # Dashboard başlat
./cluster-manager.sh status             # Cluster durumu
./cluster-manager.sh health             # Health check

# Cluster Operations
./cluster-manager.sh sync               # Tüm Pi'lerde sync
./cluster-manager.sh backup             # Tüm Pi'lerde backup
./cluster-manager.sh update             # Tüm Pi'leri güncelle
./cluster-manager.sh restart            # Services restart

# Remote Execution
./cluster-manager.sh exec 'docker ps'   # Tüm Pi'lerde command
./cluster-manager.sh exec 'df -h'       # Disk kullanımı kontrol
```

## 📊 Advanced Monitoring

### Dashboard Features
- **Real-time Stats**: Live CPU, Memory, Disk monitoring
- **Service Health**: Cloudflared, Docker, custom services
- **Network Status**: Tunnel connectivity, SSH accessibility
- **Historical Data**: SQLite database ile geçmiş veriler
- **Alert System**: Threshold-based uyarılar
- **Mobile Responsive**: Telefon/tablet uyumlu

### Monitoring Metrics
```
🖥️ System Metrics:
   - CPU Usage (%)
   - Memory Usage (%)  
   - Disk Usage (%)
   - Temperature (°C)
   - Uptime

🌐 Network Metrics:
   - Tunnel Status
   - SSH Connectivity
   - Public IP Changes
   - Bandwidth Usage

🔧 Service Metrics:
   - Cloudflared Status
   - Docker Containers
   - Node.js Processes
   - Custom Services
```

---

## 📞 Support

### Basic Troubleshooting
1. Log dosyalarını kontrol et
2. Network bağlantısını test et
3. Service statuslerini kontrol et

### Advanced Troubleshooting
```bash
# System health check
./system-check.sh

# Cluster health
./cluster-manager.sh health

# Service diagnostics
journalctl -u cloudflared-tunnel -f
docker logs container_name
```

### Log Locations
```
/home/ekrem/logs/health-check.log     # Health monitoring
/home/ekrem/logs/auto-sync.log        # Sync operations
/home/ekrem/logs/git-backup.log       # Version control
/home/ekrem/logs/cluster-management.log # Cluster ops
```

Bu paket ile artık **enterprise-grade** Pi cluster yönetimi yapabilirsin! 🚀

### 🎯 **Yeni Özellikler Özeti:**
- ✅ **Automated Sync**: Pi → PC otomatik senkronizasyon
- ✅ **Git Versioning**: Professional version control
- ✅ **Multi-Pi Dashboard**: Centralized monitoring
- ✅ **Cluster Management**: One-command cluster operations
- ✅ **Advanced Monitoring**: Real-time metrics + alerts