# 🔐 Security & Deployment Guide

**IMPORTANT: This document contains sensitive information management guidelines**

---

## 🚨 NEVER COMMIT THESE FILES

### 🔒 **Sensitive Files (Add to .gitignore)**
```
# Cloudflare credentials
.cloudflared/
tunnel-config.yml
*.json (credential files)

# Server configurations
nginx.conf (with real domains)
docker-compose.yml (with real settings)

# Environment files  
.env
.env.local
.env.production

# SSL certificates
ssl/
*.pem
*.key
*.crt

# Logs with sensitive data
logs/
*.log

# Backup files with data
backups/
uploads/
```

---

## 📋 Pre-Deployment Checklist

### 1️⃣ **Clean Repository**
```bash
# Remove sensitive files from tracking
git rm --cached tunnel-config.yml
git rm --cached nginx.conf
git rm --cached docker-compose.yml
git rm --cached .env

# Add to .gitignore
echo "tunnel-config.yml" >> .gitignore
echo "nginx.conf" >> .gitignore
echo "docker-compose.yml" >> .gitignore
echo ".env*" >> .gitignore
```

### 2️⃣ **Create Example Files**
- ✅ `tunnel-config.example.yml` (template)
- ✅ `nginx.conf.example` (template)  
- ✅ `docker-compose.example.yml` (template)
- ✅ `.env.example` (template)

### 3️⃣ **Update Documentation**
- ✅ Remove IP addresses
- ✅ Remove passwords  
- ✅ Remove domain names
- ✅ Use placeholder values

---

## 🛡️ Server Security Best Practices

### 🔐 **SSH Security**
```bash
# Change default SSH port
sudo nano /etc/ssh/sshd_config
# Port 2222 (or any non-standard port)

# Disable root login
# PermitRootLogin no

# Use key-based authentication only
# PasswordAuthentication no

# Restart SSH
sudo systemctl restart sshd
```

### 🔥 **Firewall Configuration**
```bash
# Enable UFW
sudo ufw enable

# Allow only necessary ports
sudo ufw allow 2222/tcp  # SSH (if changed)
sudo ufw allow 80/tcp    # HTTP (for Cloudflare)
sudo ufw allow 443/tcp   # HTTPS (for Cloudflare)

# Deny everything else
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### 🔒 **File Permissions**
```bash
# Secure credential files
chmod 600 ~/.cloudflared/*.json
chmod 600 tunnel-config.yml
chmod 600 .env

# Secure configuration directories
chmod 700 ~/.cloudflared/
chmod 755 /home/username/json-to-excel/
```

---

## 🌐 Environment Variables

### 📝 **Create .env File**
```bash
# Application settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Server settings  
SERVER_PORT=3000
SERVER_HOST=0.0.0.0

# Security settings
ALLOWED_ORIGINS=https://your-domain.com
MAX_FILE_SIZE=100MB
MAX_FILES_COUNT=100

# Cloudflare settings (optional)
CF_TUNNEL_ID=your-tunnel-id
CF_DOMAIN=your-domain.com
```

---

## 🚀 Deployment Variables

### 📊 **Server Information (Keep Private)**
```bash
# These should NEVER be in code:
SERVER_IP=xxx.xxx.xxx.xxx
SSH_PORT=xxxx  
SSH_USER=username
SSH_KEY_PATH=/path/to/key

# Domain information
DOMAIN=your-domain.com
CLOUDFLARE_EMAIL=your-email@example.com
CLOUDFLARE_API_TOKEN=your-api-token

# Database (if added later)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=app_db
DB_USER=app_user  
DB_PASSWORD=secure_password
```

---

## 📦 GitHub Repository Setup

### 🔧 **Repository Structure**
```
json-to-excel-converter/
├── .gitignore                 ✅ Complete ignore file
├── README.md                  ✅ Clean documentation  
├── DEPLOYMENT_GUIDE.md        ✅ Deployment instructions
├── SECURITY.md               ✅ This file
├── src/                       ✅ Application code
├── docker-compose.example.yml ✅ Template file
├── nginx.conf.example         ✅ Template file
├── tunnel-config.example.yml  ✅ Template file
├── .env.example              ✅ Template file
└── docs/                     ✅ Additional documentation
```

### 🚫 **NEVER Include**
```
❌ Real IP addresses
❌ Real passwords
❌ Real domain names  
❌ SSH keys
❌ SSL certificates
❌ Cloudflare credentials
❌ API tokens
❌ Database credentials
❌ Personal information
```

---

## 🔄 Safe Deployment Process

### 1️⃣ **Local Development**
```bash
# Use example files
cp docker-compose.example.yml docker-compose.yml
cp nginx.conf.example nginx.conf
cp tunnel-config.example.yml tunnel-config.yml
cp .env.example .env

# Edit with real values (will be ignored by git)
nano docker-compose.yml
nano nginx.conf  
nano tunnel-config.yml
nano .env
```

### 2️⃣ **Server Deployment**  
```bash
# Clone repository
git clone https://github.com/username/json-to-excel-converter.git
cd json-to-excel-converter

# Create production files from examples
cp docker-compose.example.yml docker-compose.yml
cp nginx.conf.example nginx.conf
cp tunnel-config.example.yml tunnel-config.yml

# Configure with server-specific values
nano docker-compose.yml  # Update with production settings
nano nginx.conf          # Update with real domain
nano tunnel-config.yml   # Update with real tunnel ID
```

### 3️⃣ **Secure Transfer of Credentials**
```bash
# Use SCP for credential files (separate from git)
scp ~/.cloudflared/*.json user@server:/home/user/.cloudflared/

# Or use secure methods like:
# - Encrypted USB drive
# - Secure file sharing service  
# - Manual entry on server
```

---

## 🔍 Security Audit Checklist

### ✅ **Before Committing**
- [ ] Check for IP addresses in code
- [ ] Check for passwords in files
- [ ] Check for domain names in configs
- [ ] Check for API keys/tokens
- [ ] Verify .gitignore is complete
- [ ] Test with example files
- [ ] Review commit diff carefully

### ✅ **Repository Health**
- [ ] All sensitive files in .gitignore
- [ ] Example files are clean templates
- [ ] Documentation uses placeholders
- [ ] No real credentials in history
- [ ] README is sanitized
- [ ] No personal information exposed

---

## 🆘 Emergency Response

### 🚨 **If Sensitive Data Was Committed**

#### **Immediate Actions:**
```bash
# 1. Remove from latest commit (if just committed)
git reset --soft HEAD~1
git reset HEAD sensitive-file.yml
rm sensitive-file.yml
git add .gitignore
git commit -m "Remove sensitive data"

# 2. Remove from entire history (DANGEROUS - rewrites history)
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch sensitive-file.yml' \
--prune-empty --tag-name-filter cat -- --all

# 3. Force push (if repository is private and you're the only user)
git push origin --force --all
```

#### **Security Measures:**
```bash
# 1. Change all exposed credentials immediately
# 2. Rotate API keys
# 3. Update passwords  
# 4. Regenerate SSH keys
# 5. Update Cloudflare tunnel credentials
```

---

## 📞 Security Contact

**If you discover security vulnerabilities:**
1. DO NOT create public issues
2. Contact maintainer privately
3. Allow time for fixes before disclosure
4. Follow responsible disclosure practices

---

**🔐 Remember: Security is everyone's responsibility!**