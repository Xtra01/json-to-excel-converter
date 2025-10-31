# 🍓 Raspberry Pi 5 - Sıfırdan Cloudflare Tunnel Kurulum Rehberi

**Format sonrası komple kurulum: Sistem → Docker → Uygulama → Cloudflare Tunnel**

---

## 📋 Gereksinimler Listesi

### 🖥️ **Donanım**
- ✅ Raspberry Pi 5 (8GB RAM)
- ✅ MicroSD Kart (32GB+ Class 10)
- ✅ Güvenilir internet bağlantısı
- ✅ Ethernet kablosu (Wi-Fi'dan daha stabil)

### 🌐 **Hesaplar & Erişim**
- ✅ Cloudflare hesabı (ücretsiz)
- ✅ Domain kontrolü (devtestenv.org)
- ✅ SSH erişimi için istemci (PuTTY, Terminal)
- ✅ Router admin paneli erişimi

---

## 🔧 ADIM 1: Raspberry Pi OS Kurulumu

### 1.1 SD Kart Hazırlama 💾

**Raspberry Pi Imager İndirme:**
```bash
# Windows için
# https://downloads.rpi.org/imager/imager_latest.exe

# macOS için  
# https://downloads.rpi.org/imager/imager_latest.dmg

# Linux için
sudo apt install rpi-imager
```

**İmage Yazma Adımları:**
```
1️⃣ Raspberry Pi Imager'ı açın
2️⃣ "Choose OS" → "Raspberry Pi OS (64-bit)" seçin
3️⃣ "Choose Storage" → SD kartınızı seçin  
4️⃣ ⚙️ Ayarlar simgesine tıklayın (Advanced Options)
```

**Gelişmiş Ayarlar (ÖNEMLİ!):**
```
☑️ Enable SSH
    ○ Use password authentication
    ○ Username: ekrem
    ○ Password: [güvenli şifre]

☑️ Configure WiFi (opsiyonel)
    ○ SSID: [wifi_adı] 
    ○ Password: [wifi_şifresi]
    ○ Country: TR

☑️ Set locale settings
    ○ Time zone: Europe/Istanbul
    ○ Keyboard layout: tr
```

### 1.2 İlk Boot ve SSH Bağlantısı 🚀

**Pi'yi Başlatma:**
```
1️⃣ SD kartı Pi'ye takın
2️⃣ Ethernet kablosunu bağlayın
3️⃣ Güç kablosunu bağlayın
4️⃣ 2-3 dakika bekleyin (ilk boot uzun sürer)
```

**IP Adresini Bulma:**
```bash
# Router admin panelinden bakın (192.168.1.1)
# Veya network scan ile:

# Windows (CMD)
for /l %i in (1,1,254) do ping -n 1 -w 100 192.168.1.%i | find "TTL"

# Linux/macOS
nmap -sn 192.168.1.0/24 | grep "Nmap scan report"

# Raspberry Pi genellikle: 192.168.1.xxx
```

**SSH Bağlantısı:**
```bash
# Terminal/PowerShell'den
ssh ekrem@192.168.1.143  # IP'nizi yazın

# İlk bağlantıda "yes" yazın
# Şifrenizi girin
```

---

## 🔄 ADIM 2: Sistem Güncelleme ve Hazırlık

### 2.1 Sistem Güncelleme 📦
```bash
# Paket listelerini güncelle
sudo apt update

# Sistemi güncelle (15-30 dakika sürebilir)
sudo apt upgrade -y

# Yeniden başlat
sudo reboot

# SSH'ye yeniden bağlan
ssh ekrem@192.168.1.143
```

### 2.2 Gerekli Paketleri Yükleme 🛠️
```bash
# Temel araçlar
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release

# Zaman dilimini ayarla
sudo timedatectl set-timezone Europe/Istanbul

# Sistem bilgilerini kontrol et
neofetch
```

### 2.3 Güvenlik Ayarları 🔒
```bash
# Firewall etkinleştir
sudo ufw enable

# SSH portunu aç
sudo ufw allow ssh
sudo ufw allow 22/tcp

# HTTP/HTTPS portları (Cloudflare için gerekli değil ama güvenlik için)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Durumu kontrol et
sudo ufw status
```

---

## 🐳 ADIM 3: Docker Kurulumu

### 3.1 Docker Repository Ekleme 📦
```bash
# Docker'ın GPG anahtarını ekle
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker repository'yi ekle (ARM64 için)
echo \
  "deb [arch=arm64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 3.2 Docker Engine Kurulumu ⚙️
```bash
# Paket listesini güncelle
sudo apt update

# Docker'ı yükle
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker servisini başlat
sudo systemctl start docker
sudo systemctl enable docker

# Kullanıcıyı docker grubuna ekle
sudo usermod -aG docker $USER

# Yeni grup üyeliğini aktifleştir
newgrp docker

# Docker versiyonunu kontrol et
docker --version
docker compose version
```

### 3.3 Docker Test 🧪
```bash
# Hello World test
docker run hello-world

# Docker sistem bilgisi
docker system info

# ARM64 desteğini kontrol et
docker run --rm arm64v8/ubuntu uname -m
```

---

## 📁 ADIM 4: Proje Dosyalarını Hazırlama

### 4.1 Proje Dizini Oluşturma 🗂️
```bash
# Ana dizin oluştur
mkdir -p /home/ekrem/json-to-excel
cd /home/ekrem/json-to-excel

# Gerekli alt dizinler
mkdir -p uploads
mkdir -p ssl
mkdir -p logs
mkdir -p backups

# İzinleri ayarla
chmod 755 /home/ekrem/json-to-excel
chmod 777 uploads
```

### 4.2 Proje Dosyalarını Kopyalama 💾

**Windows/macOS/Linux bilgisayarınızdan:**
```bash
# Terminal/PowerShell'de proje dizininize gidin
cd "C:\Path\To\Your\Project"  # Windows
cd "/path/to/your/project"    # Linux/macOS

# Tüm dosyaları kopyala
scp -r ./* ekrem@192.168.1.143:/home/ekrem/json-to-excel/

# Önemli dosyaları tek tek kontrol et
scp package.json ekrem@192.168.1.143:/home/ekrem/json-to-excel/
scp Dockerfile ekrem@192.168.1.143:/home/ekrem/json-to-excel/
scp docker-compose.yml ekrem@192.168.1.143:/home/ekrem/json-to-excel/
scp nginx.conf ekrem@192.168.1.143:/home/ekrem/json-to-excel/
```

**Dosya yapısını kontrol edin:**
```bash
# Raspberry Pi'de
cd /home/ekrem/json-to-excel
ls -la

# Görmek istediğiniz dosyalar:
# drwxr-xr-x src/
# -rw-r--r-- package.json
# -rw-r--r-- Dockerfile  
# -rw-r--r-- docker-compose.yml
# -rw-r--r-- nginx.conf
# -rw-r--r-- next.config.mjs
# -rw-r--r-- tailwind.config.js
# -rw-r--r-- tsconfig.json
```

---

## 🏗️ ADIM 5: Docker Container'ları Build Etme

### 5.1 Docker Network Oluşturma 🌐
```bash
# Özel network oluştur
docker network create json-excel-network

# Network listesini kontrol et
docker network ls
```

### 5.2 Application Image Build ⚡
```bash
# Build işlemini başlat (10-15 dakika sürebilir)
docker build -t json-to-excel .

# Build loglarını takip et
# ARM64 için Node.js modülleri compile edilecek

# Build başarısını kontrol et
docker images | grep json-to-excel

# Çıktı böyle olmalı:
# json-to-excel    latest    abc123def456    2 minutes ago    XXXmb
```

### 5.3 Container'ları Çalıştırma 🚀
```bash
# Application container'ını başlat
docker run -d \
  --network json-excel-network \
  --name json-to-excel-app \
  --restart unless-stopped \
  -v /home/ekrem/json-to-excel/uploads:/app/uploads:rw \
  json-to-excel

# Nginx container'ını başlat
docker run -d \
  --network json-excel-network \
  --name json-excel-nginx \
  -p 80:80 \
  -p 8080:80 \
  -v /home/ekrem/json-to-excel/nginx.conf:/etc/nginx/nginx.conf:ro \
  --restart unless-stopped \
  nginx:alpine

# Container durumlarını kontrol et
docker ps

# Logları kontrol et
docker logs json-to-excel-app
docker logs json-excel-nginx
```

### 5.4 Local Test 🧪
```bash
# Internal bağlantı testi
curl http://localhost:80

# Container'lar arası iletişim testi
docker exec json-to-excel-app curl http://localhost:3000

# Port dinleme kontrolü
netstat -tulpn | grep :80
```

---

## ☁️ ADIM 6: Cloudflare Tunnel Kurulumu

### 6.1 Cloudflared Binary İndirme 📥
```bash
# ARM64 sürümünü indir
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared

# Executable yap
chmod +x cloudflared

# Sistem PATH'ine taşı
sudo mv cloudflared /usr/local/bin/

# Versiyonu kontrol et
cloudflared --version
```

### 6.2 Cloudflare Authentication 🔐
```bash
# Cloudflare hesabına login ol
cloudflared tunnel login

# Bu komut bir URL verecek:
# https://dash.cloudflare.com/argotunnel?callback=https://...

# Bu URL'yi kopyalayın ve bilgisayarınızın tarayıcısında açın
# Cloudflare hesabınızla giriş yapın
# devtestenv.org domain'ini seçin  
# "Authorize" butonuna tıklayın

# Başarılı olduğunda şu mesajı göreceksiniz:
# "You have successfully logged in"
```

### 6.3 Tunnel Oluşturma 🚇
```bash
# Yeni tunnel oluştur
cloudflared tunnel create json-to-excel-tunnel

# Çıktıda tunnel ID'yi not alın:
# Created tunnel json-to-excel-tunnel with id 7c125fd6-3645-44ed-a248-e727ba5ddd28

# Tunnel ID'yi değişkene ata
TUNNEL_ID="7c125fd6-3645-44ed-a248-e727ba5ddd28"
echo "Tunnel ID: $TUNNEL_ID"

# Mevcut tunnel'ları listele
cloudflared tunnel list
```

### 6.4 Tunnel Konfigürasyon Dosyası 📝
```bash
# Config dosyasını oluştur
cat > /home/ekrem/tunnel-config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: /home/ekrem/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: devtestenv.org
    service: http://localhost:80
  - hostname: "*.devtestenv.org"  
    service: http://localhost:80
  - service: http_status:404
EOF

# Config dosyasını kontrol et
cat /home/ekrem/tunnel-config.yml
```

### 6.5 DNS Routing Ayarı 🌐
```bash
# DNS routing'i yapılandır (otomatik CNAME oluşturur)
cloudflared tunnel route dns json-to-excel-tunnel devtestenv.org

# Subdomain desteği için (opsiyonel)
cloudflared tunnel route dns json-to-excel-tunnel "*.devtestenv.org"

# Route'ları kontrol et
cloudflared tunnel route list
```

### 6.6 Tunnel'ı Test Etme ⚡
```bash
# Test modunda tunnel'ı çalıştır
cloudflared tunnel --config /home/ekrem/tunnel-config.yml run json-to-excel-tunnel

# Bu komut şu çıktıları vermelidir:
# INFO: Registered tunnel connection
# INFO: Serving at https://devtestenv.org

# Başka bir terminal'de test edin:
curl -I https://devtestenv.org

# Ctrl+C ile durdur
```

---

## ⚙️ ADIM 7: Sistem Servisleri Kurulumu

### 7.1 Systemd Service Oluşturma 🔧
```bash
# Cloudflare Tunnel servisi oluştur
sudo tee /etc/systemd/system/cloudflare-tunnel.service << EOF
[Unit]
Description=Cloudflare Tunnel Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ekrem
Group=ekrem
WorkingDirectory=/home/ekrem
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/ekrem/tunnel-config.yml run json-to-excel-tunnel
Restart=always
RestartSec=10
KillMode=mixed
TimeoutStopSec=120

[Install]
WantedBy=multi-user.target
EOF
```

### 7.2 Servisleri Aktifleştirme ⚡
```bash
# Systemd daemon'ı yenile
sudo systemctl daemon-reload

# Cloudflare Tunnel servisini etkinleştir
sudo systemctl enable cloudflare-tunnel

# Servisi başlat
sudo systemctl start cloudflare-tunnel

# Servis durumunu kontrol et
sudo systemctl status cloudflare-tunnel

# Logları takip et
sudo journalctl -u cloudflare-tunnel -f

# Docker otomatik başlatma (zaten açık ama kontrol edelim)
sudo systemctl enable docker
```

### 7.3 Boot Time Ayarları 🚀
```bash
# Container'ların restart policy'sini güncelle
docker update --restart unless-stopped json-to-excel-app
docker update --restart unless-stopped json-excel-nginx

# Boot sırasında çalışacak servisleri kontrol et
systemctl list-unit-files --state=enabled | grep -E "(docker|cloudflare)"

# Çıktıda şunları görmeli:
# docker.service                    enabled
# cloudflare-tunnel.service         enabled
```

---

## 🌍 ADIM 8: Cloudflare Dashboard Ayarları

### 8.1 Cloudflare Dashboard Erişimi 💻

**Tarayıcıda şu adımları izleyin:**

1. **Cloudflare Dashboard'a gidin:** https://dash.cloudflare.com
2. **Domain'inizi seçin:** devtestenv.org
3. **Sol menüden "DNS"** sekmesine tıklayın

### 8.2 DNS Records Kontrol 🔍

**Mevcut kayıtları kontrol edin:**
```
Type  | Name | Content                              | Status
------|------|--------------------------------------|--------
CNAME | @    | 7c125fd6-3645-44ed-a248-e727ba5ddd28.cfargotunnel.com | 🟠 Proxied
```

**Eğer bu kayıt yoksa manuel ekleyin:**
```
1️⃣ "Add record" butonuna tıklayın
2️⃣ Type: "CNAME"
3️⃣ Name: "@" (root domain için)
4️⃣ Target: "7c125fd6-3645-44ed-a248-e727ba5ddd28.cfargotunnel.com"
5️⃣ Proxy status: 🟠 "Proxied" (turuncu bulut)
6️⃣ TTL: "Auto"
7️⃣ "Save" butonuna tıklayın
```

### 8.3 SSL/TLS Ayarları 🔐

**SSL ayarlarını kontrol edin:**

1. **Sol menüden "SSL/TLS"** sekmesine gidin
2. **"Overview"** sayfasında:
   ```
   SSL/TLS encryption mode: "Full (strict)" ✅
   ```
3. **"Edge Certificates"** sayfasında:
   ```
   ☑️ Always Use HTTPS: ON
   ☑️ HTTP Strict Transport Security (HSTS): ON  
   ☑️ Minimum TLS Version: 1.2
   ☑️ Opportunistic Encryption: ON
   ☑️ TLS 1.3: ON
   ```

### 8.4 Security Ayarları 🛡️

**"Security" sekmesinde:**
```
☑️ Security Level: Medium
☑️ Challenge Passage: 1 hour
☑️ Browser Integrity Check: ON
☑️ Privacy Pass Support: ON
```

**"Firewall" alt sekmesinde:**
```
☑️ Bot Fight Mode: ON (ücretsiz hesaplar için)
```

---

## 🌐 ADIM 9: Router/Modem Ayarları (Opsiyonel)

### 9.1 Router Admin Paneline Erişim 🔧

**Not:** *Cloudflare Tunnel kullandığımız için port yönlendirme GEREKMİYOR, ama network optimizasyonu için yararlı*

```bash
# Router IP'nizi öğrenin
ip route show default

# Genellikle: 192.168.1.1 veya 192.168.0.1
```

**Tarayıcıda router IP'sine gidin:**
- **Türk Telekom**: 192.168.1.1 (admin/admin)
- **Superonline**: 192.168.1.1 (admin/admin)  
- **Turkcell**: 192.168.1.1 (admin/admin)
- **Vodafone**: 192.168.1.1 (vodafone/vodafone)

### 9.2 Network Optimizasyonu ⚡

**DHCP Rezervasyonu (Önerilen):**
```
1️⃣ DHCP Settings / LAN Settings
2️⃣ DHCP Reservation / Static IP
3️⃣ Device: Raspberry Pi (MAC: ...)
4️⃣ IP Address: 192.168.1.143
5️⃣ Save/Apply
```

**QoS Ayarları (Opsiyonel):**
```
1️⃣ QoS / Traffic Control
2️⃣ Device Priority: High (Raspberry Pi için)
3️⃣ Bandwidth Allocation: Min %20
4️⃣ Save/Apply
```

### 9.3 Port Forwarding (Sadece Backup İçin) 🚪

**⚠️ DİKKAT: Cloudflare Tunnel kullanırken gerekli değil!**

*Sadece tunnel çalışmadığında backup erişim için:*
```
Service Name: HTTP-Backup
External Port: 8080  
Internal IP: 192.168.1.143
Internal Port: 80
Protocol: TCP
Status: Enabled
```

---

## 🔍 ADIM 10: Test ve Doğrulama

### 10.1 Sistem Durumu Kontrolü ✅
```bash
# Container durumları
docker ps

# Servis durumları  
sudo systemctl status cloudflare-tunnel
sudo systemctl status docker

# Network bağlantısı
ping -c 3 8.8.8.8

# Disk alanı
df -h

# Memory kullanımı
free -h
```

### 10.2 Web Erişim Testi 🌐
```bash
# Local test
curl -I http://localhost:80

# Cloudflare test (Raspberry Pi'den)
curl -I https://devtestenv.org

# Dış network'ten test (bilgisayarınızdan)
curl -I https://devtestenv.org

# Tarayıcıda test
# https://devtestenv.org (ana sayfa)
```

### 10.3 SSL Sertifika Kontrolü 🔐
```bash
# SSL bilgilerini kontrol et
openssl s_client -connect devtestenv.org:443 -servername devtestenv.org

# Sertifika geçerlilik süresi
echo | openssl s_client -connect devtestenv.org:443 -servername devtestenv.org 2>/dev/null | openssl x509 -noout -dates

# Cloudflare sertifikası olmalı
```

### 10.4 Performance Test 📊
```bash
# Response time test
time curl -s https://devtestenv.org > /dev/null

# Application health check
curl -s https://devtestenv.org | grep -i "json"

# Container resource kullanımı
docker stats --no-stream
```

---

## 📊 ADIM 11: Monitoring ve Bakım

### 11.1 Log İzleme 📝
```bash
# Cloudflare Tunnel logs
sudo journalctl -u cloudflare-tunnel -f

# Docker container logs
docker logs -f json-to-excel-app
docker logs -f json-excel-nginx

# System logs
tail -f /var/log/syslog
```

### 11.2 Health Check Script 🏥
```bash
# Health check scripti oluştur
cat > /home/ekrem/health-check.sh << 'EOF'
#!/bin/bash

LOG_FILE="/home/ekrem/logs/health-check.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== Health Check - $DATE ===" >> $LOG_FILE

# Container checks
APP_STATUS=$(docker ps | grep json-to-excel-app | wc -l)
NGINX_STATUS=$(docker ps | grep json-excel-nginx | wc -l)

# Service checks
TUNNEL_STATUS=$(systemctl is-active cloudflare-tunnel)
DOCKER_STATUS=$(systemctl is-active docker)

# Network checks
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://devtestenv.org)
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" https://devtestenv.org)

# System resources
MEMORY=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100}')
DISK=$(df / | awk 'NR==2{printf "%.1f", $3/$2 * 100}')
CPU_TEMP=$(vcgencmd measure_temp | cut -d'=' -f2)

echo "App Container: $([ $APP_STATUS -eq 1 ] && echo "✅ Running" || echo "❌ Stopped")" >> $LOG_FILE
echo "Nginx Container: $([ $NGINX_STATUS -eq 1 ] && echo "✅ Running" || echo "❌ Stopped")" >> $LOG_FILE
echo "Tunnel Service: ✅ $TUNNEL_STATUS" >> $LOG_FILE
echo "Docker Service: ✅ $DOCKER_STATUS" >> $LOG_FILE
echo "Website Response: $([ $HTTP_CODE -eq 200 ] && echo "✅ OK ($HTTP_CODE)" || echo "❌ Error ($HTTP_CODE)")" >> $LOG_FILE
echo "Response Time: ${RESPONSE_TIME}s" >> $LOG_FILE
echo "Memory Usage: ${MEMORY}%" >> $LOG_FILE
echo "Disk Usage: ${DISK}%" >> $LOG_FILE
echo "CPU Temperature: $CPU_TEMP" >> $LOG_FILE
echo "---" >> $LOG_FILE

# Alert conditions
if [ $HTTP_CODE -ne 200 ] || [ $APP_STATUS -ne 1 ] || [ $NGINX_STATUS -ne 1 ]; then
    echo "🚨 ALERT: System issues detected!" >> $LOG_FILE
    # Restart containers if needed
    if [ $APP_STATUS -ne 1 ]; then
        docker start json-to-excel-app >> $LOG_FILE 2>&1
    fi
    if [ $NGINX_STATUS -ne 1 ]; then
        docker start json-excel-nginx >> $LOG_FILE 2>&1
    fi
fi
EOF

chmod +x /home/ekrem/health-check.sh

# Log dizini oluştur
mkdir -p /home/ekrem/logs

# Cron job ekle (her 5 dakikada)
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/ekrem/health-check.sh") | crontab -
```

### 11.3 Backup Script 💾
```bash
# Backup scripti oluştur
cat > /home/ekrem/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/ekrem/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "🔄 Starting backup - $DATE"

# Configuration files backup
tar czf $BACKUP_DIR/configs_$DATE.tar.gz \
    /home/ekrem/tunnel-config.yml \
    /home/ekrem/json-to-excel/nginx.conf \
    /home/ekrem/json-to-excel/Dockerfile \
    /home/ekrem/json-to-excel/docker-compose.yml \
    /home/ekrem/json-to-excel/package.json \
    /etc/systemd/system/cloudflare-tunnel.service 2>/dev/null

# Cloudflare credentials backup  
if [ -d "/home/ekrem/.cloudflared" ]; then
    cp -r /home/ekrem/.cloudflared $BACKUP_DIR/cloudflared_$DATE
fi

# Docker volumes backup (if any persistent data)
docker run --rm \
    -v json-to-excel_uploads:/data:ro \
    -v $BACKUP_DIR:/backup \
    alpine tar czf /backup/uploads_$DATE.tar.gz -C /data . 2>/dev/null

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "cloudflared_*" -mtime +7 -exec rm -rf {} \; 2>/dev/null

echo "✅ Backup completed: $BACKUP_DIR"
ls -la $BACKUP_DIR/*_$DATE*
EOF

chmod +x /home/ekrem/backup.sh

# Haftalık backup cron job (Pazar 03:00)
(crontab -l 2>/dev/null; echo "0 3 * * 0 /home/ekrem/backup.sh >> /home/ekrem/logs/backup.log 2>&1") | crontab -
```

### 11.4 Auto-Update Script 🔄
```bash
# Auto-update scripti oluştur
cat > /home/ekrem/auto-update.sh << 'EOF'
#!/bin/bash

LOG_FILE="/home/ekrem/logs/auto-update.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== Auto Update - $DATE ===" >> $LOG_FILE

# System updates
apt list --upgradable >> $LOG_FILE 2>&1
sudo apt update >> $LOG_FILE 2>&1
sudo apt upgrade -y >> $LOG_FILE 2>&1

# Docker cleanup
docker system prune -f >> $LOG_FILE 2>&1

# Restart services if needed
sudo systemctl restart cloudflare-tunnel >> $LOG_FILE 2>&1

echo "✅ Auto-update completed" >> $LOG_FILE
echo "---" >> $LOG_FILE
EOF

chmod +x /home/ekrem/auto-update.sh

# Aylık update (ayın 1'i 02:00)
(crontab -l 2>/dev/null; echo "0 2 1 * * /home/ekrem/auto-update.sh") | crontab -
```

---

## 🚨 ADIM 12: Sorun Giderme Rehberi

### 12.1 Yaygın Problemler ve Çözümleri 🔧

#### **❌ Tunnel Bağlanmıyor**
```bash
# Tunnel durumunu kontrol et
sudo systemctl status cloudflare-tunnel

# Credentials dosyasını kontrol et  
ls -la ~/.cloudflared/

# Manuel test
cloudflared tunnel --config /home/ekrem/tunnel-config.yml run json-to-excel-tunnel

# Config dosyasını kontrol et
cat /home/ekrem/tunnel-config.yml

# DNS propagation kontrol
nslookup devtestenv.org
dig devtestenv.org CNAME
```

#### **❌ Container Çalışmıyor**
```bash
# Container durumları
docker ps -a

# Logları incele
docker logs json-to-excel-app
docker logs json-excel-nginx

# Container'ları yeniden başlat
docker restart json-to-excel-app json-excel-nginx

# Network kontrolü
docker network inspect json-excel-network

# Port kontrolü
netstat -tulpn | grep :80
```

#### **❌ Website Erişilmiyor**
```bash
# Local test
curl -v http://localhost:80

# Cloudflare test
curl -v https://devtestenv.org

# DNS test
nslookup devtestenv.org 8.8.8.8

# SSL test
openssl s_client -connect devtestenv.org:443
```

### 12.2 Acil Durum Prosedürü 🆘

#### **Sistem Tamamen Çöktüyse:**
```bash
# 1. Raspberry Pi'yi yeniden başlat
sudo reboot

# 2. SSH'ye bağlan
ssh ekrem@192.168.1.143

# 3. Servisleri kontrol et
sudo systemctl status docker
sudo systemctl status cloudflare-tunnel

# 4. Container'ları kontrol et
docker ps -a

# 5. Gerekirse hepsini yeniden başlat
sudo systemctl restart docker
docker start json-to-excel-app json-excel-nginx
sudo systemctl restart cloudflare-tunnel
```

#### **Backup'tan Geri Yükleme:**
```bash
# Son backup'ı bul
ls -la /home/ekrem/backups/

# Config dosyalarını geri yükle
tar xzf /home/ekrem/backups/configs_YYYYMMDD_HHMMSS.tar.gz -C /

# Cloudflare credentials'ı geri yükle
cp -r /home/ekrem/backups/cloudflared_YYYYMMDD_HHMMSS /home/ekrem/.cloudflared

# Servisleri yeniden başlat
sudo systemctl daemon-reload
sudo systemctl restart cloudflare-tunnel
```

---

## ✅ ADIM 13: Final Kontrol Listesi

### 🎯 **Deployment Checklist**

#### **Sistem Hazırlık** ☑️
- [ ] Raspberry Pi OS kuruldu
- [ ] SSH erişimi aktif
- [ ] Sistem güncel (apt upgrade)
- [ ] Firewall ayarlandı
- [ ] Zaman dilimi: Europe/Istanbul

#### **Docker Kurulumu** ☑️
- [ ] Docker Engine kuruldu
- [ ] Docker Compose aktif
- [ ] ARM64 desteği çalışıyor
- [ ] Kullanıcı docker grubunda
- [ ] Test container çalıştı

#### **Uygulama Deployment** ☑️
- [ ] Proje dosyaları kopyalandı
- [ ] Docker network oluşturuldu
- [ ] Application image build edildi
- [ ] Container'lar çalışıyor
- [ ] Local test başarılı (localhost:80)

#### **Cloudflare Tunnel** ☑️
- [ ] Cloudflared binary kuruldu
- [ ] Authentication tamamlandı
- [ ] Tunnel oluşturuldu
- [ ] Config dosyası hazırlandı
- [ ] DNS routing yapıldı
- [ ] Systemd service aktif

#### **Production Ready** ☑️
- [ ] HTTPS erişim çalışıyor
- [ ] SSL sertifikası aktif
- [ ] Auto-restart politikaları aktif
- [ ] Health check çalışıyor
- [ ] Backup script aktif
- [ ] Monitoring logları çalışıyor

### 🌐 **Final Test**

**Dış network'ten test edin:**
```bash
# Farklı bir bilgisayar/telefon/4G'den
curl -I https://devtestenv.org

# Tarayıcıda açın:
https://devtestenv.org

# Kontrol edilecekler:
✅ Sayfa yükleniyor
✅ SSL sertifikası geçerli (yeşil kilit)
✅ JSON upload çalışıyor
✅ Excel export çalışıyor
```

---

## 🎉 Tebrikler!

**🚀 Raspberry Pi 5'iniz artık tam teşekküllü bir production server!**

### 📊 **Elde Ettiğiniz Sistem:**

- ✅ **High Availability**: Otomatik restart ve health check
- ✅ **Secure Access**: HTTPS + Cloudflare protection  
- ✅ **Professional Deployment**: Docker containerization
- ✅ **Easy Maintenance**: Automated backup and monitoring
- ✅ **Scalable Architecture**: Ready for future improvements

### 🔧 **Yönetim Komutları:**

```bash
# Sistem durumu
sudo systemctl status cloudflare-tunnel
docker ps

# Logları izle
sudo journalctl -u cloudflare-tunnel -f
docker logs -f json-to-excel-app

# Manuel backup
/home/ekrem/backup.sh

# Health check çalıştır
/home/ekrem/health-check.sh
```

### 📞 **Destek ve Kaynaklar:**

- 🌐 **Website**: https://devtestenv.org
- 📊 **Cloudflare Dashboard**: https://dash.cloudflare.com
- 🐳 **Docker Hub**: https://hub.docker.com
- 📚 **Cloudflare Docs**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

---

**💡 Final İpucu:** Bu rehberi bookmark'layın! Format attıktan sonra bu adımları takip ederek sisteminizi tekrar kurabilirsiniz.

**🍓 Raspberry Pi 5 + Cloudflare Tunnel = Güçlü ve Güvenli Web Hosting! 🎊**