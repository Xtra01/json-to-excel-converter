# ⚙️ Configuration Files

This directory contains example configuration files for deployment.

## 📁 Files

### **Docker Configuration**
- `docker-compose.example.yml` - Docker Compose template
  - Copy to `docker-compose.yml` and customize
  - Configure ports, volumes, and environment variables

### **Nginx Configuration**
- `nginx.conf.example` - Nginx reverse proxy template
  - Copy to `nginx.conf` and customize
  - Configure server names and SSL settings

### **Cloudflare Tunnel**
- `tunnel-config.example.yml` - Cloudflare tunnel template
  - Copy to `tunnel-config.yml` and customize
  - Set tunnel ID and routing rules

### **Environment Variables**
- `.env.example` - Environment variables template
  - Copy to `.env` and customize
  - **NEVER commit the actual `.env` file**

## 🚀 Usage

```bash
# Copy example files
cp config/docker-compose.example.yml docker-compose.yml
cp config/nginx.conf.example nginx.conf
cp config/tunnel-config.example.yml tunnel-config.yml
cp config/.env.example .env

# Edit with your values
nano docker-compose.yml
nano nginx.conf
nano tunnel-config.yml
nano .env
```

## ⚠️ Security Notes

- ✅ Example files are safe to commit (no sensitive data)
- ❌ **NEVER** commit actual configuration files with real credentials
- ✅ All actual config files are in `.gitignore`

---

*These are example files only. Customize for your environment.*