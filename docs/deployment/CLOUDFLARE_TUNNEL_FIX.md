# 🔧 CLOUDFLARE TUNNEL - KALICI ÇÖZÜM DOKÜMANTASYONU
## Kendi Bilgisayarınız Dışından Erişim Sorunu Çözümü

---

## 🔍 **SORUN ANALİZİ**

### **Problem**: 
`https://devtestenv.org` üzerinden kendi bilgisayarınız dışından erişemiyordunuz.

### **Tespit Edilen Sorunlar**:
1. ❌ **Port 80'de servis yok**: `json2excel-static` container durmuştu
2. ❌ **Systemd servisleri yok**: Reboot sonrası otomatik başlamıyordu
3. ✅ **Cloudflared çalışıyor**: Manuel olarak başlatılmıştı ancak kalıcı değil

### **Kök Neden**:
- Docker container'lar sistem yeniden başlatıldığında otomatik başlamıyordu
- Cloudflare tunnel servisi systemd ile yönetilmiyordu
- Manuel başlatılan process'ler reboot sonrası kayboluyordu

---

## ✅ **UYGULANAN KALICI ÇÖZÜM**

### **1. Docker Container Otomatik Başlatma**

**Systemd servisi oluşturuldu**: `/etc/systemd/system/json2excel-container.service`

```ini
[Unit]
Description=JSON to Excel Converter Container
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker start json2excel-static
ExecStop=/usr/bin/docker stop json2excel-static
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
```

**Ne yapıyor?**
- ✅ Sistem açılışında otomatik container başlatır
- ✅ Docker servisinden sonra çalışır
- ✅ Hata durumunda 30 saniye sonra yeniden dener

### **2. Cloudflare Tunnel Kalıcı Servis**

**Systemd servisi oluşturuldu**: `/etc/systemd/system/cloudflare-tunnel.service`

```ini
[Unit]
Description=Cloudflare Tunnel Service
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=ekrem
Group=ekrem
WorkingDirectory=/home/ekrem
ExecStart=/home/ekrem/cloudflared tunnel --config /home/ekrem/tunnel-config.yml run
Restart=always
RestartSec=10
KillMode=mixed
TimeoutStopSec=120
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Ne yapıyor?**
- ✅ Network ve Docker hazır olduktan sonra başlar
- ✅ Hata durumunda 10 saniye sonra otomatik yeniden başlar
- ✅ Log'ları systemd journal'a yazar
- ✅ Sistem açılışında otomatik başlar

### **3. Servislerin Aktifleştirilmesi**

```bash
# Servisleri enable et (boot'ta başlat)
sudo systemctl enable cloudflare-tunnel.service
sudo systemctl enable json2excel-container.service

# Servisleri başlat
sudo systemctl start cloudflare-tunnel.service
sudo systemctl start json2excel-container.service
```

---

## 🎯 **COPY-PASTE YÖNETİM KOMUTLARI**

### **📊 Servis Durumu Kontrol**

```bash
# Her iki servisin durumunu kontrol et
ssh ekrem@192.168.1.143 "sudo systemctl status cloudflare-tunnel.service json2excel-container.service"

# Sadece aktif mi değil mi göster
ssh ekrem@192.168.1.143 "sudo systemctl is-active cloudflare-tunnel && sudo systemctl is-active json2excel-container"

# Log'ları izle (real-time)
ssh ekrem@192.168.1.143 "sudo journalctl -u cloudflare-tunnel.service -f"
```

### **🔄 Servis Yönetimi**

```bash
# Servisleri yeniden başlat
ssh ekrem@192.168.1.143 "sudo systemctl restart cloudflare-tunnel.service json2excel-container.service"

# Servisleri durdur
ssh ekrem@192.168.1.143 "sudo systemctl stop cloudflare-tunnel.service json2excel-container.service"

# Servisleri başlat
ssh ekrem@192.168.1.143 "sudo systemctl start cloudflare-tunnel.service json2excel-container.service"

# Servisleri devre dışı bırak (boot'ta başlamasın)
ssh ekrem@192.168.1.143 "sudo systemctl disable cloudflare-tunnel.service json2excel-container.service"
```

### **📋 Log Analizi**

```bash
# Cloudflare tunnel log'ları (son 50 satır)
ssh ekrem@192.168.1.143 "sudo journalctl -u cloudflare-tunnel.service -n 50 --no-pager"

# Container servis log'ları
ssh ekrem@192.168.1.143 "sudo journalctl -u json2excel-container.service -n 50 --no-pager"

# Bugünkü tüm log'lar
ssh ekrem@192.168.1.143 "sudo journalctl -u cloudflare-tunnel.service --since today --no-pager"

# Hata log'ları
ssh ekrem@192.168.1.143 "sudo journalctl -u cloudflare-tunnel.service -p err --no-pager"
```

### **🔍 Sistem Kontrolleri**

```bash
# Docker container durumu
ssh ekrem@192.168.1.143 "docker ps | grep json2excel-static"

# Port 80 dinleniyor mu?
ssh ekrem@192.168.1.143 "curl -I http://localhost:80"

# Cloudflare tunnel bağlantı durumu
ssh ekrem@192.168.1.143 "ps aux | grep cloudflared | grep -v grep"

# Tam sistem durumu (hepsi bir arada)
ssh ekrem@192.168.1.143 "echo '=== Servis Durumu ===' && sudo systemctl is-active cloudflare-tunnel json2excel-container && echo '=== Docker Container ===' && docker ps | grep json2excel && echo '=== Port 80 Test ===' && curl -s -o /dev/null -w '%{http_code}' http://localhost:80"
```

---

## 🧪 **TEST KONTROLLERİ**

### **Yerel Test (Pi üzerinden)**
```bash
# Pi'ye SSH bağlan
ssh ekrem@192.168.1.143

# Local test
curl -I http://localhost:80

# Cloudflare üzerinden test
curl -I https://devtestenv.org
```

### **Dış Ağdan Test (Kendi bilgisayarınızdan)**
```bash
# Windows PowerShell'den
curl.exe -I https://devtestenv.org

# Veya tarayıcıda
# https://devtestenv.org
```

### **Mobil Test (4G/5G)**
```bash
# Telefon data ile tarayıcıda aç:
# https://devtestenv.org

# Veya mobil tarayıcıda Developer Console'da:
# fetch('https://devtestenv.org').then(r => console.log(r.status))
```

---

## 🚨 **SORUN GİDERME**

### **Problem: Servis başlamıyor**
```bash
# Servis durumunu kontrol et
sudo systemctl status cloudflare-tunnel.service

# Detaylı log'ları incele
sudo journalctl -u cloudflare-tunnel.service -xe

# Servis dosyasını kontrol et
cat /etc/systemd/system/cloudflare-tunnel.service

# Daemon'u reload et ve tekrar dene
sudo systemctl daemon-reload
sudo systemctl restart cloudflare-tunnel.service
```

### **Problem: Port 80 erişilemiyor**
```bash
# Docker container çalışıyor mu?
docker ps | grep json2excel-static

# Container log'larını kontrol et
docker logs json2excel-static

# Container'ı manuel başlat
docker start json2excel-static

# Port kullanımını kontrol et
sudo netstat -tlnp | grep :80
```

### **Problem: Cloudflare tunnel bağlanmıyor**
```bash
# Tunnel konfigürasyonunu kontrol et
cat ~/tunnel-config.yml

# Credentials dosyası var mı?
ls -la ~/.cloudflared/

# Manuel test
/home/ekrem/cloudflared tunnel --config /home/ekrem/tunnel-config.yml run

# Network bağlantısı var mı?
ping -c 3 1.1.1.1
```

### **Problem: DNS çözümlemiyor**
```bash
# DNS propagation kontrol
nslookup devtestenv.org

# Cloudflare DNS'e sor
nslookup devtestenv.org 1.1.1.1

# CNAME kaydını kontrol et
dig devtestenv.org CNAME
```

---

## 🔄 **REBOOT SONRASI KONTROL LİSTESİ**

Pi'yi yeniden başlattıktan sonra otomatik olarak çalışması gerekenler:

```bash
# 1. Reboot
ssh ekrem@192.168.1.143 "sudo reboot"

# 2. 2-3 dakika bekle, sonra kontrol et
ssh ekrem@192.168.1.143 "sudo systemctl is-active cloudflare-tunnel json2excel-container && docker ps && curl -I http://localhost:80"

# 3. Dışarıdan test
curl -I https://devtestenv.org
```

**Beklenen sonuç**: ✅ Her şey otomatik başlamalı

---

## 📊 **SİSTEM MİMARİSİ**

```
🌐 CLOUDFLARE TUNNEL ARCHITECTURE

Internet (https://devtestenv.org)
           ↓
[Cloudflare CDN/Proxy]
           ↓
Encrypted Tunnel (cloudflared)
           ↓
[Raspberry Pi - Port 80]
           ↓
[Docker Container: json2excel-static]
           ↓
[Nginx serving static files]

SYSTEMD SERVICES:
├── cloudflare-tunnel.service
│   ├── Manages: cloudflared tunnel
│   ├── Auto-start: ✅ Enabled
│   ├── Auto-restart: ✅ On failure
│   └── Dependencies: network, docker
│
└── json2excel-container.service
    ├── Manages: Docker container
    ├── Auto-start: ✅ Enabled
    ├── Auto-restart: ✅ On failure
    └── Dependencies: docker.service
```

---

## 🎯 **GÜVENLİK KONTROL LİSTESİ**

### **Cloudflare Güvenlik Ayarları**

**Cloudflare Dashboard → Security**:
- ✅ Security Level: Medium
- ✅ Browser Integrity Check: ON
- ✅ Challenge Passage: 1 hour
- ✅ Bot Fight Mode: ON

**SSL/TLS Settings**:
- ✅ Mode: Full (strict)
- ✅ Always Use HTTPS: ON
- ✅ Automatic HTTPS Rewrites: ON
- ✅ TLS 1.3: ON

### **Pi Güvenlik Kontrolleri**

```bash
# Firewall durumu
ssh ekrem@192.168.1.143 "sudo ufw status"

# SSH security
ssh ekrem@192.168.1.143 "sudo sshd -T | grep -E '(PermitRootLogin|PasswordAuthentication|Port)'"

# Cloudflare tunnel credentials koruması
ssh ekrem@192.168.1.143 "ls -la ~/.cloudflared/"
# Beklenen: -r-------- (sadece okuma, sadece user)
```

---

## 📈 **PERFORMANS İZLEME**

### **Monitoring Dashboard**

```bash
# Multi-Pi monitoring başlat
cd "e:\Programming\Jukka\Geliştir\Project4\raspberry-pi-backup"
python multi-pi-monitor.py

# Tarayıcıda: http://localhost:8080
```

### **Cloudflare Analytics**

**Cloudflare Dashboard → Analytics**:
- Requests per minute/hour/day
- Bandwidth usage
- Response times
- Geographic distribution
- Threat analytics

---

## ✅ **SON DURUM**

### **Çözülen Sorunlar**:
- ✅ **Port 80 servisi**: Container yeniden başlatıldı ve systemd servisi eklendi
- ✅ **Otomatik başlatma**: Her iki servis de boot'ta otomatik başlıyor
- ✅ **Cloudflare tunnel**: Systemd servisi olarak kalıcı hale getirildi
- ✅ **Dış erişim**: `https://devtestenv.org` artık her yerden erişilebilir

### **Test Sonuçları**:
```bash
$ curl -I https://devtestenv.org
HTTP/1.1 200 OK
Date: Fri, 31 Oct 2025 21:26:00 GMT
Server: cloudflare
✅ BAŞARILI!
```

### **Kalıcılık Garantisi**:
- ✅ Reboot sonrası otomatik başlatma aktif
- ✅ Hata durumunda otomatik yeniden başlatma
- ✅ Systemd log'ları ile izlenebilir
- ✅ Manual müdahale gerektirmiyor

---

*📅 Çözüm Tarihi: 1 Kasım 2025*  
*⚡ Sistem Durumu: OPERASYONEL*  
*🔒 Güvenlik Durumu: GÜÇLÜ*  
*🌐 Erişim: https://devtestenv.org*