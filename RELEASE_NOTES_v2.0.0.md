# Release Notes - v2.0.0

**JSON to Excel Converter - Major Feature Release**

Release Date: November 3, 2025

---

## 🎉 Highlights

This is a **major release** with significant new features, infrastructure improvements, and comprehensive documentation.

### Key Achievements

- ✨ **Bulk Processing Mode** - Process 90+ JSON files simultaneously
- 🔒 **Enterprise Logging** - Comprehensive log management with rotation
- 📊 **PowerShell Analyzer** - Advanced log analysis tool
- 🚀 **Deployment Ready** - Production configs and automation
- 🐛 **Critical Fixes** - Column mixing and memory issues resolved

---

## ✨ New Features

### 📁 Bulk Processing Mode
- Process hundreds of JSON files at once
- Folder upload with structure preservation
- Memory-optimized batch processing
- Real-time progress tracking
- Source file tracking in exports

### 🔒 Enterprise Logging System
- **Docker Log Rotation**
  - Automatic size-based rotation (max-size, max-file)
  - Backend: 20MB × 5 = 100MB total
  - Nginx: 50MB × 7 = 350MB total
  - Worker: 20MB × 5 = 100MB total

- **Python Application Logs**
  - 3 log types: all, errors, daily
  - RotatingFileHandler + TimedRotatingFileHandler
  - Colored console output
  - Auto-cleanup after 30 days

- **Nginx File Logs**
  - Separate access.log and error.log
  - 100MB size limit with compression
  - Archive retention: 30 days

- **Automated Rotation**
  - Cron job (daily 2 AM)
  - Master rotation script
  - Archive compression (7+ days)
  - Old file cleanup (30+ days)

### 📊 PowerShell Log Analyzer
```powershell
# Quick view
.\scripts\analyze_logs.ps1 -Service backend

# Download and analyze
.\scripts\analyze_logs.ps1 -Service all -Download -Summary
```

Features:
- Remote log viewing
- Auto-download for large logs (>5MB)
- Summary analysis (errors, warnings, HTTP codes)
- Multi-service support (backend, nginx, worker, all)
- Local storage for offline analysis

### 🌐 Landing Page
- Professional landing page on devtestenv.org
- Links to JSON to Excel and Scraper projects
- Responsive design
- Docker deployment ready

### 🗂️ Deployment Automation
- Organized `deployment/` directory
- Scraper configs with log rotation
- Docker Compose files
- Nginx rotation scripts
- Python logging config
- Comprehensive deployment guide

---

## 🐛 Bug Fixes

### Critical Fixes
- **Column Mixing Issue**: System fields (Memory, CPU, Status) no longer leak into Excel exports
- **Debug Data Leak**: "Show Debug" panel data excluded from exports
- **Memory Management**: Fixed memory leaks in large file processing

### Improvements
- Filtered internal columns (`__`, `_source_`, `_`)
- Enhanced CSV export with proper column filtering
- Fixed clipboard copy including system fields
- Improved error handling and recovery

---

## 📚 Documentation

### New Docs
- **LOG_MANAGEMENT_GUIDE.md** (comprehensive 300+ lines)
  - Docker logging setup
  - Nginx rotation guide
  - Python logging config
  - Cron automation
  - Local analysis tools
  - Troubleshooting section
  - Quick reference commands

- **deployment/README.md** (200+ lines)
  - Scraper deployment
  - JSON to Excel deployment
  - Landing page setup
  - Cloudflare Tunnel config
  - Maintenance tasks
  - Backup procedures
  - Testing guide

### Updated Docs
- **README.md** - Complete v2.0 overhaul
  - Badges and live demo link
  - Quick start guide
  - Usage examples
  - Configuration reference
  - Troubleshooting section
  - Changelog section

---

## 🔧 Infrastructure

### Docker Improvements
- Log rotation in docker-compose.yml
- Volume mounts for logs
- Environment variables for log config
- Health checks for all services

### Automation Scripts
```bash
deployment/scraper/scripts/
├── rotate_nginx_logs.sh       # Nginx rotation
└── master_log_rotation.sh     # Master rotation
```

### Cron Jobs
```bash
# Daily log rotation (2 AM)
0 2 * * * /opt/scraper/scripts/master_log_rotation.sh
```

---

## 🗂️ Project Cleanup

### Archived
- Moved `raspberry-pi-backup/` to `archive/`
- Removed old deployment scripts
- Cleaned build artifacts (.next)

### Organized
- Created `deployment/` directory structure
- Added `scripts/` for PowerShell tools
- Updated `.gitignore` for archives

### File Structure
```
Project4/
├── deployment/          # NEW: Production configs
│   ├── scraper/
│   │   ├── docker-compose.yml
│   │   ├── logging_config.py
│   │   └── scripts/
│   └── landing-page/
├── scripts/             # NEW: Utility scripts
│   └── analyze_logs.ps1
├── docs/               # NEW: Documentation
│   └── LOG_MANAGEMENT_GUIDE.md
└── archive/            # NEW: Old files
```

---

## 📦 Deployment

### Live Deployments
- **JSON to Excel**: https://json2excel.devtestenv.org
- **Scraper**: https://scraper.devtestenv.org  
- **Landing Page**: https://devtestenv.org

### Deployment Targets
- Raspberry Pi 5 (Ubuntu)
- Docker + Docker Compose
- Nginx reverse proxy
- Cloudflare Tunnel

### Log Locations
| Service | Location | Max Size | Retention |
|---------|----------|----------|-----------|
| Backend | `/opt/scraper/backend/logs/` | 50MB×5 | Auto |
| Nginx | `/opt/scraper/nginx/logs/` | 100MB | 30 days |
| Docker | Auto-managed | 590MB total | Auto |

---

## 🧪 Testing

### Test Results
✅ Docker log rotation - Verified
✅ Nginx file rotation - Verified  
✅ Python logging - Verified
✅ Cron automation - Verified
✅ PowerShell analyzer - Verified
✅ Column filtering - Verified
✅ Bulk processing - Verified (90 files)
✅ Memory management - Verified
✅ Deployment scripts - Verified

### Test Commands
```powershell
# Test log analyzer
.\scripts\analyze_logs.ps1 -Service all -Summary

# Test bulk processing
# Upload 90+ files via UI
# Export → Single Sheet
# Verify no system columns
```

---

## 🔄 Migration Guide

### For Existing Users

**No breaking changes!** v2.0 is fully backward compatible.

**To use new features:**
1. Pull latest code: `git pull origin main`
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Deploy: `scp -r out/* user@pi:/path/`

**To enable logging (optional):**
1. Copy deployment configs to Pi
2. Update docker-compose.yml
3. Add cron job
4. Restart containers

---

## 📊 Statistics

- **Files Changed**: 31
- **Additions**: ~8,000 lines
- **Deletions**: ~4,000 lines (cleanup)
- **New Files**: 10
- **Documentation**: 1,500+ lines

---

## 🤝 Contributors

- **Xtra01** - Lead Developer

---

## 📞 Support

- **GitHub Issues**: [Report bugs](https://github.com/Xtra01/json-to-excel-converter/issues)
- **Email**: support@devtestenv.org
- **Docs**: See `docs/LOG_MANAGEMENT_GUIDE.md`

---

## 🔗 Links

- **Live Demo**: https://json2excel.devtestenv.org
- **Repository**: https://github.com/Xtra01/json-to-excel-converter
- **Documentation**: [README.md](README.md)
- **License**: [AGPL v3](LICENSE.md)

---

## 🎯 What's Next

### v2.1 (Planned)
- [ ] GraphQL support
- [ ] API endpoint for programmatic access
- [ ] Advanced filtering options
- [ ] Export templates
- [ ] Batch scheduling

### Future
- [ ] Database export (SQL, MongoDB)
- [ ] XML/YAML support
- [ ] Data validation rules
- [ ] Custom transformations

---

**Full Changelog**: [v1.0...v2.0](https://github.com/Xtra01/json-to-excel-converter/compare/v1.0...v2.0)

**Download**: [Release Assets](https://github.com/Xtra01/json-to-excel-converter/releases/tag/v2.0.0)

---

**Thank you for using JSON to Excel Converter! 🎉**

If you find this useful, please ⭐ star the repo!
