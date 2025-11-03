# ============================================================
# Scraper Log Management - Comprehensive Setup Summary
# Date: November 3, 2025
# ============================================================

## ✅ 1. Docker Log Rotation (Automatic)

**Location:** `/opt/scraper/docker-compose.yml`

**Configuration:**
- **Backend**: 20MB max size, 5 backup files = 100MB total
- **Nginx**: 50MB max size, 7 backup files = 350MB total  
- **Worker**: 20MB max size, 5 backup files = 100MB total
- **PostgreSQL**: 10MB max size, 3 backup files = 30MB total
- **Redis**: 5MB max size, 2 backup files = 10MB total

**Total Max Storage:** ~590MB for Docker container logs

**How it works:**
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "20m"
    max-file: "5"
```

Docker automatically rotates logs when size limit is reached.

---

## ✅ 2. Nginx Access/Error Logs

**Location:** `/opt/scraper/nginx/logs/`

**Files:**
- `access.log` - All HTTP requests
- `error.log` - Nginx errors only
- `archive/` - Compressed old logs

**Rotation Script:** `/opt/scraper/scripts/rotate_nginx_logs.sh`

**Configuration:**
- Max size before rotation: 100MB
- Archive format: `access_YYYYMMDD_HHMMSS.log.gz`
- Retention: 30 days

**Manual rotation:**
```bash
bash /opt/scraper/scripts/rotate_nginx_logs.sh
```

---

## ✅ 3. Backend Application Logs (Python)

**Location:** `/opt/scraper/backend/logs/`

**Files:**
- `scraper_all.log` - All logs (DEBUG+), 50MB max, 5 backups
- `scraper_errors.log` - Errors only (ERROR+), 10MB max, 10 backups
- `scraper_daily.log` - Daily rotating, 30 days retention

**Usage in Python:**
```python
from logging_config import setup_logging, get_logger

# Initialize logging
logger = setup_logging("scraper")

# Use in modules
logger = get_logger("scraper.api")
logger.info("Request processed")
logger.error("Error occurred", exc_info=True)
```

**Environment Variables:**
- `LOG_LEVEL=INFO` - Minimum log level
- `LOG_MAX_BYTES=52428800` - 50MB default
- `LOG_BACKUP_COUNT=5` - Number of backup files

---

## ✅ 4. Automated Log Rotation (Cron Job)

**Cron Job:** Runs daily at 02:00 AM

**Command:**
```bash
crontab -l | grep log
# Output: 0 2 * * * /opt/scraper/scripts/master_log_rotation.sh
```

**What it does:**
1. Rotates Nginx logs if > 100MB
2. Cleans old application logs (> 30 days)
3. Compresses archived logs (> 7 days old)
4. Generates rotation summary log

**Manual execution:**
```bash
bash /opt/scraper/scripts/master_log_rotation.sh
```

---

## ✅ 5. Local Log Analysis Tool

**Location:** `E:\Programming\Jukka\Geliştir\Project4\scripts\analyze_logs.ps1`

**Usage:**

**Quick view (last 100 lines):**
```powershell
.\analyze_logs.ps1 -Service backend
```

**Download for local analysis:**
```powershell
.\analyze_logs.ps1 -Service nginx -Download
```

**Full analysis with summary:**
```powershell
.\analyze_logs.ps1 -Service all -Download -Summary
```

**Parameters:**
- `-Service` - backend, nginx, worker, beat, all
- `-Lines` - Number of lines to show (default: 100)
- `-Download` - Force download to local
- `-Summary` - Show analysis summary (errors, warnings, HTTP codes)

**Auto-download:** Automatically downloads if log > 5MB

**Saved logs:** `E:\Programming\Jukka\Geliştir\Project4\logs\`

---

## 📊 6. Log Size Monitoring

**Check current sizes:**
```bash
# Docker logs
for c in scraper_prod_backend scraper_prod_nginx scraper_prod_worker; do
  echo "$c: $(docker logs $c 2>&1 | wc -c | awk '{print $1/1024/1024"MB"}')"
done

# Nginx files
du -sh /opt/scraper/nginx/logs/*

# Application logs
du -sh /opt/scraper/backend/logs/*
```

**Expected sizes:**
- Docker logs: Auto-managed, max 590MB total
- Nginx logs: 0-100MB active, archives compressed
- Python logs: 50MB all, 10MB errors, 30 days daily

---

## 🧪 7. Testing & Verification

**Test log rotation:**
```bash
# Nginx rotation
bash /opt/scraper/scripts/rotate_nginx_logs.sh

# Full rotation
bash /opt/scraper/scripts/master_log_rotation.sh
```

**Test log analyzer:**
```powershell
# Quick check
.\analyze_logs.ps1 -Service backend

# Full analysis
.\analyze_logs.ps1 -Service all -Download -Summary
```

**Generate test logs:**
```bash
# Create large nginx log for testing rotation
for i in {1..10000}; do 
  curl -s https://scraper.devtestenv.org/ > /dev/null
done
```

---

## 🚨 8. Troubleshooting

**If logs not rotating:**
```bash
# Check cron job
crontab -l | grep log

# Check script permissions
ls -l /opt/scraper/scripts/*.sh

# Test rotation manually
bash /opt/scraper/scripts/master_log_rotation.sh
```

**If logs too large:**
```bash
# Check Docker log sizes
docker system df

# Force prune old Docker logs (CAREFUL!)
docker system prune --volumes -af

# Check specific container
docker inspect scraper_prod_backend --format='{{.LogPath}}'
du -h $(docker inspect scraper_prod_backend --format='{{.LogPath}}')
```

**If disk space low:**
```bash
# Find large log files
find /opt/scraper -name "*.log*" -size +50M -exec ls -lh {} \;

# Clean archives older than 7 days
find /opt/scraper/nginx/logs/archive -name "*.gz" -mtime +7 -delete

# Clean old Python logs
find /opt/scraper/backend/logs -name "*.log.*" -mtime +30 -delete
```

---

## 📈 9. Log Locations Summary

| Service | Type | Location | Max Size | Retention |
|---------|------|----------|----------|-----------|
| Backend | Docker | `/var/lib/docker/containers/...` | 20MB×5 | Auto |
| Backend | Python | `/opt/scraper/backend/logs/scraper_all.log` | 50MB×5 | Auto |
| Backend | Errors | `/opt/scraper/backend/logs/scraper_errors.log` | 10MB×10 | Auto |
| Nginx | Docker | `/var/lib/docker/containers/...` | 50MB×7 | Auto |
| Nginx | Access | `/opt/scraper/nginx/logs/access.log` | 100MB | 30 days |
| Nginx | Error | `/opt/scraper/nginx/logs/error.log` | 100MB | 30 days |
| Worker | Docker | `/var/lib/docker/containers/...` | 20MB×5 | Auto |
| Local | Archive | `E:\Programming\Jukka\Geliştir\Project4\logs\` | Manual | Manual |

---

## ✨ 10. Key Features

✅ **Automatic Rotation** - Docker handles rotation automatically
✅ **Size Limits** - Prevents disk space issues  
✅ **Time-based Retention** - Old logs auto-deleted after 30 days
✅ **Compression** - Archives gzipped to save space
✅ **Local Analysis** - Download large logs for offline analysis
✅ **Error Tracking** - Separate error logs for quick debugging
✅ **Daily Logs** - Time-based rotation for audit trail
✅ **Cron Automation** - Zero manual intervention needed
✅ **Smart Download** - Auto-downloads logs > 5MB
✅ **Summary Reports** - Error/warning/HTTP status counts

---

## 🎯 Quick Reference Commands

**View live logs:**
```bash
docker logs -f scraper_prod_backend
docker logs -f scraper_prod_nginx --tail 50
```

**Download and analyze:**
```powershell
.\analyze_logs.ps1 -Service all -Download -Summary
```

**Manual rotation:**
```bash
bash /opt/scraper/scripts/master_log_rotation.sh
```

**Check disk usage:**
```bash
df -h /opt/scraper
du -sh /opt/scraper/*/logs
```

**Clean up old logs:**
```bash
find /opt/scraper -name "*.log.*" -mtime +30 -delete
find /opt/scraper/nginx/logs/archive -name "*.gz" -mtime +30 -delete
```

---

## 📞 Support

**Log issues:** Check `/opt/scraper/logs/rotation_YYYYMM.log`
**Cron issues:** Check `/var/log/syslog` or `journalctl -u cron`
**Docker issues:** `docker logs <container_name>`

**Emergency cleanup:**
```bash
# Stop all containers
cd /opt/scraper && docker compose down

# Clean Docker system
docker system prune -af --volumes

# Restart
docker compose up -d
```

---

**Last Updated:** November 3, 2025
**Status:** ✅ All systems operational
**Tested:** Backend, Nginx, Worker, Rotation scripts, Analysis tool
