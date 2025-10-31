# 🚀 JSON to Excel Converter - Deployment Guide

**Profesyonel Docker & Cloudflare Tunnel Deployment Rehberi**

---

## 📋 Gereksinimler

### 🖥️ **Sistem Gereksinimleri**
- **İşletim Sistemi**: Raspberry Pi OS (Debian-based) / Ubuntu 20.04+
- **RAM**: Minimum 4GB (Önerilen: 8GB)
- **Disk**: Minimum 32GB (SSD önerilir)
- **Network**: Sabit internet bağlantısı
- **Port**: 80, 3000, 8080 (opsiyonel)

### 🛠️ **Yazılım Gereksinimleri**
- **Docker**: v20.10+ (ARM64 uyumlu)
- **Docker Compose**: v2.0+
- **Node.js**: v18+ (sadece development için)
- **Git**: v2.0+

---

## 🔧 Adım 1: Sistem Hazırlığı

### **Raspberry Pi Güncelleme**
```bash
# Sistem güncellemeleri
sudo apt update && sudo apt upgrade -y

# Gerekli paketleri yükle
sudo apt install -y curl wget git vim htop

# Zaman dilimini ayarla
sudo timedatectl set-timezone Europe/Istanbul
```

### **SSH Konfigürasyonu**
```bash
# SSH servisini aktifleştir
sudo systemctl enable ssh
sudo systemctl start ssh

# SSH key ile bağlantı (opsiyonel)
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

---

## 🐳 Adım 2: Docker Kurulumu

### **Docker Engine Kurulumu**
```bash
# Eski Docker sürümlerini temizle
sudo apt remove docker docker-engine docker.io containerd runc

# Docker GPG key ekle
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker repository ekle
echo "deb [arch=arm64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker'ı yükle
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker'ı başlat ve otomatik başlatmayı etkinleştir
sudo systemctl start docker
sudo systemctl enable docker

# Kullanıcıyı docker grubuna ekle
sudo usermod -aG docker $USER
newgrp docker

# Kurulumu test et
docker --version
docker compose version
```

### **Docker Test**
```bash
# Hello World container test
docker run hello-world

# Docker sistem bilgisi
docker system info
```

---

## 📁 Adım 3: Proje Kurulumu

### **Proje Dosyalarını Kopyalama**
```bash
# Proje dizini oluştur
mkdir -p /home/$USER/json-to-excel
cd /home/$USER/json-to-excel

# Projeyi klonla (örnek)
# git clone https://github.com/your-repo/json-to-excel.git .

# Veya dosyaları manuel kopyala (scp ile)
# scp -r ./project/* user@raspberry-pi:/home/user/json-to-excel/
```

### **Gerekli Dosya Yapısı**
```
/home/user/json-to-excel/
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── package.json
├── package-lock.json
├── next.config.mjs
├── tailwind.config.js
├── tsconfig.json
├── src/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   └── workers/
└── test-data/
```

---

## 🏗️ Adım 4: Docker Container'ları Oluşturma

### **Docker Network Oluşturma**
```bash
# Özel network oluştur
docker network create json-to-excel-network

# Network'ü kontrol et
docker network ls
```

### **Application Container Build**
```bash
# Image'ı build et
docker build -t json-to-excel .

# Build başarısını kontrol et
docker images | grep json-to-excel
```

### **Application Container Çalıştırma**
```bash
# Container'ı başlat
docker run -d \
  --network json-to-excel-network \
  --name json-to-excel-app \
  --restart unless-stopped \
  json-to-excel

# Container durumunu kontrol et
docker ps
docker logs json-to-excel-app
```

### **Nginx Reverse Proxy**
```bash
# Nginx container'ı başlat
docker run -d \
  --network json-to-excel-network \
  --name nginx-proxy \
  -p 80:80 \
  -p 8080:80 \
  -v /home/$USER/json-to-excel/nginx.conf:/etc/nginx/nginx.conf \
  --restart unless-stopped \
  nginx:alpine

# Nginx durumunu kontrol et
docker logs nginx-proxy
```

---

## 🌐 Adım 5: Cloudflare Tunnel Kurulumu

### **Cloudflared İndirme**
```bash
# ARM64 cloudflared binary indir
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared

# Executable yap
chmod +x cloudflared

# Sistem PATH'ine taşı (opsiyonel)
sudo mv cloudflared /usr/local/bin/
```

### **Cloudflare Authentication**
```bash
# Cloudflare'e login ol
./cloudflared tunnel login

# Browser açılacak, Cloudflare hesabınızla giriş yapın
# Domain'inizi seçin ve "Authorize" butonuna tıklayın
```

### **Tunnel Oluşturma**
```bash
# Tunnel oluştur
./cloudflared tunnel create json-to-excel-tunnel

# Tunnel ID'yi not alın (örnek: 7c125fd6-3645-44ed-a248-e727ba5ddd28)
TUNNEL_ID=$(./cloudflared tunnel list | grep json-to-excel-tunnel | awk '{print $1}')
echo "Tunnel ID: $TUNNEL_ID"
```

### **Tunnel Konfigürasyon Dosyası**
```bash
# Config dosyası oluştur
cat > tunnel-config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: /home/$USER/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: devtestenv.org
    service: http://localhost:80
  - service: http_status:404
EOF
```

### **Tunnel'ı Başlatma**
```bash
# Tunnel'ı test modunda çalıştır
./cloudflared tunnel --config tunnel-config.yml run json-to-excel-tunnel

# Ctrl+C ile durdur, sonra daemon modunda başlat
nohup ./cloudflared tunnel --config tunnel-config.yml run json-to-excel-tunnel > tunnel.log 2>&1 &

# Process ID'yi kaydet
echo $! > tunnel.pid
```

---

## 🌍 Adım 6: DNS Konfigürasyonu

### **Cloudflare Dashboard Ayarları**

1. **Cloudflare Dashboard**'a git: https://dash.cloudflare.com
2. **Domain'inizi** seçin (örn: devtestenv.org)
3. **DNS** → **Records** sekmesine git
4. **Mevcut A record'unu sil** (eski IP'li)
5. **Yeni CNAME record ekle**:
   - **Type**: `CNAME`
   - **Name**: `@` (veya domain adı)
   - **Target**: `$TUNNEL_ID.cfargotunnel.com`
   - **Proxy status**: 🟠 **Proxied**
   - **TTL**: `Auto`

### **DNS Propagation Test**
```bash
# DNS değişikliğini test et
nslookup devtestenv.org

# CNAME kaydını kontrol et
dig devtestenv.org CNAME

# HTTP erişim test
curl -I https://devtestenv.org
```

---

## 🔧 Adım 7: Sistem Servisleri (Systemd)

### **Tunnel Servisi Oluşturma**
```bash
# Systemd service dosyası oluştur
sudo tee /etc/systemd/system/cloudflare-tunnel.service << EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER
ExecStart=/home/$USER/cloudflared tunnel --config /home/$USER/tunnel-config.yml run json-to-excel-tunnel
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Servisi aktifleştir
sudo systemctl daemon-reload
sudo systemctl enable cloudflare-tunnel
sudo systemctl start cloudflare-tunnel

# Servis durumunu kontrol et
sudo systemctl status cloudflare-tunnel
```

### **Docker Container Auto-Start**
```bash
# Container'ları restart policy ile güncelle
docker update --restart unless-stopped json-to-excel-app
docker update --restart unless-stopped nginx-proxy

# Docker daemon otomatik başlatma
sudo systemctl enable docker
```

---

## 📊 Adım 8: Monitoring ve Bakım

### **Log İzleme**
```bash
# Application logs
docker logs -f json-to-excel-app

# Nginx logs
docker logs -f nginx-proxy

# Tunnel logs
sudo journalctl -u cloudflare-tunnel -f

# Sistem resource'ları
htop
docker stats
```

### **Health Check Script**
```bash
# Health check scripti oluştur
cat > health-check.sh << 'EOF'
#!/bin/bash

# Container durumları
APP_STATUS=$(docker ps | grep json-to-excel-app | wc -l)
NGINX_STATUS=$(docker ps | grep nginx-proxy | wc -l)

# HTTP response check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://devtestenv.org)

echo "=== Health Check Report ==="
echo "Date: $(date)"
echo "App Container: $([ $APP_STATUS -eq 1 ] && echo "✅ Running" || echo "❌ Stopped")"
echo "Nginx Container: $([ $NGINX_STATUS -eq 1 ] && echo "✅ Running" || echo "❌ Stopped")"
echo "Website Response: $([ $HTTP_CODE -eq 200 ] && echo "✅ OK ($HTTP_CODE)" || echo "❌ Error ($HTTP_CODE)")"
echo "=========================="
EOF

chmod +x health-check.sh

# Cron job ekle (her 5 dakikada check)
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/$USER/json-to-excel/health-check.sh >> /home/$USER/health.log") | crontab -
```

### **Backup Script**
```bash
# Backup scripti oluştur
cat > backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Docker volumes backup
docker run --rm \
  -v json-to-excel-app:/data:ro \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/app_data_$DATE.tar.gz -C /data .

# Configuration files backup
tar czf $BACKUP_DIR/configs_$DATE.tar.gz \
  tunnel-config.yml \
  nginx.conf \
  Dockerfile \
  docker-compose.yml

# Cloudflare credentials backup
cp -r ~/.cloudflared $BACKUP_DIR/cloudflared_$DATE

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x backup.sh

# Haftalık backup cron job
(crontab -l 2>/dev/null; echo "0 3 * * 0 /home/$USER/json-to-excel/backup.sh") | crontab -
```

---

## 🚨 Sorun Giderme

### **Container Sorunları**
```bash
# Container'ları yeniden başlat
docker restart json-to-excel-app nginx-proxy

# Image'ı yeniden build et
docker build --no-cache -t json-to-excel .

# Container loglarını incele
docker logs --since=1h json-to-excel-app
```

### **Network Sorunları**
```bash
# Network bağlantısını test et
docker exec json-to-excel-app curl http://localhost:3000

# Network inspect
docker network inspect json-to-excel-network

# Port dinleme kontrolü
netstat -tulpn | grep :80
```

### **Tunnel Sorunları**
```bash
# Tunnel durumunu kontrol et
./cloudflared tunnel list

# Tunnel'ı yeniden başlat
sudo systemctl restart cloudflare-tunnel

# DNS routing kontrol
./cloudflared tunnel route dns json-to-excel-tunnel devtestenv.org --overwrite-dns
```

### **Performance Sorunları**
```bash
# Sistem kaynak kullanımı
free -h
df -h
docker system df

# Container resource limits
docker update --memory="2g" --cpus="2.0" json-to-excel-app

# Docker cleanup
docker system prune -f
```

---

## 📈 Performance Optimization

### **Docker Optimizasyonu**
```bash
# Docker daemon config
sudo tee /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

sudo systemctl restart docker
```

### **Nginx Optimizasyonu**
Nginx config'e eklenebilecek performans ayarları:
```nginx
# nginx.conf içine ekle
worker_processes auto;
worker_connections 1024;

# Compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

# Caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

### **Sistem Optimizasyonu**
```bash
# Swap ayarları (Raspberry Pi için)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# File descriptor limits
echo 'fs.file-max = 65536' | sudo tee -a /etc/sysctl.conf

# Network optimizations
echo 'net.core.rmem_max = 16777216' | sudo tee -a /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' | sudo tee -a /etc/sysctl.conf

# Ayarları uygula
sudo sysctl -p
```

---

## ✅ Deployment Checklist

### **Pre-Deployment**
- [ ] Sistem gereksinimleri kontrol edildi
- [ ] Docker kurulumu tamamlandı
- [ ] Proje dosyaları kopyalandı
- [ ] Cloudflare hesabı hazır

### **Deployment**
- [ ] Docker containers build edildi
- [ ] Network konfigürasyonu yapıldı
- [ ] Cloudflare tunnel kuruldu
- [ ] DNS kayıtları güncellendi

### **Post-Deployment**
- [ ] HTTPS erişim test edildi
- [ ] Health check çalışıyor
- [ ] Backup script ayarlandı
- [ ] Monitoring aktif
- [ ] Dokümantasyon güncel

### **Production Ready**
- [ ] SSL certificate aktif
- [ ] Performance optimizasyonları yapıldı
- [ ] Security ayarları kontrol edildi
- [ ] Auto-restart politikaları aktif
- [ ] Log rotation ayarlandı

---

## 🎯 Sonuç

Bu rehber ile JSON to Excel Converter uygulamanız:
- ✅ **Professional deployment** ile yayında
- ✅ **Auto-scaling** ve **high-availability** 
- ✅ **SSL security** ve **CDN** desteği
- ✅ **Automated backup** ve **monitoring**
- ✅ **Production-ready** konfigürasyon

**🚀 Artık uygulamanız enterprise düzeyde bir altyapıda çalışıyor!**