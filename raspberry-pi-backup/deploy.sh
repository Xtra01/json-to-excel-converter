#!/bin/bash

# Raspberry Pi JSON to Excel PWA - Automated Deployment Script
# Bu script yeni bir Raspberry Pi'ye tam kurulum yapar

set -e  # Exit on any error

echo "🚀 Raspberry Pi JSON to Excel PWA Deployment Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Check if running as pi/ekrem user
if [ "$USER" != "ekrem" ] && [ "$USER" != "pi" ]; then
    error "Bu script ekrem veya pi kullanıcısı ile çalıştırılmalı!"
    exit 1
fi

# Backup directory path (adjust as needed)
BACKUP_DIR="/home/$USER/raspberry-pi-backup"

if [ ! -d "$BACKUP_DIR" ]; then
    error "Backup directory bulunamadı: $BACKUP_DIR"
    error "Lütfen backup dosyalarını Pi'ye kopyalayın."
    exit 1
fi

log "Backup directory bulundu: $BACKUP_DIR"

# Function to install package if not exists
install_if_missing() {
    if ! command -v $1 &> /dev/null; then
        log "Installing $1..."
        sudo apt-get install -y $2
    else
        log "$1 zaten kurulu"
    fi
}

# 1. System Update
log "Sistem güncelleniyor..."
sudo apt update && sudo apt upgrade -y

# 2. Install required packages
log "Gerekli paketler kuruluyor..."
install_if_missing "curl" "curl"
install_if_missing "wget" "wget"
install_if_missing "git" "git"
install_if_missing "htop" "htop"
install_if_missing "nano" "nano"

# 3. Docker Installation
if ! command -v docker &> /dev/null; then
    log "Docker kuruluyor..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    log "Docker kuruldu. Yeniden giriş yapmanız gerekebilir."
else
    log "Docker zaten kurulu"
fi

# 4. Node.js Installation
if ! command -v node &> /dev/null; then
    log "Node.js kuruluyor..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    log "Node.js zaten kurulu"
fi

# 5. Cloudflared Installation
if ! command -v cloudflared &> /dev/null; then
    log "Cloudflared kuruluyor..."
    
    # Determine architecture
    ARCH=$(uname -m)
    if [ "$ARCH" = "aarch64" ]; then
        CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb"
    elif [ "$ARCH" = "armv7l" ]; then
        CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb"
    else
        CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
    fi
    
    wget -O /tmp/cloudflared.deb $CLOUDFLARED_URL
    sudo dpkg -i /tmp/cloudflared.deb
    rm /tmp/cloudflared.deb
else
    log "Cloudflared zaten kurulu"
fi

# 6. Create necessary directories
log "Gerekli dizinler oluşturuluyor..."
mkdir -p /home/$USER/logs
mkdir -p /home/$USER/.cloudflared

# 7. Copy configuration files
log "Konfigürasyon dosyaları kopyalanıyor..."

# Cloudflared config
if [ -d "$BACKUP_DIR/.cloudflared" ]; then
    cp -r "$BACKUP_DIR/.cloudflared/"* /home/$USER/.cloudflared/
    chmod 600 /home/$USER/.cloudflared/*
    log "Cloudflared konfigürasyonu kopyalandı"
fi

# Scripts
if [ -d "$BACKUP_DIR/home/ekrem" ]; then
    cp "$BACKUP_DIR/home/ekrem/"*.sh /home/$USER/ 2>/dev/null || warn "Script dosyaları bulunamadı"
    chmod +x /home/$USER/*.sh 2>/dev/null || true
    log "Shell scripts kopyalandı"
fi

# 8. Copy and setup project
if [ -d "$BACKUP_DIR/home/ekrem/json-to-excel" ]; then
    log "JSON to Excel projesi kopyalanıyor..."
    cp -r "$BACKUP_DIR/home/ekrem/json-to-excel" /home/$USER/
    
    cd /home/$USER/json-to-excel
    
    # Install dependencies if package.json exists
    if [ -f "package.json" ]; then
        log "NPM dependencies kuruluyor..."
        npm install
    fi
    
    # Setup Docker if docker-compose files exist
    if [ -f "docker-compose.yml" ] || [ -f "docker-compose.backup.yml" ]; then
        log "Docker containers başlatılıyor..."
        
        # Use backup docker-compose if available
        if [ -f "docker-compose.backup.yml" ]; then
            docker-compose -f docker-compose.backup.yml up -d
        else
            docker-compose up -d
        fi
    fi
else
    warn "JSON to Excel proje dosyaları bulunamadı"
fi

# 9. Setup systemd services
log "Systemd services kuruluyor..."
if [ -f "$BACKUP_DIR/etc/systemd/system/cloudflared-tunnel.service" ]; then
    sudo cp "$BACKUP_DIR/etc/systemd/system/cloudflared-tunnel.service" /etc/systemd/system/
    
    # Update service file to use correct user
    sudo sed -i "s/User=ekrem/User=$USER/g" /etc/systemd/system/cloudflared-tunnel.service
    sudo sed -i "s|WorkingDirectory=/home/ekrem|WorkingDirectory=/home/$USER|g" /etc/systemd/system/cloudflared-tunnel.service
    sudo sed -i "s|ExecStart=/usr/bin/cloudflared --config /home/ekrem/.cloudflared/config.yml tunnel run|ExecStart=/usr/bin/cloudflared --config /home/$USER/.cloudflared/config.yml tunnel run|g" /etc/systemd/system/cloudflared-tunnel.service
    
    sudo systemctl daemon-reload
    sudo systemctl enable cloudflared-tunnel
    sudo systemctl start cloudflared-tunnel
    
    log "Cloudflared tunnel service kuruldu ve başlatıldı"
else
    warn "Cloudflared service dosyası bulunamadı"
fi

# 10. Setup cron jobs
log "Cron jobs kuruluyor..."
# Remove existing cron jobs for this user
crontab -l 2>/dev/null | grep -v "/home/$USER/" | crontab - 2>/dev/null || true

# Add new cron jobs
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/$USER/health-check.sh >/dev/null 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/$USER/ip-monitor.sh >/dev/null 2>&1") | crontab -

log "Cron jobs eklendi"

# 11. Set proper permissions
log "Dosya izinleri ayarlanıyor..."
chown -R $USER:$USER /home/$USER/
chmod 755 /home/$USER/*.sh 2>/dev/null || true
chmod 600 /home/$USER/.cloudflared/* 2>/dev/null || true

# 12. System status check
log "Sistem durumu kontrol ediliyor..."

echo -e "\n${BLUE}=== DEPLOYMENT SUMMARY ===${NC}"

# Check services
systemctl is-active --quiet cloudflared-tunnel && echo -e "${GREEN}✓ Cloudflared tunnel: RUNNING${NC}" || echo -e "${RED}✗ Cloudflared tunnel: NOT RUNNING${NC}"

# Check Docker
if command -v docker &> /dev/null; then
    if docker ps | grep -q json-to-excel; then
        echo -e "${GREEN}✓ Docker container: RUNNING${NC}"
    else
        echo -e "${YELLOW}! Docker container: NOT FOUND${NC}"
    fi
fi

# Check cron jobs
if crontab -l | grep -q "health-check.sh"; then
    echo -e "${GREEN}✓ Cron jobs: CONFIGURED${NC}"
else
    echo -e "${RED}✗ Cron jobs: NOT CONFIGURED${NC}"
fi

# Check files
if [ -f "/home/$USER/.cloudflared/config.yml" ]; then
    echo -e "${GREEN}✓ Cloudflared config: FOUND${NC}"
else
    echo -e "${RED}✗ Cloudflared config: MISSING${NC}"
fi

echo -e "\n${GREEN}🎉 Deployment tamamlandı!${NC}"
echo -e "${BLUE}Tunnel URL: https://devtestenv.org${NC}"
echo -e "${YELLOW}Not: Eğer 'docker' grubu hatası alırsanız, sistemi yeniden başlatın.${NC}"

# Optional: Test connectivity
echo -e "\n${BLUE}Bağlantı testi yapılıyor...${NC}"
sleep 5

if curl -s -o /dev/null -w "%{http_code}" https://devtestenv.org | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Site erişilebilir durumda!${NC}"
else
    echo -e "${YELLOW}! Site henüz erişilebilir değil. Birkaç dakika bekleyin.${NC}"
fi

echo -e "\n${BLUE}Deployment log'u saklandı: /home/$USER/deployment.log${NC}"