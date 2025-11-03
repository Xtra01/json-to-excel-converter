# Deployment Guide - JSON to Excel & Scraper

**Production deployment configurations for Raspberry Pi 5**

---

## 📁 Directory Structure

```
deployment/
├── scraper/
│   ├── docker-compose.yml          # Main compose file with log rotation
│   ├── logging_config.py           # Python logging configuration
│   └── scripts/
│       ├── rotate_nginx_logs.sh    # Nginx log rotation
│       └── master_log_rotation.sh  # Master rotation script
└── landing-page/
    ├── index.html                  # Landing page
    ├── styles.css                  # Styles
    ├── Dockerfile                  # Nginx container
    └── docker-compose.yml          # Landing page compose
```

---

## 🚀 Scraper Deployment

### Prerequisites

- Raspberry Pi 5 (or 4) with Ubuntu/Debian
- Docker & Docker Compose installed
- Cloudflare Tunnel configured

### Setup

```bash
# Copy files to Pi
scp -r deployment/scraper/* user@pi:/opt/scraper/

# Set permissions
ssh user@pi "chmod +x /opt/scraper/scripts/*.sh"

# Create log directories
ssh user@pi "mkdir -p /opt/scraper/{nginx/logs,backend/logs}"

# Start containers
ssh user@pi "cd /opt/scraper && docker compose up -d"
```

### Log Rotation Setup

```bash
# Add cron job (runs daily at 2 AM)
ssh user@pi '(crontab -l 2>/dev/null | grep -v "master_log_rotation"; echo "0 2 * * * /opt/scraper/scripts/master_log_rotation.sh") | crontab -'

# Verify cron job
ssh user@pi "crontab -l | grep log"
```

### Docker Compose Features

**Log Rotation (Automatic):**
- Backend: 20MB max, 5 backups = 100MB total
- Nginx: 50MB max, 7 backups = 350MB total
- Worker: 20MB max, 5 backups = 100MB total

**Services:**
- PostgreSQL (DB)
- Redis (Cache/Queue)
- Backend (FastAPI)
- Celery Worker
- Celery Beat
- Frontend (Next.js)
- Nginx (Reverse Proxy)
- Certbot (SSL)
- Cloudflare Tunnel

---

## 📝 Log Management

### Log Locations

| Service | Location | Max Size | Retention |
|---------|----------|----------|-----------|
| Backend Docker | Auto-managed | 20MB×5 | Auto |
| Backend Python | `/opt/scraper/backend/logs/` | 50MB×5 | Auto |
| Nginx Docker | Auto-managed | 50MB×7 | Auto |
| Nginx Files | `/opt/scraper/nginx/logs/` | 100MB | 30 days |

### Manual Operations

```bash
# View live logs
ssh user@pi "docker logs -f scraper_prod_backend"
ssh user@pi "docker logs -f scraper_prod_nginx --tail 50"

# Manual rotation
ssh user@pi "bash /opt/scraper/scripts/master_log_rotation.sh"

# Check log sizes
ssh user@pi "du -sh /opt/scraper/*/logs"

# Clean old logs
ssh user@pi "find /opt/scraper -name '*.log.*' -mtime +30 -delete"
```

### Local Log Analysis

```powershell
# Quick view
.\scripts\analyze_logs.ps1 -Service backend

# Download and analyze
.\scripts\analyze_logs.ps1 -Service all -Download -Summary

# Specific service
.\scripts\analyze_logs.ps1 -Service nginx -Lines 500
```

---

## 🌐 Landing Page Deployment

### Setup

```bash
# Create directory
ssh user@pi "mkdir -p /opt/landing-page"

# Copy files
scp -r deployment/landing-page/* user@pi:/opt/landing-page/

# Start container
ssh user@pi "cd /opt/landing-page && docker compose up -d"
```

### Features

- Professional landing page
- Links to JSON to Excel and Scraper
- Responsive design
- Nginx-based (nginx:alpine)
- Port 3001

---

## 📦 JSON to Excel Deployment

### Setup

```bash
# Build locally
npm run build

# Copy to Pi
scp -r out/* user@pi:/home/user/json-to-excel/out/

# Restart container
ssh user@pi "docker restart json2excel-static"
```

### Docker Setup

```yaml
version: '3.8'
services:
  json2excel:
    image: nginx:alpine
    container_name: json2excel-static
    ports:
      - "8091:80"
    volumes:
      - ./out:/usr/share/nginx/html:ro
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 🔐 Cloudflare Tunnel

### Configuration

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/user/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: devtestenv.org
    service: http://127.0.0.1:3001
  - hostname: json2excel.devtestenv.org
    service: http://127.0.0.1:8091
  - hostname: scraper.devtestenv.org
    service: http://127.0.0.1:80
    originRequest:
      httpHostHeader: scraper.devtestenv.org
  - service: http_status:404
```

### Restart Tunnel

```bash
# Restart systemd service
ssh user@pi "sudo systemctl restart cloudflared"

# Check status
ssh user@pi "sudo systemctl status cloudflared"

# View logs
ssh user@pi "sudo journalctl -u cloudflared -n 50"
```

---

## 🧪 Testing

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# JSON to Excel
curl -I http://localhost:8091

# Landing page
curl -I http://localhost:3001

# Scraper
curl -I http://localhost:80
```

### External Tests

```powershell
# Test all domains
Invoke-WebRequest -Uri "https://json2excel.devtestenv.org/" -UseBasicParsing
Invoke-WebRequest -Uri "https://scraper.devtestenv.org/" -UseBasicParsing
Invoke-WebRequest -Uri "https://devtestenv.org/" -UseBasicParsing
```

---

## 🔧 Maintenance

### Regular Tasks

**Daily (Automated via Cron):**
- Log rotation (2 AM)
- Old log cleanup (30+ days)
- Archive compression (7+ days)

**Weekly:**
```bash
# Check disk space
ssh user@pi "df -h"

# Check container status
ssh user@pi "docker ps -a"

# Review logs for errors
.\scripts\analyze_logs.ps1 -Service all -Summary
```

**Monthly:**
```bash
# Clean Docker system
ssh user@pi "docker system prune -af"

# Update containers
ssh user@pi "cd /opt/scraper && docker compose pull && docker compose up -d"
```

### Backup

```bash
# Backup configurations
scp -r user@pi:/opt/scraper/docker-compose.yml ./backups/
scp -r user@pi:/opt/scraper/.env ./backups/
scp -r user@pi:/opt/scraper/scripts ./backups/

# Backup database
ssh user@pi "docker exec scraper_prod_db pg_dump -U user dbname > /tmp/backup.sql"
scp user@pi:/tmp/backup.sql ./backups/db_$(date +%Y%m%d).sql
```

---

## 🚨 Troubleshooting

### Containers Not Starting

```bash
# Check logs
ssh user@pi "docker logs scraper_prod_backend --tail 50"

# Check compose config
ssh user@pi "cd /opt/scraper && docker compose config"

# Restart all
ssh user@pi "cd /opt/scraper && docker compose down && docker compose up -d"
```

### 502 Bad Gateway

```bash
# Check backend is running
ssh user@pi "docker ps | grep backend"

# Check backend health
ssh user@pi "curl http://localhost:8000/health"

# Check nginx config
ssh user@pi "docker exec scraper_prod_nginx nginx -t"

# Restart nginx
ssh user@pi "docker restart scraper_prod_nginx"
```

### Disk Space Issues

```bash
# Check disk usage
ssh user@pi "df -h"

# Find large files
ssh user@pi "du -sh /opt/* | sort -h"

# Clean Docker
ssh user@pi "docker system df"
ssh user@pi "docker system prune -af --volumes"

# Clean logs
ssh user@pi "find /opt -name '*.log*' -mtime +7 -delete"
```

### Memory Issues

```bash
# Check memory
ssh user@pi "free -h"

# Check container memory
ssh user@pi "docker stats --no-stream"

# Restart high-memory containers
ssh user@pi "docker restart scraper_prod_backend"
```

---

## 📞 Support

For detailed logging guide, see: [LOG_MANAGEMENT_GUIDE.md](../docs/LOG_MANAGEMENT_GUIDE.md)

**Issues:** Create GitHub issue with:
- Container logs
- System info (`uname -a`, `free -h`, `df -h`)
- Error messages
- Steps to reproduce

---

**Last Updated:** November 3, 2025
